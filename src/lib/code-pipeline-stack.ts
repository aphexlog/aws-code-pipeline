import * as cdk from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as codeBuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as codestarconnections from '@aws-cdk/aws-codestarconnections';
import * as ec2 from '@aws-cdk/aws-ec2';

import { getEcrBuildImagePolicy } from './helpers/policyHelpers';

import { IPipelineProps } from './types'

export class CodePipelineStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props?: IPipelineProps) {
        super(scope, id, props,);
        const { git_branch: branch,
            git_repo: repo,
            git_owner: owner,
            image_repo_name: imageRepoName,
            image_repo_tag: imageRepoTag,
            vpc_id: vpcId,
        } = props;

        const src = new codePipeline.Artifact();

        const connection = new codestarconnections.CfnConnection(this, 'CodestarConnection', {
            connectionName: 'super-awesome-connection',
            providerType: 'GitHub',
        });

        const sourceAction = new actions.BitBucketSourceAction({
            actionName: 'SourceAction',
            connectionArn: connection.attrConnectionArn,
            output: src,
            owner,
            repo,
            branch,
            runOrder: 1,
        });

        const approvalAction = new actions.ManualApprovalAction({
            actionName: 'ApprovalAction',
            runOrder: 2,
            additionalInformation: codePipeline.GlobalVariables.executionId
        });

        const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        });
        codeBuildRole.addToPolicy(
            new iam.PolicyStatement(getEcrBuildImagePolicy(`arn:aws:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/*`)),
        );

        const imageBuild = new codeBuild.PipelineProject(
            this,
            'PipelineProject',
            {
                projectName: 'ImageBuilderECR',
                buildSpec: codeBuild.BuildSpec.fromSourceFilename(
                    './buildspec/buildspec-deploy.yml'
                ),
                role: codeBuildRole,
                vpc: ec2.Vpc.fromLookup(this, 'VPC', { vpcId }),
                logging: {
                    cloudWatch: {
                        enabled: true,
                        logGroup: new logs.LogGroup(this, 'LogGroup', {
                            removalPolicy: cdk.RemovalPolicy.DESTROY,
                        }),
                    },
                },
                environment: {
                    buildImage: codeBuild.LinuxBuildImage.STANDARD_2_0,
                    privileged: true,
                    computeType: codeBuild.ComputeType.SMALL,
                    environmentVariables: {
                        AWS_DEFAULT_REGION: {
                            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
                            value: this.region,
                        },
                        AWS_ACCOUNT_ID: {
                            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
                            value: this.account,
                        },
                        IMAGE_REPO_NAME: {
                            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
                            value: imageRepoName,
                        },
                        IMAGE_TAG: {
                            type: codeBuild.BuildEnvironmentVariableType.PLAINTEXT,
                            value: imageRepoTag,
                        },
                    },
                },
            },
        );

        const imageBuildAction = new actions.CodeBuildAction({
            actionName: 'ImageBuildAction',
            project: imageBuild,
            input: src,
            runOrder: 3,
        });

        const pipeline = new codePipeline.Pipeline(this, 'Pipeline', {
        });
        pipeline.addStage({
            stageName: 'GitHubSource-stage',
            actions: [sourceAction],
        });
        pipeline.addStage({
            stageName: 'ImageBuild-stage',
            actions: [approvalAction, imageBuildAction]
        });

    }
}

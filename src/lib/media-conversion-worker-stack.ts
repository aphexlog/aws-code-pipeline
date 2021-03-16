import * as cdk from '@aws-cdk/core';
import { Rule } from '@aws-cdk/aws-events';
import { BatchJob } from '@aws-cdk/aws-events-targets';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ecr from '@aws-cdk/aws-ecr';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as batch from '@aws-cdk/aws-batch';
import * as iam from '@aws-cdk/aws-iam';

import { IMediaConversionWorkerProps } from './types'

export class MediaConversionWorkerStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: IMediaConversionWorkerProps) {
        const {
            vpc_id: vpcId,
        } = props
        super(scope, id, props);

        // Input S3 Bucket
        const input = new s3.Bucket(this, 'callRecordingsQueue', {
            publicReadAccess: true
        });

        // Output S3 Bucket
        const output = new s3.Bucket(this, 'callRecordingsProcessed', {
            publicReadAccess: true
        });

        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId })

        // Grab VPC.
        const subnets = vpc.selectSubnets().subnetIds;

        // AWS logging
        const logging = batch.LogDriver.AWSLOGS;

        // AWS Service Role
        const batchrole = new iam.Role(this, "MediaConversionBatchRole", {
            assumedBy: new iam.ServicePrincipal('batch.amazonaws.com'),
            roleName: cdk.Aws.STACK_NAME + '-ServiceRole'
        });
        batchrole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBatchServiceRole'));

        // AWS Execution Role
        const ecsrole = new iam.Role(this, "MediaConversionECSRole", {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            roleName: cdk.Aws.STACK_NAME + '-ExecutionRole'
        });
        ecsrole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'));

        // Create a Securtity Group for Service.
        const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc,
            description: 'Allow inbound connections from me',
            allowAllOutbound: true,
            securityGroupName: cdk.Aws.STACK_NAME + '-SecurityGroup'
        });

        // AWS Batch Compute Environment
        const computeEnvironment = new batch.ComputeEnvironment(this, "ComputeEnvironment", {
            managed: true,
            enabled: true,
            serviceRole: batchrole,
            computeEnvironmentName: cdk.Aws.STACK_NAME + "-FargateCE",
            computeResources: {
                maxvCpus: 2,
                vpc,
                vpcSubnets: vpc.selectSubnets(),
                type: batch.ComputeResourceType.ON_DEMAND,
                securityGroups: [securityGroup],
            }
        });

        // TODO: Namespace this and export it to be shared - keep DRY
        const image = ecs.ContainerImage.fromEcrRepository(
            ecr.Repository.fromRepositoryAttributes(this, 'EcrRepository', {
                repositoryArn: `arn:aws:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/test-repo`,
                repositoryName: `test-repo`
            }));

        // AWS Batch Job Definition
        const jobDefinition = new batch.JobDefinition(this, 'JobDefinition', {
            container: {
                image,
                jobRole: ecsrole,
                logConfiguration: {
                    logDriver: logging,
                },
                instanceType: ec2.InstanceType.of(ec2.InstanceClass.C4, ec2.InstanceSize.XLARGE),
                vcpus: 0.25,
                memoryLimitMiB: 512
            },
            jobDefinitionName: cdk.Aws.STACK_NAME + "-JobDefinition"
        });

        const jobQueue = new batch.JobQueue(this, 'testQueue', {
            computeEnvironments: [{
                order: 0,
                computeEnvironment,
            }]
        })

        new BatchJob(jobQueue, jobDefinition)

        new Rule(this, 'Rule', {})

    }
}
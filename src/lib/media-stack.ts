import * as cdk from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecr from '@aws-cdk/aws-ecr';
import * as iam from '@aws-cdk/aws-iam';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { IMediaProps } from './types';

import { getTaskRolePolicy } from './helpers/policyHelpers';

export class MediaStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: IMediaProps) {
        const {
            vpc_id: vpcId,
        } = props;

        super(scope, id, props);

        const image = ecs.ContainerImage.fromEcrRepository(
            ecr.Repository.fromRepositoryAttributes(this, 'EcrRepository', {
                repositoryArn: `arn:aws:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/test-repo`,
                repositoryName: `test-repo`
            }));

        // AWS log driver
        const logging = new ecs.AwsLogDriver({
            streamPrefix: cdk.Aws.STACK_NAME
        });

        const vpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId })
        // Create Cluster.
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc, containerInsights: true, clusterName: cdk.Aws.STACK_NAME });
        const autoScalingGroup = cluster.addCapacity('AutoScalingGroup', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            autoScalingGroupName: cdk.Aws.STACK_NAME + '-ASG',
            minCapacity: 1,
            maxCapacity: 2,
            desiredCapacity: 1,
            vpcSubnets: vpc.selectSubnets(),
            // vpcSubnets: vpc.selectSubnets['subnet-0a654e1cad5949b11'],
            associatePublicIpAddress: false,
            canContainersAccessInstanceRole: true,
        });
        autoScalingGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        // Create Task Definition.
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            family: 'AsteriskMedia',
        });
        const asteriskContainer = taskDefinition.addContainer('AsteriskContainer', {
            image,
            logging,
            memoryLimitMiB: 512,
            essential: true,
            // hostname: 'Asterisk', // I think we needed to get rid of this?
        });
        asteriskContainer.addPortMappings({
            containerPort: 5060,
            hostPort: 5060,
            protocol: ecs.Protocol.UDP,
        });
        taskDefinition.addToTaskRolePolicy(
            new iam.PolicyStatement(getTaskRolePolicy(taskDefinition.taskDefinitionArn))
        );

        // Create Service
        const service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            assignPublicIp: false,
            serviceName: 'MediaService',
            desiredCount: 1,
        });
        service.autoScaleTaskCount({ maxCapacity: 2, minCapacity: 1 })
            .scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent: 60,
                policyName: cdk.Aws.STACK_NAME + '-AsgPolicy',
            });
        service.node.addDependency(cluster, taskDefinition);

    }
}

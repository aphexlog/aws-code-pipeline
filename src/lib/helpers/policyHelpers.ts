import * as ecs from '@aws-cdk/aws-ecs';
import * as iam from '@aws-cdk/aws-iam';


export const getEcrBuildImagePolicy = (
    ecrRepositoryArn: string
): iam.PolicyStatementProps => {
    return {
        effect: iam.Effect.ALLOW,
        resources: [ecrRepositoryArn],
        actions: [
            'ecr:PutLifecyclePolicy',
            'ecr:PutImageTagMutability',
            'ecr:StartImageScan',
            'ecr:CreateRepository',
            'ecr:PutImageScanningConfiguration',
            'ecr:UploadLayerPart',
            'ecr:BatchDeleteImage',
            'ecr:DeleteLifecyclePolicy',
            'ecr:DeleteRepository',
            'ecr:PutImage',
            'ecr:CompleteLayerUpload',
            'ecr:StartLifecyclePolicyPreview',
            'ecr:InitiateLayerUpload',
            'ecr:DeleteRepositoryPolicy',
            'ecr:ReplicateImage',
            'ecr:GetAuthorizationToken',
        ]
    }
};

export const getTaskRolePolicy = (
    taskDefinitionArn: string
): iam.PolicyStatementProps => {
    return {
        effect: iam.Effect.ALLOW,
        resources: [taskDefinitionArn],
        actions: [
            'ecs:DescribeTasks',
        ]
    }
}

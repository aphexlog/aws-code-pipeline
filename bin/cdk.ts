#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MediaStack, CodePipelineStack, MediaConversionWorkerStack } from '../src';
import * as config from '../src/lib/config/dev.json';


const app = new cdk.App();

function App(
    account = config.aws.accountId,
    region = config.aws.region) {

    new CodePipelineStack(app, 'fs-container-image-pipeline',
        {
            description: 'Deploys a code pipeline stack used for building container images and pushing it to ECR',
            analyticsReporting: true,
            env: {
                account,
                region,
            },
            git_repo: config.github.repo,
            git_branch: config.github.branch,
            git_owner: config.github.owner,
            image_repo_name: config.aws.image_repo_name,
            image_repo_tag: config.aws.image_repo_tag,
            vpc_id: config.aws.vpc_id,
        });

    new MediaStack(app, 'fs-asterisk-media', {
        description: 'Deploys a container from an ECR image repository into an ECS Cluster',
        analyticsReporting: true,
        env: {
            account,
            region,
        },
        vpc_id: config.aws.vpc_id,
    });

    // new MediaConversionWorkerStack(app, 'MediaConversionWorkerStack', {
    //     env: {
    //         account,
    //         region,
    //     },
    //     vpc_id: config.aws.vpc_id,
    // });
}

App();
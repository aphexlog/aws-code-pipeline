import { StackProps } from '@aws-cdk/core';

export type ITags = [key: 'managedBy',
  value: 'cloudformation'][] |
  [key: 'environment',
    value: 'dev' | 'test' | 'prod'][]

export interface IPipelineProps extends StackProps {
  git_repo: string,
  git_owner: string,
  git_branch: string,
  image_repo_name: string,
  image_repo_tag: string,
  vpc_id: string,
}

export interface IMediaProps extends StackProps {
  vpc_id: string,
  // test?: IPipelineProps,
}

export interface IMediaConversionWorkerProps extends StackProps {
  vpc_id: string,
}

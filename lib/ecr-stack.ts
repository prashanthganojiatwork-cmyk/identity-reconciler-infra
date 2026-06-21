import * as cdk from 'aws-cdk-lib/core';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, 'IdentityReconcilerRepo', {
      repositoryName: 'identity-reconciler',
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Lifecycle rule: keep only the last 5 images
    this.repository.addLifecycleRule({
      maxImageCount: 5,
      description: 'Keep only the last 5 images (free tier optimization)',
    });

    // Output the repository URI
    new cdk.CfnOutput(this, 'RepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: 'IdentityReconcilerRepoUri',
    });

    new cdk.CfnOutput(this, 'RepositoryArn', {
      value: this.repository.repositoryArn,
      description: 'ECR Repository ARN',
      exportName: 'IdentityReconcilerRepoArn',
    });
  }
}

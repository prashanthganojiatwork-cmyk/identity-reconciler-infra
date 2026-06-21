#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { EcrStack } from '../lib/ecr-stack';
import { NetworkingStack } from '../lib/networking-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '097853039310',
  region: 'ap-south-2',
};

// Stack 1: ECR Repository
const ecrStack = new EcrStack(app, 'IdentityReconcilerEcrStack', { env });

// Stack 2: Networking (VPC, Security Group, Elastic IP)
const networkingStack = new NetworkingStack(app, 'IdentityReconcilerNetworkingStack', { env });

// Stack 3: ECS (Cluster, Task Definition, Service)
const ecsStack = new EcsStack(app, 'IdentityReconcilerEcsStack', {
  env,
  vpc: networkingStack.vpc,
  securityGroup: networkingStack.securityGroup,
  elasticIp: networkingStack.elasticIp,
  repository: ecrStack.repository,
});

// Explicit dependency ordering
ecsStack.addDependency(networkingStack);
ecsStack.addDependency(ecrStack);

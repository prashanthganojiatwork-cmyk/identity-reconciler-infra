import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import { Construct } from 'constructs';

export interface EcsStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  elasticIp: ec2.CfnEIP;
  repository: ecr.Repository;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { vpc, securityGroup, elasticIp, repository } = props;

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'ReconcilerCluster', {
      clusterName: 'identity-reconciler-cluster',
      vpc,
    });

    // Create Auto Scaling Group for EC2 capacity (t3.micro for free tier)
    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'ReconcilerASG', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      securityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
      minCapacity: 1,
      maxCapacity: 1,
      // Require IMDSv2 for security
      requireImdsv2: true,
    });

    // Grant SSM access for debugging (Session Manager)
    autoScalingGroup.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Associate Elastic IP using IMDSv2-compatible user data
    autoScalingGroup.addUserData(
      '#!/bin/bash',
      'TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")',
      'INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)',
      `ALLOCATION_ID=${elasticIp.attrAllocationId}`,
      'aws ec2 associate-address --instance-id $INSTANCE_ID --allocation-id $ALLOCATION_ID --region ap-south-2'
    );

    // Grant the ASG instances permission to associate Elastic IP
    autoScalingGroup.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ec2:AssociateAddress'],
      resources: ['*'],
    }));

    // Add EC2 capacity provider
    const capacityProvider = new ecs.AsgCapacityProvider(this, 'ReconcilerCapacityProvider', {
      autoScalingGroup,
      capacityProviderName: 'reconciler-ec2-capacity',
      enableManagedTerminationProtection: false,
    });
    cluster.addAsgCapacityProvider(capacityProvider);

    // Create CloudWatch log group
    const logGroup = new logs.LogGroup(this, 'ReconcilerLogGroup', {
      logGroupName: '/ecs/identity-reconciler',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create ECS Task Definition
    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'ReconcilerTaskDef', {
      family: 'identity-reconciler',
      networkMode: ecs.NetworkMode.BRIDGE,
    });

    // Add container to task definition
    const container = taskDefinition.addContainer('identity-reconciler', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 450,
      cpu: 256,
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: 'ecs',
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8080/ui/input || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Port mapping
    container.addPortMappings({
      containerPort: 8080,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    // Create ECS Service
    const service = new ecs.Ec2Service(this, 'ReconcilerService', {
      cluster,
      taskDefinition,
      serviceName: 'identity-reconciler-service',
      desiredCount: 1,
      capacityProviderStrategies: [
        {
          capacityProvider: capacityProvider.capacityProviderName,
          weight: 1,
        },
      ],
      circuitBreaker: { enable: true, rollback: true },
      minHealthyPercent: 0,
      maxHealthyPercent: 100,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'StableEndpoint', {
      value: `http://${elasticIp.ref}:8080`,
      description: 'Stable public endpoint for the service',
    });
  }
}

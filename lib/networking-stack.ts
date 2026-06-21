import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class NetworkingStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly elasticIp: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a simple VPC with 1 public subnet (free tier friendly)
    // Specify availabilityZones explicitly to avoid AWS context lookups
    this.vpc = new ec2.Vpc(this, 'ReconcilerVpc', {
      vpcName: 'identity-reconciler-vpc',
      availabilityZones: ['ap-south-2a'],
      natGateways: 0, // No NAT gateway to stay free tier
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Create security group
    this.securityGroup = new ec2.SecurityGroup(this, 'ReconcilerSG', {
      vpc: this.vpc,
      securityGroupName: 'identity-reconciler-sg',
      description: 'Security group for Identity Reconciler ECS service',
      allowAllOutbound: true,
    });

    // Allow inbound TCP on port 8080 from anywhere
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8080),
      'Allow inbound HTTP on port 8080'
    );

    // Create Elastic IP for stable public address
    this.elasticIp = new ec2.CfnEIP(this, 'ReconcilerEIP', {
      tags: [{ key: 'Name', value: 'identity-reconciler-eip' }],
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'ReconcilerVpcId',
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: 'Security Group ID',
      exportName: 'ReconcilerSecurityGroupId',
    });

    new cdk.CfnOutput(this, 'ElasticIpAllocationId', {
      value: this.elasticIp.attrAllocationId,
      description: 'Elastic IP Allocation ID',
      exportName: 'ReconcilerElasticIpAllocationId',
    });

    new cdk.CfnOutput(this, 'ElasticIpAddress', {
      value: this.elasticIp.ref,
      description: 'Elastic IP Public Address',
      exportName: 'ReconcilerElasticIpAddress',
    });
  }
}

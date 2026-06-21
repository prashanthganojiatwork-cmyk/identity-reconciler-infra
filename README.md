# Identity Reconciler — Infrastructure (AWS CDK)

AWS CDK infrastructure for deploying the Identity Reconciler service on AWS ECS (EC2 launch type, free tier eligible).

## Overview

| Property | Value |
|----------|-------|
| **AWS Region** | ap-south-2 (Hyderabad) |
| **AWS Account** | 097853039310 |
| **Compute** | ECS on EC2 (t2.micro, free tier) |
| **Container Registry** | ECR (`097853039310.dkr.ecr.ap-south-2.amazonaws.com/identity-reconciler`) |
| **Networking** | Elastic IP for stable public endpoint |
| **Container Port** | 8080 |
| **Stable URL** | `http://<Elastic-IP>:8080` (assigned after deployment) |

## CDK Stacks

This project defines three CDK stacks deployed in order:

### 1. `IdentityReconcilerEcrStack`
- ECR repository `identity-reconciler`
- Image scanning on push enabled
- Lifecycle rule: keep last 5 images

### 2. `IdentityReconcilerNetworkingStack`
- VPC with 1 public subnet (no NAT gateway — free tier friendly)
- Security group allowing inbound TCP 8080 from anywhere
- Elastic IP for stable public address

### 3. `IdentityReconcilerEcsStack`
- ECS cluster with EC2 capacity provider (t2.micro)
- Task definition: 450 MB memory, 256 CPU units, port 8080
- Health check on `/ui/input`
- CloudWatch log driver (`/ecs/identity-reconciler`)
- ECS service with desired count = 1
- Elastic IP auto-associated with the EC2 instance on startup

## Prerequisites

- Node.js >= 18
- AWS CDK CLI: `npm install -g aws-cdk`
- AWS credentials configured for account `097853039310` in region `ap-south-2`

## Usage

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Synthesize CloudFormation templates (validates without deploying)
npx cdk synth

# View changes before deploying
npx cdk diff

# Deploy all stacks
npx cdk deploy --all

# Deploy a specific stack
npx cdk deploy IdentityReconcilerNetworkingStack

# Destroy all stacks (removes resources)
npx cdk destroy --all
```

## Configuration Details

### ECS Task Definition
- **Family:** identity-reconciler
- **Launch Type:** EC2 (free tier eligible)
- **CPU:** 256 units
- **Memory:** 450 MB
- **Port:** 8080 (host and container)
- **Logging:** CloudWatch Logs (`/ecs/identity-reconciler`)
- **Health Check:** curl to `/ui/input`
- **JVM:** `-Xmx384m`

### Networking
- **VPC:** 1 public subnet, no NAT gateway
- **Security Group:** inbound TCP 8080 from 0.0.0.0/0, all outbound allowed
- **Elastic IP:** associated with ECS EC2 instance for stable endpoint

## Notes

- This is a free tier deployment. The t2.micro instance provides 1 vCPU and 1 GB RAM.
- Container memory is limited to 450 MB to leave room for the ECS agent and OS overhead.
- JVM is configured with `-Xmx384m` to fit within the container memory limit.
- Container Insights is disabled to avoid additional costs.
- No NAT gateway is provisioned (saves ~$30/month).

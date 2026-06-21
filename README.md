# Identity Reconciler — Infrastructure

AWS infrastructure configuration for the Identity Reconciler service.

## Overview

This repository contains the infrastructure-as-code for deploying the Identity Reconciler service on AWS ECS.

## Architecture

- **AWS Region:** ap-south-2 (Hyderabad)
- **AWS Account:** 097853039310
- **Compute:** ECS on EC2 (free tier)
- **Container Registry:** ECR (`097853039310.dkr.ecr.ap-south-2.amazonaws.com/identity-reconciler`)
- **Networking:** Elastic IP for stable public endpoint

## Structure

```
├── ecs/           # ECS task definitions and service config
├── networking/    # VPC, security groups, Elastic IP
└── ecr/           # ECR repository setup
```

## Deployment

Infrastructure is managed via Terraform (or CloudFormation). See individual directories for setup instructions.

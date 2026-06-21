# Identity Reconciler — Infrastructure

AWS infrastructure configuration for the Identity Reconciler service.

## Overview

This repository contains the infrastructure-as-code for deploying the Identity Reconciler service on AWS ECS (EC2 launch type, free tier eligible).

## Architecture

- **AWS Region:** ap-south-2 (Hyderabad)
- **AWS Account:** 097853039310
- **Compute:** ECS on EC2 (t2.micro, free tier)
- **Container Registry:** ECR (`097853039310.dkr.ecr.ap-south-2.amazonaws.com/identity-reconciler`)
- **Networking:** Elastic IP for stable public endpoint
- **Container Port:** 8080

## Structure

```
├── ecs/
│   ├── task-definition.json   # ECS task definition (EC2 compatible)
│   ├── cluster.json           # ECS cluster configuration
│   └── service.json           # ECS service definition (desired count = 1)
├── ecr/
│   └── repository.json        # ECR repository definition with lifecycle policy
└── README.md
```

## Configuration Details

### ECS Task Definition
- **Family:** identity-reconciler
- **Launch Type:** EC2 (free tier eligible, not Fargate)
- **CPU:** 256 units
- **Memory:** 450 MB
- **Port:** 8080 (host and container)
- **Logging:** CloudWatch Logs via awslogs driver (`/ecs/identity-reconciler`)
- **Health Check:** curl to `/actuator/health`

### ECS Cluster
- **Cluster Name:** identity-reconciler-cluster
- **Instance Type:** t2.micro (free tier)
- **Desired Capacity:** 1

### ECS Service
- **Service Name:** identity-reconciler-service
- **Desired Count:** 1
- **Scheduling Strategy:** REPLICA
- **Deployment:** minimumHealthyPercent=0, maximumPercent=100 (rolling deploy on single instance)

### ECR Repository
- **Repository:** identity-reconciler
- **Image URI:** `097853039310.dkr.ecr.ap-south-2.amazonaws.com/identity-reconciler`
- **Scan on Push:** enabled
- **Lifecycle Policy:** keep last 5 images (free tier storage optimization)

## Usage

These JSON configuration files are reference definitions used by the CI/CD pipeline (GitHub Actions) to register/update ECS tasks and services. They can also be used with the AWS CLI:

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs/task-definition.json --region ap-south-2

# Create cluster
aws ecs create-cluster --cluster-name identity-reconciler-cluster --region ap-south-2

# Create service
aws ecs create-service --cli-input-json file://ecs/service.json --region ap-south-2

# Create ECR repository
aws ecr create-repository --repository-name identity-reconciler --region ap-south-2
```

## Notes

- This is a free tier deployment. The t2.micro instance provides 1 vCPU and 1 GB RAM.
- Container memory is limited to 450 MB to leave room for the ECS agent and OS overhead.
- JVM is configured with `-Xmx384m` to fit within the container memory limit.
- Container Insights is disabled to avoid additional costs.

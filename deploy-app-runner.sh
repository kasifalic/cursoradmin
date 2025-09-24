#!/bin/bash

# 🚀 AWS App Runner Deployment Script for Amagi Cursor Analytics
# This script deploys using Docker containers to AWS App Runner

set -e

echo "🚀 Deploying Amagi Cursor Analytics to AWS App Runner"

# Configuration
APP_NAME="amagi-cursor-analytics"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $APP_NAME .

# Create ECR repository
echo "🏗️ Creating ECR repository..."
aws ecr create-repository --repository-name $APP_NAME --region $AWS_REGION || true

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Tag and push image
echo "📤 Pushing image to ECR..."
docker tag $APP_NAME:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Create App Runner service
echo "🏃 Creating App Runner service..."
cat > apprunner-service.json << EOF
{
    "ServiceName": "$APP_NAME",
    "SourceConfiguration": {
        "ImageRepository": {
            "ImageIdentifier": "$ECR_REPO:latest",
            "ImageConfiguration": {
                "Port": "3000",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production",
                    "CURSOR_ADMIN_API_KEY": "cursor_04ec0590d197d6bfe2c93289a97aec043e56bbc32da3a5dcda2481d2c1a1231e"
                }
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": false
    },
    "InstanceConfiguration": {
        "Cpu": "0.25 vCPU",
        "Memory": "0.5 GB"
    }
}
EOF

aws apprunner create-service --cli-input-json file://apprunner-service.json --region $AWS_REGION

echo "✅ App Runner service created successfully!"
echo "🌐 Check the AWS App Runner Console for your service URL:"
echo "   https://console.aws.amazon.com/apprunner/home?region=$AWS_REGION#/services"

# Clean up
rm -f apprunner-service.json

echo ""
echo "🎉 Deployment complete!"
echo "Your Cursor Analytics Dashboard will be available at the App Runner URL in ~5-10 minutes."

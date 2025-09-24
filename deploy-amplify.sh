#!/bin/bash

# 🚀 AWS Amplify Deployment Script for Amagi Cursor Analytics
# This script helps you deploy via AWS CLI (requires AWS CLI installation)

set -e

echo "🚀 Deploying Amagi Cursor Analytics to AWS Amplify"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
    echo "   unzip awscliv2.zip"
    echo "   sudo ./aws/install"
    echo "   rm -rf aws awscliv2.zip"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run:"
    echo "   aws configure"
    echo "   # Enter your AWS Access Key ID, Secret Access Key, and region"
    exit 1
fi

# Build the application
echo "🔨 Building production application..."
npm run build

# Create Amplify app
echo "🏗️ Creating Amplify application..."

APP_NAME="amagi-cursor-analytics"
GITHUB_REPO="https://github.com/YOUR_USERNAME/cursor-admin-analytics"

# Create the app
aws amplify create-app \
    --name "$APP_NAME" \
    --description "Amagi Cursor Analytics Dashboard" \
    --repository "$GITHUB_REPO" \
    --platform WEB \
    --iam-service-role-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/amplifyconsole-backend-role" \
    --environment-variables CURSOR_ADMIN_API_KEY=cursor_04ec0590d197d6bfe2c93289a97aec043e56bbc32da3a5dcda2481d2c1a1231e,NODE_ENV=production

echo "✅ Amplify app created successfully!"
echo "🌐 Visit AWS Amplify Console to complete the setup:"
echo "   https://console.aws.amazon.com/amplify/home"

echo ""
echo "🎉 Next steps:"
echo "1. Go to Amplify Console"
echo "2. Connect your GitHub repository"
echo "3. Your app will auto-deploy!"

# 🚀 AWS Deployment Guide - Amagi Cursor Analytics

## 🏆 **Recommended: AWS Amplify** (Fastest & Easiest)

### **Why AWS Amplify?**
- ✅ **Zero-config Next.js deployment**
- ✅ **Automatic HTTPS & Global CDN**
- ✅ **Built-in CI/CD from GitHub**
- ✅ **Environment variable management**
- ✅ **Auto-scaling & high availability**
- ✅ **Cost-effective (~$5-15/month)**

### **Step-by-Step Deployment:**

#### **1. Prepare Your Repository**
```bash
# Ensure your code is in GitHub
git add .
git commit -m "Ready for AWS Amplify deployment"
git push origin main
```

#### **2. Deploy to AWS Amplify**
1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Click "New app" → "Host web app"**
3. **Connect GitHub**: Select your repository
4. **Configure build settings**: 
   - Build command: `npm run build`
   - Output directory: `.next`
   - Node version: `18`
5. **Add Environment Variables**:
   ```
   CURSOR_ADMIN_API_KEY=cursor_04ec0590d197d6bfe2c93289a97aec043e56bbc32da3a5dcda2481d2c1a1231e
   NODE_ENV=production
   ```
6. **Deploy**: Click "Save and Deploy"

#### **3. Custom Domain (Optional)**
- Add your custom domain in Amplify console
- Automatic SSL certificate provisioning
- DNS configuration assistance

### **Expected Costs:**
- **Free Tier**: First 1000 build minutes free
- **Hosting**: ~$1-5/month for typical usage
- **Bandwidth**: ~$0.15/GB (first 15GB free)
- **Total**: ~$5-15/month

---

## 🐳 **Alternative: AWS App Runner** (Container-based)

### **When to Use:**
- Need more control over the runtime environment
- Want containerized deployment
- Require custom configurations

### **Deployment Steps:**

#### **1. Build and Test Docker Image**
```bash
# Build locally first
docker build -t amagi-cursor-analytics .

# Test locally
docker run -p 3000:3000 \
  -e CURSOR_ADMIN_API_KEY=your_key_here \
  -e NODE_ENV=production \
  amagi-cursor-analytics
```

#### **2. Push to Amazon ECR**
```bash
# Create ECR repository
aws ecr create-repository --repository-name amagi-cursor-analytics

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag amagi-cursor-analytics:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/amagi-cursor-analytics:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/amagi-cursor-analytics:latest
```

#### **3. Create App Runner Service**
1. **Go to AWS App Runner Console**
2. **Create service**:
   - Source: Container registry (ECR)
   - Image: Your pushed image
   - Port: 3000
3. **Configure**:
   - CPU: 0.25 vCPU, 0.5 GB RAM (start small)
   - Environment variables: Add your API key
4. **Deploy**

### **Expected Costs:**
- **Compute**: ~$7-20/month (0.25 vCPU)
- **Requests**: $0.40 per 1M requests
- **Total**: ~$10-25/month

---

## 🏢 **Enterprise: ECS Fargate** (Full Control)

### **When to Use:**
- Enterprise deployment requirements
- Need VPC isolation
- Custom networking requirements
- Load balancing needs

### **Quick Setup:**
```bash
# Use AWS CLI or CloudFormation
aws ecs create-cluster --cluster-name amagi-cursor-analytics

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster amagi-cursor-analytics --service-name cursor-analytics --task-definition cursor-analytics:1
```

### **Expected Costs:**
- **Fargate**: ~$15-50/month depending on resources
- **Load Balancer**: ~$16/month
- **Total**: ~$30-70/month

---

## 🔧 **Pre-Deployment Checklist**

### **✅ Code Changes Made:**
- [x] Restored proper mounted state check for production
- [x] Created optimized Dockerfile
- [x] Added .dockerignore for smaller builds
- [x] Created amplify.yml for AWS Amplify

### **✅ Environment Variables Needed:**
```bash
CURSOR_ADMIN_API_KEY=cursor_04ec0590d197d6bfe2c93289a97aec043e56bbc32da3a5dcda2481d2c1a1231e
NODE_ENV=production
```

### **✅ Build Test:**
```bash
# Test production build locally
npm run build
npm start

# Test Docker build
docker build -t test-build .
docker run -p 3000:3000 -e CURSOR_ADMIN_API_KEY=your_key test-build
```

---

## 🎯 **Recommendation**

**For Amagi's use case, I recommend AWS Amplify because:**

1. **Simplicity**: Deploy in 5 minutes with zero configuration
2. **Cost**: Most cost-effective for internal tools
3. **Performance**: Global CDN and automatic optimization
4. **Maintenance**: Zero server management required
5. **Security**: Built-in HTTPS and security headers
6. **Scalability**: Auto-scales with your team growth

---

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Build Fails**: 
   - Check Node.js version (use 18.x)
   - Verify environment variables are set

2. **API Errors**:
   - Ensure CURSOR_ADMIN_API_KEY is correctly set
   - Check API key has proper permissions

3. **Performance Issues**:
   - Enable compression (automatic in Amplify)
   - Use CDN (automatic in Amplify)

### **Support:**
- AWS Documentation: https://docs.aws.amazon.com/amplify/
- Internal: Contact Amagi Engineering Team

---

## 🚀 **Ready to Deploy?**

**Choose AWS Amplify** and follow the steps above. Your dashboard will be live in under 10 minutes!

After deployment, test:
1. Dashboard loads correctly
2. All metrics populate
3. Dark mode works
4. CSV export functions
5. Mobile responsiveness

**🎉 Your team will have a production-ready Cursor analytics dashboard!**


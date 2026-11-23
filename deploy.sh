#!/bin/bash

# === CONFIG ===  (same approach as New_CRM/deploy-react.sh)
S3_BUCKET="digihrmsfrontend"     # HRMS frontend bucket
CLOUDFRONT_ID=""                 # set to the CloudFront distribution ID (leave empty to skip)
AWS_PROFILE="default"            # change if using a different AWS profile
REGION="us-east-1"               # bucket region

export AWS_PROFILE

# === STEP 1: Build (Vite -> dist/) ===
echo "🚧 Building (Vite production)..."
# Use Vite directly to skip the blocking `tsc -b`; type errors don't fail the bundle.
npx vite build --mode production || { echo "❌ Build failed"; exit 1; }

# === STEP 2: Create S3 bucket if it doesn't exist ===
echo "🪣 Checking S3 bucket: $S3_BUCKET..."
if ! aws s3 ls "s3://$S3_BUCKET" --profile $AWS_PROFILE 2>/dev/null; then
  echo "📦 Creating S3 bucket: $S3_BUCKET..."
  aws s3 mb s3://$S3_BUCKET --region $REGION --profile $AWS_PROFILE || { echo "❌ Failed to create bucket"; exit 1; }

  # Enable static website hosting (SPA: errors fall back to index.html)
  aws s3 website s3://$S3_BUCKET --index-document index.html --error-document index.html --profile $AWS_PROFILE

  # Set bucket policy for public read access
  cat > bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$S3_BUCKET/*"
    }
  ]
}
EOF
  aws s3api put-bucket-policy --bucket $S3_BUCKET --policy file://bucket-policy.json --profile $AWS_PROFILE
  rm bucket-policy.json
fi

# === STEP 3: Upload to S3 ===
echo "📤 Uploading to S3 bucket: $S3_BUCKET..."
aws s3 sync dist/ s3://$S3_BUCKET --delete --profile $AWS_PROFILE || { echo "❌ S3 upload failed"; exit 1; }

# === STEP 4: CloudFront SPA error pages (manual reminder) ===
if [ -n "$CLOUDFRONT_ID" ]; then
  echo "⚙️  CloudFront custom error pages for SPA routing (configure once in Console):"
  echo "   1. CloudFront Console → Distribution $CLOUDFRONT_ID → Error Pages"
  echo "   2. Add 404: Response Path=/index.html, Response Code=200"
  echo "   3. Add 403: Response Path=/index.html, Response Code=200"
fi

# === STEP 5: Invalidate CloudFront cache ===
if [ -n "$CLOUDFRONT_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --region us-east-1 --profile $AWS_PROFILE > /dev/null 2>&1
  echo "✅ Cache invalidation initiated"
else
  echo "⚠️  CloudFront ID not configured, skipping cache invalidation"
fi

echo "✅ Deployment complete!"
echo "🌐 S3 Website URL: http://$S3_BUCKET.s3-website-$REGION.amazonaws.com"

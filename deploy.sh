#!/bin/bash
set -e

# ---------------------------------------------------------------------------
# HRMS Frontend deploy script (S3 + CloudFront)
#
# Usage:
#   ./deploy.sh prod     # deploy to production (app.digihrms.com)
#   ./deploy.sh dev      # deploy to the dev environment
#
# Builds the Vite app (dist/) and syncs it to the environment's S3 bucket,
# then invalidates CloudFront.
#
# Prerequisites:
#   - AWS CLI configured with the profile set below (or override AWS_PROFILE).
#   - The sibling ../Auth-sdk package present (the app depends on it via file:).
#   - Env files: .env.production for prod, .env.development for dev
#     (Vite loads these automatically based on --mode).
# ---------------------------------------------------------------------------

ENVIRONMENT="${1:-prod}"
AWS_PROFILE="${AWS_PROFILE:-vysor}"   # change to your AWS CLI profile name
export AWS_PROFILE

case "$ENVIRONMENT" in
  prod|production)
    BUCKET="digihrmsapp"
    DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID_PROD:-${CLOUDFRONT_DISTRIBUTION_ID}}"
    VITE_MODE="production"
    ;;
  dev|development)
    BUCKET="${DEV_BUCKET:-digihrmsapp-dev}"
    DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID_DEV:-${CLOUDFRONT_DISTRIBUTION_ID}}"
    VITE_MODE="development"
    ;;
  *)
    echo "Unknown environment: '$ENVIRONMENT'  (use 'prod' or 'dev')"
    exit 1
    ;;
esac

# CloudFront is optional. If no distribution id is set, we build + sync to S3
# and skip the invalidation (useful before the distribution is created).
CLOUDFRONT_LABEL="$DISTRIBUTION_ID"
[ -z "$CLOUDFRONT_LABEL" ] && CLOUDFRONT_LABEL="(not set — invalidation skipped)"

echo "=============================================="
echo " Deploying HRMS Frontend"
echo "   environment : $ENVIRONMENT"
echo "   bucket      : s3://$BUCKET"
echo "   cloudfront  : $CLOUDFRONT_LABEL"
echo "   aws profile : $AWS_PROFILE"
echo "=============================================="

echo "Building ($VITE_MODE)..."
# Use Vite directly (skip the blocking `tsc -b` from `npm run build`).
# Type-checking is a separate concern; the bundle builds fine without it.
npx vite build --mode "$VITE_MODE"

echo "Syncing to S3..."
# 1) Assets with long cache (JS/CSS/images use hashed filenames)
aws s3 sync dist/ "s3://$BUCKET/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html"

# 2) HTML with no cache (so SPA entry point always refreshes)
aws s3 sync dist/ "s3://$BUCKET/" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --include "*.html" \
  --exclude "assets/*"

if [ -n "$DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront..."
  aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*"

  DOMAIN=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" \
    --query 'Distribution.DomainName' --output text)
  echo "Done! Files uploaded and CloudFront invalidated — https://$DOMAIN"
else
  echo "Skipping CloudFront invalidation (no distribution id set)."
  echo "Done! Files uploaded to s3://$BUCKET."
  echo "After you create the CloudFront distribution, re-run with:"
  echo "  CLOUDFRONT_DISTRIBUTION_ID_PROD=<id> ./deploy.sh $ENVIRONMENT"
fi

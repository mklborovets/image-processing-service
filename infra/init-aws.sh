#!/bin/bash
set -e

echo "Waiting for Floci to boot..."
until curl -s http://floci:4566/_floci/health > /dev/null; do
  sleep 2
done
echo "Initializing AWS resources in Floci (S3, SQS)..."

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=eu-central-1
ENDPOINT_URL="http://floci:4566"
ALIAS="aws --endpoint-url=$ENDPOINT_URL"

for BUCKET in "images-originals" "images-thumbnails"; do
  echo "Checking bucket: $BUCKET..."
  if ! $ALIAS s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    echo "Creating bucket: $BUCKET"
    $ALIAS s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint=eu-central-1
  fi
done

echo "Setting CORS for images-originals..."
cat <<EOF > /tmp/cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["POST", "GET", "PUT", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": []
    }
  ]
}
EOF
$ALIAS s3api put-bucket-cors --bucket images-originals --cors-configuration file:///tmp/cors.json

echo "Creating DLQ queue..."
DLQ_URL=$($ALIAS sqs create-queue --queue-name images-dlq --output text)
DLQ_ARN=$($ALIAS sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

echo "Creating main queue..."
cat <<EOF > /tmp/redrive.json
{
  "deadLetterTargetArn": "$DLQ_ARN",
  "maxReceiveCount": "3"
}
EOF
QUEUE_URL=$($ALIAS sqs create-queue --queue-name images-queue --attributes RedrivePolicy="'$(cat /tmp/redrive.json)'" --output text)
QUEUE_ARN=$($ALIAS sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

echo "Setting up S3 bucket notifications..."
cat <<EOF > /tmp/notification.json
{
  "QueueConfigurations": [
    {
      "QueueArn": "$QUEUE_ARN",
      "Events": ["s3:ObjectCreated:*"]
    }
  ]
}
EOF
$ALIAS s3api put-bucket-notification-configuration --bucket images-originals --notification-configuration file:///tmp/notification.json

echo "AWS initialization completed successfully!"

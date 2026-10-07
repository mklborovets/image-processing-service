# Antigravity Image Service

A full-stack event-driven image processing application built with NestJS, React, PostgreSQL, and AWS (S3 & SQS).

## Architecture

This project implements an **Event-driven Architecture**:

1. **Frontend (React)** requests a short-lived **Presigned URL** from the Backend.
2. The Frontend uploads the image **directly to AWS S3**, bypassing the Backend server entirely.
3. S3 triggers an event which is sent to an **AWS SQS Queue**.
4. The Backend **Worker** polls the SQS Queue, downloads the original image via Streams, processes it using `sharp` (resizes to 300px width, converts to WebP), and uploads the thumbnail to a separate S3 bucket.
5. The Worker updates the status in the PostgreSQL database from `pending` to `processed`.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- AWS CLI configured (or LocalStack/Floci for local emulation)

### 1. Start Infrastructure

Run PostgreSQL and S3/SQS emulator (Floci) locally:
\`\`\`bash
cd image-processing-service
docker-compose up -d
\`\`\`

Wait for the containers to start. The `init-aws.sh` script will automatically create the S3 buckets and SQS queues inside the emulator.

### 2. Start Backend

\`\`\`bash
cd backend
npm install

# Run database migrations

npx prisma migrate dev

# Start the NestJS server

npm run start:dev
\`\`\`
The Backend will run at http://localhost:3000.
Swagger API Documentation is available at: http://localhost:3000/api/docs

### 3. Start Frontend

In a new terminal window:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
The React app will be available at http://localhost:5173.

## Database Management

You can easily view and manage your PostgreSQL database using Prisma Studio.
In the `backend` directory, run:
\`\`\`bash
npx prisma studio
\`\`\`
It will open a beautiful web interface to view the `Image` table.

## Testing

To run the automated tests on the backend:
\`\`\`bash
cd backend
npm run test # Unit tests
npm run test:e2e # End-to-End tests
\`\`\`

## AWS IAM Policy

For a real AWS environment, the application requires the following minimal IAM policy (replace placeholders with actual ARNs):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::images-originals/*",
        "arn:aws:s3:::images-thumbnails/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:REGION:ACCOUNT_ID:images-queue"
    }
  ]
}
```

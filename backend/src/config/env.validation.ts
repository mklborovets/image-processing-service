import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_ENDPOINT: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  SQS_QUEUE_URL: Joi.string().required(),
  S3_ORIGINALS_BUCKET: Joi.string().required(),
  S3_THUMBNAILS_BUCKET: Joi.string().required(),
});

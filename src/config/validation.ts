import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().positive().default(3000),
  APP_GLOBAL_PREFIX: Joi.string().default('api'),
  DATABASE_URL: Joi.string().uri().required(),
  GEMINI_API_KEY: Joi.string().min(20).required(),
  GEMINI_MODEL: Joi.string().default('models/gemini-1.5-flash'),
  GEMINI_SAFETY_THRESHOLD: Joi.number().min(0).max(1).default(0.6),
  PRISMA_LOG_QUERIES: Joi.boolean().default(false),
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('docs'),
  SWAGGER_TITLE: Joi.string().default('Agentic AI Resume Scanner API'),
  SWAGGER_DESCRIPTION: Joi.string().default(
    'REST API documentation for AI-powered resume analysis workflows.',
  ),
  SWAGGER_VERSION: Joi.string().default('1.0.0'),
});

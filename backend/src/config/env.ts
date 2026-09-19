import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MySQL
  MYSQL_HOST: z.string().min(1, 'MYSQL_HOST is required'),
  MYSQL_PORT: z.string().default('3306').transform(Number),
  MYSQL_USER: z.string().min(1, 'MYSQL_USER is required'),
  MYSQL_PASSWORD: z.string().min(1, 'MYSQL_PASSWORD is required'),
  MYSQL_DATABASE: z.string().min(1, 'MYSQL_DATABASE is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Qdrant
  QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),
  QDRANT_API_KEY: z.string().optional().default(''),
  QDRANT_COLLECTION_NAME: z.string().default('nwis_knowledge'),
  OCR_PROVIDER: z.enum(['pdf-parse', 'tesseract', 'custom']).default('pdf-parse'),
  EMBEDDING_DIMENSION: z.string().default('1536').transform(Number),
  EMBEDDING_MODEL: z.string().default('grok-embedding'),

  // Grok
  GROK_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),

  // Files
  UPLOADS_DIR: z.string().default('./uploads'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`   • ${issue.path.join('.')} — ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

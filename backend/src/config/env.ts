import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Postgres
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('admin@123'),

  // Qdrant
  QDRANT_URL: z.string().url('QDRANT_URL must be a valid URL'),
  QDRANT_API_KEY: z.string().optional().default(''),
  QDRANT_COLLECTION_NAME: z.string().default('nwis_knowledge'),
  OCR_PROVIDER: z.enum(['pdf-parse', 'tesseract', 'custom']).default('pdf-parse'),
  EMBEDDING_DIMENSION: z.string().default('1536').transform(Number),
  EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-001'),

  // Grok
  GROK_API_KEY: z.string().optional().default(''),
  GROK_MODEL: z.string().default('openai/gpt-oss-20b'),
  GROK_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  RAG_RISK_TOP_K: z.string().default('8').transform(Number),
  OPENAI_API_KEY: z.string().optional().default(''),

  // Files
  UPLOADS_DIR: z.string().default('./uploads'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org/search'),

  // Python remains responsible for OCR and optional reranking; risk prediction
  // is performed by the Node RAG + Grok pipeline.
  ML_SERVICE_URL: z.string().url().default('http://localhost:8100'),
  ML_SERVICE_TIMEOUT_MS: z.string().default('5000').transform(Number),

  // Hybrid retrieval (BM25 + vector + RRF fusion + optional reranker)
  HYBRID_TOPK_VECTOR: z.string().default('40').transform(Number),
  HYBRID_TOPK_BM25: z.string().default('40').transform(Number),
  HYBRID_RRF_K: z.string().default('60').transform(Number),
  RERANKER_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),
  HYDE_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v !== 'false'),

  // Depth tolerance (ft) for risk-record dedup and depth correlation.
  DEPTH_TOLERANCE_FT: z.string().default('100').transform(Number),
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

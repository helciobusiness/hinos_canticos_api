import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/hinos_canticos?schema=public'),
  CORS_ORIGIN: z.string().default('*'),
  HINOS_JSON_PATH: z.string().default(path.resolve(process.cwd(), '../hinos_canticos_conversor/output/hinos.json')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração inválida de variáveis de ambiente:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

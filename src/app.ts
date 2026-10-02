import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { hinosRoutes } from './modules/hinos/routes/hinos.routes.js';
import { jsonHinosStore } from './database/json-store.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: 'info' },
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Swagger OpenAPI
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Hinos & Cânticos API',
        description: 'API REST para consulta, pesquisa, leitura e navegação de hinos e cânticos com suporte a diacríticos em português.',
        version: '1.0.0',
        contact: {
          name: 'Hinos & Cânticos',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Ambiente Local',
        },
      ],
      tags: [
        { name: 'Hinos', description: 'Endpoints para listagem, consulta por número, pesquisa e navegação de hinos' },
        { name: 'Saúde', description: 'Endpoints para diagnóstico e estado da aplicação' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Tratamento de erros centralizado
  app.setErrorHandler(errorHandler);

  // Pré-carrega base de hinos em memória
  jsonHinosStore.load();

  // Registro de rotas
  await app.register(healthRoutes);
  await app.register(hinosRoutes);

  return app;
}

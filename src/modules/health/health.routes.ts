import { FastifyInstance } from 'fastify';
import { checkDatabaseConnection } from '../../database/prisma.js';
import { jsonHinosStore } from '../../database/json-store.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/health',
    {
      schema: {
        description: 'Verificação de integridade e status da API e banco de dados',
        tags: ['Saúde'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              timestamp: { type: 'string' },
              database: { type: 'string' },
              hinosDisponiveis: { type: 'integer' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const isPgConnected = await checkDatabaseConnection();
      const count = jsonHinosStore.getCount();

      return reply.status(200).send({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: isPgConnected ? 'postgresql (conectado)' : 'in-memory (json)',
        hinosDisponiveis: count,
        version: '1.0.0',
      });
    }
  );
}

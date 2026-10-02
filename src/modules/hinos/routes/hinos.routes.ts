import { FastifyInstance } from 'fastify';
import { hinosController } from '../controllers/hinos.controller.js';
import {
  swaggerListHinosSchema,
  swaggerGetHinoSchema,
  swaggerSearchHinosSchema,
  swaggerNavHinoSchema,
} from '../schemas/hinos.schema.js';

export async function hinosRoutes(fastify: FastifyInstance) {
  // Lista paginada de hinos
  fastify.get('/api/hinos', { schema: swaggerListHinosSchema }, hinosController.listHinos);

  // Pesquisa de hinos (deve vir antes de /:numero)
  fastify.get('/api/hinos/search', { schema: swaggerSearchHinosSchema }, hinosController.searchHinos);

  // Hino anterior
  fastify.get('/api/hinos/:numero/anterior', { schema: swaggerNavHinoSchema }, hinosController.getAnterior);

  // Hino seguinte
  fastify.get('/api/hinos/:numero/seguinte', { schema: swaggerNavHinoSchema }, hinosController.getSeguinte);

  // Detalhe de um hino específico por número
  fastify.get('/api/hinos/:numero', { schema: swaggerGetHinoSchema }, hinosController.getHino);
}

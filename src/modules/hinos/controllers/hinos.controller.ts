import { FastifyReply, FastifyRequest } from 'fastify';
import { hinosService, HinosService } from '../services/hinos.service.js';
import {
  hinoParamsSchema,
  listHinosQuerySchema,
  searchHinosQuerySchema,
} from '../schemas/hinos.schema.js';

export class HinosController {
  constructor(private readonly service: HinosService = hinosService) {}

  public listHinos = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listHinosQuerySchema.parse(request.query);
    const result = await this.service.listHinos(query.page, query.limit, query.sort);
    return reply.status(200).send(result);
  };

  public getHino = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = hinoParamsSchema.parse(request.params);
    const hino = await this.service.getHinoByNumero(params.numero);

    if (!hino) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Hino número ${params.numero} não encontrado.`,
      });
    }

    return reply.status(200).send(hino);
  };

  public searchHinos = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = searchHinosQuerySchema.parse(request.query);
    const result = await this.service.searchHinos(query.q, query.page, query.limit);
    return reply.status(200).send(result);
  };

  public getAnterior = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = hinoParamsSchema.parse(request.params);
    const anterior = await this.service.getHinoAnterior(params.numero);

    if (!anterior) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Não há hino anterior ao número ${params.numero}.`,
      });
    }

    return reply.status(200).send(anterior);
  };

  public getSeguinte = async (request: FastifyRequest, reply: FastifyReply) => {
    const params = hinoParamsSchema.parse(request.params);
    const seguinte = await this.service.getHinoSeguinte(params.numero);

    if (!seguinte) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Não há hino seguinte ao número ${params.numero}.`,
      });
    }

    return reply.status(200).send(seguinte);
  };
}

export const hinosController = new HinosController();

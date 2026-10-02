import { z } from 'zod';

export const hinoParamsSchema = z.object({
  numero: z.coerce.number().int().positive({ message: 'O número do hino deve ser um inteiro positivo' }),
});

export const listHinosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('asc'),
});

export const searchHinosQuerySchema = z.object({
  q: z.string().min(1, { message: 'Termo de busca é obrigatório' }),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Fastify JSON schemas for Swagger documentation
export const swaggerListHinosSchema = {
  description: 'Lista paginada de hinos ordenados por número',
  tags: ['Hinos'],
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', default: 1, minimum: 1 },
      limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      sort: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
    },
  },
  response: {
    200: {
      description: 'Lista retornada com sucesso',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              numero: { type: 'integer' },
              numeroFormatado: { type: 'string' },
              titulo: { type: 'string' },
              autor: { type: 'string', nullable: true },
              totalEstrofes: { type: 'integer' },
              primeiraEstrofe: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const swaggerGetHinoSchema = {
  description: 'Obtém detalhes completos de um hino pelo número',
  tags: ['Hinos'],
  params: {
    type: 'object',
    required: ['numero'],
    properties: {
      numero: { type: 'integer', description: 'Número do hino (ex: 1, 23, 100)' },
    },
  },
  response: {
    200: {
      description: 'Hino encontrado',
      type: 'object',
      properties: {
        id: { type: 'integer' },
        numero: { type: 'integer' },
        numeroFormatado: { type: 'string' },
        titulo: { type: 'string' },
        autor: { type: 'string', nullable: true },
        letraCompleta: { type: 'string' },
        fonteArquivo: { type: 'string', nullable: true },
        estrofes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              numero: { type: 'integer' },
              tipo: { type: 'string' },
              texto: { type: 'string' },
            },
          },
        },
        anterior: {
          type: 'object',
          nullable: true,
          properties: {
            numero: { type: 'integer' },
            titulo: { type: 'string' },
          },
        },
        seguinte: {
          type: 'object',
          nullable: true,
          properties: {
            numero: { type: 'integer' },
            titulo: { type: 'string' },
          },
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
    404: {
      description: 'Hino não encontrado',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

export const swaggerSearchHinosSchema = {
  description: 'Pesquisa hinos por número, título, autor ou letra com suporte a diacríticos em português',
  tags: ['Hinos'],
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', description: 'Termo de pesquisa (título, autor, número ou trecho da letra)' },
      page: { type: 'integer', default: 1, minimum: 1 },
      limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
    },
  },
  response: {
    200: {
      description: 'Resultados da pesquisa',
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              numero: { type: 'integer' },
              numeroFormatado: { type: 'string' },
              titulo: { type: 'string' },
              autor: { type: 'string', nullable: true },
              totalEstrofes: { type: 'integer' },
              trechoRelevante: { type: 'string' },
              correspondencia: { type: 'string', enum: ['numero', 'titulo', 'autor', 'letra'] },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
      },
    },
  },
};

export const swaggerNavHinoSchema = {
  description: 'Obtém o hino anterior ou seguinte ao número informado',
  tags: ['Hinos'],
  params: {
    type: 'object',
    required: ['numero'],
    properties: {
      numero: { type: 'integer', description: 'Número do hino atual' },
    },
  },
  response: {
    200: {
      description: 'Hino adjacente retornado',
      type: 'object',
      properties: {
        id: { type: 'integer' },
        numero: { type: 'integer' },
        numeroFormatado: { type: 'string' },
        titulo: { type: 'string' },
        autor: { type: 'string', nullable: true },
      },
    },
    404: {
      description: 'Não existe hino anterior/seguinte',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

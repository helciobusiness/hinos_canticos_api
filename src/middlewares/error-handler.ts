import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export function errorHandler(error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) {
  // Tratamento de erros de validação Zod
  if (error instanceof ZodError) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Falha na validação dos parâmetros da requisição.',
      issues: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    });
  }

  // Tratamento de erros de validação do Fastify
  if (
    'validation' in error ||
    ('code' in error && error.code === 'FST_ERR_VALIDATION') ||
    ('statusCode' in error && error.statusCode === 400)
  ) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: error.message || 'Falha na validação dos parâmetros da requisição.',
    });
  }

  // Tratamento de erro 404
  if ('statusCode' in error && error.statusCode === 404) {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: error.message || 'Recurso não encontrado.',
    });
  }

  // Log de erros internos
  console.error('🔥 Erro não tratado na requisição:', error);

  return reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.',
  });
}

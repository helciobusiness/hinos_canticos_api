import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Hinário Digital API Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('deve retornar status 200 e informações de integridade', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.status).toBe('ok');
      expect(typeof json.uptime).toBe('number');
      expect(typeof json.hinosDisponiveis).toBe('number');
      expect(json.version).toBe('1.0.0');
    });
  });

  describe('GET /api/hinos', () => {
    it('deve retornar listagem padrão paginada de hinos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(20);
      expect(json.pagination.total).toBeGreaterThan(0);

      const first = json.data[0];
      expect(first).toHaveProperty('numero');
      expect(first).toHaveProperty('titulo');
      expect(first).toHaveProperty('numeroFormatado');
    });

    it('deve respeitar paginação customizada (?page=2&limit=5)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos?page=2&limit=5',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.pagination.page).toBe(2);
      expect(json.pagination.limit).toBe(5);
      expect(json.data.length).toBe(5);
    });

    it('deve retornar erro 400 para limit inválido (> 100)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos?limit=500',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe('Bad Request');
    });
  });

  describe('GET /api/hinos/:numero', () => {
    it('deve retornar detalhes completos do hino 1 com estrofes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/1',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.numero).toBe(1);
      expect(json.numeroFormatado).toBe('001');
      expect(json.titulo).toBe('A divinal mensagem');
      expect(json.autor).toBe('Stuart Edmund Mc Nair');
      expect(Array.isArray(json.estrofes)).toBe(true);
      expect(json.estrofes.length).toBe(4);
      expect(json.estrofes[0].tipo).toBe('estrofe');
      expect(json.estrofes[0].texto).toContain('A divinal mensagem');
    });

    it('deve retornar 404 para hino inexistente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/99999',
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.payload);
      expect(json.statusCode).toBe(404);
      expect(json.error).toBe('Not Found');
    });

    it('deve retornar 400 para número inválido', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/abc',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe('Bad Request');
    });
  });

  describe('Navegação: Anterior e Seguinte', () => {
    it('deve retornar o hino anterior a 2', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/2/anterior',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.numero).toBe(1);
      expect(json.titulo).toBe('A divinal mensagem');
    });

    it('deve retornar 404 ao buscar o anterior do primeiro hino (1)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/1/anterior',
      });

      expect(response.statusCode).toBe(404);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe('Not Found');
    });

    it('deve retornar o hino seguinte a 1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/1/seguinte',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.numero).toBe(2);
      expect(json.titulo).toBe('A Linda História');
    });
  });

  describe('GET /api/hinos/search', () => {
    it('deve pesquisar por número exato', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search?q=1',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].numero).toBe(1);
    });

    it('deve pesquisar por título COM acento', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search?q=história',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.data.length).toBeGreaterThan(0);
      const hasLindaHistoria = json.data.some((h: any) => h.titulo.toLowerCase().includes('história'));
      expect(hasLindaHistoria).toBe(true);
    });

    it('deve pesquisar por título SEM acento (normalização)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search?q=historia',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.data.length).toBeGreaterThan(0);
      const hasLindaHistoria = json.data.some((h: any) => h.titulo.toLowerCase().includes('história'));
      expect(hasLindaHistoria).toBe(true);
    });

    it('deve pesquisar por autor', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search?q=Ginsburg',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0].autor).toContain('Ginsburg');
    });

    it('deve pesquisar por palavras na letra', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search?q=pecador',
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.payload);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty('trechoRelevante');
    });

    it('deve retornar 400 se o parâmetro q estiver ausente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hinos/search',
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.payload);
      expect(json.error).toBe('Bad Request');
    });
  });
});

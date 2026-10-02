import { prisma, checkDatabaseConnection } from '../../../database/prisma.js';
import { jsonHinosStore } from '../../../database/json-store.js';
import { normalizeText, extractSnippet, formatHinoNumero } from '../../../utils/text.js';
import {
  IHinoDetailResponse,
  IHinoListItemResponse,
  IHinoSearchResultResponse,
  IPaginatedResponse,
} from '../types/hinos.types.js';

export class HinosRepository {
  private usePostgresCache: boolean | null = null;

  private async isPostgresAvailable(): Promise<boolean> {
    if (this.usePostgresCache !== null) {
      return this.usePostgresCache;
    }
    const available = await checkDatabaseConnection();
    this.usePostgresCache = available;
    if (available) {
      console.log('✅ Conectado ao PostgreSQL com sucesso.');
    } else {
      console.warn('⚠️ PostgreSQL não detectado ou indisponível. Usando armazenamento em memória a partir de hinos.json.');
    }
    return available;
  }

  public async findMany(options: {
    page: number;
    limit: number;
    sort?: 'asc' | 'desc';
  }): Promise<IPaginatedResponse<IHinoListItemResponse>> {
    const { page, limit, sort = 'asc' } = options;
    const isPg = await this.isPostgresAvailable();

    if (!isPg) {
      return jsonHinosStore.getPaginated(page, limit, sort);
    }

    try {
      const skip = (page - 1) * limit;
      const [total, hinos] = await Promise.all([
        prisma.hino.count(),
        prisma.hino.findMany({
          skip,
          take: limit,
          orderBy: { numero: sort },
          include: {
            estrofes: {
              where: { numero: 1 },
              take: 1,
            },
            _count: {
              select: { estrofes: true },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;
      const data: IHinoListItemResponse[] = hinos.map((h) => ({
        id: h.id,
        numero: h.numero,
        numeroFormatado: formatHinoNumero(h.numero),
        titulo: h.titulo,
        autor: h.autor,
        totalEstrofes: h._count.estrofes,
        primeiraEstrofe: h.estrofes[0]?.texto,
      }));

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      console.warn('Erro ao consultar PostgreSQL, recorrendo ao store JSON:', err);
      return jsonHinosStore.getPaginated(page, limit, sort);
    }
  }

  public async findByNumero(numero: number): Promise<IHinoDetailResponse | null> {
    const isPg = await this.isPostgresAvailable();

    if (!isPg) {
      return jsonHinosStore.getByNumero(numero);
    }

    try {
      const hino = await prisma.hino.findUnique({
        where: { numero },
        include: {
          estrofes: {
            orderBy: { numero: 'asc' },
          },
        },
      });

      if (!hino) return null;

      const [anterior, seguinte] = await Promise.all([
        prisma.hino.findFirst({
          where: { numero: { lt: numero } },
          orderBy: { numero: 'desc' },
          select: { numero: true, titulo: true },
        }),
        prisma.hino.findFirst({
          where: { numero: { gt: numero } },
          orderBy: { numero: 'asc' },
          select: { numero: true, titulo: true },
        }),
      ]);

      return {
        id: hino.id,
        numero: hino.numero,
        numeroFormatado: formatHinoNumero(hino.numero),
        titulo: hino.titulo,
        autor: hino.autor,
        letraCompleta: hino.letraCompleta,
        fonteArquivo: hino.fonteArquivo,
        estrofes: hino.estrofes.map((e) => ({
          id: e.id,
          numero: e.numero,
          tipo: e.tipo,
          texto: e.texto,
        })),
        anterior: anterior || null,
        seguinte: seguinte || null,
        createdAt: hino.createdAt.toISOString(),
        updatedAt: hino.updatedAt.toISOString(),
      };
    } catch (err) {
      console.warn('Erro ao consultar hino no PostgreSQL, usando store JSON:', err);
      return jsonHinosStore.getByNumero(numero);
    }
  }

  public async findAnterior(numero: number): Promise<{ numero: number; titulo: string; autor: string | null } | null> {
    const isPg = await this.isPostgresAvailable();
    if (!isPg) return jsonHinosStore.getAnterior(numero);

    try {
      const anterior = await prisma.hino.findFirst({
        where: { numero: { lt: numero } },
        orderBy: { numero: 'desc' },
        select: { id: true, numero: true, titulo: true, autor: true },
      });
      return anterior;
    } catch (err) {
      return jsonHinosStore.getAnterior(numero);
    }
  }

  public async findSeguinte(numero: number): Promise<{ numero: number; titulo: string; autor: string | null } | null> {
    const isPg = await this.isPostgresAvailable();
    if (!isPg) return jsonHinosStore.getSeguinte(numero);

    try {
      const seguinte = await prisma.hino.findFirst({
        where: { numero: { gt: numero } },
        orderBy: { numero: 'asc' },
        select: { id: true, numero: true, titulo: true, autor: true },
      });
      return seguinte;
    } catch (err) {
      return jsonHinosStore.getSeguinte(numero);
    }
  }

  public async search(options: {
    query: string;
    page: number;
    limit: number;
  }): Promise<IPaginatedResponse<IHinoSearchResultResponse>> {
    const { query, page, limit } = options;
    const isPg = await this.isPostgresAvailable();

    if (!isPg) {
      return jsonHinosStore.search(query, page, limit);
    }

    try {
      const trimmedQuery = query.trim();
      const numQuery = parseInt(trimmedQuery, 10);
      const isNum = !isNaN(numQuery);
      const unaccentPattern = `%${trimmedQuery}%`;
      const offset = (page - 1) * limit;

      const rows = isNum
        ? await prisma.$queryRaw<Array<{
            id: number;
            numero: number;
            titulo: string;
            autor: string | null;
            letra_completa: string;
            total_estrofes: bigint;
            total_count: bigint;
          }>>`
            WITH filtered AS (
              SELECT h.id, h.numero, h.titulo, h.autor, h.letra_completa,
                     (SELECT COUNT(*) FROM hino_estrofes e WHERE e.hino_id = h.id) as total_estrofes
              FROM hinos h
              WHERE h.numero = ${numQuery}
                 OR unaccent(h.titulo) ILIKE unaccent(${unaccentPattern})
                 OR unaccent(h.letra_completa) ILIKE unaccent(${unaccentPattern})
            )
            SELECT *, COUNT(*) OVER() as total_count
            FROM filtered
            ORDER BY CASE WHEN numero = ${numQuery} THEN 0 ELSE 1 END, numero ASC
            LIMIT ${limit} OFFSET ${offset};
          `
        : await prisma.$queryRaw<Array<{
            id: number;
            numero: number;
            titulo: string;
            autor: string | null;
            letra_completa: string;
            total_estrofes: bigint;
            total_count: bigint;
          }>>`
            WITH filtered AS (
              SELECT h.id, h.numero, h.titulo, h.autor, h.letra_completa,
                     (SELECT COUNT(*) FROM hino_estrofes e WHERE e.hino_id = h.id) as total_estrofes
              FROM hinos h
              WHERE unaccent(h.titulo) ILIKE unaccent(${unaccentPattern})
                 OR (h.autor IS NOT NULL AND unaccent(h.autor) ILIKE unaccent(${unaccentPattern}))
                 OR unaccent(h.letra_completa) ILIKE unaccent(${unaccentPattern})
            )
            SELECT *, COUNT(*) OVER() as total_count
            FROM filtered
            ORDER BY
              CASE WHEN unaccent(titulo) ILIKE unaccent(${unaccentPattern}) THEN 0 ELSE 1 END,
              numero ASC
            LIMIT ${limit} OFFSET ${offset};
          `;

      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

      const data: IHinoSearchResultResponse[] = rows.map((h) => {
        let matchType: 'numero' | 'titulo' | 'autor' | 'letra' = 'letra';
        const normQ = normalizeText(trimmedQuery);
        if (isNum && h.numero === numQuery) matchType = 'numero';
        else if (normalizeText(h.titulo).includes(normQ)) matchType = 'titulo';
        else if (h.autor && normalizeText(h.autor).includes(normQ)) matchType = 'autor';

        return {
          id: h.id,
          numero: h.numero,
          numeroFormatado: formatHinoNumero(h.numero),
          titulo: h.titulo,
          autor: h.autor,
          totalEstrofes: Number(h.total_estrofes || 0),
          trechoRelevante: extractSnippet(h.letra_completa, trimmedQuery, 120),
          correspondencia: matchType,
        };
      });

      const totalPages = Math.ceil(total / limit) || 1;

      return {
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      console.warn('Erro ao realizar busca no PostgreSQL, recorrendo ao store JSON:', err);
      return jsonHinosStore.search(query, page, limit);
    }
  }
}

export const hinosRepository = new HinosRepository();

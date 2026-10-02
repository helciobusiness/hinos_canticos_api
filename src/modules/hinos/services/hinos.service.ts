import { hinosRepository, HinosRepository } from '../repositories/hinos.repository.js';
import {
  IHinoDetailResponse,
  IHinoListItemResponse,
  IHinoSearchResultResponse,
  IPaginatedResponse,
} from '../types/hinos.types.js';

export class HinosService {
  constructor(private readonly repository: HinosRepository = hinosRepository) {}

  public async listHinos(
    page: number = 1,
    limit: number = 20,
    sort: 'asc' | 'desc' = 'asc'
  ): Promise<IPaginatedResponse<IHinoListItemResponse>> {
    return this.repository.findMany({ page, limit, sort });
  }

  public async getHinoByNumero(numero: number): Promise<IHinoDetailResponse | null> {
    return this.repository.findByNumero(numero);
  }

  public async searchHinos(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IPaginatedResponse<IHinoSearchResultResponse>> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
    return this.repository.search({ query: trimmed, page, limit });
  }

  public async getHinoAnterior(numero: number) {
    return this.repository.findAnterior(numero);
  }

  public async getHinoSeguinte(numero: number) {
    return this.repository.findSeguinte(numero);
  }
}

export const hinosService = new HinosService();

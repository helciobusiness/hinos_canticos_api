import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { normalizeText, extractSnippet, formatHinoNumero } from '../utils/text.js';
import {
  IHinoDetailResponse,
  IHinoListItemResponse,
  IHinoSearchResultResponse,
  IPaginatedResponse,
} from '../modules/hinos/types/hinos.types.js';

interface RawEstrofe {
  numero: number;
  tipo: string;
  texto: string;
}

interface RawHino {
  source_file?: string;
  source_hash?: string;
  numero: number;
  titulo: string;
  autor?: string | null;
  estrofes: RawEstrofe[];
}

class JsonHinosStore {
  private hinos: RawHino[] = [];
  private isLoaded = false;

  public load(): void {
    if (this.isLoaded) return;

    try {
      let resolvedPath = path.isAbsolute(env.HINOS_JSON_PATH)
        ? env.HINOS_JSON_PATH
        : path.resolve(process.cwd(), env.HINOS_JSON_PATH);

      if (!fs.existsSync(resolvedPath)) {
        // Fallback relative to project root
        resolvedPath = path.resolve(process.cwd(), '../hinos_canticos_conversor/output/hinos.json');
      }

      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        const rawList: RawHino[] = Array.isArray(parsed.hinos) ? parsed.hinos : [];

        // Trata a inconsistência identificada no 233.pps (que vinha com numero 213 no json original)
        const map = new Map<number, RawHino>();
        for (const item of rawList) {
          let num = item.numero;
          if (item.source_file === '233.pps' && num === 213) {
            num = 233;
            item.numero = 233;
          }
          map.set(num, item);
        }

        this.hinos = Array.from(map.values()).sort((a, b) => a.numero - b.numero);
        this.isLoaded = true;
      }
    } catch (err) {
      console.warn('Aviso: Não foi possível carregar hinos.json de fallback:', err);
    }
  }

  public getCount(): number {
    this.load();
    return this.hinos.length;
  }

  public getPaginated(page: number, limit: number, sort: 'asc' | 'desc' = 'asc'): IPaginatedResponse<IHinoListItemResponse> {
    this.load();
    const sorted = [...this.hinos].sort((a, b) => (sort === 'asc' ? a.numero - b.numero : b.numero - a.numero));
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const items = sorted.slice(offset, offset + limit).map((h) => ({
      id: h.numero,
      numero: h.numero,
      numeroFormatado: formatHinoNumero(h.numero),
      titulo: h.titulo,
      autor: h.autor || null,
      totalEstrofes: h.estrofes ? h.estrofes.length : 0,
      primeiraEstrofe: h.estrofes && h.estrofes[0] ? h.estrofes[0].texto : undefined,
    }));

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public getByNumero(numero: number): IHinoDetailResponse | null {
    this.load();
    const hino = this.hinos.find((h) => h.numero === numero);
    if (!hino) return null;

    const anterior = this.getAnterior(numero);
    const seguinte = this.getSeguinte(numero);

    const letraCompleta = (hino.estrofes || []).map((e) => e.texto).join('\n\n');

    return {
      id: hino.numero,
      numero: hino.numero,
      numeroFormatado: formatHinoNumero(hino.numero),
      titulo: hino.titulo,
      autor: hino.autor || null,
      letraCompleta,
      fonteArquivo: hino.source_file || null,
      estrofes: (hino.estrofes || []).map((e, idx) => ({
        id: idx + 1,
        numero: e.numero,
        tipo: e.tipo || 'estrofe',
        texto: e.texto,
      })),
      anterior: anterior ? { numero: anterior.numero, titulo: anterior.titulo } : null,
      seguinte: seguinte ? { numero: seguinte.numero, titulo: seguinte.titulo } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  public getAnterior(numero: number): { numero: number; titulo: string; autor: string | null } | null {
    this.load();
    const sorted = [...this.hinos].filter((h) => h.numero < numero).sort((a, b) => b.numero - a.numero);
    if (sorted.length === 0) return null;
    return {
      numero: sorted[0].numero,
      titulo: sorted[0].titulo,
      autor: sorted[0].autor || null,
    };
  }

  public getSeguinte(numero: number): { numero: number; titulo: string; autor: string | null } | null {
    this.load();
    const sorted = [...this.hinos].filter((h) => h.numero > numero).sort((a, b) => a.numero - b.numero);
    if (sorted.length === 0) return null;
    return {
      numero: sorted[0].numero,
      titulo: sorted[0].titulo,
      autor: sorted[0].autor || null,
    };
  }

  public search(query: string, page: number, limit: number): IPaginatedResponse<IHinoSearchResultResponse> {
    this.load();
    const normQ = normalizeText(query);
    const numQ = parseInt(query, 10);

    const matches: Array<{ hino: RawHino; matchType: 'numero' | 'titulo' | 'autor' | 'letra'; snippet: string; score: number }> = [];

    for (const hino of this.hinos) {
      const fullText = (hino.estrofes || []).map((e) => e.texto).join('\n\n');
      const normTitle = normalizeText(hino.titulo);
      const normAuthor = normalizeText(hino.autor || '');
      const normFull = normalizeText(fullText);

      if (!isNaN(numQ) && hino.numero === numQ) {
        matches.push({
          hino,
          matchType: 'numero',
          snippet: (hino.estrofes && hino.estrofes[0] ? hino.estrofes[0].texto.slice(0, 100) : '') + '...',
          score: 100,
        });
        continue;
      }

      if (!isNaN(numQ) && hino.numero.toString().includes(query)) {
        matches.push({
          hino,
          matchType: 'numero',
          snippet: (hino.estrofes && hino.estrofes[0] ? hino.estrofes[0].texto.slice(0, 100) : '') + '...',
          score: 80,
        });
        continue;
      }

      if (normTitle.includes(normQ)) {
        matches.push({
          hino,
          matchType: 'titulo',
          snippet: extractSnippet(fullText, query, 120),
          score: normTitle.startsWith(normQ) ? 70 : 60,
        });
        continue;
      }

      if (normAuthor.includes(normQ)) {
        matches.push({
          hino,
          matchType: 'autor',
          snippet: `Autor: ${hino.autor}. ${fullText.slice(0, 80)}...`,
          score: 50,
        });
        continue;
      }

      if (normFull.includes(normQ)) {
        matches.push({
          hino,
          matchType: 'letra',
          snippet: extractSnippet(fullText, query, 120),
          score: 40,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score || a.hino.numero - b.hino.numero);

    const total = matches.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data: IHinoSearchResultResponse[] = matches.slice(offset, offset + limit).map((m) => ({
      id: m.hino.numero,
      numero: m.hino.numero,
      numeroFormatado: formatHinoNumero(m.hino.numero),
      titulo: m.hino.titulo,
      autor: m.hino.autor || null,
      totalEstrofes: m.hino.estrofes ? m.hino.estrofes.length : 0,
      trechoRelevante: m.snippet,
      correspondencia: m.matchType,
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
  }
}

export const jsonHinosStore = new JsonHinosStore();

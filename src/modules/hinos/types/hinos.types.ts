export interface IEstrofeInput {
  numero: number;
  tipo: string;
  texto: string;
}

export interface IHinoInput {
  source_file?: string;
  source_hash?: string;
  numero: number;
  titulo: string;
  autor?: string | null;
  estrofes: IEstrofeInput[];
  confidence?: Record<string, number>;
  valid?: boolean;
  warnings?: string[];
  errors?: string[];
}

export interface IHinoEstrofeResponse {
  id: number;
  numero: number;
  tipo: string;
  texto: string;
}

export interface IHinoDetailResponse {
  id: number;
  numero: number;
  numeroFormatado: string;
  titulo: string;
  autor: string | null;
  letraCompleta: string;
  fonteArquivo: string | null;
  estrofes: IHinoEstrofeResponse[];
  anterior?: { numero: number; titulo: string } | null;
  seguinte?: { numero: number; titulo: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface IHinoListItemResponse {
  id: number;
  numero: number;
  numeroFormatado: string;
  titulo: string;
  autor: string | null;
  totalEstrofes: number;
  primeiraEstrofe?: string;
}

export interface IHinoSearchResultResponse extends IHinoListItemResponse {
  trechoRelevante?: string;
  correspondencia: 'numero' | 'titulo' | 'autor' | 'letra';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface IImportReport {
  totalNoArquivo: number;
  processados: number;
  inseridos: number;
  atualizados: number;
  erros: Array<{ numero?: number; arquivo?: string; erro: string }>;
  avisos: Array<{ numero?: number; arquivo?: string; aviso: string }>;
  duracaoMs: number;
}

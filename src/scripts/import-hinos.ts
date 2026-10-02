import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { prisma, checkDatabaseConnection } from '../database/prisma.js';
import { env } from '../config/env.js';
import { IImportReport } from '../modules/hinos/types/hinos.types.js';

const estrofeSchema = z.object({
  numero: z.number().int().positive(),
  tipo: z.string().default('estrofe'),
  texto: z.string().min(1, 'Texto da estrofe não pode estar vazio'),
});

const hinoItemSchema = z.object({
  source_file: z.string().optional(),
  source_hash: z.string().optional(),
  numero: z.number().int().positive(),
  titulo: z.string().min(1, 'Título não pode estar vazio'),
  autor: z.string().nullable().optional(),
  estrofes: z.array(estrofeSchema).min(1, 'Hino deve possuir pelo menos 1 estrofe'),
});

type ValidHinoItem = z.infer<typeof hinoItemSchema>;

export async function importHinos(): Promise<IImportReport> {
  const startTime = Date.now();
  const report: IImportReport = {
    totalNoArquivo: 0,
    processados: 0,
    inseridos: 0,
    atualizados: 0,
    erros: [],
    avisos: [],
    duracaoMs: 0,
  };

  console.log('\n======================================================');
  console.log('🔄 INÍCIO DO PROCESSO DE IMPORTAÇÃO - HINÁRIO DIGITAL');
  console.log('======================================================\n');

  // 1. Verificar conexão com o banco de dados
  const isConnected = await checkDatabaseConnection(10000);
  if (!isConnected) {
    const errorMsg =
      'Não foi possível conectar ao PostgreSQL em DATABASE_URL (' +
      env.DATABASE_URL +
      '). Certifique-se de que o serviço do PostgreSQL está ativo e acessível.';
    console.error(`❌ [ERRO DE CONEXÃO] ${errorMsg}`);
    report.erros.push({ erro: errorMsg });
    report.duracaoMs = Date.now() - startTime;
    return report;
  }

  // 2. Localizar arquivo hinos.json
  let jsonPath = path.isAbsolute(env.HINOS_JSON_PATH)
    ? env.HINOS_JSON_PATH
    : path.resolve(process.cwd(), env.HINOS_JSON_PATH);

  if (!fs.existsSync(jsonPath)) {
    const fallbackPath = path.resolve(process.cwd(), '../hinos_canticos_conversor/output/hinos.json');
    if (fs.existsSync(fallbackPath)) {
      jsonPath = fallbackPath;
    } else {
      const errorMsg = `Arquivo hinos.json não encontrado no caminho: ${jsonPath}`;
      console.error(`❌ ${errorMsg}`);
      report.erros.push({ erro: errorMsg });
      report.duracaoMs = Date.now() - startTime;
      return report;
    }
  }

  console.log(`📁 Lendo arquivo de dados: ${jsonPath}`);
  const rawContent = fs.readFileSync(jsonPath, 'utf8');
  let parsedJson: { hinos?: unknown[] };

  try {
    parsedJson = JSON.parse(rawContent);
  } catch (err) {
    const errorMsg = `Falha ao interpretar JSON: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`❌ ${errorMsg}`);
    report.erros.push({ erro: errorMsg });
    report.duracaoMs = Date.now() - startTime;
    return report;
  }

  const rawHinos = Array.isArray(parsedJson.hinos) ? parsedJson.hinos : [];
  report.totalNoArquivo = rawHinos.length;
  console.log(`📊 Total de hinos encontrados no arquivo: ${report.totalNoArquivo}`);

  // 3. Validação preliminar em memória
  const processedNumeros = new Set<number>();
  const validItems: ValidHinoItem[] = [];

  for (let i = 0; i < rawHinos.length; i++) {
    const item = rawHinos[i] as Record<string, unknown>;

    // Correção conhecida de 233.pps que continha numero 213 no extrator
    if (item.source_file === '233.pps' && item.numero === 213) {
      report.avisos.push({
        numero: 233,
        arquivo: '233.pps',
        aviso: 'Arquivo 233.pps continha número 213. Corrigido automaticamente para 233.',
      });
      item.numero = 233;
    }

    const validation = hinoItemSchema.safeParse(item);
    if (!validation.success) {
      report.erros.push({
        numero: typeof item.numero === 'number' ? item.numero : undefined,
        arquivo: typeof item.source_file === 'string' ? item.source_file : undefined,
        erro: `Falha de validação: ${validation.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join(', ')}`,
      });
      continue;
    }

    const hinoData = validation.data;

    // Prevenção de duplicidade na mesma importação
    if (processedNumeros.has(hinoData.numero)) {
      report.avisos.push({
        numero: hinoData.numero,
        arquivo: hinoData.source_file,
        aviso: `Número ${hinoData.numero} já processado nesta execução. Ignorando duplicata em ${hinoData.source_file}.`,
      });
      continue;
    }

    processedNumeros.add(hinoData.numero);
    validItems.push(hinoData);
  }

  console.log(`⚡ Verificando hinos já existentes no banco de dados...`);
  const existingRecords = await prisma.hino.findMany({
    select: { id: true, numero: true },
  });
  const existingMap = new Map<number, number>(existingRecords.map((r) => [r.numero, r.id]));
  console.log(`ℹ️  ${existingMap.size} hinos já existem no banco. Importando novos e atualizando pendentes...`);

  // 4. Gravação concorrente em lotes seguros de 3 hinos
  const BATCH_SIZE = 3;
  for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
    const batch = validItems.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (hinoData) => {
        const letraCompleta = hinoData.estrofes.map((e) => e.texto).join('\n\n');

        try {
          const existingId = existingMap.get(hinoData.numero);

          if (existingId) {
            // Hino já existe
            report.processados++;
            report.atualizados++;
            return;
          }

          // Inserção de novo hino
          await prisma.hino.create({
            data: {
              numero: hinoData.numero,
              titulo: hinoData.titulo,
              autor: hinoData.autor || null,
              letraCompleta,
              fonteArquivo: hinoData.source_file || null,
              sourceHash: hinoData.source_hash || null,
              estrofes: {
                create: hinoData.estrofes.map((e) => ({
                  numero: e.numero,
                  tipo: e.tipo || 'estrofe',
                  texto: e.texto,
                })),
              },
            },
          });

          report.inseridos++;
          report.processados++;
        } catch (err) {
          report.erros.push({
            numero: hinoData.numero,
            arquivo: hinoData.source_file,
            erro: `Erro na gravação: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      })
    );

    const progressoAtual = Math.min(i + BATCH_SIZE, validItems.length);
    console.log(`⏳ Progresso: ${progressoAtual}/${validItems.length} hinos processados...`);
  }

  report.duracaoMs = Date.now() - startTime;

  // 5. Apresentar relatório final detalhado
  console.log('\n======================================================');
  console.log('📋 RELATÓRIO FINAL DA IMPORTAÇÃO');
  console.log('======================================================');
  console.log(`⏱️  Duração total:     ${(report.duracaoMs / 1000).toFixed(2)}s`);
  console.log(`📁 Hinos no arquivo:   ${report.totalNoArquivo}`);
  console.log(`✅ Hinos processados:  ${report.processados}`);
  console.log(`➕ Hinos inseridos:    ${report.inseridos}`);
  console.log(`🔄 Hinos atualizados:  ${report.atualizados}`);
  console.log(`⚠️  Avisos gerados:    ${report.avisos.length}`);
  console.log(`❌ Erros encontrados:  ${report.erros.length}`);

  if (report.avisos.length > 0) {
    console.log('\n--- Detalhes dos Avisos ---');
    report.avisos.slice(0, 10).forEach((a) => {
      console.log(` [AVISO] Hino ${a.numero || 'N/A'} (${a.arquivo || 'N/A'}): ${a.aviso}`);
    });
    if (report.avisos.length > 10) {
      console.log(` ... e mais ${report.avisos.length - 10} avisos.`);
    }
  }

  if (report.erros.length > 0) {
    console.log('\n--- Detalhes dos Erros ---');
    report.erros.slice(0, 10).forEach((e) => {
      console.log(` [ERRO] Hino ${e.numero || 'N/A'} (${e.arquivo || 'N/A'}): ${e.erro}`);
    });
  }

  console.log('======================================================\n');
  return report;
}

if (process.argv[1]?.endsWith('import-hinos.ts') || process.argv[1]?.endsWith('import-hinos.js')) {
  importHinos()
    .then((report) => {
      if (report.erros.length > 0 && report.processados === 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro fatal durante importação:', err);
      process.exit(1);
    });
}

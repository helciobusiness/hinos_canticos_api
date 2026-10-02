import { buildApp } from './app.js';
import { env } from './config/env.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: env.PORT, host: env.HOST });

    console.log(`\n🎵 =========================================`);
    console.log(`   Hinos & Cânticos API inicializada!`);
    console.log(`   Servidor:   http://localhost:${env.PORT}`);
    console.log(`   Documentação: http://localhost:${env.PORT}/docs`);
    console.log(`   Saúde:      http://localhost:${env.PORT}/api/health`);
    console.log(`   Ambiente:   ${env.NODE_ENV}`);
    console.log(`=========================================\n`);

    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`\nRecebido ${signal}. Encerrando servidor graciosamente...`);
        await app.close();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error('Erro ao inicializar o servidor:', err);
    process.exit(1);
  }
}

start();

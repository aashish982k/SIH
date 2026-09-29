import http from 'http';
import app from './app';
import { env } from './config/env';
import { checkConnection } from './config/db';
import { ensureCollection, checkQdrantConnection } from './config/qdrant';
import { initWebSocket } from './websocket';
import { initLiveEngine } from './services/live/liveEngine';
import { groqEnabled } from './services/groqService';
import { embedOne } from './services/embeddingService';

async function bootstrap(): Promise<void> {
  console.log('🔌  Connecting to PostgreSQL...');
  await checkConnection();
  console.log('✅  PostgreSQL connected');

  try {
    await checkQdrantConnection();
    await ensureCollection();
    console.log('✅  Qdrant connected');
  } catch (err: any) {
    console.warn(`⚠️   Qdrant unavailable (${err?.message}). Search falls back to keyword mode.`);
  }

  const httpServer = http.createServer(app);
  const io = initWebSocket(httpServer);
  await initLiveEngine(io);

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌  Port ${env.PORT} is already in use — another NWIS backend is probably running.`);
      console.error(`    Stop it first (PowerShell):  Get-NetTCPConnection -LocalPort ${env.PORT} -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`);
      console.error('    or set a different PORT in backend/.env (and NEXT_PUBLIC_API_URL / CORS if you change it).\n');
    } else {
      console.error('❌  Server error:', err.message);
    }
    process.exit(1);
  });

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀  NWIS backend on http://localhost:${env.PORT}/api`);
    console.log(`    Groq: ${groqEnabled() ? env.GROQ_MODEL : 'not configured (rules-based extraction; search still works)'}`);
  });

  // Warm the embedding model so the first search is fast
  embedOne('warm up').then(() => console.log('✅  Embedding model ready')).catch((e) => console.warn('⚠️   Embedding model not loaded:', e?.message));
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err.message);
  process.exit(1);
});

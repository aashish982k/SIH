import http from 'http';
import app from './app';
import { env } from './config/env';
import { checkConnection } from './config/db';
import { ensureCollection, checkQdrantConnection } from './config/qdrant';
import { initWebSocket } from './websocket';

async function bootstrap(): Promise<void> {
  // ── Verify Database (MySQL with automatic SQLite fallback) ──────
  console.log('🔌  Connecting to database engine...');
  await checkConnection();

  // ── Verify Vector Search Engine (Qdrant with SQL fallback) ─────
  await checkQdrantConnection();
  await ensureCollection();

  // ── HTTP + WebSocket server ────────────────────────────────────
  const httpServer = http.createServer(app);
  initWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀  NWIS Operational Intelligence Backend live on port ${env.PORT}`);
    console.log(`    REST API : http://localhost:${env.PORT}/api`);
    console.log(`    Health   : http://localhost:${env.PORT}/api/health`);
    console.log(`    Mode     : ${env.NODE_ENV}\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err.message);
  process.exit(1);
});

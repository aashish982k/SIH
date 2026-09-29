import http from 'http';
import app from './app';
import { env } from './config/env';

import { ensureCollection, checkQdrantConnection } from './config/qdrant';
import { initWebSocket } from './websocket';
import { resumePendingDocuments } from './services/documentService';

async function bootstrap(): Promise<void> {
  // ── PostgreSQL Connection is established implicitly on first query ──
  // ── Verify + setup Qdrant (non-fatal) ─────────────────────────
  console.log('🔌  Connecting to Qdrant...');
  try {
    await checkQdrantConnection();
    await ensureCollection();
  } catch (err: any) {
    console.warn('⚠️   Qdrant unavailable — semantic search will be disabled.');
    console.warn('    Start Qdrant with: docker run -p 6333:6333 qdrant/qdrant');
    console.warn(`    Error: ${err?.message ?? err}`);
  }
  void resumePendingDocuments().catch((err) => console.warn('⚠️ Unable to resume document processing:', err?.message ?? err));

  // ── HTTP + WebSocket server ────────────────────────────────────
  const httpServer = http.createServer(app);
  initWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀  NWIS Backend running on port ${env.PORT}`);
    console.log(`    REST API : http://localhost:${env.PORT}/api`);
    console.log(`    Health   : http://localhost:${env.PORT}/api/health`);
    console.log(`    WebSocket: ws://localhost:${env.PORT}`);
    console.log(`    Mode     : ${env.NODE_ENV}\n`);
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err.message);
  process.exit(1);
});

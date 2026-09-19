import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware';
import { registerHandlers } from './handlers';

let io: SocketServer;

export function initWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Apply JWT authentication to all socket connections
  io.use(socketAuthMiddleware);

  // Register event handlers for each authenticated connection
  io.on('connection', (socket) => {
    registerHandlers(io, socket);
  });

  console.log('✅  WebSocket server initialised');
  return io;
}

/** Returns the Socket.IO instance (used for broadcasting from services) */
export function getIO(): SocketServer {
  if (!io) throw new Error('WebSocket server not initialised — call initWebSocket() first');
  return io;
}

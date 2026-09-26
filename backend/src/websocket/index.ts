import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { env } from '../config/env';
import { socketAuthMiddleware } from './middleware';
import { WS_EVENTS } from './events';

let io: SocketServer;

/**
 * Socket.IO is server → browser only for drilling data. Clients join a well room
 * and receive drilling:update, alert:new, alert:update, sim:state and sim:reset.
 */
export function initWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });
  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    socket.on(WS_EVENTS.JOIN_WELL, (wellId: unknown) => {
      if (typeof wellId !== 'string' || !wellId) return;
      for (const r of socket.rooms) if (r.startsWith('well:')) socket.leave(r);
      socket.join(`well:${wellId}`);
      socket.emit('well:joined', { wellId });
    });
    socket.on(WS_EVENTS.LEAVE_WELL, (wellId: unknown) => {
      if (typeof wellId === 'string') socket.leave(`well:${wellId}`);
    });
  });
  console.log('✅  WebSocket server initialised');
  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('WebSocket server not initialised — call initWebSocket() first');
  return io;
}

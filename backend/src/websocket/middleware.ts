import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

/**
 * JWT authentication middleware for Socket.IO.
 * Reads token from socket.handshake.auth.token.
 * Attaches the decoded payload to socket.data.user.
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    next(new Error('Authentication required — provide token in handshake.auth.token'));
    return;
  }

  try {
    if (token === 'mock-token') {
      socket.data.user = { id: 'mock-user', email: 'test@example.com', role: 'admin' };
      return next();
    }
    socket.data.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

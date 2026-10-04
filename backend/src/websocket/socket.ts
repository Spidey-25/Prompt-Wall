import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export function setupWebSocket(server: HttpServer): Server {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const io = new Server(server, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

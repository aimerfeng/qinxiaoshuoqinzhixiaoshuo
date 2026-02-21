import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/constants';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Extract base URL without /api/v1 for WebSocket connection
    const wsUrl = API_BASE_URL.replace('/api/v1', '');

    socket = io(wsUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(token: string): void {
  const sock = getSocket();

  // Set auth token
  sock.auth = { token };

  if (!sock.connected) {
    sock.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// Socket event types
export interface NotificationEvent {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'tip' | 'update' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface SocketEvents {
  // Client -> Server
  'join:room': (roomId: string) => void;
  'leave:room': (roomId: string) => void;

  // Server -> Client
  notification: (data: NotificationEvent) => void;
  'notification:count': (count: number) => void;
  'work:update': (data: { workId: string; chapterId?: string }) => void;
  'card:new': (data: { cardId: string }) => void;
}

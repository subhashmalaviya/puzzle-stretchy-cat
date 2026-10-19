import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  stage: number;
  level: number;
  status: 'waiting' | 'ready' | 'playing' | 'timeout' | 'reset' | 'won';
  isReady: boolean;
  lastActive: number;
  color: string;
}

interface Room {
  id: string;
  createdAt: number;
  hostId: string;
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  endedBy?: string;
  countdownValue?: number;
  players: Record<string, RoomPlayer>;
}


function multiplayerRoomsPlugin() {
  const rooms = new Map<string, Room>();
  const subscribers = new Map<string, Set<any>>();

  function broadcast(roomId: string, data: any) {
    const subs = subscribers.get(roomId);
    if (subs) {
      const msg = `data: ${JSON.stringify(data)}\n\n`;
      subs.forEach(res => {
        try {
          res.write(msg);
        } catch {
          subs.delete(res);
        }
      });
    }
  }

  return {
    name: 'multiplayer-rooms-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const host = req.headers.host || 'localhost';
        const url = new URL(req.url, `http://${host}`);

        if (url.pathname.startsWith('/api/rooms')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          // SSE Stream: GET /api/rooms/:id/stream
          if (url.pathname.endsWith('/stream')) {
            const parts = url.pathname.split('/');
            const roomId = parts[parts.length - 2]?.toUpperCase();

            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            });
            res.write('\n');

            if (!subscribers.has(roomId)) {
              subscribers.set(roomId, new Set());
            }
            subscribers.get(roomId)!.add(res);

            // Send current state immediately if room exists
            const room = rooms.get(roomId);
            if (room) {
              res.write(`data: ${JSON.stringify({ type: 'SYNC', room })}\n\n`);
            }

            req.on('close', () => {
              subscribers.get(roomId)?.delete(res);
            });
            return;
          }

          // POST requests
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              let data: any = {};
              try { data = JSON.parse(body || '{}'); } catch {}

              if (url.pathname === '/api/rooms/create') {
                const roomId = (data.roomId || `CAT-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
                const room: Room = {
                  id: roomId,
                  createdAt: Date.now(),
                  hostId: data.player.id,
                  status: 'waiting',
                  players: {
                    [data.player.id]: { 
                      ...data.player, 
                      isReady: true,
                      status: 'ready',
                      lastActive: Date.now() 
                    }
                  }
                };
                rooms.set(roomId, room);
                broadcast(roomId, { type: 'SYNC', room });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, room }));
                return;
              }

              if (url.pathname === '/api/rooms/join') {
                const roomId = (data.roomId || '').toUpperCase();
                let room = rooms.get(roomId);
                if (!room) {
                  room = {
                    id: roomId,
                    createdAt: Date.now(),
                    hostId: data.player.id,
                    status: 'waiting',
                    players: {}
                  };
                  rooms.set(roomId, room);
                }
                const isHost = room.hostId === data.player.id;
                room.players[data.player.id] = { 
                  ...data.player, 
                  isReady: isHost,
                  status: isHost ? 'ready' : 'waiting',
                  lastActive: Date.now() 
                };
                broadcast(roomId, { type: 'SYNC', room });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, room }));
                return;
              }

              if (url.pathname === '/api/rooms/toggle-ready') {
                const roomId = (data.roomId || '').toUpperCase();
                const room = rooms.get(roomId);
                if (room && room.players[data.playerId]) {
                  const p = room.players[data.playerId];
                  p.isReady = !p.isReady;
                  p.status = p.isReady ? 'ready' : 'waiting';
                  p.lastActive = Date.now();
                  broadcast(roomId, { type: 'UPDATE', room, playerId: data.playerId, updates: { isReady: p.isReady, status: p.status } });
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, room }));
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Room or player not found' }));
                }
                return;
              }

              if (url.pathname === '/api/rooms/start') {
                const roomId = (data.roomId || '').toUpperCase();
                const room = rooms.get(roomId);
                if (room) {
                  room.status = 'countdown';
                  Object.values(room.players).forEach(p => {
                    p.status = 'playing';
                    p.score = 0;
                    p.stage = 1;
                    p.level = 1;
                  });
                  broadcast(roomId, { type: 'START_MATCH', room });
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, room }));
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Room not found' }));
                }
                return;
              }

              if (url.pathname === '/api/rooms/end-match') {
                const roomId = (data.roomId || '').toUpperCase();
                const room = rooms.get(roomId);
                if (room) {
                  room.status = 'ended';
                  room.endedBy = data.endedBy || 'A player';
                  if (data.playerId && room.players[data.playerId]) {
                    room.players[data.playerId].status = 'timeout';
                  }
                  broadcast(roomId, { type: 'MATCH_END', room, endedBy: room.endedBy });
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, room }));
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Room not found' }));
                }
                return;
              }

              if (url.pathname === '/api/rooms/rematch') {
                const roomId = (data.roomId || '').toUpperCase();
                const room = rooms.get(roomId);
                if (room) {
                  room.status = 'waiting';
                  delete room.endedBy;
                  Object.values(room.players).forEach(p => {
                    p.score = 0;
                    p.stage = 1;
                    p.level = 1;
                    p.isReady = p.id === room.hostId;
                    p.status = p.isReady ? 'ready' : 'waiting';
                  });
                  broadcast(roomId, { type: 'REMATCH', room });
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, room }));
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Room not found' }));
                }
                return;
              }

              if (url.pathname === '/api/rooms/update') {
                const roomId = (data.roomId || '').toUpperCase();
                const room = rooms.get(roomId);
                if (room && room.players[data.playerId]) {
                  room.players[data.playerId] = {
                    ...room.players[data.playerId],
                    ...data.updates,
                    lastActive: Date.now()
                  };
                  broadcast(roomId, { type: 'UPDATE', room, playerId: data.playerId, updates: data.updates });
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, room }));
                } else {
                  res.statusCode = 404;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Room or player not found' }));
                }
                return;
              }

              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Endpoint not found' }));
            });
            return;
          }

          // GET /api/rooms/:id
          const parts = url.pathname.split('/');
          const roomId = parts[parts.length - 1]?.toUpperCase();
          const room = rooms.get(roomId);
          if (room) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, room }));
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Room not found' }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), multiplayerRoomsPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

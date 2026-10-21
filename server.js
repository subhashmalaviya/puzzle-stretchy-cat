/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

// In-Memory Multiplayer Room Storage
const rooms = new Map();
const subscribers = new Map();

function broadcast(roomId, data) {
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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url, `http://${host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Handle Multiplayer Room API Endpoints
  if (url.pathname.startsWith('/api/rooms')) {
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
      subscribers.get(roomId).add(res);

      const room = rooms.get(roomId);
      if (room) {
        res.write(`data: ${JSON.stringify({ type: 'SYNC', room })}\n\n`);
      }

      req.on('close', () => {
        subscribers.get(roomId)?.delete(res);
      });
      return;
    }

    // POST /api/rooms/...
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let data = {};
        try { data = JSON.parse(body || '{}'); } catch {}

        if (url.pathname === '/api/rooms/create') {
          const roomId = (data.roomId || `CAT-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
          const room = {
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

  // Serve Static Files from dist/
  let sanitizedPath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  if (sanitizedPath === '/' || sanitizedPath === '') {
    sanitizedPath = '/index.html';
  }

  let filePath = path.join(DIST_DIR, sanitizedPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA fallback to dist/index.html
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on http://0.0.0.0:${PORT}`);
});

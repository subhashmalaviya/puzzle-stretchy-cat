/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { RoomPlayer, RoomState, MultiplayerToastMsg } from '../types';
import { STORAGE_KEYS } from '../constants';

const AVATARS = ['🐱', '😸', '😻', '😼', '😽', '🦁', '🐯', '🐾', '🐈'];
const COLOR_OPTIONS = ['#4285F4', '#EA4335', '#FBBC04', '#38A852', '#BB55A1', '#00ACC1'];

class MultiplayerService {
  private profile: { id: string; name: string; avatar: string; color: string };
  private room: RoomState | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private roomListeners = new Set<(room: RoomState | null) => void>();
  private toastListeners = new Set<(toast: MultiplayerToastMsg) => void>();
  private matchStartListeners = new Set<() => void>();
  private matchEndListeners = new Set<(endedBy: string, room: RoomState) => void>();
  private rematchListeners = new Set<(room: RoomState) => void>();
  private prevRankings: string[] = [];

  constructor() {
    this.profile = this.loadProfile();
    this.initBroadcastChannel();
    this.initStorageListener();
  }

  private loadProfile(): { id: string; name: string; avatar: string; color: string } {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    const id = `player_${Math.random().toString(36).substring(2, 9)}`;
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
    const randomNum = Math.floor(10 + Math.random() * 90);
    const newProfile = {
      id,
      name: `Cat${randomNum}`,
      avatar: randomAvatar,
      color: randomColor,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, JSON.stringify(newProfile));
    } catch {}
    return newProfile;
  }

  public getProfile() {
    return { ...this.profile };
  }

  public updateProfile(name: string, avatar: string) {
    this.profile.name = name.trim() || this.profile.name;
    this.profile.avatar = avatar || this.profile.avatar;
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, JSON.stringify(this.profile));
    } catch {}

    if (this.room && this.room.players[this.profile.id]) {
      this.updateProgress(
        this.room.players[this.profile.id].score,
        this.room.players[this.profile.id].stage,
        this.room.players[this.profile.id].level,
        this.room.players[this.profile.id].status
      );
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('stretchy_cat_mp_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, room, toast, endedBy } = event.data || {};
          if ((type === 'ROOM_SYNC' || type === 'UPDATE') && room) {
            if (this.room && this.room.id === room.id) {
              this.applyRoomUpdate(room);
            }
          } else if (type === 'START_MATCH' && room) {
            if (this.room && this.room.id === room.id) {
              this.applyRoomUpdate(room);
              this.notifyMatchStart();
            }
          } else if (type === 'MATCH_END' && room) {
            if (this.room && this.room.id === room.id) {
              this.applyRoomUpdate(room);
              this.notifyMatchEnd(endedBy || room.endedBy || 'A player', room);
            }
          } else if (type === 'REMATCH' && room) {
            if (this.room && this.room.id === room.id) {
              this.applyRoomUpdate(room);
              this.notifyRematch(room);
            }
          } else if (type === 'TOAST' && toast) {
            this.emitToast(toast);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization failed', e);
      }
    }
  }

  private initStorageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEYS.LAST_ROOM && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (this.room && this.room.id === parsed.id) {
              const wasWaiting = this.room.status === 'waiting';
              const wasPlaying = this.room.status === 'playing' || this.room.status === 'countdown';
              const isEnded = parsed.status === 'ended';
              const isRematch = this.room.status === 'ended' && parsed.status === 'waiting';

              this.applyRoomUpdate(parsed);

              if (wasWaiting && (parsed.status === 'countdown' || parsed.status === 'playing')) {
                this.notifyMatchStart();
              } else if (wasPlaying && isEnded) {
                this.notifyMatchEnd(parsed.endedBy || 'A player', parsed);
              } else if (isRematch) {
                this.notifyRematch(parsed);
              }
            }
          } catch {}
        }
      });
    }
  }

  private connectSSE(roomId: string) {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource(`/api/rooms/${roomId}/stream`);
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.room) {
            const wasWaiting = this.room?.status === 'waiting';
            const wasPlaying = this.room?.status === 'playing' || this.room?.status === 'countdown';
            const isEnded = data.room.status === 'ended';
            const isRematch = this.room?.status === 'ended' && data.room.status === 'waiting';

            this.applyRoomUpdate(data.room);

            if (data.type === 'START_MATCH' || (wasWaiting && data.room.status === 'countdown')) {
              this.notifyMatchStart();
            } else if (data.type === 'MATCH_END' || (wasPlaying && isEnded)) {
              this.notifyMatchEnd(data.endedBy || data.room.endedBy || 'A player', data.room);
            } else if (data.type === 'REMATCH' || isRematch) {
              this.notifyRematch(data.room);
            }
          }
        } catch {}
      };
      this.eventSource.onerror = () => {
        // SSE fallback is quiet; BroadcastChannel and storage take over
      };
    } catch {}
  }

  private applyRoomUpdate(newRoom: RoomState) {
    if (!newRoom) return;

    // Detect rank changes or milestones for notifications
    const sortedBefore = this.prevRankings;
    const sortedNow = Object.values(newRoom.players)
      .sort((a, b) => b.score - a.score)
      .map(p => p.id);

    this.prevRankings = sortedNow;

    if (sortedBefore.length > 0 && sortedNow.length > 0 && newRoom.status === 'playing') {
      if (sortedBefore[0] !== sortedNow[0]) {
        const newLeader = newRoom.players[sortedNow[0]];
        if (newLeader) {
          if (newLeader.id === this.profile.id) {
            this.emitToast({
              id: Date.now().toString(),
              message: `🔥 You took 1st place on the leaderboard!`,
              type: 'rank',
              timestamp: Date.now(),
            });
          } else {
            this.emitToast({
              id: Date.now().toString(),
              message: `👑 ${newLeader.name} took 1st place (${newLeader.score.toLocaleString()} pts)`,
              type: 'rank',
              timestamp: Date.now(),
            });
          }
        }
      }
    }

    this.room = newRoom;
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, JSON.stringify(newRoom));
    } catch {}

    this.notifyListeners();
  }

  public async createRoom(customId?: string): Promise<RoomState> {
    const roomId = (customId || `CAT-${Math.floor(100 + Math.random() * 900)}`).toUpperCase();
    const player: RoomPlayer = {
      id: this.profile.id,
      name: this.profile.name,
      avatar: this.profile.avatar,
      score: 0,
      stage: 1,
      level: 1,
      status: 'ready',
      isReady: true,
      lastActive: Date.now(),
      color: this.profile.color,
    };

    const initialRoom: RoomState = {
      id: roomId,
      createdAt: Date.now(),
      hostId: player.id,
      status: 'waiting',
      players: { [player.id]: player },
    };

    this.room = initialRoom;
    this.prevRankings = [player.id];

    // Try backend API
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, player }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room) this.room = data.room;
      }
    } catch {}

    // Broadcast
    this.broadcastChannel?.postMessage({ type: 'ROOM_SYNC', room: this.room });
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, JSON.stringify(this.room));
    } catch {}

    this.connectSSE(roomId);
    this.notifyListeners();
    return this.room;
  }

  public async joinRoom(roomIdInput: string): Promise<RoomState | null> {
    const roomId = roomIdInput.trim().toUpperCase();
    if (!roomId) return null;

    const player: RoomPlayer = {
      id: this.profile.id,
      name: this.profile.name,
      avatar: this.profile.avatar,
      score: 0,
      stage: 1,
      level: 1,
      status: 'waiting',
      isReady: false,
      lastActive: Date.now(),
      color: this.profile.color,
    };

    let joinedRoom: RoomState | null = null;

    // Check backend API
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, player }),
      });
      if (res.ok) {
        const data = await res.json();
        joinedRoom = data.room;
      }
    } catch {}

    // Fallback to local/broadcast if offline
    if (!joinedRoom) {
      const cached = localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.id === roomId) {
            joinedRoom = parsed;
          }
        } catch {}
      }
      if (!joinedRoom) {
        joinedRoom = {
          id: roomId,
          createdAt: Date.now(),
          hostId: player.id,
          status: 'waiting',
          players: {},
        };
      }
      joinedRoom.players[player.id] = player;
    }

    this.room = joinedRoom;
    this.prevRankings = Object.keys(this.room.players);

    this.broadcastChannel?.postMessage({ type: 'ROOM_SYNC', room: this.room });
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, JSON.stringify(this.room));
    } catch {}

    this.connectSSE(roomId);
    this.notifyListeners();
    return this.room;
  }

  public async toggleReady() {
    if (!this.room || !this.room.players[this.profile.id]) return;

    const me = this.room.players[this.profile.id];
    const newReady = !me.isReady;
    me.isReady = newReady;
    me.status = newReady ? 'ready' : 'waiting';

    const updatedRoom: RoomState = {
      ...this.room,
      players: {
        ...this.room.players,
        [this.profile.id]: { ...me },
      },
    };

    this.applyRoomUpdate(updatedRoom);
    this.broadcastChannel?.postMessage({ type: 'UPDATE', room: updatedRoom });

    try {
      await fetch('/api/rooms/toggle-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      });
    } catch {}
  }

  public async startMatch() {
    if (!this.room) return;

    const updatedRoom: RoomState = {
      ...this.room,
      status: 'countdown',
      players: Object.fromEntries(
        Object.entries(this.room.players).map(([id, p]) => [
          id,
          { ...p, status: 'playing', score: 0, stage: 1, level: 1 }
        ])
      ),
    };

    this.applyRoomUpdate(updatedRoom);
    this.broadcastChannel?.postMessage({ type: 'START_MATCH', room: updatedRoom });
    this.notifyMatchStart();

    try {
      await fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      });
    } catch {}
  }

  public updateProgress(
    score: number,
    stage: number,
    level: number,
    status: 'waiting' | 'ready' | 'playing' | 'timeout' | 'reset' | 'won'
  ) {
    if (!this.room) return;

    const player = this.room.players[this.profile.id];
    const prevStatus = player?.status;
    const prevStage = player?.stage || 1;

    const updates = {
      score,
      stage,
      level,
      status,
      name: this.profile.name,
      avatar: this.profile.avatar,
      lastActive: Date.now(),
    };

    const updatedRoom: RoomState = {
      ...this.room,
      players: {
        ...this.room.players,
        [this.profile.id]: {
          ...(this.room.players[this.profile.id] || {
            id: this.profile.id,
            color: this.profile.color,
            isReady: true,
          }),
          ...updates,
        },
      },
    };

    this.applyRoomUpdate(updatedRoom);

    // Broadcast toast if death or stage clear
    if (status === 'timeout' && prevStatus !== 'timeout') {
      const toast: MultiplayerToastMsg = {
        id: Date.now().toString(),
        message: `💀 ${this.profile.name} ran out of time (${score.toLocaleString()} pts)`,
        type: 'death',
        timestamp: Date.now(),
      };
      this.emitToast(toast);
      this.broadcastChannel?.postMessage({ type: 'TOAST', toast });
    } else if (stage > prevStage) {
      const toast: MultiplayerToastMsg = {
        id: Date.now().toString(),
        message: `🎉 ${this.profile.name} advanced to Stage ${stage}!`,
        type: 'stage',
        timestamp: Date.now(),
      };
      this.emitToast(toast);
      this.broadcastChannel?.postMessage({ type: 'TOAST', toast });
    }

    // Send to backend
    fetch('/api/rooms/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: this.room.id,
        playerId: this.profile.id,
        updates,
      }),
    }).catch(() => {});

    this.broadcastChannel?.postMessage({ type: 'UPDATE', room: updatedRoom });
  }

  public leaveRoom() {
    if (this.room && this.room.players[this.profile.id]) {
      delete this.room.players[this.profile.id];
      // If host left, pass host to next player
      if (this.room.hostId === this.profile.id) {
        const remaining = Object.keys(this.room.players);
        if (remaining.length > 0) {
          this.room.hostId = remaining[0];
        }
      }
      this.broadcastChannel?.postMessage({ type: 'ROOM_SYNC', room: this.room });
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.room = null;
    this.prevRankings = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.LAST_ROOM);
    } catch {}
    this.notifyListeners();
  }

  public getRoom(): RoomState | null {
    return this.room;
  }

  public getLeaderboard(): RoomPlayer[] {
    if (!this.room) return [];
    return Object.values(this.room.players).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.stage !== a.stage) return b.stage - a.stage;
      return b.level - a.level;
    });
  }

  public subscribe(callback: (room: RoomState | null) => void) {
    this.roomListeners.add(callback);
    callback(this.room);
    return () => {
      this.roomListeners.delete(callback);
    };
  }

  public subscribeToasts(callback: (toast: MultiplayerToastMsg) => void) {
    this.toastListeners.add(callback);
    return () => {
      this.toastListeners.delete(callback);
    };
  }

  public onMatchStart(callback: () => void) {
    this.matchStartListeners.add(callback);
    return () => {
      this.matchStartListeners.delete(callback);
    };
  }

  public onMatchEnd(callback: (endedBy: string, room: RoomState) => void) {
    this.matchEndListeners.add(callback);
    return () => {
      this.matchEndListeners.delete(callback);
    };
  }

  public onRematch(callback: (room: RoomState) => void) {
    this.rematchListeners.add(callback);
    return () => {
      this.rematchListeners.delete(callback);
    };
  }

  public async endMatch(endedBy?: string) {
    if (!this.room) return;
    const name = endedBy || this.profile.name;
    const me = this.room.players[this.profile.id];
    const updatedPlayers = {
      ...this.room.players,
      ...(me ? {
        [this.profile.id]: {
          ...me,
          status: 'timeout' as const,
          lastActive: Date.now(),
        }
      } : {})
    };

    const updatedRoom: RoomState = {
      ...this.room,
      status: 'ended',
      endedBy: name,
      players: updatedPlayers,
    };

    this.applyRoomUpdate(updatedRoom);
    this.broadcastChannel?.postMessage({ type: 'MATCH_END', room: updatedRoom, endedBy: name });
    this.notifyMatchEnd(name, updatedRoom);

    try {
      await fetch('/api/rooms/end-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
          endedBy: name,
        }),
      });
    } catch {}
  }

  public async rematchRoom() {
    if (!this.room) return;
    const isHost = this.room.hostId === this.profile.id;
    if (!isHost) return;

    const resetPlayers: Record<string, RoomPlayer> = {};
    Object.values(this.room.players).forEach(p => {
      const host = p.id === this.room!.hostId;
      resetPlayers[p.id] = {
        ...p,
        score: 0,
        stage: 1,
        level: 1,
        status: host ? 'ready' : 'waiting',
        isReady: host,
      };
    });

    const updatedRoom: RoomState = {
      ...this.room,
      status: 'waiting',
      endedBy: undefined,
      players: resetPlayers,
    };

    this.applyRoomUpdate(updatedRoom);
    this.broadcastChannel?.postMessage({ type: 'REMATCH', room: updatedRoom });
    this.notifyRematch(updatedRoom);

    try {
      await fetch('/api/rooms/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      });
    } catch {}
  }

  private notifyListeners() {
    this.roomListeners.forEach(cb => cb(this.room));
  }

  private emitToast(toast: MultiplayerToastMsg) {
    this.toastListeners.forEach(cb => cb(toast));
  }

  private notifyMatchStart() {
    this.matchStartListeners.forEach(cb => cb());
  }

  private notifyMatchEnd(endedBy: string, room: RoomState) {
    this.matchEndListeners.forEach(cb => cb(endedBy, room));
  }

  private notifyRematch(room: RoomState) {
    this.rematchListeners.forEach(cb => cb(room));
  }
}

export const multiplayerService = new MultiplayerService();
export default multiplayerService;

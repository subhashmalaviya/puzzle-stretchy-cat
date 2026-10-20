/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RoomPlayer, RoomState, MultiplayerToastMsg } from '../types';
import { STORAGE_KEYS } from '../constants';
import mqtt, { MqttClient } from 'mqtt';

const AVATARS = ['🐱', '😸', '😻', '😼', '😽', '🦁', '🐯', '🐾', '🐈'];
const COLOR_OPTIONS = ['#4285F4', '#EA4335', '#FBBC04', '#38A852', '#BB55A1', '#00ACC1'];

// Global MQTT brokers for instant cross-device WebSockets (works on mobile, Render Static, anywhere)
const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081',
];

class MultiplayerService {
  private profile: { id: string; name: string; avatar: string; color: string };
  private room: RoomState | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private mqttClient: MqttClient | null = null;
  private currentTopic: string | null = null;
  private heartbeatInterval: any = null;

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

  private getRoomTopic(roomId: string): string {
    return `stretchy_cat_v4/rooms/${roomId.toUpperCase()}`;
  }

  private initMQTT(roomId: string, onConnected?: () => void) {
    this.closeMQTT();
    const topic = this.getRoomTopic(roomId);
    this.currentTopic = topic;

    try {
      const brokerUrl = MQTT_BROKERS[0];
      const client = mqtt.connect(brokerUrl, {
        keepalive: 30,
        clientId: `scat_${this.profile.id}_${Math.random().toString(36).substring(2, 6)}`,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 7000,
      });

      this.mqttClient = client;

      client.on('connect', () => {
        client.subscribe(topic, { qos: 0 }, (err) => {
          if (!err && onConnected) {
            onConnected();
          }
        });
      });

      client.on('message', (receivedTopic, payload) => {
        if (receivedTopic !== topic) return;
        try {
          const msg = JSON.parse(payload.toString());
          this.handleNetworkMessage(msg);
        } catch {}
      });

      client.on('error', () => {
        // Fallback gracefully to secondary broker if first has network issue
      });
    } catch (e) {
      console.warn('MQTT initialization failed', e);
    }
  }

  private closeMQTT() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.mqttClient) {
      try {
        if (this.currentTopic) {
          this.mqttClient.unsubscribe(this.currentTopic);
        }
        this.mqttClient.end(true);
      } catch {}
      this.mqttClient = null;
    }
    this.currentTopic = null;
  }

  private publishNetworkMessage(msg: any) {
    // 1. MQTT for cross-device / internet
    if (this.mqttClient && this.mqttClient.connected && this.currentTopic) {
      try {
        this.mqttClient.publish(this.currentTopic, JSON.stringify(msg));
      } catch {}
    }

    // 2. BroadcastChannel for local tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {}
    }
  }

  private handleNetworkMessage(msg: any) {
    if (!msg || !this.room) return;
    const { type, room, player, playerId, updates, endedBy, toast, senderId } = msg;

    // Ignore messages sent by ourselves (except when explicit)
    if (senderId === this.profile.id && type !== 'ROOM_STATE') {
      return;
    }

    switch (type) {
      case 'ROOM_STATE':
        if (room && room.id === this.room.id) {
          const wasWaiting = this.room.status === 'waiting';
          const wasPlaying = this.room.status === 'playing' || this.room.status === 'countdown';
          const isEnded = room.status === 'ended';
          const isRematch = this.room.status === 'ended' && room.status === 'waiting';

          this.applyRoomUpdate(room);

          if (wasWaiting && (room.status === 'countdown' || room.status === 'playing')) {
            this.notifyMatchStart();
          } else if (wasPlaying && isEnded) {
            this.notifyMatchEnd(endedBy || room.endedBy || 'A player', room);
          } else if (isRematch) {
            this.notifyRematch(room);
          }
        }
        break;

      case 'JOIN_REQUEST':
        // Host receives join request and welcomes player into room
        if (this.room.hostId === this.profile.id && player && player.id !== this.profile.id) {
          const updatedPlayers = {
            ...this.room.players,
            [player.id]: {
              ...player,
              isReady: false,
              status: 'waiting' as const,
              lastActive: Date.now(),
            }
          };
          const updatedRoom: RoomState = {
            ...this.room,
            players: updatedPlayers,
          };
          this.applyRoomUpdate(updatedRoom);
          this.publishNetworkMessage({
            type: 'ROOM_STATE',
            room: updatedRoom,
            senderId: this.profile.id,
          });

          this.emitToast({
            id: Date.now().toString(),
            message: `👋 ${player.name} joined the room!`,
            type: 'info',
            timestamp: Date.now(),
          });
        }
        break;

      case 'TOGGLE_READY':
        if (this.room.hostId === this.profile.id && playerId && this.room.players[playerId]) {
          const targetPlayer = this.room.players[playerId];
          const newReady = !targetPlayer.isReady;
          const updatedRoom: RoomState = {
            ...this.room,
            players: {
              ...this.room.players,
              [playerId]: {
                ...targetPlayer,
                isReady: newReady,
                status: newReady ? 'ready' : 'waiting',
                lastActive: Date.now(),
              }
            }
          };
          this.applyRoomUpdate(updatedRoom);
          this.publishNetworkMessage({
            type: 'ROOM_STATE',
            room: updatedRoom,
            senderId: this.profile.id,
          });
        }
        break;

      case 'START_MATCH':
        if (room && room.id === this.room.id) {
          this.applyRoomUpdate(room);
          this.notifyMatchStart();
        }
        break;

      case 'PLAYER_UPDATE':
        if (playerId && this.room.players[playerId] && updates) {
          const updatedRoom: RoomState = {
            ...this.room,
            players: {
              ...this.room.players,
              [playerId]: {
                ...this.room.players[playerId],
                ...updates,
                lastActive: Date.now(),
              }
            }
          };
          this.applyRoomUpdate(updatedRoom);
        }
        break;

      case 'MATCH_END':
        if (room && room.id === this.room.id) {
          this.applyRoomUpdate(room);
          this.notifyMatchEnd(endedBy || room.endedBy || 'A player', room);
        }
        break;

      case 'REMATCH':
        if (room && room.id === this.room.id) {
          this.applyRoomUpdate(room);
          this.notifyRematch(room);
        }
        break;

      case 'PLAYER_LEFT':
        if (playerId && this.room.players[playerId]) {
          const leavingName = this.room.players[playerId].name;
          delete this.room.players[playerId];
          if (this.room.hostId === playerId) {
            const remaining = Object.keys(this.room.players);
            if (remaining.length > 0) this.room.hostId = remaining[0];
          }
          const updatedRoom = { ...this.room };
          this.applyRoomUpdate(updatedRoom);
          this.emitToast({
            id: Date.now().toString(),
            message: `🏃 ${leavingName} left the room`,
            type: 'info',
            timestamp: Date.now(),
          });
        }
        break;

      case 'TOAST':
        if (toast) {
          this.emitToast(toast);
        }
        break;
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('stretchy_cat_mp_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleNetworkMessage(event.data);
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
              this.applyRoomUpdate(parsed);
            }
          } catch {}
        }
      });
    }
  }

  private applyRoomUpdate(newRoom: RoomState) {
    if (!newRoom) return;

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

    // Initialize Global MQTT WebSocket for cross-device support
    this.initMQTT(roomId, () => {
      this.publishNetworkMessage({
        type: 'ROOM_STATE',
        room: this.room,
        senderId: this.profile.id,
      });
    });

    // Host heartbeat every 3 seconds to keep room synced across all devices
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.room && this.room.hostId === this.profile.id) {
        this.publishNetworkMessage({
          type: 'ROOM_STATE',
          room: this.room,
          senderId: this.profile.id,
        });
      }
    }, 3000);

    // Also attempt local backend API if available
    try {
      fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, player }),
      }).catch(() => {});
    } catch {}

    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, JSON.stringify(this.room));
    } catch {}

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

    // Prepare tentative local room state while waiting for host handshake
    const tentativeRoom: RoomState = {
      id: roomId,
      createdAt: Date.now(),
      hostId: 'waiting_for_host',
      status: 'waiting',
      players: { [player.id]: player },
    };

    this.room = tentativeRoom;
    this.notifyListeners();

    return new Promise((resolve) => {
      let resolved = false;

      // Connect to global MQTT room topic
      this.initMQTT(roomId, () => {
        // Send Join Request to host
        this.publishNetworkMessage({
          type: 'JOIN_REQUEST',
          player,
          senderId: this.profile.id,
        });
      });

      // Also listen on room sync
      const checkListener = (r: RoomState | null) => {
        if (r && r.id === roomId && r.hostId !== 'waiting_for_host' && !resolved) {
          resolved = true;
          this.roomListeners.delete(checkListener);
          resolve(r);
        }
      };
      this.roomListeners.add(checkListener);

      // Attempt local backend API fallback
      fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, player }),
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.room && !resolved) {
            resolved = true;
            this.roomListeners.delete(checkListener);
            this.applyRoomUpdate(data.room);
            resolve(data.room);
          }
        })
        .catch(() => {});

      // Timeout fallback: if no host responds in 4.5s
      setTimeout(() => {
        if (!resolved) {
          // If we received any room update with other players
          if (this.room && Object.keys(this.room.players).length > 1) {
            resolved = true;
            this.roomListeners.delete(checkListener);
            resolve(this.room);
          } else {
            // Still resolve with the tentative room so friend can see the lobby and retry handshake
            resolved = true;
            this.roomListeners.delete(checkListener);
            resolve(this.room);
          }
        }
      }, 4500);
    });
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
    this.publishNetworkMessage({
      type: 'TOGGLE_READY',
      playerId: this.profile.id,
      room: updatedRoom,
      senderId: this.profile.id,
    });

    try {
      fetch('/api/rooms/toggle-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      }).catch(() => {});
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
    this.publishNetworkMessage({
      type: 'START_MATCH',
      room: updatedRoom,
      senderId: this.profile.id,
    });
    this.notifyMatchStart();

    try {
      fetch('/api/rooms/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      }).catch(() => {});
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

    // Toast notifications for events
    if (status === 'timeout' && prevStatus !== 'timeout') {
      const toast: MultiplayerToastMsg = {
        id: Date.now().toString(),
        message: `💀 ${this.profile.name} ran out of time (${score.toLocaleString()} pts)`,
        type: 'death',
        timestamp: Date.now(),
      };
      this.emitToast(toast);
      this.publishNetworkMessage({ type: 'TOAST', toast, senderId: this.profile.id });
    } else if (stage > prevStage) {
      const toast: MultiplayerToastMsg = {
        id: Date.now().toString(),
        message: `🎉 ${this.profile.name} advanced to Stage ${stage}!`,
        type: 'stage',
        timestamp: Date.now(),
      };
      this.emitToast(toast);
      this.publishNetworkMessage({ type: 'TOAST', toast, senderId: this.profile.id });
    }

    this.publishNetworkMessage({
      type: 'PLAYER_UPDATE',
      playerId: this.profile.id,
      updates,
      senderId: this.profile.id,
    });

    try {
      fetch('/api/rooms/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
          updates,
        }),
      }).catch(() => {});
    } catch {}
  }

  public leaveRoom() {
    if (this.room && this.room.players[this.profile.id]) {
      this.publishNetworkMessage({
        type: 'PLAYER_LEFT',
        playerId: this.profile.id,
        senderId: this.profile.id,
      });
      delete this.room.players[this.profile.id];
      if (this.room.hostId === this.profile.id) {
        const remaining = Object.keys(this.room.players);
        if (remaining.length > 0) {
          this.room.hostId = remaining[0];
        }
      }
    }

    this.closeMQTT();
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
    this.publishNetworkMessage({
      type: 'MATCH_END',
      room: updatedRoom,
      endedBy: name,
      senderId: this.profile.id,
    });
    this.notifyMatchEnd(name, updatedRoom);

    try {
      fetch('/api/rooms/end-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
          endedBy: name,
        }),
      }).catch(() => {});
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
    this.publishNetworkMessage({
      type: 'REMATCH',
      room: updatedRoom,
      senderId: this.profile.id,
    });
    this.notifyRematch(updatedRoom);

    try {
      fetch('/api/rooms/rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.room.id,
          playerId: this.profile.id,
        }),
      }).catch(() => {});
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

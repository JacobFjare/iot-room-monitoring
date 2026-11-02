
import {
  Injectable,
  OnDestroy,
  signal
} from '@angular/core';

import { Room } from '../models/room';

type ConnectionStatus =
  'connecting' | 'connected' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class RoomData implements OnDestroy {

  private roomsSignal = signal<Room[]>([]);
  readonly rooms = this.roomsSignal.asReadonly();

  private statusSignal =
    signal<ConnectionStatus>('connecting');

  readonly status = this.statusSignal.asReadonly();

  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.destroyed) return;

    this.statusSignal.set('connecting');

    const protocol =
      location.protocol === 'https:' ? 'wss:' : 'ws:';

    this.socket = new WebSocket(
      `${protocol}//${location.host}/ws`
    );

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.statusSignal.set('connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const rooms: Room[] = JSON.parse(event.data);
        this.roomsSignal.set(rooms);
      } catch (error) {
        console.error('Invalid room data:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      if (this.destroyed) return;

      console.log('WebSocket disconnected');
      this.statusSignal.set('disconnected');

      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.destroyed) {
      return;
    }

    console.log('Reconnecting in 3 seconds...');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 3000);
  }

  ngOnDestroy() {
    this.destroyed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.socket?.close();
  }
}


import {
  Component,
  OnInit,
  OnDestroy,
  signal,
} from '@angular/core';

interface Room {
  id: number;
  name: string;
  occupied: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {

  // Stores the rooms received from the backend
  rooms = signal<Room[]>([]);

  private socket?: WebSocket;

  ngOnInit() {

    // Use secure WebSockets when the website uses HTTPS
    const protocol =
      location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Connect through Angular's development proxy
    this.socket = new WebSocket(
      `${protocol}//${location.host}/ws`
    );

    this.socket.onopen = () => {
      console.log('Connected to backend WebSocket');
    };

    this.socket.onmessage = (event) => {

      // Convert the JSON string into JavaScript objects
      const rooms: Room[] = JSON.parse(event.data);

      // Update Angular's room state
      this.rooms.set(rooms);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }

  ngOnDestroy() {
    this.socket?.close();
  }
}
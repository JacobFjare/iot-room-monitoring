
import {
  Component,
  inject
} from '@angular/core';

import { RoomData } from './services/room';

import {
  RoomCard
} from './components/room-card/room-card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RoomCard],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly roomData = inject(RoomData);
  readonly rooms = this.roomData.rooms;
}

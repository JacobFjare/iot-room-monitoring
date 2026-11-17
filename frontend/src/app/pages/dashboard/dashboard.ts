
import {
  Component,
  inject
} from '@angular/core';

import { RoomData } from '../../services/room';

import {
  RoomCard
} from '../../components/room-card/room-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RoomCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {
  readonly roomData = inject(RoomData);
  readonly rooms = this.roomData.rooms;
}

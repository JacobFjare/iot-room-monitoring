
import {
  Component,
  computed,
  inject,
  input
} from '@angular/core';

import { Room } from '../../models/room';
import { Clock } from '../../services/clock';

@Component({
  selector: 'app-room-card',
  standalone: true,
  templateUrl: './room-card.html',
  styleUrl: './room-card.scss'
})
export class RoomCard {

  // Room passed in by the parent component
  readonly room = input.required<Room>();

  readonly clock = inject(Clock);

  readonly statusClass = computed(() => {
    const room = this.room();

    const minutes =
      this.clock.minutesSince(room.stateSince);

    if (minutes === null) {
      return 'unknown';
    }

    if (room.occupied) {
      return 'occupied';
    }

    return minutes < 15
      ? 'recently-vacant'
      : 'vacant';
  });
}

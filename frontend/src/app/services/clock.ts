
import {
  Injectable,
  DestroyRef,
  inject,
  signal
} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Clock {

  readonly now = signal(Date.now());

  private destroyRef = inject(DestroyRef);

  constructor() {
    const interval = setInterval(() => {
      this.now.set(Date.now());
    }, 10000);

    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
    });
  }

  minutesSince(timestamp: string | null): number | null {
    if (!timestamp) {
      return null;
    }

    const elapsed = this.now() - new Date(timestamp).getTime();

    if (!Number.isFinite(elapsed)) {
      return null;
    }

    return Math.max(0, Math.floor(elapsed / 60000));
  }

  formatDuration(timestamp: string | null): string {
    const minutes = this.minutesSince(timestamp);

    if (minutes === null) {
      return 'Unknown';
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours} h ${minutes % 60} min`;
  }
}

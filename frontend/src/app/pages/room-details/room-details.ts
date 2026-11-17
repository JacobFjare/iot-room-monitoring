
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { forkJoin, EMPTY, switchMap, tap, catchError } from 'rxjs';

import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

import { StatisticsService } from '../../services/statistics';
import {
  DailyStatistics,
  HourlyStatistics
} from '../../models/statistics';

@Component({
  selector: 'app-room-details',
  standalone: true,
  imports: [RouterLink, BaseChartDirective],
  templateUrl: './room-details.html',
  styleUrl: './room-details.scss'
})
export class RoomDetails {

  private readonly route = inject(ActivatedRoute);
  private readonly statisticsService = inject(StatisticsService);

  readonly roomId = signal('');
  readonly loading = signal(true);
  readonly error = signal('');

  readonly daily = signal<DailyStatistics | null>(null);
  readonly monthly = signal<HourlyStatistics | null>(null);

  // Last 7 days: convert minutes into hours for display
  readonly dailyChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.daily()?.data ?? [];

    return {
      labels: rows.map(row => row.date),
      datasets: [{
        label: 'Occupied hours',
        data: rows.map(row =>
          Math.round(row.occupiedMinutes / 60 * 100) / 100
        ),
        backgroundColor: '#3b82f6'
      }]
    };
  });

  // Monthly average: 24 hourly buckets
  readonly monthlyChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.monthly()?.data ?? [];

    return {
      labels: rows.map(row => row.hour),
      datasets: [{
        label: 'Average occupied minutes',
        data: rows.map(row => row.averageOccupiedMinutes ?? 0),
        backgroundColor: '#22c55e'
      }]
    };
  });

  readonly dailyOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Hours occupied' }
      }
    }
  };

  readonly monthlyOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 60,
        title: { display: true, text: 'Average minutes' }
      },
      x: {
        ticks: { maxTicksLimit: 12 }
      }
    }
  };

  constructor() {
    this.route.paramMap.pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set('');
        this.daily.set(null);
        this.monthly.set(null);
      }),

      switchMap(params => {
        const deviceId = params.get('deviceId') ?? '';
        this.roomId.set(deviceId);

        return forkJoin({
          daily: this.statisticsService.getDaily(deviceId),
          monthly: this.statisticsService.getMonthly(deviceId)
        }).pipe(
          catchError(error => {
            console.error('Statistics request failed:', error);

            this.error.set(
              error.status === 404
                ? 'Room not found'
                : 'Could not load room statistics'
            );

            this.loading.set(false);
            return EMPTY;
          })
        );
      }),

      takeUntilDestroyed()
    ).subscribe(result => {
      this.daily.set(result.daily);
      this.monthly.set(result.monthly);
      this.loading.set(false);
    });
  }
}

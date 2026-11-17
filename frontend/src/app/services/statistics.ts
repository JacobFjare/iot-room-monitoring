
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  DailyStatistics,
  HourlyStatistics
} from '../models/statistics';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  private readonly http = inject(HttpClient);

  getDaily(deviceId: string) {
    return this.http.get<DailyStatistics>(
      `/api/rooms/${encodeURIComponent(deviceId)}/statistics`,
      {
        params: {
          period: '7d',
          view: 'daily'
        }
      }
    );
  }

  getMonthly(deviceId: string) {
    return this.http.get<HourlyStatistics>(
      `/api/rooms/${encodeURIComponent(deviceId)}/statistics`,
      {
        params: {
          period: 'month',
          view: 'hourly'
        }
      }
    );
  }
}

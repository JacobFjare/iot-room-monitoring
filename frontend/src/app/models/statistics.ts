export interface DailyStatistics {
  deviceId: string;
  name: string;
  period: '7d';
  view: 'daily';
  timezone: string;
  data: {
    date: string;
    occupiedMinutes: number;
  }[];
}

export interface HourlyStatistics {
  deviceId: string;
  name: string;
  period: 'month';
  view: 'hourly';
  timezone: string;
  daysIncluded: number;
  data: {
    hour: string;
    averageOccupiedMinutes: number | null;
  }[];
}


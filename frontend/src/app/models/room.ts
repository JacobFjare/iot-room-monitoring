
export interface Room {
  deviceId: string;
  name: string;
  occupied: boolean;
  stateSince: string | null;
  lastSeenAt: string | null;
}

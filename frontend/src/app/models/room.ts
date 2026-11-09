
export interface Room {
  deviceId: string;
  name: string;
  occupied: boolean | null;
  stateSince: string | null;
  lastSeenAt: string | null;
}

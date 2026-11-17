import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { RoomDetails } from './pages/room-details/room-details';

export const routes: Routes = [
  {
    path: '',
    component: Dashboard
  },
  {
    path: 'rooms/:deviceId',
    component: RoomDetails
  },
  {
    path: '**',
    redirectTo: ''
  }
];

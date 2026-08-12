import { PhotocopyRequest, UserAccount } from '../types';

export const INITIAL_REQUESTS: PhotocopyRequest[] = [];

export const ALLOWED_STAFF_EMAILS = [
  'dini@lazuardi.sch.id',
  'sari@lazuardi.sch.id',
  'saidi@lazuardi.sch.id'
];

export const DEMO_USERS: UserAccount[] = [
  {
    id: 'user-dini',
    name: 'Dini Rahmadani',
    email: 'dini@lazuardi.sch.id',
    username: 'dini',
    role: 'ADMIN',
    title: 'Administrator System & Pengelola'
  },
  {
    id: 'user-sari',
    name: 'Sari Kusuma Dewi',
    email: 'sari@lazuardi.sch.id',
    username: 'sari',
    role: 'KEPSEK',
    title: 'Kepala SD Lazuardi'
  },
  {
    id: 'user-saidi',
    name: 'Saidi Fatulloh',
    email: 'saidi@lazuardi.sch.id',
    username: 'saidi',
    role: 'ADMIN',
    title: 'Administrator System & Pengelola'
  }
];

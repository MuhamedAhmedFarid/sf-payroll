
export enum Role {
  Admin,
  Rep,
}

export interface User {
  id: string;
  username: string; // Used for login
  name: string; // Used for display
  alias?: string | null;
  password?: string; // Password is used for auth, but shouldn't be passed around
  role: Role;
  status?: string | null;
}

export interface WorkRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  talkTime: string; // MM:SS
  waitTime: string; // MM:SS
  ratePerHour: number;
  setsAdded: number;
  breakMinutes: number;
  meetingMinutes: number;
  morning_meetings: number;
  moes_total: number;
  training: boolean;
  payment_status: string; // 'unpaid', 'pending', 'paid'
  payment_batch_id: string | null;
}

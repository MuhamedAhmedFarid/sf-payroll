
/**
 * Parses a time string in H:M:S format into total seconds.
 * Supports partial inputs like "4" (4 hours) or "4:30" (4 hours, 30 minutes).
 * @param time - The time string, e.g., "4:30:15"
 * @returns Total number of seconds.
 */
export const parseHHMMSS = (time: string): number => {
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':').map(part => parseInt(part, 10) || 0);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Formats a total number of seconds into an HH:MM:SS string.
 * @param totalSeconds - The total number of seconds.
 * @returns A formatted time string, e.g., "01:15:45".
 */
export const formatSeconds = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Calculates the total payment based on active hours, meeting time, and rate.
 * Supports a combination of hourly and per-set payment models.
 * @param activeSeconds - Total active work time in seconds.
 * @param meetingMinutes - Total meeting time in minutes.
 * @param breakMinutes - Total break time in minutes.
 * @param morningMeetingMinutes - Total morning meeting time in minutes.
 * @param ratePerHour - The hourly pay rate.
 * @param setsAdded - The number of sets added.
 * @returns The calculated total payment.
 */
export const calculatePayment = (
  activeSeconds: number,
  meetingMinutes: number,
  breakMinutes: number,
  morningMeetingMinutes: number = 0,
  ratePerHour: number,
  setsAdded: number
): number => {
  const mMM = morningMeetingMinutes || 0;
  if (
    isNaN(activeSeconds) ||
    isNaN(meetingMinutes) ||
    isNaN(breakMinutes) ||
    isNaN(mMM) ||
    isNaN(ratePerHour) ||
    isNaN(setsAdded)
  ) {
    return 0;
  }

  // Calculate time-based pay (includes paid breaks)
  const activeHours = activeSeconds / 3600;
  const meetingHours = meetingMinutes / 60;
  const breakHours = breakMinutes / 60;
  const morningMeetingHours = mMM / 60;
  const totalHours = activeHours + meetingHours + breakHours + morningMeetingHours;
  const hourlyPay = totalHours * (ratePerHour || 0);

  // Calculate set-based pay
  const perSetPay = (setsAdded || 0) * 20;
  
  // Return the sum of both
  return hourlyPay + perSetPay;
};

/**
 * Calculates the "Reps" bonus value based on performance metrics.
 * @param activeSeconds - Total active work time in seconds.
 * @param setsAdded - The number of sets added.
 * @param breakMinutes - Total break time in minutes.
 * @param meetingMinutes - Total meeting time in minutes.
 * @param morningMeetingMinutes - Total morning meeting time in minutes.
 * @param isTraining - Whether this is a training session (overrides to 0).
 * @returns The calculated "Reps" bonus value.
 */
export const calculateRepsValue = (
  activeSeconds: number,
  setsAdded: number,
  breakMinutes: number,
  meetingMinutes: number,
  morningMeetingMinutes: number = 0,
  isTraining: boolean = false
): number => {
  if (isTraining) return 0;

  const mMM = morningMeetingMinutes || 0;
  const activeHours = activeSeconds / 3600;
  const baseRepsValue = activeHours * 2;
  const setsBonus = (setsAdded || 0) * 5;
  const breaksBonus = ((breakMinutes || 0) / 60) * 2;
  const meetingsBonus = ((meetingMinutes || 0) / 60) * 2;
  const morningMeetingsBonus = (mMM / 60) * 2;
  return baseRepsValue + setsBonus + breaksBonus + meetingsBonus + morningMeetingsBonus;
};

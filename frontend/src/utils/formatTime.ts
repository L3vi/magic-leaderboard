/**
 * Format minutes into human-readable time format
 * @param minutes - The number of minutes to format
 * @returns A formatted string like "2d 3h 45m" or just "45m" for small values
 */
export const formatPlayTime = (minutes: number): string => {
  if (minutes === 0) return "0m";

  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.join(" ");
};

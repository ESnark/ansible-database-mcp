import { Request, Response, NextFunction } from 'express';

/**
 * Off-hours middleware configuration
 *
 * Environment variables:
 *   - OFF_HOURS: Time range in "HH:MM-HH:MM" format (24-hour)
 *   - OFF_HOURS_MESSAGE: Custom message to display during off-hours
 *
 * Examples:
 *   - "18:00-09:00" (6pm to 9am next day - overnight)
 *   - "12:00-13:00" (noon to 1pm - lunch break)
 *   - "22:00-06:00" (10pm to 6am - night hours)
 */

const DEFAULT_OFF_HOURS_MESSAGE = '🏠 퇴근 시간입니다! 일은 내일 하세요.';

interface TimeRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/**
 * Parse time range string into structured format
 * @param timeRange - Time range in "HH:MM-HH:MM" format
 * @returns Parsed time range or null if invalid
 */
function parseTimeRange(timeRange: string): TimeRange | null {
  const pattern = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
  const match = timeRange.trim().match(pattern);

  if (!match) {
    return null;
  }

  const startHour = parseInt(match[1]!, 10);
  const startMinute = parseInt(match[2]!, 10);
  const endHour = parseInt(match[3]!, 10);
  const endMinute = parseInt(match[4]!, 10);

  // Validate ranges
  if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
    return null;
  }
  if (startMinute < 0 || startMinute > 59 || endMinute < 0 || endMinute > 59) {
    return null;
  }

  return { startHour, startMinute, endHour, endMinute };
}

/**
 * Convert time to minutes since midnight for easier comparison
 */
function timeToMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/**
 * Check if current time is within the blocked time range
 * Handles overnight ranges (e.g., 18:00-09:00)
 */
function isWithinBlockedTime(range: TimeRange, now: Date = new Date()): boolean {
  const currentMinutes = timeToMinutes(now.getHours(), now.getMinutes());
  const startMinutes = timeToMinutes(range.startHour, range.startMinute);
  const endMinutes = timeToMinutes(range.endHour, range.endMinute);

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 12:00-13:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight range (e.g., 18:00-09:00)
    // Blocked if: after start time OR before end time
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Get the configured off-hours time range
 */
export function getOffHoursConfig(): TimeRange | null {
  const offHours = process.env.OFF_HOURS;

  if (!offHours) {
    return null;
  }

  const range = parseTimeRange(offHours);

  if (!range) {
    console.warn(`⚠️  Invalid OFF_HOURS format: "${offHours}". Expected "HH:MM-HH:MM" (e.g., "18:00-09:00")`);
    return null;
  }

  return range;
}

/**
 * Get the configured off-hours message
 */
export function getOffHoursMessage(): string {
  return process.env.OFF_HOURS_MESSAGE || DEFAULT_OFF_HOURS_MESSAGE;
}

/**
 * Format time range for display
 */
function formatTimeRange(range: TimeRange): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(range.startHour)}:${pad(range.startMinute)} ~ ${pad(range.endHour)}:${pad(range.endMinute)}`;
}

/**
 * Off-hours middleware
 * Blocks all requests during configured off-hours and returns a "go home" message
 */
export function offHoursMiddleware(req: Request, res: Response, next: NextFunction): void {
  const range = getOffHoursConfig();

  // No off-hours configured, proceed normally
  if (!range) {
    next();
    return;
  }

  // Check if current time is within blocked hours
  if (isWithinBlockedTime(range)) {
    const timeRangeStr = formatTimeRange(range);
    const message = getOffHoursMessage();

    console.log(`🌙 Request blocked during off-hours (${timeRangeStr})`);

    res.status(503).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message,
        data: {
          reason: 'off-hours',
          blockedTimeRange: timeRangeStr,
        }
      },
      id: null
    });
    return;
  }

  next();
}

/**
 * Log off-hours configuration at startup
 */
export function logOffHoursConfig(): void {
  const range = getOffHoursConfig();

  if (range) {
    console.log(`🌙 Off-hours: ${formatTimeRange(range)} (requests will be blocked)`);
  }
}

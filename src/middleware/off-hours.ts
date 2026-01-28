import { Request, Response, NextFunction } from 'express';

/**
 * Off-hours middleware configuration
 *
 * Environment variables:
 *   - OFF_HOURS: Time range in "HH:MM-HH:MM" format (24-hour)
 *   - OFF_HOURS_TZ: Timezone for off-hours (e.g., "Asia/Seoul", "UTC"). Defaults to UTC.
 *   - OFF_HOURS_MESSAGE: Custom message to display during off-hours
 *
 * Examples:
 *   - "18:00-09:00" (6pm to 9am next day - overnight)
 *   - "12:00-13:00" (noon to 1pm - lunch break)
 *   - "22:00-06:00" (10pm to 6am - night hours)
 */

const DEFAULT_OFF_HOURS_MESSAGE = 'Service is unavailable during off-hours. Please try again later.';

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
 * Get current time in configured timezone
 */
function getCurrentTimeInTimezone(): { hours: number; minutes: number } {
  const timezone = process.env.OFF_HOURS_TZ || 'UTC';
  const now = new Date();

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

    return { hours, minutes };
  } catch {
    // Fallback to UTC if timezone is invalid
    console.warn(`⚠️  Invalid timezone: "${timezone}", falling back to UTC`);
    return { hours: now.getUTCHours(), minutes: now.getUTCMinutes() };
  }
}

/**
 * Check if current time is within the blocked time range
 * Handles overnight ranges (e.g., 18:00-09:00)
 */
function isWithinBlockedTime(range: TimeRange): boolean {
  const { hours, minutes } = getCurrentTimeInTimezone();
  const currentMinutes = timeToMinutes(hours, minutes);
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

// MCP methods that should be blocked during off-hours (actual operations)
const BLOCKED_MCP_METHODS = [
  'tools/call',
];

/**
 * Off-hours middleware
 * Blocks tool calls during configured off-hours while keeping connection alive
 * Note: Health check endpoint and MCP handshake are always allowed
 */
export function offHoursMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Always allow health check endpoint for load balancer/gateway health checks
  if (req.path === '/health') {
    next();
    return;
  }

  const range = getOffHoursConfig();

  // No off-hours configured, proceed normally
  if (!range) {
    next();
    return;
  }

  // Check if current time is within blocked hours
  if (isWithinBlockedTime(range)) {
    // Check the MCP method from request body
    const method = req.body?.method;

    // Only block specific operational methods during off-hours
    if (method && BLOCKED_MCP_METHODS.some(blocked => method.startsWith(blocked))) {
      const timeRangeStr = formatTimeRange(range);
      const timezone = process.env.OFF_HOURS_TZ || 'UTC';
      const message = getOffHoursMessage();

      console.log(`🌙 Method "${method}" blocked during off-hours (${timeRangeStr} ${timezone})`);

      // Return HTTP 200 with JSON-RPC error (per JSON-RPC spec)
      res.status(200).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message,
          data: {
            reason: 'off-hours',
            blockedTimeRange: `${timeRangeStr} ${timezone}`,
            blockedMethod: method,
          }
        },
        id: req.body?.id ?? null
      });
      return;
    }
  }

  next();
}

/**
 * Log off-hours configuration at startup
 */
export function logOffHoursConfig(): void {
  const range = getOffHoursConfig();

  if (range) {
    const timezone = process.env.OFF_HOURS_TZ || 'UTC';
    console.log(`🌙 Off-hours: ${formatTimeRange(range)} ${timezone} (requests will be blocked)`);
  }
}

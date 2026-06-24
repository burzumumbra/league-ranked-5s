import { END_HOUR, START_HOUR } from "./regions.js";

const WEEKDAY = { SUN: 0, MON: 1, SAT: 6 };

function getZonedParts(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      weekday: "short",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? 0 : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: weekdayMap[parts.weekday],
  };
}

function minutesSinceMidnight({ hour, minute }) {
  return hour * 60 + minute;
}

/** Queue is open Sat/Sun 8 PM – 1 AM in the region's local timezone. */
export function isQueueOpen(date, timeZone) {
  const z = getZonedParts(date, timeZone);
  const mins = minutesSinceMidnight(z);

  const afterStart = mins >= START_HOUR * 60;
  const beforeEnd = mins < END_HOUR * 60;

  if (beforeEnd) {
    return z.weekday === WEEKDAY.SUN || z.weekday === WEEKDAY.MON;
  }

  if (afterStart) {
    return z.weekday === WEEKDAY.SAT || z.weekday === WEEKDAY.SUN;
  }

  return false;
}

function makeUtcDateFromZoned(timeZone, { year, month, day, hour, minute = 0, second = 0 }) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const asZoned = getZonedParts(guess, timeZone);
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  const actual = Date.UTC(asZoned.year, asZoned.month - 1, asZoned.day, asZoned.hour, asZoned.minute, asZoned.second);
  return new Date(guess.getTime() + (desired - actual));
}

function nextWeekendStartAfter(date, timeZone) {
  const z = getZonedParts(date, timeZone);
  const mins = minutesSinceMidnight(z);

  const candidates = [];

  for (let offset = 0; offset <= 7; offset += 1) {
    const probe = new Date(date.getTime() + offset * 86_400_000);
    const p = getZonedParts(probe, timeZone);

    if (p.weekday !== WEEKDAY.SAT && p.weekday !== WEEKDAY.SUN) continue;

    const start = makeUtcDateFromZoned(timeZone, {
      year: p.year,
      month: p.month,
      day: p.day,
      hour: START_HOUR,
      minute: 0,
      second: 0,
    });

    if (offset === 0) {
      const sameDay = p.year === z.year && p.month === z.month && p.day === z.day;
      if (sameDay && mins >= START_HOUR * 60) continue;
    }

    if (start > date) {
      candidates.push(start);
    }
  }

  return candidates.sort((a, b) => a - b)[0] ?? null;
}

function currentWindowEnd(date, timeZone) {
  const z = getZonedParts(date, timeZone);
  const mins = minutesSinceMidnight(z);

  let endDay = { year: z.year, month: z.month, day: z.day };

  if (mins >= START_HOUR * 60) {
    const next = new Date(makeUtcDateFromZoned(timeZone, { ...endDay, hour: 12 }).getTime() + 86_400_000);
    const nz = getZonedParts(next, timeZone);
    endDay = { year: nz.year, month: nz.month, day: nz.day };
  }

  return makeUtcDateFromZoned(timeZone, {
    ...endDay,
    hour: END_HOUR,
    minute: 0,
    second: 0,
  });
}

export function getQueueStatus(date, timeZone) {
  if (isQueueOpen(date, timeZone)) {
    return {
      open: true,
      nextEvent: currentWindowEnd(date, timeZone),
      eventType: "closes",
    };
  }

  return {
    open: false,
    nextEvent: nextWeekendStartAfter(date, timeZone),
    eventType: "opens",
  };
}

export function formatDuration(ms) {
  const segments = parseDurationSegments(ms);
  const parts = [];
  if (segments.days > 0) parts.push(`${segments.days}d`);
  parts.push(`${segments.hours}h`);
  parts.push(`${segments.minutes.toString().padStart(2, "0")}m`);
  parts.push(`${segments.seconds.toString().padStart(2, "0")}s`);
  return parts.join(" ");
}

export function parseDurationSegments(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function formatTime(date, timeZone, options = {}) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: options.weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: options.timeZoneName ?? "short",
  }).format(date);
}

export function formatWindowInZone(timeZone, userZone) {
  const refSaturday = makeUtcDateFromZoned(timeZone, {
    year: 2026,
    month: 6,
    day: 27,
    hour: START_HOUR,
    minute: 0,
  });
  const refEnd = makeUtcDateFromZoned(timeZone, {
    year: 2026,
    month: 6,
    day: 28,
    hour: END_HOUR,
    minute: 0,
  });

  const start = formatTime(refSaturday, userZone, { timeZoneName: "short" });
  const end = formatTime(refEnd, userZone, { timeZoneName: "short" });
  return `${start} → ${end}`;
}

export function formatServerWindow(abbr) {
  return `Sat & Sun · 8:00 PM – 1:00 AM ${abbr}`;
}

export function getSupportedTimezones() {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone").sort();
  }

  return [
    "America/Chicago",
    "America/Los_Angeles",
    "America/New_York",
    "America/Mexico_City",
    "America/Santiago",
    "America/Sao_Paulo",
    "Europe/Berlin",
    "Europe/London",
    "Europe/Istanbul",
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Asia/Taipei",
    "Asia/Ho_Chi_Minh",
    "Asia/Riyadh",
    "Australia/Sydney",
    "UTC",
  ].sort();
}

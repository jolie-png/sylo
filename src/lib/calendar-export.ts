// ---------------------------------------------------------------------------
// .ics calendar file generation for opportunity deadlines.
// Creates a downloadable .ics file or Google Calendar link.
// ---------------------------------------------------------------------------

/**
 * Format a date as iCal YYYYMMDD (all-day event).
 */
function icsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * Format a date as the day after (for DTEND of all-day events — iCal uses exclusive end).
 */
function icsDatePlusOne(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Escape text for iCal format.
 */
function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export type CalendarEvent = {
  /** Opportunity name */
  title: string;
  /** ISO date string YYYY-MM-DD */
  deadline: string;
  /** Description / reasoning */
  description?: string;
  /** URL to the program page */
  url?: string;
};

/**
 * Generate an .ics file string for a deadline reminder.
 * Creates an all-day event on the deadline date with a 2-week-before alarm.
 */
export function generateICS(event: CalendarEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `sylo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@sylo.app`;

  const description = [
    event.description || "",
    event.url ? `\\n\\nApply here: ${event.url}` : "",
    "\\n\\nAdded from Sylo — your career roadmap.",
  ].filter(Boolean).join("");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sylo//Deadline Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${icsDate(event.deadline)}`,
    `DTEND;VALUE=DATE:${icsDatePlusOne(event.deadline)}`,
    `SUMMARY:${icsEscape(event.title)} — Application Deadline`,
    `DESCRIPTION:${icsEscape(description)}`,
    ...(event.url ? [`URL:${event.url}`] : []),
    // 2-week reminder alarm
    "BEGIN:VALARM",
    "TRIGGER:-P14D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(event.title)} deadline is in 2 weeks`,
    "END:VALARM",
    // 3-day reminder alarm
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(event.title)} deadline is in 3 days!`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Download an .ics file to the user's device.
 */
export function downloadICS(event: CalendarEvent): void {
  const ics = generateICS(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-deadline.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a Google Calendar URL for the event (opens in new tab).
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const startDate = icsDate(event.deadline);
  const endDate = icsDatePlusOne(event.deadline);
  const title = encodeURIComponent(`${event.title} — Application Deadline`);
  const details = encodeURIComponent(
    [event.description || "", event.url ? `\n\nApply: ${event.url}` : "", "\n\nAdded from Sylo"].filter(Boolean).join(""),
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}`;
}

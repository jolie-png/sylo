import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { downloadICS, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar-export";
import { cn } from "@/lib/utils";

/**
 * Small "Add to Calendar" button with a dropdown for Google Calendar or .ics download.
 * Only renders if deadline is a non-empty string.
 */
export function CalendarButton({
  name,
  deadline,
  description,
  url,
  compact = false,
}: {
  name: string;
  deadline: string;
  description?: string;
  url?: string;
  /** Compact mode: icon-only with tooltip */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!deadline) return null;

  const event: CalendarEvent = { title: name, deadline, description, url };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "tap inline-flex items-center gap-1.5 rounded-full border text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary",
          compact
            ? "h-7 w-7 justify-center border-transparent text-muted-foreground"
            : "border-foreground/15 bg-background px-3 py-1.5 text-muted-foreground",
        )}
        title="Add deadline to calendar"
        aria-label="Add to calendar"
      >
        <CalendarPlus className={cn(compact ? "h-3.5 w-3.5" : "h-3 w-3")} />
        {!compact && <span>Add to calendar</span>}
      </button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border bg-popover p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 4V2M15 4V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="15" r="1.5" fill="currentColor" />
              </svg>
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-[11px] text-muted-foreground">Opens in new tab</p>
              </div>
            </a>
            <button
              type="button"
              onClick={() => { downloadICS(event); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="font-medium">Download .ics file</p>
                <p className="text-[11px] text-muted-foreground">Apple Calendar, Outlook, etc.</p>
              </div>
            </button>
            <p className="mt-1 px-3 py-1 text-[10px] text-muted-foreground/70">
              Includes reminders at 2 weeks and 3 days before.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

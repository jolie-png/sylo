import { Link, useRouterState } from "@tanstack/react-router";
import { Map, KanbanSquare, User, ChevronDown as ChevronDownIcon, RotateCcw, Sparkles, Info, MapPin, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SyloMark } from "@/components/SyloMark";
import type { StepStatus } from "@/lib/wayfind-data";



const NAV = [
  { to: "/paths", label: "Success Maps", icon: Sparkles },
  { to: "/dashboard", label: "Roadmap", icon: Map },
  { to: "/pin", label: "Pin Drop", icon: MapPin },
  { to: "/progress", label: "Progress Board", icon: KanbanSquare },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/about", label: "About", icon: Info },
] as const;

export function Workspace({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen">
      <aside className="glass-panel sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r px-4 py-5 md:flex">
        <Link to="/" className="tap mb-6 flex items-center gap-2.5 rounded-full px-3 py-1.5">
          <SyloMark className="h-5 w-5" animated />
          <span className="text-lg font-semibold tracking-tight">Sylo</span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "nav-item tap",
                pathname === item.to &&
                  "bg-secondary text-foreground font-semibold",
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}

          {/* Divider + extra section */}
          <div className="my-3 border-t border-border/60" />
          <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground">For when you just want to scroll (the database you didn't ask for).</p>
          <Link
            to="/opportunity-details"
            search={{ id: undefined }}
            className={cn(
              "nav-item tap",
              pathname === "/opportunity-details" &&
                "bg-secondary text-foreground font-semibold",
            )}
          >
            <Search className="h-4 w-4" strokeWidth={1.75} />
            Opportunities
          </Link>
        </nav>
        <div className="mt-auto px-3 pb-1">
          <Link to="/roadmap-builder" className="nav-item tap px-0 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Rebuild roadmap
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <MobileHeader pathname={pathname} />
        <div
          className={cn(
            "mx-auto w-full px-4 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8 md:py-10 md:pt-10",
            wide ? "max-w-6xl" : "max-w-3xl",
          )}
        >
          <div className="glass px-6 py-7 sm:px-10 sm:py-9">{children}</div>
        </div>
      </main>
    </div>
  );
}

function MobileHeader({ pathname }: { pathname: string }) {
  return (
    <header className="glass-panel sticky top-0 z-50 flex flex-col border-b px-4 py-3 md:hidden">
      <div className="flex items-center justify-between">
        <Link to="/" className="tap flex items-center gap-2.5 rounded-full py-1">
          <SyloMark className="h-5 w-5" animated />
          <span className="text-lg font-semibold tracking-tight">Sylo</span>
        </Link>
        <Link
          to="/roadmap-builder"
          className="tap rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-xs font-medium text-primary hover:border-primary/40 hover:bg-primary/10"
        >
          Rebuild
        </Link>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "tap flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              pathname === item.to
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function PageHeader({
  icon,
  title,
  subtitle,
  meta,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  meta?: string[];
}) {
  return (
    <header className="pb-6">
      <div className="flex items-center gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
          {icon}
        </span>
        <div>
          <h1 className="text-[26px] font-bold tracking-tight sm:text-[30px]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {meta?.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {meta.map((m) => (
            <span key={m} className="tag bg-tag-gray text-tag-gray-foreground">
              {m}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function StatusTag({ status, onChange }: { status: StepStatus; onChange?: (s: StepStatus) => void }) {
  const map = {
    "not-started": { label: "Not started", cls: "bg-tag-gray text-tag-gray-foreground" },
    "in-progress": { label: "In progress", cls: "bg-tag-blue text-tag-blue-foreground" },
    complete: { label: "Complete", cls: "bg-tag-green text-tag-green-foreground" },
  } as const;
  const s = map[status];
  const [open, setOpen] = useState(false);

  if (!onChange) {
    return <span className={cn("tag", s.cls)}>{s.label}</span>;
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn("tag cursor-pointer select-none", s.cls)}
      >
        {s.label}
        <ChevronDownIcon className="ml-1 inline h-3 w-3 opacity-60" aria-hidden="true" />
      </button>
      {open && (
        <span
          className="absolute left-0 top-full z-50 mt-1 flex flex-col rounded-lg border bg-card p-1 shadow-lg"
          role="listbox"
          aria-label="Step status"
          onBlur={(e) => {
            // Close if focus leaves the dropdown entirely
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
          }}
        >
          {(Object.keys(map) as StepStatus[]).map((key) => (
            <button
              key={key}
              type="button"
              role="option"
              aria-selected={key === status}
              onClick={() => { onChange(key); setOpen(false); }}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
              className={cn(
                "tap rounded-md px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap",
                key === status ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {map[key].label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

export function Tag({
  tone = "gray",
  children,
}: {
  tone?: "gray" | "blue" | "green" | "amber";
  children: ReactNode;
}) {
  const cls = {
    gray: "bg-tag-gray text-tag-gray-foreground",
    blue: "bg-tag-blue text-tag-blue-foreground",
    green: "bg-tag-green text-tag-green-foreground",
    amber: "bg-tag-amber text-tag-amber-foreground",
  }[tone];
  return <span className={cn("tag", cls)}>{children}</span>;
}

/**
 * Marks a row that came from live search rather than Sylo's curated dataset.
 * Deliberately distinct from every other tag: the two have had different
 * levels of scrutiny applied, and a reader should always be able to tell which
 * one they're looking at.
 */
export function FoundViaSearchBadge() {
  return (
    <span className="tag border border-dotted border-primary/45 bg-primary/[0.06] text-primary/90">
      Found via search
    </span>
  );
}

/** Confidence marker for curated/verified opportunities from Sylo's dataset. */
export function CuratedBadge() {
  return (
    <span className="tag border border-solid border-green-600/40 bg-green-500/[0.08] text-green-700">
      ✓ Verified
    </span>
  );
}

/** Neutral marker for a step the student added themselves — never mixed with dataset-backed steps. */
export function OwnGoalBadge() {
  return (
    <span className="tag border border-dashed border-foreground/25 bg-transparent text-muted-foreground">
      Added by you
    </span>
  );
}

/** Marker for steps that originated from Pin Drop (screenshot/link capture). */
export function PinDropBadge() {
  return (
    <span className="tag border border-solid border-purple-400/40 bg-purple-500/[0.08] text-purple-700 dark:border-purple-600/40 dark:text-purple-300">
      From Pin Drop
    </span>
  );
}


export function NotionCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "tap mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150",
        checked ? "border-primary bg-primary" : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
      )}
    >
      {checked ? (
        <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" aria-hidden="true">
          <path d="M2.5 6.3 4.7 8.5 9.5 3.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </button>
  );
}

export function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field-tonal mb-1.5 flex items-start justify-between gap-6 rounded-xl px-3 py-2.5 text-sm last:mb-0">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 text-right">{children}</span>
    </div>
  );
}

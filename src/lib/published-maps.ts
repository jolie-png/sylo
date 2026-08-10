// ---------------------------------------------------------------------------
// Published Success Maps — community-submitted paths that went through review.
// Static JSON for MVP; replaceable with a database later.
// ---------------------------------------------------------------------------

export type StepCategory =
  | "internship"
  | "fellowship"
  | "club"
  | "project"
  | "networking"
  | "application"
  | "course"
  | "other";

export type PublishedStep = {
  timing: string;
  action: string;
  category: StepCategory;
  /** Optional: what this step unlocked or made possible. */
  unlocked?: string;
};

export type PublishedMap = {
  id: string;
  /** Display name or "Anonymous" */
  author: string;
  track: string;
  school: string;
  major: string;
  startYear: string;
  /** The outcome they reached (role + optional company/type) */
  outcome: string;
  /** Total timeline from start to outcome, e.g., "Sophomore → Senior spring" */
  timeline: string;
  steps: PublishedStep[];
  /** The one thing that mattered most */
  turningPoint: string;
  /** What they'd skip if they did it again */
  wouldSkip: string;
  /** One piece of advice for someone at step 1 */
  advice: string;
  /** ISO date when this was published */
  publishedAt: string;
  /** Whether this is a composite example (not a real single person) */
  isExample?: boolean;
};

export const STEP_CATEGORIES: { value: StepCategory; label: string; color: string }[] = [
  { value: "internship", label: "Internship", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  { value: "fellowship", label: "Fellowship", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  { value: "club", label: "Club / Org", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  { value: "project", label: "Project", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  { value: "networking", label: "Networking", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400" },
  { value: "application", label: "Application", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  { value: "course", label: "Course", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400" },
];

export function getCategoryStyle(category: StepCategory): string {
  return STEP_CATEGORIES.find((c) => c.value === category)?.color ?? STEP_CATEGORIES[7].color;
}

export function getCategoryLabel(category: StepCategory): string {
  return STEP_CATEGORIES.find((c) => c.value === category)?.label ?? "Other";
}

// ---------------------------------------------------------------------------
// Published maps dataset (static for MVP)
// ---------------------------------------------------------------------------

export const PUBLISHED_MAPS: PublishedMap[] = [
  {
    id: "example-pm-columbia",
    author: "Jordan",
    track: "product-manager",
    school: "Columbia University",
    major: "Computer Science",
    startYear: "Sophomore",
    outcome: "Associate Product Manager at Google",
    timeline: "Sophomore fall → Senior winter",
    steps: [
      {
        timing: "Sophomore fall",
        action: "Built a Chrome extension that helped 200+ students find open study rooms on campus. Shipped in 3 weeks, iterated based on user complaints.",
        category: "project",
        unlocked: "Had a real product with real users to talk about in every interview.",
      },
      {
        timing: "Sophomore spring",
        action: "Joined Columbia's product management club (CORE) and competed in their internal case competition. Our team won with a marketplace feature redesign.",
        category: "club",
        unlocked: "Learned PM frameworks (RICE, user stories) and met upperclassmen who'd done APM programs.",
      },
      {
        timing: "Junior summer",
        action: "PM externship at a Series B fintech startup through a cold email to their Head of Product. Owned one feature from discovery through launch.",
        category: "internship",
        unlocked: "Had a real PM story with metrics: 'I shipped X, it moved Y by Z%.' This was the interview story that landed Google.",
      },
      {
        timing: "Junior fall",
        action: "Ran 12 user interviews for a class project redesigning Columbia's course registration. Documented findings in a case study with wireframes.",
        category: "course",
        unlocked: "Filled the user research gap — could now say 'I've led discovery work' with a concrete artifact.",
      },
      {
        timing: "Senior fall",
        action: "Applied to Google APM, Meta RPM, and Uber APM in September. Did 3 mock PM interviews per week from August through October with CORE alumni.",
        category: "application",
      },
      {
        timing: "Senior fall",
        action: "Passed Google APM final round. The interviewers asked about my Chrome extension users and my externship metrics — not textbook case frameworks.",
        category: "application",
        unlocked: "Signed offer in November. Started the following August.",
      },
    ],
    turningPoint: "The cold-email externship at the Series B startup. I almost didn't send it because I had no PM experience. But that one summer gave me the metrics story and the 'shipped a real feature as PM' proof point that every APM interview specifically screens for. Without it, I'd have had projects but no PM-titled experience.",
    wouldSkip: "I spent way too much time on PM club politics and event planning instead of actually building products. The club was useful for the case comp and the alumni network, but the committee meetings were pure overhead. I'd do the competition and the networking dinners, skip the rest.",
    advice: "Ship something real before you start applying. Not a class project — something with actual users who didn't have to use it. The bar is lower than you think (my Chrome extension was 200 lines of code), but having it changes every conversation from 'I want to be a PM' to 'I already am one, just without the title.'",
    publishedAt: "2026-07-15",
    isExample: true,
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getPublishedMaps(filters?: { track?: string; school?: string }): PublishedMap[] {
  let maps = PUBLISHED_MAPS;
  if (filters?.track) {
    maps = maps.filter((m) => m.track === filters.track);
  }
  if (filters?.school) {
    maps = maps.filter((m) => m.school.toLowerCase().includes(filters.school!.toLowerCase()));
  }
  return maps.sort((a, b) => {
    // Example first, then by publishedAt descending
    if (a.isExample && !b.isExample) return -1;
    if (!a.isExample && b.isExample) return 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

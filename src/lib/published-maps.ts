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
  {
    id: "example-consulting-howard",
    author: "Mia",
    track: "management-consulting",
    school: "Howard University",
    major: "Economics",
    startYear: "Sophomore",
    outcome: "Strategy Consultant at BCG",
    timeline: "Sophomore spring → Senior fall",
    steps: [
      {
        timing: "Sophomore spring",
        action: "Applied to BCG's Growing Future Leaders program — a 10-week paid diversity internship for sophomores from underrepresented backgrounds. It's a direct pipeline into the junior-summer interview pool.",
        category: "fellowship",
        unlocked: "Got paired with a BCG Associate who did 1:1 case prep with me for 3 months. The program itself is a direct funnel to the full internship.",
      },
      {
        timing: "Sophomore summer",
        action: "Completed the Growing Future Leaders internship: worked on a real client engagement alongside a BCG case team for 10 weeks. Presented findings to a Principal.",
        category: "internship",
        unlocked: "The Principal who saw my presentation became my champion in the internship decision. GFL participants get fast-tracked interviews — no resume screen for the junior-summer role.",
      },
      {
        timing: "Junior fall",
        action: "Joined Howard's consulting club and led a case team for the Deloitte National Case Competition. We placed top 10 out of 200+ teams.",
        category: "club",
        unlocked: "Got comfortable structuring ambiguous problems under time pressure. The competition result became my go-to 'teamwork under constraint' behavioral story.",
      },
      {
        timing: "Junior fall",
        action: "Did 40+ practice cases between September and November — 3 per week with peers, plus monthly sessions with my Bridge mentor. Recorded myself and rewatched.",
        category: "other",
        unlocked: "By interview day, casing felt automatic. The mental math and structure came without thinking, which freed me to actually listen to the interviewer.",
      },
      {
        timing: "Junior winter",
        action: "Interviewed for BCG summer internship — two rounds, four cases total. Already knew three of the interviewers from Bridge events.",
        category: "application",
        unlocked: "Got the offer within a week. The familiarity from Bridge meant the interviews felt like conversations, not interrogations.",
      },
      {
        timing: "Senior fall",
        action: "Converted my summer internship to a full-time offer. During the internship, I volunteered for the hardest workstream and got staffed on a healthcare case my manager specifically requested me for.",
        category: "internship",
        unlocked: "Signed full-time offer in August, two months before most of my peers even started recruiting.",
      },
    ],
    turningPoint: "Growing Future Leaders — full stop. Without it, I would have been one of 10,000 resumes in BCG's general pool. GFL gave me a mentor, a Principal who knew my name, fast-tracked interviews, and 3 months of insider case prep. The program IS the pipeline. Everything after it was just not messing up the opportunity it created.",
    wouldSkip: "I spent too much time attending general 'consulting info sessions' from firms I wasn't targeting. Every firm runs these and they're mostly marketing. The real networking happened at GFL events and through my mentor's introductions — not at panel discussions in hotel ballrooms. I'd also skip the generic case prep books (Case in Point, etc.) and go straight to drilling with a real person.",
    advice: "Apply to every pipeline program your target firms offer — BCG Growing Future Leaders, McKinsey's Sophomore Diversity programs, Bain's Building Entrepreneurial Leaders. These aren't 'nice to have' extras. They are how a huge portion of diverse hires get in. The general application pool is a meat grinder. The pipeline programs are a side door that's wide open if you meet the criteria. Apply early — most close in January.",
    publishedAt: "2026-08-01",
    isExample: true,
  },
  {
    id: "example-swe-gracehopper",
    author: "Priya",
    track: "software-engineer",
    school: "University of Florida",
    major: "Computer Science",
    startYear: "Junior",
    outcome: "Software Engineer at Microsoft",
    timeline: "Junior fall → Senior winter",
    steps: [
      {
        timing: "Junior fall",
        action: "Signed up for Capital One's Code for Good hackathon — a 24-hour event where you build a real app for a nonprofit. They fly you out, feed you, and interview you at the event.",
        category: "networking",
        unlocked: "Got a same-week interview invite from Capital One. The hackathon doubled as a technical screen — they watched how I coded in a team for 24 hours.",
      },
      {
        timing: "Junior fall",
        action: "Applied to attend Grace Hopper Conference through my university's SWE chapter scholarship. Got a free ticket + hotel. Spent 3 days at the career fair talking to 15+ companies.",
        category: "networking",
        unlocked: "Got same-day interview invites from Microsoft, Bloomberg, and Salesforce. The GHC career fair bypasses the resume screen entirely — you talk to a recruiter, they like you, you're in the pipeline.",
      },
      {
        timing: "Junior fall",
        action: "Did on-the-spot technical phone screens with Microsoft and Bloomberg within 2 weeks of Grace Hopper. Prepped by doing 5 LeetCode mediums per day the week before GHC.",
        category: "application",
        unlocked: "Advanced to Microsoft's final round. Bloomberg gave me an exploding offer with a 2-week deadline.",
      },
      {
        timing: "Junior winter",
        action: "Flew to Microsoft's Redmond campus for the final loop — 4 interviews back-to-back. One was a system design question I'd never seen before. Talked through my thinking out loud instead of freezing.",
        category: "application",
        unlocked: "Got the offer 5 days later. Used the Bloomberg offer as soft leverage (didn't negotiate hard, just mentioned the timeline).",
      },
      {
        timing: "Junior summer",
        action: "Interned at Microsoft on the Azure DevOps team. Shipped a feature that reduced CI/CD pipeline setup time by 30%. Asked my manager for honest feedback every 2 weeks.",
        category: "internship",
        unlocked: "Got a return offer in August. My skip-level manager specifically said the biweekly feedback requests showed maturity.",
      },
      {
        timing: "Senior fall",
        action: "Accepted the full-time return offer. Spent senior year mentoring underclassmen in the SWE chapter and doing mock interviews for them before GHC season.",
        category: "other",
      },
    ],
    turningPoint: "Grace Hopper. I almost didn't go because I thought it was 'just a conference.' It's not — it's a career fair where companies hand out interviews like candy because they've already decided they want to hire from that pool. I got my Microsoft pipeline from a 5-minute conversation at a booth. No cold application, no online assessment, no waiting 3 months for a response. If you're eligible for GHC, WE@SHPE, or any similar conference with a career fair, go. It compresses months of recruiting into 48 hours.",
    wouldSkip: "I applied to 80+ companies online before GHC and heard back from maybe 5. The online application grind is brutal and mostly doesn't work for students without Big Tech on their resume already. I wish I'd spent that time doing more LeetCode and preparing for the in-person events where the conversion rate is 10x higher. I'd also skip spending $200 on AlgoExpert — free NeetCode + LeetCode Discuss was better.",
    advice: "The hack is: don't apply online if you can get in front of a human instead. Code for Good, Grace Hopper, SHPE, Tapia Conference, Google's CSSI, and company-specific diversity programs all let you skip the resume screen. If you're from an underrepresented background, these events exist specifically to give you access. Use them. One conversation at a booth is worth 50 online applications.",
    publishedAt: "2026-07-20",
    isExample: true,
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getPublishedMaps(filters?: { track?: string; school?: string; query?: string }): PublishedMap[] {
  let maps = PUBLISHED_MAPS;
  if (filters?.track) {
    maps = maps.filter((m) => m.track === filters.track);
  }
  if (filters?.school) {
    maps = maps.filter((m) => m.school.toLowerCase().includes(filters.school!.toLowerCase()));
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    maps = maps.filter((m) =>
      m.author.toLowerCase().includes(q) ||
      m.school.toLowerCase().includes(q) ||
      m.major.toLowerCase().includes(q) ||
      m.track.toLowerCase().includes(q) ||
      m.outcome.toLowerCase().includes(q) ||
      m.steps.some((s) => s.action.toLowerCase().includes(q))
    );
  }
  return maps.sort((a, b) => {
    if (a.isExample && !b.isExample) return -1;
    if (!a.isExample && b.isExample) return 1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

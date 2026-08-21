// Sylo seed dataset. Every fact shown to a student must come from this file.
// Nothing outside this file may be presented as real.

import { createElement, type ReactNode } from "react";
import { Heart, Briefcase, TrendingUp, Microscope, Sparkles, Code, Scale, Palette } from "lucide-react";

export type TrackId =
  | "physician-scientist"
  | "nursing"
  | "public-health"
  | "business-analyst"
  | "product-manager"
  | "management-consulting"
  | "software-engineer"
  | "data-science"
  | "cybersecurity"
  | "investment-banking"
  | "private-equity"
  | "financial-planning"
  | "research-phd"
  | "public-affairs"
  | "policy-analyst"
  | "government-relations"
  | "design"
  | "product-designer"
  | "creative-director"
  /** No verified opportunity dataset — the honest "my goal is something else" path. */
  | "something-else";

export const OTHER_TRACK_ID = "something-else";

export type CareerTrack = {
  id: TrackId;
  label: string;
  icon: ReactNode;
  /** Identity framing — speaks to the person, not the job title. */
  identity: string;
  blurb: string;
  brandPrograms: { name: string; sponsor: string; note: string }[];
};


export type StepStatus = "not-started" | "in-progress" | "complete";

/** A real page found in live search that backs a live opportunity. Never invented. */
export type OpportunitySource = { title: string; url: string };

export type Opportunity = {
  id: string;
  name: string;
  track: TrackId;
  category: "Research" | "Internship" | "Fellowship" | "Club" | "Funding" | "Advising" | "Course";
  access: "direct" | "translated";
  /** Name-brand program this stands in for, when access === "translated". */
  brandEquivalent?: string;
  /** What is missing at the student's school that makes translation necessary. */
  missingHere?: string;
  school: string; // "any" or a specific seeded school
  deadline: string; // ISO
  timeframe: string;
  requirements: string[];
  contact: string;
  link: string;
  timeline: string;
  leverage: string;
  /** Course code this opportunity routes into, if it is course-linked. */
  courseCode?: string;
  // --- Cascade fields. Static, pre-written copy. Only a track's hero
  // "next move" fills in all four; every other opportunity leaves them blank.
  /** The single biggest, most specific blocker this step resolves, timing included. */
  gapLabel?: string;
  /** What this step requires before it can be taken. */
  upstream?: string;
  /** What this step leads to, chained forward at least two steps. */
  unlocks?: string[];
  /** A hard time constraint on this step. */
  window?: string;
  // --- Provenance. Absent means this row came from the curated seed dataset
  // below. "live" means it was found by search at runtime and has had less
  // scrutiny applied than anything in this file — the UI says so.
  origin?: "seed" | "live";
  /** Pages found in search that back this opportunity. Live results only. */
  sources?: OpportunitySource[];
  /** Only one independent source could be confirmed after a follow-up search. */
  singleSourced?: boolean;
};

/** True when `raw` is a well-formed http(s) URL. */
function isValidHttpUrl(raw: string | undefined | null): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** A Google search URL for a program — always resolves to something useful. */
export function programSearchUrl(name: string, school?: string): string {
  const q = [name, school && school !== "any" ? school : ""].filter(Boolean).join(" ").trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/**
 * Resolve a guaranteed-usable link for an opportunity — never a dead end.
 * - Curated (seed) opportunities: trust their hand-verified link.
 * - Live (AI-generated) opportunities: trust the link only when a real search
 *   source backs the same domain; otherwise use the first real search-result
 *   URL, and finally fall back to a program search that always resolves.
 */
export function opportunityLink(op: Opportunity): string {
  const link = op.link?.trim();
  const linkValid = isValidHttpUrl(link);
  const isLive = op.origin === "live";

  // Curated data links are hand-checked — trust them.
  if (linkValid && !isLive) return link!;

  // A live link is trustworthy only if a real source corroborates its domain.
  if (linkValid && isLive && op.sources?.length) {
    try {
      const host = new URL(link!).host.replace(/^www\./, "");
      const corroborated = op.sources.some((s) => {
        try {
          return new URL(s.url).host.replace(/^www\./, "") === host;
        } catch {
          return false;
        }
      });
      if (corroborated) return link!;
    } catch {
      /* fall through to fallbacks */
    }
  }

  // Next best: a real URL that actually came from search results.
  const source = op.sources?.find((s) => isValidHttpUrl(s.url));
  if (source) return source.url;

  // Guaranteed fallback — a search that always resolves to the real program.
  return programSearchUrl(op.name, op.school);
}


export type Course = {
  code: string;
  title: string;
  credits: number;
  format: "Seminar" | "Lecture";
  workload: "Light" | "Moderate" | "Heavy";
  timeOfDay: "Morning" | "Afternoon" | "Evening";
  style: "Discussion" | "Independent";
  satisfies: string;
  tracks: TrackId[];
  why: string;
};

export type DegreeAudit = {
  program: string;
  creditsEarned: number;
  creditsRequired: number;
  remaining: string[];
};

export type Persona = {
  id: string;
  name: string;
  major: string;
  year: string;
  school: string;
  track: TrackId;
  preferences: Preferences;
  audit: DegreeAudit;
};

export type Preferences = {
  format: "Seminar" | "Lecture";
  workload: "Light" | "Moderate" | "Heavy";
  style: "Discussion" | "Independent";
};

export const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate student"];

export const MAJORS = [
  "Biology",
  "Computer Science",
  "Business Administration",
  "Chemistry",
  "Economics",
  "Psychology",
  "Political Science",
];

export const TRACKS: CareerTrack[] = [
  // ---- Healthcare ----
  {
    id: "physician-scientist",
    label: "Physician-Scientist",
    icon: createElement(Heart, { className: "h-5 w-5" }),
    identity: "You want to run the experiment and still see the patient.",
    blurb: "MD/PhD paths are decided by bench research plus a named faculty letter, years before you apply.",
    brandPrograms: [
      { name: "NIH Summer Internship Program", sponsor: "NIH", note: "Paid biomedical research" },
      { name: "SHPEP", sponsor: "AAMC/RWJF", note: "Six-week pre-health enrichment" },
    ],
  },
  {
    id: "nursing",
    label: "Nurse Practitioner",
    icon: createElement(Heart, { className: "h-5 w-5" }),
    identity: "You want to be the one at the bedside making the call.",
    blurb: "Clinical placements fill early. The students who land top residencies locked in preceptors and volunteer hours by sophomore year.",
    brandPrograms: [
      { name: "HRSA Nursing Scholarship", sponsor: "HRSA", note: "Full tuition + stipend for underserved practice" },
      { name: "Johnson & Johnson Nursing Scholars", sponsor: "J&J", note: "Leadership development for nursing students" },
    ],
  },
  {
    id: "public-health",
    label: "Public Health Analyst",
    icon: createElement(Heart, { className: "h-5 w-5" }),
    identity: "You want to fix the system, not just treat the symptom.",
    blurb: "MPH admissions and CDC pipelines reward field experience and research with a named PI.",
    brandPrograms: [
      { name: "CDC Undergraduate Public Health Scholars", sponsor: "CDC", note: "Summer field placement in public health" },
      { name: "Emory Global Health Case Competition", sponsor: "Emory", note: "Applied public health problem-solving" },
    ],
  },
  // ---- Business ----
  {
    id: "management-consulting",
    label: "Business Analyst",
    icon: createElement(Briefcase, { className: "h-5 w-5" }),
    identity: "You want to solve business problems with data and strategy.",
    blurb: "Analyst pipelines at Big 4 and Fortune 500 recruit from structured programs — case competitions, integrated cores, and corporate projects.",
    brandPrograms: [
      { name: "Deloitte Discovery Internship", sponsor: "Deloitte", note: "Sophomore analyst pipeline" },
      { name: "EY Launch Program", sponsor: "EY", note: "Early-career consulting exposure" },
    ],
  },
  {
    id: "product-manager",
    label: "Product Manager",
    icon: createElement(Briefcase, { className: "h-5 w-5" }),
    identity: "You'd rather ship the thing than write about it.",
    blurb: "APM pipelines screen for shipped work, not coursework, and recruit 12 months ahead.",
    brandPrograms: [
      { name: "Google APM", sponsor: "Google", note: "Associate Product Manager new-grad track" },
      { name: "Meta RPM", sponsor: "Meta", note: "Rotational Product Manager program" },
    ],
  },
  // ---- Engineering ----
  {
    id: "software-engineer",
    label: "Software Engineer",
    icon: createElement(Code, { className: "h-5 w-5" }),
    identity: "You want to build things that work at scale.",
    blurb: "Top internship pipelines recruit 9–12 months early and screen for projects and DSA, not GPA.",
    brandPrograms: [
      { name: "Google STEP", sponsor: "Google", note: "Freshman/sophomore SWE internship pipeline" },
      { name: "Meta University", sponsor: "Meta", note: "Engineering internship for underrepresented students" },
      { name: "Microsoft Explore", sponsor: "Microsoft", note: "First-year SWE exploration internship" },
    ],
  },
  {
    id: "data-science",
    label: "Data Scientist",
    icon: createElement(Code, { className: "h-5 w-5" }),
    identity: "You want to find the signal no one else noticed.",
    blurb: "DS internships expect a portfolio of real analyses — Kaggle medals, research posters, or published notebooks — not just coursework.",
    brandPrograms: [
      { name: "Two Sigma Freshman Internship", sponsor: "Two Sigma", note: "Quantitative research for first-years" },
      { name: "Microsoft Data Science Summer School", sponsor: "Microsoft", note: "Intro DS for underrepresented students" },
    ],
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity Engineer",
    icon: createElement(Code, { className: "h-5 w-5" }),
    identity: "You want to be the reason the breach didn't happen.",
    blurb: "Security recruiting values CTF placements, bug bounties, and clearance-track internships over coursework alone.",
    brandPrograms: [
      { name: "NSA GenCyber Camp", sponsor: "NSA", note: "Summer cybersecurity fundamentals program" },
      { name: "CrowdStrike Nextgen Scholarship", sponsor: "CrowdStrike", note: "Scholarship + mentorship for security students" },
    ],
  },
  // ---- Finance ----
  {
    id: "investment-banking",
    label: "Investment Banker",
    icon: createElement(TrendingUp, { className: "h-5 w-5" }),
    identity: "You want a seat in the room where the deal actually gets decided.",
    blurb: "Sophomore insight programs open a full year before junior recruiting closes.",
    brandPrograms: [
      { name: "Goldman Sachs Undergraduate Camp", sponsor: "Goldman Sachs", note: "Freshman/sophomore insight program" },
      { name: "Jumpstart Advisory Program", sponsor: "Jumpstart", note: "Diversity finance recruiting pipeline" },
    ],
  },
  {
    id: "private-equity",
    label: "Private Equity Analyst",
    icon: createElement(TrendingUp, { className: "h-5 w-5" }),
    identity: "You want to own the company, not just advise it.",
    blurb: "PE recruiting pulls almost exclusively from IB analyst classes — the pipeline starts with sophomore insight programs.",
    brandPrograms: [
      { name: "SEO Career", sponsor: "SEO", note: "Finance internship pipeline for underrepresented students" },
      { name: "Toigo Fellowship", sponsor: "Toigo Foundation", note: "MBA-track finance leadership for minorities" },
    ],
  },
  {
    id: "financial-planning",
    label: "Financial Advisor",
    icon: createElement(TrendingUp, { className: "h-5 w-5" }),
    identity: "You want to be the person families trust with their future.",
    blurb: "CFP-track firms recruit sophomores into wealth management internships that convert to full-time offers.",
    brandPrograms: [
      { name: "Schwab Internship Program", sponsor: "Charles Schwab", note: "Wealth management summer internship" },
      { name: "NAPFA NextGen Gathering", sponsor: "NAPFA", note: "Conference + mentorship for aspiring planners" },
    ],
  },
  // ---- Science ----
  {
    id: "research-phd",
    label: "Research PhD",
    icon: createElement(Microscope, { className: "h-5 w-5" }),
    identity: "You want a question of your own, and years to chase it.",
    blurb: "Admissions are driven by one faculty letter tied to real, sustained lab work.",
    brandPrograms: [
      { name: "NSF REU", sponsor: "NSF", note: "Funded summer research placements" },
      { name: "Leadership Alliance SR-EIP", sponsor: "Leadership Alliance", note: "Summer research and grad prep" },
    ],
  },
  // ---- Law (Law School, Policy, Government) ----
  {
    id: "public-affairs",
    label: "Lawyer",
    icon: createElement(Scale, { className: "h-5 w-5" }),
    identity: "You want to shape the rules, not just follow them.",
    blurb: "Law school admissions, policy fellowships, and government pipelines all reward early research + named mentors. Recruiting starts sophomore year.",
    brandPrograms: [
      { name: "PPIA Junior Summer Institute", sponsor: "PPIA", note: "Gateway to top MPP/MPA programs" },
      { name: "Truman Scholarship", sponsor: "Truman Foundation", note: "Graduate funding for public service leaders" },
      { name: "LSAC Prelaw Undergraduate Scholars", sponsor: "LSAC", note: "Pre-law pipeline for underrepresented students" },
    ],
  },
  {
    id: "policy-analyst",
    label: "Policy Analyst",
    icon: createElement(Scale, { className: "h-5 w-5" }),
    identity: "You want to write the memo that changes the regulation.",
    blurb: "Think tanks and government agencies recruit from named fellowship cohorts — not job boards. The application windows are short and early.",
    brandPrograms: [
      { name: "Brookings Internship", sponsor: "Brookings Institution", note: "Semester-long policy research placement" },
      { name: "Congressional Hispanic Caucus Institute", sponsor: "CHCI", note: "DC-based public policy fellowship" },
    ],
  },
  {
    id: "government-relations",
    label: "Government Relations",
    icon: createElement(Scale, { className: "h-5 w-5" }),
    identity: "You want to be the bridge between institutions and the people they serve.",
    blurb: "GovRel roles value Hill experience and policy writing samples. Start with a legislative internship sophomore summer.",
    brandPrograms: [
      { name: "Congressional Internship Program", sponsor: "U.S. Congress", note: "Semester internship on Capitol Hill" },
      { name: "Public Policy and International Affairs Fellowship", sponsor: "PPIA", note: "Summer institute + grad school pipeline" },
    ],
  },
  // ---- Design (UX, Product, Graphic, Industrial) ----
  {
    id: "design",
    label: "UX Designer",
    icon: createElement(Palette, { className: "h-5 w-5" }),
    identity: "You want to make things people actually want to use.",
    blurb: "Design recruiting is portfolio-first. Internships and fellowships screen for shipped work and case studies, not GPA.",
    brandPrograms: [
      { name: "Google UX Design Certificate", sponsor: "Google", note: "Industry-recognized UX credential" },
      { name: "AIGA Design Scholars", sponsor: "AIGA", note: "National design mentorship + conference access" },
      { name: "IBM Design Internship", sponsor: "IBM", note: "Enterprise design thinking immersion" },
    ],
  },
  {
    id: "product-designer",
    label: "Product Designer",
    icon: createElement(Palette, { className: "h-5 w-5" }),
    identity: "You want to own the whole experience, from research to final pixel.",
    blurb: "Product design roles at top tech companies want end-to-end case studies — research, wireframes, prototypes, and shipped outcomes in one portfolio piece.",
    brandPrograms: [
      { name: "Meta Design Internship", sponsor: "Meta", note: "Product design internship with real feature ownership" },
      { name: "Figma Design Residency", sponsor: "Figma", note: "New-grad design program with mentorship" },
    ],
  },
  {
    id: "creative-director",
    label: "Creative Director",
    icon: createElement(Palette, { className: "h-5 w-5" }),
    identity: "You want to set the vision, not just execute someone else's.",
    blurb: "Creative leadership paths reward breadth — campaigns, brand systems, art direction — and start with agency internships or in-house brand roles.",
    brandPrograms: [
      { name: "D&AD New Blood Awards", sponsor: "D&AD", note: "Global creative competition for students" },
      { name: "Wieden+Kennedy Internship", sponsor: "W+K", note: "Immersive agency creative internship" },
    ],
  },
  // ---- Catch-all ----
  {
    id: "something-else",
    label: "Something else",
    icon: createElement(Sparkles, { className: "h-5 w-5" }),
    identity: "Your goal isn't one of the above.",
    blurb:
      "Sylo will search for real opportunities at your school for whatever goal you describe.",
    brandPrograms: [],
  },
];

export const OPPORTUNITIES: Opportunity[] = [
  // ===== UCLA — Biology / Physician-Scientist track =====
  {
    id: "op-ucla-urfp",
    name: "Undergraduate Research Fellows Program (URFP)",
    track: "physician-scientist",
    category: "Research",
    access: "direct",
    school: "University of California, Los Angeles",
    deadline: "2026-11-15",
    timeframe: "Apply Fall quarter",
    requirements: ["Minimum 3.0 GPA", "Completed at least 2 quarters at UCLA", "Faculty mentor identified"],
    contact: "URC-Sciences Office, Life Sciences Building",
    link: "https://sciences.ugresearch.ucla.edu/programs-and-scholarships/research-programs/",
    timeline: "Academic year fellowship with quarterly mentorship meetings and spring symposium presentation.",
    leverage: "Gives you a funded research position and a faculty mentor — the two things med school apps weigh heaviest after GPA.",
    courseCode: undefined,
    upstream: "Faculty mentor identified (start with MCDB cold-emails or office hours one quarter before applying)",
    unlocks: ["Funded research position", "Spring symposium presentation (builds your poster record)", "Strong faculty rec letter for HHMI Pathways and NSF REU applications"],
    window: "Nov 15 — you need a mentor commitment before you can submit",
  },
  {
    id: "op-ucla-bisep",
    name: "Biomedical Science Enrichment Program (BISEP)",
    track: "physician-scientist",
    category: "Research",
    access: "direct",
    school: "University of California, Los Angeles",
    deadline: "2027-03-01",
    timeframe: "Summer program",
    requirements: ["Freshman or sophomore", "From underrepresented group in science", "Interest in biomedical research"],
    contact: "Life Sciences Division",
    link: "https://lifesciences.ucla.edu/undergraduate/research-programs/",
    timeline: "8-week summer intensive — lab placement, faculty mentorship, and research presentation.",
    leverage: "Gets you into a real lab before most sophomores even know how to ask. Early start = stronger letter by junior year.",
    upstream: "None — designed for students without existing research experience",
    unlocks: ["Faculty mentor relationship (required for URFP)", "Lab skills + techniques before sophomore year", "Research presentation experience for grad school apps"],
    window: "March 1 deadline — one cohort per year, no late applications",
  },
  {
    id: "op-ucla-premed-summer",
    name: "Pre-Med Summer Scholar Program (PMSS)",
    track: "physician-scientist",
    category: "Internship",
    access: "direct",
    school: "University of California, Los Angeles",
    deadline: "2027-02-15",
    timeframe: "Summer — 8 weeks",
    requirements: ["Pre-med intent", "Completed general biology series", "Good academic standing"],
    contact: "UCLA Jonsson Comprehensive Cancer Center",
    link: "https://trainees.cancer.ucla.edu/education/training-programs/undergraduate",
    timeline: "Clinical exposure + research mentorship at UCLA Health. Designed for students exploring medicine.",
    leverage: "Real clinical experience at a top academic medical center — exactly what your app is missing after just 40 shadow hours.",
    upstream: "Completed LS 7A-C (general biology series) — typically done by end of freshman year",
    unlocks: ["Clinical experience hours for med school apps", "Research mentorship at UCLA Health", "Letter from a clinical faculty member (different from bench research PI)"],
    window: "Feb 15 deadline — competitive, apply early in Winter quarter",
  },
  {
    id: "op-ucla-hhmi-pathways",
    name: "UCLA-HHMI Pathways to Success Program",
    track: "physician-scientist",
    category: "Fellowship",
    access: "direct",
    school: "University of California, Los Angeles",
    deadline: "2027-04-01",
    timeframe: "Academic year",
    requirements: ["Biology or related major", "Interest in research career", "Demonstrated need or disadvantage"],
    contact: "HHMI Pathways Office",
    link: "https://www.hhmipathways.ucla.edu/pathways-calendar",
    timeline: "Year-long cohort with research mentoring, grad school prep workshops, and community.",
    leverage: "Structured pipeline from undergrad lab to med/grad school — with HHMI name recognition on your CV.",
    upstream: "At least one quarter of lab research (BISEP or URFP satisfies this) — they want to see commitment before investing in you",
    unlocks: ["HHMI name on CV (recognized by every MD/PhD committee)", "Grad school prep workshops + GRE/MCAT resources", "Cohort community that persists through applications"],
    window: "April 1 — apply Spring quarter of sophomore or junior year",
  },
  {
    id: "op-ucla-mcdb-research",
    name: "MCDB Faculty Research Mentorship",
    track: "physician-scientist",
    category: "Research",
    access: "direct",
    school: "University of California, Los Angeles",
    deadline: "",
    timeframe: "Rolling — start any quarter",
    requirements: ["Completed LS 7A-C or equivalent", "Email faculty directly with research interest"],
    contact: "MCDB Department",
    link: "https://www.mcdb.ucla.edu/how-to-get-research-experience/",
    timeline: "Self-directed. Email PIs, attend office hours, join a lab. Can enroll for course credit (190A-C) or volunteer.",
    leverage: "No application barrier — just initiative. The students who get strong rec letters started by showing up to office hours early.",
    upstream: "Completed LS 7A-C or currently enrolled — enough biology background to be useful in a lab",
    unlocks: ["Faculty mentor (required for URFP application)", "Lab skills + course credit via 190A-C", "Foundation for every other research opportunity at UCLA"],
    window: "Rolling — but reach out at the start of a quarter when PIs are forming lab teams",
  },

  // ===== Georgia Tech — Computer Science / Software Engineer track =====
  {
    id: "op-gt-urop-pura",
    name: "PURA Salary Award — Undergraduate Research",
    track: "software-engineer",
    category: "Funding",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "2026-09-15",
    timeframe: "Apply early Fall semester",
    requirements: ["Enrolled undergraduate", "Faculty research mentor", "Minimum 10 hrs/week commitment"],
    contact: "Undergraduate Research Opportunities Program (UROP)",
    link: "https://undergradresearch.gatech.edu/pura-salary",
    timeline: "$2,000 stipend for one semester of research under a GT or GTRI faculty member.",
    leverage: "Paid research that counts toward the Research Option — and gives you a project to talk about in SWE interviews.",
    gapLabel: "No funded research experience yet — the single biggest gap for top internship applications",
    upstream: "Faculty mentor identified (cold-email 2–3 CS professors with a specific research interest)",
    unlocks: ["Research Option credit", "GRIP eligibility (requires active research)", "Strong faculty rec letter for internship apps"],
    window: "Sept 15 deadline — one shot per semester, Fall window closes first",
  },
  {
    id: "op-gt-createx-learn",
    name: "CREATE-X Startup Lab",
    track: "software-engineer",
    category: "Course",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "2027-03-15",
    timeframe: "Spring or Summer semester",
    requirements: ["Any major", "Enrolled undergraduate", "3 credit hours"],
    contact: "CREATE-X Program Office",
    link: "https://create-x.gatech.edu/about-us",
    timeline: "3-credit course covering product conception, market analysis, and company formation. Leads into Startup Launch if you want to keep going.",
    leverage: "Ship a real product for course credit. The portfolio piece interviewers notice more than another LeetCode badge.",
    courseCode: "CS 2699",
    upstream: "None — open to any GT undergraduate",
    unlocks: ["CREATE-X Startup Launch eligibility", "Portfolio project for internship apps", "Working prototype required for Launch"],
    window: "Registration closes mid-March for following semester",
  },
  {
    id: "op-gt-createx-launch",
    name: "CREATE-X Startup Launch",
    track: "software-engineer",
    category: "Internship",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "2027-03-17",
    timeframe: "Summer — 12 weeks",
    requirements: ["Completed Startup Lab or equivalent", "Working prototype", "Team of 2-4 students"],
    contact: "CREATE-X Launch Team",
    link: "https://create-x.gatech.edu/launch/startup-launch",
    timeline: "Seed funding, legal assistance, intensive coaching, and a demo day. Students launch real startups.",
    leverage: "Founding a company (even a failed one) during undergrad sets you apart from every other candidate with just internships.",
    upstream: "CREATE-X Startup Lab completed (or equivalent prototype experience)",
    unlocks: ["Seed funding + legal support", "Demo Day exposure to investors", "Founder credential on resume — strongest differentiator for top-tier SWE roles"],
    window: "Must apply within 2 weeks of Startup Lab ending — teams that wait miss the cohort",
  },
  {
    id: "op-gt-coop",
    name: "Georgia Tech Co-op Program",
    track: "software-engineer",
    category: "Internship",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "",
    timeframe: "Alternating semesters — apply anytime",
    requirements: ["Completed 2 semesters", "Good academic standing", "CS or related major"],
    contact: "Career Center — C2D2",
    link: "https://live.ttl.gatech.edu/co-op-internships",
    timeline: "Alternate semesters of work and school over 5 years. Paid, full-time industry experience with return offers.",
    leverage: "Three rotations of real engineering work before you graduate. Most co-op students get return offers without ever doing a traditional job search.",
    upstream: "Completed 2 semesters + at least one project or research experience to discuss in interviews",
    unlocks: ["3 industry rotations before graduation", "Return offer (most co-op students never cold-apply again)", "Senior-level engineering experience by junior year"],
    window: "Rolling, but the best companies fill co-op slots by mid-Fall — start early",
  },
  {
    id: "op-gt-uroc",
    name: "Undergraduate Research Opportunities in Computing (UROC)",
    track: "software-engineer",
    category: "Research",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "",
    timeframe: "Rolling — contact faculty",
    requirements: ["Interest in a CS research area", "Willingness to commit 10+ hrs/week"],
    contact: "College of Computing Advising",
    link: "https://www.cc.gatech.edu/undergraduate-research-opportunities-computing-uroc",
    timeline: "Work directly with a faculty member on an active research project. Can lead to publications and grad school recs.",
    leverage: "If you're considering grad school or want to stand out for research-heavy roles (ML, systems), this is the on-ramp.",
    upstream: "None — but having taken one upper-level CS course in your area of interest makes cold-emails far more effective",
    unlocks: ["Faculty mentor for PURA application", "Publication co-authorship", "NSF REU competitiveness (REUs prefer students with existing lab experience)"],
    window: "Rolling — but faculty take fewer students mid-semester. Reach out at the start of Fall or Spring",
  },
  {
    id: "op-gt-grip",
    name: "GRIP — Georgia Tech Research Institute Projects",
    track: "software-engineer",
    category: "Internship",
    access: "direct",
    school: "Georgia Institute of Technology",
    deadline: "2027-10-01",
    timeframe: "Apply Fall for Spring/Summer",
    requirements: ["US citizen or permanent resident", "Enrolled GT undergraduate", "Interest in applied research"],
    contact: "GTRI Student Programs",
    link: "https://grip.gtri.gatech.edu/",
    timeline: "Work on government and industry problems with GTRI mentors. Paid, security-clearance-eligible projects.",
    leverage: "Applied research with real clients (defense, government). Unique resume line that signals you can ship in constrained environments.",
    upstream: "Active research experience (PURA or UROC) — GRIP prefers students who've already worked in a lab",
    unlocks: ["Security clearance eligibility", "Government/defense industry network", "Full-time GTRI offer pipeline after graduation"],
    window: "Fall application for Spring/Summer placement — late applications rarely considered",
  },
  // ===== Indiana (Kelley) — Business Analyst track =====
  {
    id: "op-kelley-i-core",
    name: "Kelley Integrated Core (I-Core) Business Foundations",
    track: "management-consulting",
    category: "Course",
    access: "direct",
    school: "Indiana University",
    deadline: "2027-02-01",
    timeframe: "Apply Spring for following Fall (year-long)",
    requirements: ["Kelley sophomore", "Minimum 3.2 GPA", "Completed prerequisite business courses"],
    contact: "Kelley School of Business Undergraduate Program",
    link: "https://kelley.iu.edu/programs/undergrad/academics/index.html",
    timeline: "Year-long intensive cohort: finance, marketing, operations, and strategy taught as one integrated case. Real company projects each semester.",
    leverage: "I-Core is why Kelley places more analysts at Big 4 and Fortune 500 than schools ranked higher. Recruiters know the program by name.",
  },
  {
    id: "op-kelley-consulting-workshop",
    name: "Kelley Consulting Workshop + Case Competition",
    track: "management-consulting",
    category: "Club",
    access: "direct",
    school: "Indiana University",
    deadline: "2027-09-10",
    timeframe: "Apply early Fall for semester-long workshop",
    requirements: ["Kelley sophomore or junior", "Interest in consulting or strategy"],
    contact: "Kelley Undergraduate Consulting Club",
    link: "https://kelley.iu.edu/",
    timeline: "Semester workshop: case frameworks, market sizing, deck building. Ends with a live case competition judged by Deloitte/Accenture/EY managers.",
    leverage: "Case competition wins go directly on your resume and judges often fast-track participants to interviews. The structured prep is what most students try to DIY and fail.",
  },
  {
    id: "op-kelley-vest",
    name: "Kelley VEST (Voluntary Experiential Skills Training) — Analytics Track",
    track: "management-consulting",
    category: "Fellowship",
    access: "direct",
    school: "Indiana University",
    deadline: "2027-01-15",
    timeframe: "Apply Winter for Spring/Summer placement",
    requirements: ["Kelley junior", "Completed business analytics course", "Minimum 3.3 GPA"],
    contact: "Kelley Undergraduate Career Services",
    link: "https://kelley.iu.edu/programs/undergrad/index.html",
    timeline: "Semester-long placement with a corporate partner (Cummins, Eli Lilly, Salesforce). Real analytics projects: dashboards, process improvement, strategy decks.",
    leverage: "A named corporate project before your junior-year internship. VEST alums get return offers from their placement companies at 60%+ rates.",
  },
  // ===== NYU Stern — Investment Banking track =====
  {
    id: "op-nyu-wallstreet-scholars",
    name: "NYU Stern Wall Street Scholars Program",
    track: "investment-banking",
    category: "Fellowship",
    access: "direct",
    school: "New York University",
    deadline: "2027-09-15",
    timeframe: "Apply early Fall for Spring cohort",
    requirements: ["NYU Stern sophomore", "Minimum 3.5 GPA", "Interest in finance careers"],
    contact: "Stern Office of Student Engagement",
    link: "https://www.stern.nyu.edu/programs-admissions/undergraduate",
    timeline: "Semester-long cohort: firm visits, alumni panels, technical workshops (DCF, LBO, comps), and mock interviews with analysts.",
    leverage: "Structured IB prep with firm access that most sophomores have to build themselves. The alumni network from this cohort is where referrals come from.",
    upstream: "None — but completing Foundations of Finance before applying makes your application stronger and lets you absorb the technical workshops",
    unlocks: ["Alumni network for referrals (the #1 way into IB interviews)", "Technical prep (DCF, LBO, comps) needed for Superday Simulator", "Firm visits that convert to sophomore internship interviews"],
    window: "Sept 15 — one cohort per year, sophomore-only window",
  },
  {
    id: "op-nyu-stern-womens-finance",
    name: "Stern Women in Finance Conference + Mentorship",
    track: "investment-banking",
    category: "Fellowship",
    access: "direct",
    school: "New York University",
    deadline: "2027-10-01",
    timeframe: "Apply Fall for academic year mentorship",
    requirements: ["NYU undergraduate", "Interest in finance", "Women or non-binary students"],
    contact: "Stern Women in Business",
    link: "https://www.stern.nyu.edu/",
    timeline: "Year-long mentorship with a Stern alum in IB/PE/VC + annual conference with recruiting access from Goldman, JPM, Morgan Stanley.",
    leverage: "Direct mentorship from someone who recruited into your target bank. The conference alone generates more interviews than cold-applying to 50 firms.",
    upstream: "None — open to all NYU undergrads with finance interest",
    unlocks: ["Named mentor at your target bank (for referrals and mock interviews)", "Conference recruiting access to Goldman, JPM, Morgan Stanley", "Insider knowledge of recruiting timelines specific to your target firm"],
    window: "Oct 1 — one annual mentorship cohort, conference is in spring",
  },
  {
    id: "op-nyu-simulator",
    name: "Stern Finance Recruiting Simulator (Mock Superday)",
    track: "investment-banking",
    category: "Advising",
    access: "direct",
    school: "New York University",
    deadline: "",
    timeframe: "Spring semester (sign up via career portal)",
    requirements: ["NYU undergraduate", "Completed corporate finance or equivalent"],
    contact: "Wasserman Center for Career Development",
    link: "https://www.nyu.edu/students/student-information-and-resources/career-development-and-jobs.html",
    timeline: "Full-day simulation of a Superday: 3 back-to-back technicals, a case study, and behavioral rounds. Feedback from IB analysts and associates.",
    leverage: "The format gap kills more candidates than the content gap. One realistic Superday sim is worth 20 hours of solo prep.",
    upstream: "Corporate finance course completed + Wall Street Scholars technical workshops (DCF/LBO/comps knowledge assumed)",
    unlocks: ["Realistic interview feedback before real Superday", "Confidence under pressure — the #1 predictor of IB offer conversion", "Direct connection to IB analysts who serve as mock interviewers"],
    window: "Spring semester only — sign up early, slots fill within days of opening",
  },
  // ===== MIT — Research PhD track =====
  {
    id: "op-mit-urop",
    name: "MIT Undergraduate Research Opportunities Program (UROP)",
    track: "research-phd",
    category: "Research",
    access: "direct",
    school: "Massachusetts Institute of Technology",
    deadline: "",
    timeframe: "Rolling — apply any semester",
    requirements: ["MIT undergraduate", "Faculty sponsor"],
    contact: "Office of Undergraduate Advising and Academic Programming",
    link: "https://urop.mit.edu/",
    timeline: "Paid or credit-based research under a faculty member. Can start any semester, continue year-round, and build toward a thesis.",
    leverage: "80% of MIT PhD admits did UROP. Starting sophomore year gives you 2+ years of sustained research — exactly what PhD committees screen for.",
  },
  {
    id: "op-mit-superurop",
    name: "SuperUROP — Advanced Undergraduate Research",
    track: "research-phd",
    category: "Research",
    access: "direct",
    school: "Massachusetts Institute of Technology",
    deadline: "2027-05-15",
    timeframe: "Apply Spring for following Fall (year-long)",
    requirements: ["MIT junior", "Prior UROP or equivalent research", "Faculty sponsor", "Minimum one semester of research experience"],
    contact: "EECS Department / CSAIL",
    link: "https://superurop.mit.edu/",
    timeline: "Year-long intensive: your own research project, $6K stipend, weekly seminar, conference-quality paper, and poster presentation at MIT.",
    leverage: "Produces a publication-quality result in one year. SuperUROP alums get into top PhD programs at 2x the base rate because they have a real paper.",
  },
  {
    id: "op-mit-primes",
    name: "MIT PRIMES (Program for Research in Mathematics, Engineering, and Science)",
    track: "research-phd",
    category: "Research",
    access: "direct",
    school: "Massachusetts Institute of Technology",
    deadline: "2027-01-01",
    timeframe: "Apply Winter for academic year placement",
    requirements: ["MIT or local undergraduate", "Strong math/CS background", "Faculty mentor match"],
    contact: "MIT Mathematics Department",
    link: "https://math.mit.edu/research/highschool/primes/",
    timeline: "Year-long mentored research in pure math, CS theory, or computational biology. Annual conference presentation and co-authored paper.",
    leverage: "Publish with MIT faculty as an undergrad. For PhD apps in math/CS theory, a PRIMES paper is essentially an auto-admit signal at top programs.",
  },
  // ===== Georgetown — Political Science / Public Affairs track =====
  {
    id: "op-gtown-ppia",
    name: "PPIA Junior Summer Institute at Georgetown",
    track: "public-affairs",
    category: "Fellowship",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-11-01",
    timeframe: "Apply Fall for following Summer",
    requirements: ["Sophomore or junior", "Interest in public service career", "US citizen or permanent resident", "Minimum 3.0 GPA"],
    contact: "McCourt School of Public Policy",
    link: "https://ppiaprogram.org/",
    timeline: "Fully funded 7-week summer institute covering quantitative methods, policy analysis, and economics. Guarantees fee waivers at 50+ grad programs.",
    leverage: "The single strongest signal for MPP/MPA admissions. Completers get fee waivers at every top policy school and a network that follows you for decades.",
  },
  {
    id: "op-gtown-guppi",
    name: "Georgetown Undergraduate Public Policy Institute (GUPPI)",
    track: "public-affairs",
    category: "Research",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-02-15",
    timeframe: "Spring application, Summer program",
    requirements: ["Georgetown undergraduate", "Interest in policy research", "Faculty recommendation"],
    contact: "McCourt School of Public Policy",
    link: "https://mccourt.georgetown.edu/",
    timeline: "Semester-long policy research mentorship with a McCourt faculty member, culminating in a policy brief presentation.",
    leverage: "Gets you a named faculty relationship in the policy school — critical for law school recs and Hill internship referrals.",
  },
  {
    id: "op-gtown-legal-fellows",
    name: "Georgetown Pre-Law Scholars Program",
    track: "public-affairs",
    category: "Fellowship",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-03-01",
    timeframe: "Apply Spring for following academic year",
    requirements: ["Sophomore", "Minimum 3.3 GPA", "Interest in legal career", "Two faculty recommendations"],
    contact: "Georgetown Law Center Pre-Law Programs",
    link: "https://www.law.georgetown.edu/",
    timeline: "Year-long cohort with LSAT prep, law school visits, mentorship from Georgetown Law students, and a mock trial experience.",
    leverage: "Structured LSAT prep + Georgetown Law network access. Students in this program admit to T14 law schools at 3x the base rate.",
  },
  {
    id: "op-gtown-hill-intern",
    name: "Georgetown Congressional Internship Program",
    track: "public-affairs",
    category: "Internship",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-09-15",
    timeframe: "Apply early Fall for Spring semester",
    requirements: ["Georgetown undergraduate", "Completed intro political science course", "US citizen"],
    contact: "Government Department Internship Coordinator",
    link: "https://government.georgetown.edu/",
    timeline: "Part-time semester placement on Capitol Hill — legislative research, constituent casework, and committee hearing prep.",
    leverage: "Direct Hill experience as a sophomore is rare. Builds the policy writing sample and government network that Truman reviewers look for.",
  },
  {
    id: "op-gtown-pivot-fellows",
    name: "Pivot Program — Public Interest Law Fellowship",
    track: "public-affairs",
    category: "Fellowship",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-01-15",
    timeframe: "Apply Winter for Summer placement",
    requirements: ["Sophomore or junior", "Interest in public interest law", "Demonstrated community engagement"],
    contact: "Center for Social Justice",
    link: "https://csj.georgetown.edu/",
    timeline: "8-week paid summer placement at a public interest law organization (legal aid, civil rights, immigration). Weekly seminars with practicing attorneys.",
    leverage: "Hands-on legal work before law school. The personal statement writes itself, and you'll know if law is actually what you want.",
  },
  {
    id: "op-gtown-truman-prep",
    name: "Truman Scholarship Faculty Nomination Prep",
    track: "public-affairs",
    category: "Advising",
    access: "direct",
    school: "Georgetown University",
    deadline: "2027-09-01",
    timeframe: "Early Fall (internal deadline ahead of national)",
    requirements: ["Junior", "Minimum 3.5 GPA", "Track record of public service", "Faculty nomination required"],
    contact: "Office of Fellowships, Scholarships & Awards",
    link: "https://www.truman.gov/",
    timeline: "Georgetown's internal process starts September — meet with the fellowships office, identify your faculty nominator, and workshop your policy proposal.",
    leverage: "Truman is $30K for grad school and the strongest public-service credential an undergrad can earn. The internal prep process is where you win or lose.",
  },
  // ===== Carnegie Mellon — Design track =====
  {
    id: "op-cmu-ixd-studio",
    name: "IxD Studio — Interaction Design Practicum",
    track: "design",
    category: "Course",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "",
    timeframe: "Fall or Spring semester",
    requirements: ["Sophomore or above", "Completed Intro to Design Fundamentals", "Portfolio of 3+ projects"],
    contact: "School of Design, CFA",
    link: "https://design.cmu.edu/",
    timeline: "Semester-long client project in teams of 4. Real briefs from industry partners (Google, UPMC, PNC). End-of-semester critique with external reviewers.",
    leverage: "A shipped client project with a real company name — the portfolio piece that gets you past the recruiter screen at any design internship.",
  },
  {
    id: "op-cmu-ideate",
    name: "IDeATe Creative Technology Network",
    track: "design",
    category: "Club",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "",
    timeframe: "Rolling — join any semester",
    requirements: ["Any CMU undergraduate", "Interest in creative technology"],
    contact: "IDeATe @ Hunt Library",
    link: "https://ideate.cmu.edu/",
    timeline: "Cross-disciplinary making community. Access to fabrication labs, laser cutters, VR equipment. Collaborative projects across CS, art, architecture, and design.",
    leverage: "Gives you access to tools and collaborators outside your major. The interdisciplinary projects stand out in portfolios because they show range.",
  },
  {
    id: "op-cmu-design-research",
    name: "Undergraduate Design Research Assistantship",
    track: "design",
    category: "Research",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "2027-09-30",
    timeframe: "Apply early Fall for academic year",
    requirements: ["Sophomore or junior in School of Design", "Minimum 3.2 GPA", "Faculty sponsor"],
    contact: "School of Design Research Office",
    link: "https://design.cmu.edu/",
    timeline: "Paid research position under a design faculty member. Projects range from healthcare UX to accessibility to speculative design.",
    leverage: "Design research experience is rare at the undergrad level. Strong signal for HCI grad programs and research-oriented roles at Google/Microsoft.",
  },
  {
    id: "op-cmu-summer-design",
    name: "CMU Summer Design Intensive for Non-Majors",
    track: "design",
    category: "Course",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "2027-03-15",
    timeframe: "Apply Spring for Summer",
    requirements: ["Any CMU undergraduate", "No prior design coursework required"],
    contact: "School of Design Admissions",
    link: "https://www.cmu.edu/pre-college/",
    timeline: "6-week intensive covering design thinking, prototyping, user research, and visual design. Ends with a portfolio-ready capstone project.",
    leverage: "If you're coming from CS or engineering, this gives you a design portfolio in one summer. The fastest path to qualifying for design internships.",
  },
  {
    id: "op-cmu-aiga-chapter",
    name: "AIGA CMU Student Chapter + Portfolio Reviews",
    track: "design",
    category: "Club",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "",
    timeframe: "Rolling — attend events any semester",
    requirements: ["Any CMU student", "Interest in design careers"],
    contact: "AIGA CMU Chapter, School of Design",
    link: "https://www.aiga.org/",
    timeline: "Monthly portfolio reviews with visiting designers, recruiting events with IDEO/Figma/Spotify, and annual design conference scholarships.",
    leverage: "Portfolio reviews from working professionals fix blind spots you can't see yourself. Plus direct recruiting pipelines to top studios and tech companies.",
  },
  {
    id: "op-cmu-ux-internship",
    name: "HCII Undergraduate UX Research Internship",
    track: "design",
    category: "Internship",
    access: "direct",
    school: "Carnegie Mellon University",
    deadline: "2027-02-01",
    timeframe: "Apply Winter for Summer",
    requirements: ["Junior", "Completed at least one HCI course", "Portfolio with 2+ research projects"],
    contact: "Human-Computer Interaction Institute",
    link: "https://hcii.cmu.edu/",
    timeline: "10-week paid summer placement in an HCII lab. Publish-quality research on accessibility, AI interfaces, or health tech.",
    leverage: "HCII is the #1 ranked HCI program. A summer here is the strongest possible signal for UX research roles at Google, Apple, or Microsoft.",
  },
];

export const COURSES: Course[] = [];

export const PERSONAS: Persona[] = [
  {
    id: "maya",
    name: "Maya",
    major: "Computer Science",
    year: "Freshman",
    school: "Georgia Institute of Technology",
    track: "software-engineer",
    preferences: { format: "Lecture", workload: "Heavy", style: "Independent" },
    audit: {
      program: "B.S. Computer Science, Intelligence thread",
      creditsEarned: 18,
      creditsRequired: 126,
      remaining: ["CS 1331 (OOP)", "CS 1332 (Data Structures)", "CS electives (9 credits)", "Senior design (6 credits)", "Math electives (6 credits)"],
    },
  },
  {
    id: "alex",
    name: "Alex",
    major: "Biology",
    year: "Sophomore",
    school: "University of California, Los Angeles",
    track: "physician-scientist",
    preferences: { format: "Seminar", workload: "Moderate", style: "Discussion" },
    audit: {
      program: "B.S. Biology, pre-med concentration",
      creditsEarned: 52,
      creditsRequired: 180,
      remaining: ["Upper-division biology (12 units)", "Organic chemistry (8 units)", "Physics sequence (8 units)", "Biostatistics (4 units)"],
    },
  },
];

export function getTrack(id: string) {
  return TRACKS.find((t) => t.id === id);
}
export function getOpportunity(id: string) {
  return OPPORTUNITIES.find((o) => o.id === id);
}
export function getCourse(code: string) {
  return COURSES.find((c) => c.code === code);
}
export function opportunitiesForTrack(track: string) {
  return OPPORTUNITIES.filter((o) => o.track === track);
}

/** The track's hero "next move": earliest real deadline first, rolling programs last. */
export function heroOpportunityForTrack(track: string) {
  return opportunitiesForTrack(track)
    .slice()
    .sort((a, b) => {
      // Empty deadlines (rolling) sort AFTER real deadlines
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })[0];
}


// ---------------------------------------------------------------------------
// The Long View — general, well-established patterns per track and year.
// Deliberately contains NO program names, deadlines, contacts, or links:
// anything specific must live in OPPORTUNITIES instead.
// ---------------------------------------------------------------------------

export type MilestoneYear = "Sophomore" | "Junior" | "Senior" | "Year 1" | "Years 2–3" | "Graduate Year 1" | "Graduate Years 2–3";

export type Milestone = {
  track: TrackId;
  year: MilestoneYear;
  /** Short phrase — the general goal for this year. */
  focus: string;
  /** One sentence — a broad pattern worth watching for. */
  lookOutFor: string;
  /** Concrete, specific action items — exactly what to do. */
  actions: string[];
  /** What "done" looks like — the deliverable or evidence. */
  doneWhen: string;
};

export const MILESTONES: Milestone[] = [
  // -------------------------------------------------------------------------
  // Physician-Scientist
  // -------------------------------------------------------------------------
  {
    track: "physician-scientist",
    year: "Sophomore",
    focus: "Get into a lab and stay there",
    lookOutFor:
      "Depth in one lab reads stronger than short stints across several — an early start compounds into a named authorship or co-authorship by junior year.",
    actions: [
      "Email 3–5 faculty whose papers you've actually read; attach a one-paragraph summary of what interested you and ask for 10 minutes to discuss joining their lab.",
      "Commit to a minimum of 10 hours/week in one lab for the full academic year — not a one-semester trial.",
      "Complete your Organic Chemistry I sequence this year (it gates every MCAT prep timeline).",
      "Log at least 20 hours of clinical shadowing (hospital volunteer corps, free clinic) to test whether you actually want patient contact.",
      "Start a simple research notebook: date, what you did, what you observed, questions for your PI.",
    ],
    doneWhen: "You have a faculty mentor who knows your name, you've been in the same lab for two consecutive semesters, and you can explain one active project in your own words.",
  },
  {
    track: "physician-scientist",
    year: "Junior",
    focus: "Turn one lab relationship into a letter",
    lookOutFor:
      "MD/PhD committees weigh sustained time with a single mentor over breadth across several labs. A letter that says 'independently designed an experiment' outweighs one that says 'assisted with data collection.'",
    actions: [
      "Ask your PI by October: 'What would I need to accomplish this year for you to write me a strong letter?' — then do exactly that.",
      "Present at least one poster or short talk (departmental symposium, undergraduate research day) by spring.",
      "Take the MCAT in May or June — register by February. Target 515+ (85th percentile) for competitive MD/PhD programs.",
      "Accumulate 50+ additional clinical hours; start a longitudinal relationship (same clinic weekly) rather than one-off shifts.",
      "Draft a one-page research summary: hypothesis, methods, your specific contribution, one result.",
      "Apply to summer research fellowships (NIH MSTP fairs, institutional SURF programs) by January deadlines.",
    ],
    doneWhen: "Your PI has agreed to write your letter, you have an MCAT score on file, and you can articulate your research narrative in two minutes.",
  },
  {
    track: "physician-scientist",
    year: "Senior",
    focus: "Apply with a complete committee letter",
    lookOutFor:
      "Programs generally expect two or more years of documented research plus 100+ clinical hours before a strong committee letter is possible. Applications open June 1 (AMCAS).",
    actions: [
      "Submit AMCAS primary application the first week it opens (early June). Pre-write your personal statement by April.",
      "Secure 3 letters: one research PI (strong, detailed), one science faculty, one from clinical supervisor.",
      "Prepare for MD/PhD secondary essays: each school asks 'Why MD/PhD?' and 'Describe your research' — draft both by May.",
      "Finalize 150+ total clinical contact hours across at least two settings (hospital + community).",
      "Have your research summary ready: 1–2 publications or a manuscript in preparation strengthens your file significantly.",
      "Interview prep: be ready to explain one experiment at the whiteboard and connect it to a clinical question.",
    ],
    doneWhen: "Primary application submitted by mid-June, secondaries returned within 2 weeks of receipt, all letters uploaded by August, and you can walk through your research narrative without notes.",
  },

  // -------------------------------------------------------------------------
  // Product Manager
  // -------------------------------------------------------------------------
  {
    track: "product-manager",
    year: "Sophomore",
    focus: "Ship something small and real",
    lookOutFor:
      "Early PM screens look for evidence you shipped something and learned from users — not coursework alone. 'I built X, Y people used it, I changed Z based on feedback' is the story they want.",
    actions: [
      "Build and launch one product (app, tool, Chrome extension, Slack bot) that at least 20 real people use. Put it on a live URL.",
      "Run 5 user interviews: watch people use your thing, write down what confused them, ship a fix within a week.",
      "Join or lead a product-building club (startup team, hackathon org, design sprint group) — PMs are evaluated on cross-functional collaboration.",
      "Take one data/analytics course (SQL at minimum; A/B testing concepts are a plus).",
      "Start reading shipped product case studies (Lenny's Newsletter, Shreyas Doshi threads) weekly — build vocabulary for tradeoff discussions.",
    ],
    doneWhen: "You have one live project with real users and can explain: what problem it solves, how you measured success, and one decision you reversed based on data or feedback.",
  },
  {
    track: "product-manager",
    year: "Junior",
    focus: "Land a product-adjacent internship",
    lookOutFor:
      "APM programs (Google, Meta, Uber, Stripe) recruit 12+ months early — applications open the summer before junior year ends. Monitor job boards starting June.",
    actions: [
      "Apply to 10–15 APM/PM intern programs between July and October. Deadlines are early and rolling — first-round closes fast.",
      "Prep for PM interviews: practice product sense (design a feature for X), execution (metrics for Y), and strategy (enter market Z) frameworks weekly.",
      "Get a product-adjacent internship if not a direct PM role: growth marketing, product analytics, UX research, or engineering at a startup all count.",
      "Document one project as a full case study: problem → hypothesis → what you built → metrics → learnings. This becomes your interview story.",
      "Do at least one mock PM interview per week with a peer or mentor from September through November.",
    ],
    doneWhen: "You have a summer internship offer in a product-adjacent or direct PM role, and you can deliver a 5-minute product case study without slides.",
  },
  {
    track: "product-manager",
    year: "Senior",
    focus: "Convert your internship into a full-time offer or recruit new-grad PM roles",
    lookOutFor:
      "New-grad product roles are filled in early autumn — most APM programs close applications by October. If you're converting an internship, the decision usually comes within 4 weeks of your last day.",
    actions: [
      "During your summer internship: own a measurable outcome, not just a feature. Ship something and tie it to a metric the team cares about.",
      "Ask your internship manager for explicit feedback at the midpoint — course-correct before the final review.",
      "If applying externally: submit applications August–October. Have 2–3 polished case studies ready (one from internship, one personal project, one from class or club).",
      "Practice behavioral questions: 'Tell me about a time you disagreed with an engineer' — have 4–5 STAR stories prepped.",
      "Network with 2–3 PMs at target companies via cold LinkedIn messages or alumni connections — referrals meaningfully increase interview rates.",
    ],
    doneWhen: "You have a signed full-time PM offer, or you're actively in final-round interviews with at least 2 companies by November.",
  },

  // -------------------------------------------------------------------------
  // Software Engineer
  // -------------------------------------------------------------------------
  {
    track: "software-engineer",
    year: "Sophomore",
    focus: "Build projects and nail data structures",
    lookOutFor:
      "Top internship pipelines (FAANG, unicorns) open applications in August–September for the following summer. They screen on projects and DSA, not GPA. Start LeetCode now, not junior year.",
    actions: [
      "Complete 100+ LeetCode problems (focus: arrays, strings, trees, graphs, dynamic programming). Aim for Medium difficulty by spring.",
      "Build 2–3 projects with real functionality and deploy them: one full-stack web app, one systems/CLI tool or API, one that interests you personally. Put them on GitHub with READMEs.",
      "Contribute to one open-source project — even a small PR (docs fix, bug fix) shows you can work in a real codebase.",
      "Apply to freshman/sophomore-specific programs: Google STEP, Meta University, Microsoft Explore, Uber STARt — deadlines are August–October.",
      "Learn Git workflows, CI/CD basics, and how to write tests. Interviewers notice when you mention testing in your project descriptions.",
    ],
    doneWhen: "You have a GitHub with 2+ deployed projects, you can solve a medium LeetCode in 25 minutes, and you've applied to at least 5 sophomore-targeted internship programs.",
  },
  {
    track: "software-engineer",
    year: "Junior",
    focus: "Land a top-tier summer internship",
    lookOutFor:
      "Applications for Summer 2027 roles at major companies open July–September 2026 and fill on a rolling basis. Applying in August vs. November genuinely changes your odds.",
    actions: [
      "Apply to 30–50 companies between July and October. Track applications in a spreadsheet. Prioritize companies that opened early.",
      "Reach 200+ LeetCode problems solved. Focus on patterns (sliding window, BFS/DFS, two pointers, backtracking) not raw count.",
      "Practice system design basics: load balancers, caching, database sharding, API design. You won't get deep SD rounds yet, but some companies ask lightweight versions.",
      "Do 2–3 mock interviews per week (Pramp, peers, or interviewing.io) from September through December.",
      "Build one 'impressive' project: something with scale (handles concurrent users), uses a real database, or solves an actual problem people have. This is your resume headliner.",
      "Attend career fairs and company info sessions — direct recruiter contact can fast-track your application past the resume screen.",
    ],
    doneWhen: "You have a signed internship offer at a company you're excited about, ideally by December. Your resume leads with projects and technical skills, not coursework.",
  },
  {
    track: "software-engineer",
    year: "Senior",
    focus: "Convert your internship or recruit for new-grad roles",
    lookOutFor:
      "Return offers from summer internships typically come 2–4 weeks after your last day. New-grad applications open August–October. The strongest candidates have offers by December.",
    actions: [
      "During your internship: ship a feature end-to-end, ask for scope expansion, get written feedback from your manager and skip-level.",
      "If no return offer: apply to 50+ new-grad roles starting in August. Prioritize early openers (trading firms, FAANG, well-funded startups).",
      "Maintain LeetCode sharpness: solve 3–5 problems/week through interview season. Focus on Hard problems now.",
      "Prepare system design answers for senior-level new-grad interviews: design a URL shortener, chat system, notification service.",
      "Negotiate offers: research levels.fyi for comp data. Having multiple offers gives you leverage — don't accept the first one immediately.",
      "If interested in startups: attend demo days, reach out to YC companies directly, network with CTOs on Twitter/X.",
    ],
    doneWhen: "You have a signed new-grad offer with a start date, or you've successfully converted your internship return offer. You can explain your internship impact in quantified terms.",
  },

  // -------------------------------------------------------------------------
  // Investment Banking
  // -------------------------------------------------------------------------
  {
    track: "investment-banking",
    year: "Sophomore",
    focus: "Build technical foundation and apply to insight programs",
    lookOutFor:
      "Sophomore insight/diversity programs at bulge brackets (Goldman, JPM, Morgan Stanley) open applications as early as September — 18 months before your actual junior-summer internship. These are the pipeline into junior recruiting.",
    actions: [
      "Apply to 5–10 sophomore insight programs (Goldman Sachs Insight, JPM Freshman/Sophomore Program, Citi Early ID) by October–December deadlines.",
      "Complete a financial modeling course (Wall Street Prep, CFI, or Macabacus) and build 1–2 DCF models from scratch.",
      "Master accounting fundamentals: know how the three financial statements link. Be able to walk through an income statement and explain what flows where.",
      "Learn to pitch a stock: pick one public company, build a one-page investment thesis with valuation support. Practice delivering it in 2 minutes.",
      "Network with 5+ alumni in banking — send cold LinkedIn messages asking for 15-minute calls. Keep a tracker of conversations.",
      "Join your school's finance club or investment club. Aim for an analyst role where you write research reports.",
    ],
    doneWhen: "You can walk through a DCF, pitch a stock in 2 minutes, explain the three statements, and you've applied to multiple insight programs. Your networking tracker has 5+ contacts.",
  },
  {
    track: "investment-banking",
    year: "Junior",
    focus: "Recruit for the junior-summer internship",
    lookOutFor:
      "Banking recruiting runs absurdly early — applications open September–November of sophomore year for many firms, with superdays (final interviews) running October–January. If you haven't started networking by September of junior year, you're late for the main cycle.",
    actions: [
      "Submit applications to 15–25 banks between September and January. Bulge brackets close first; middle-market and boutiques stay open longer.",
      "Prep technical questions cold: 'Walk me through a DCF,' 'What are the three ways to value a company,' 'Walk me through an LBO.' Practice daily.",
      "Master behavioral questions: 'Why banking?' 'Why this firm?' 'Tell me about a deal you followed.' Have 3–4 deal summaries from WSJ/FT ready.",
      "Network aggressively: aim for 3–5 informational calls per week. Every conversation should end with 'Is there anyone else you'd recommend I speak with?'",
      "Attend every on-campus event your target banks host. Introduce yourself to associates and VPs — they remember faces.",
      "Prep for superdays: 30-minute technicals + 30-minute behavioral, back-to-back for 3–5 hours. Do mock superdays with your club or peers.",
    ],
    doneWhen: "You have a signed junior-summer internship offer at a bank by February. You can deliver a 2-minute deal pitch, walk through a DCF without notes, and explain why this firm specifically.",
  },
  {
    track: "investment-banking",
    year: "Senior",
    focus: "Convert the internship into a return offer",
    lookOutFor:
      "85–90% of full-time analyst offers come from summer interns who performed well. The internship IS the interview — every interaction is evaluated. Return decisions come 2–4 weeks post-internship.",
    actions: [
      "During your internship: volunteer for extra work, stay until the deal team leaves (not before), ask smart questions in meetings, triple-check your models for errors.",
      "Build relationships with associates and VPs — they write your review. Get lunch with a different person each week.",
      "Ask your staffer for a variety of deal exposure (M&A, ECM, DCM if in a generalist pool). Breadth of reps matters.",
      "If you don't get a return offer: immediately pivot to off-cycle recruiting. Boutiques, PE firms, and corporate development teams hire year-round.",
      "If you do convert: use senior year to rest, but also learn about exit opportunities (PE, HF, corp dev) since most analysts recruit for exits within 6–12 months of starting.",
      "Keep your modeling skills sharp — you'll be expected to hit the ground running on Day 1.",
    ],
    doneWhen: "You have a signed full-time analyst offer (return or off-cycle), and you can execute a full operating model, DCF, and comps set independently.",
  },

  // -------------------------------------------------------------------------
  // Research PhD
  // -------------------------------------------------------------------------
  {
    track: "research-phd",
    year: "Sophomore",
    focus: "Find a research question and commit to a lab",
    lookOutFor:
      "PhD applications ask 'What do you want to study and why?' — that answer comes from hands-on time in a lab, not from browsing faculty pages. Start now and you'll have 2+ years of depth by application time.",
    actions: [
      "Join a research lab by October. Approach 3–5 professors whose recent papers interest you — read at least one paper before emailing.",
      "Commit to 10–15 hours/week minimum. Treat it like a part-time job, not a club.",
      "Learn the tools of your field this year: statistics software (R/Python), lab equipment, field methods, or whatever your discipline uses.",
      "Attend your department's research seminar series — even if you understand 30% of the talks, exposure matters.",
      "Apply to a summer REU (Research Experiences for Undergraduates) — NSF funds hundreds of these. Deadlines are January–February.",
      "Start reading papers weekly in your area. Keep a one-line summary of each in a running document.",
    ],
    doneWhen: "You're in a lab, you've been there for two semesters, you can explain your PI's research program to a non-expert, and you've applied to at least one summer research program.",
  },
  {
    track: "research-phd",
    year: "Junior",
    focus: "Take ownership of a project and get a result",
    lookOutFor:
      "Recommenders write the strongest letters when they can describe work you drove yourself. 'Student independently designed the experiment' or 'originated the analysis' are the phrases that move committees.",
    actions: [
      "Propose a sub-project or extension of your PI's work that you can own end-to-end. Get your PI's sign-off and timeline.",
      "Present your work: submit an abstract to at least one conference (even a regional undergraduate symposium counts). Deadline awareness: most are January–March.",
      "Aim for a co-authored paper or a manuscript in preparation by the end of junior year. Even a conference proceedings paper counts.",
      "Spend the summer doing full-time research — either in your own lab or an external REU/SURF. Full-time summer research is the single strongest signal on a PhD application.",
      "Identify 3–5 PhD programs and 2–3 faculty at each whose work aligns with yours. Read their recent papers.",
      "Take the GRE if your target programs still require it (many have dropped it — check each program).",
    ],
    doneWhen: "You have one research product (poster, paper, or talk), your PI can speak to work you drove independently, and you've identified target programs and advisors.",
  },
  {
    track: "research-phd",
    year: "Senior",
    focus: "Apply in the autumn with three strong letters",
    lookOutFor:
      "PhD applications are due November–January of senior year. You need 3 letters (at least 2 from research supervisors who know your work deeply), a research statement, and a personal statement. Faculty fit often matters more than prestige.",
    actions: [
      "Email potential PhD advisors in September–October: introduce your research, ask if they're taking students, and express specific interest in their work. This is not optional — advisor fit drives admissions decisions.",
      "Ask for letters by September 15 at the latest. Give each writer a one-page summary of your research, your target programs, and why you're applying to PhD (not just grad school).",
      "Write your research statement: 2 pages covering what you did, what you found, and what you want to study next. Have your PI review it.",
      "Apply to 8–12 programs. Don't over-index on rankings — advisor fit and funding matter more than US News rank.",
      "Prep for interviews (January–March): be ready to present your research in 10 minutes, discuss your future directions, and ask intelligent questions about the lab's current projects.",
      "Have a backup plan: post-bac research positions, lab manager roles, or industry research jobs if you want a gap year to strengthen your application.",
    ],
    doneWhen: "All applications submitted by December deadlines, letters confirmed uploaded, you've contacted 2+ faculty per program, and you can present your research clearly in 10 minutes.",
  },

  // -------------------------------------------------------------------------
  // Post-graduation: Product Manager
  // -------------------------------------------------------------------------
  {
    track: "product-manager",
    year: "Year 1",
    focus: "Earn trust and ship your first product win",
    lookOutFor:
      "First-year PMs are judged on execution speed and cross-functional relationships, not grand strategy. The ones who get promoted fastest ship small wins early and build credibility with engineers before proposing big bets.",
    actions: [
      "In your first 90 days: ship one measurable improvement to an existing product — not a new feature, a better version of something that already exists.",
      "Build a 1:1 relationship with at least 3 engineers on your team. Understand their frustrations before proposing solutions.",
      "Master your product's metrics: know the funnel, retention curves, and top-line KPIs cold. Be the person who notices when something moves.",
      "Run your first A/B test end-to-end — hypothesis, design, analysis, decision. Document the learnings publicly for your team.",
      "Get comfortable saying 'no' to feature requests with data. Practice writing clear one-pagers that explain why something isn't worth building right now.",
    ],
    doneWhen: "You've shipped 2–3 features that moved a metric your team cares about, your engineering lead trusts your judgment, and you can explain your product's strategy without looking at a doc.",
  },
  {
    track: "product-manager",
    year: "Years 2–3",
    focus: "Own a problem space, not just a feature backlog",
    lookOutFor:
      "The transition from APM/PM to Senior PM is about moving from executing someone else's roadmap to defining the roadmap yourself. This requires developing product intuition, managing ambiguity, and influencing without authority across teams.",
    actions: [
      "Identify a customer problem your team isn't solving yet and write the strategy doc to address it — then get buy-in from leadership to pursue it.",
      "Mentor a junior PM or intern. Teaching forces you to articulate frameworks you use intuitively and builds your leadership brand.",
      "Build a network outside your immediate team: attend product leadership meetings, join cross-functional working groups, present at company all-hands.",
      "Develop a point of view on where your product area is headed in 2–3 years. Write it down. Share it with your manager and get feedback.",
      "Start evaluating whether you want to go deeper (staff PM, principal PM) or broader (general management, founder). Both paths require different investments starting now.",
    ],
    doneWhen: "You own a product area with P&L responsibility or team-level scope, you've influenced a strategic decision that affected multiple teams, and peers seek your opinion on product direction.",
  },

  // -------------------------------------------------------------------------
  // Post-graduation: Physician-Scientist
  // -------------------------------------------------------------------------
  {
    track: "physician-scientist",
    year: "Year 1",
    focus: "Survive first year of med school while maintaining research momentum",
    lookOutFor:
      "MD/PhD students who keep a toe in research during M1–M2 (even just a few hours/week on analysis or writing) transition back to full-time research far more smoothly than those who disconnect entirely.",
    actions: [
      "Complete your first-year coursework: anatomy, biochemistry, physiology. Boards preparation begins naturally through this material.",
      "Maintain contact with your research lab — even 3–5 hours/week on data analysis or literature review keeps the thread alive.",
      "Identify your thesis advisor if you haven't already. Have at least two conversations about potential dissertation directions by spring.",
      "Build clinical reasoning skills early: engage deeply with patient encounters in your clinical skills course. These observations feed back into your research questions.",
      "Connect with senior MD/PhD students — they know which qualifying exam pitfalls to avoid and which committees to seek out.",
    ],
    doneWhen: "You've passed your first-year coursework, maintained active contact with your research lab, and have a preliminary thesis direction and advisor confirmed.",
  },
  {
    track: "physician-scientist",
    year: "Years 2–3",
    focus: "Complete the PhD transition and produce your core publications",
    lookOutFor:
      "The middle years are where MD/PhD students either build the publication record that defines their career or stall. Consistent output — even incremental results — matters more than waiting for one big finding.",
    actions: [
      "Pass Step 1/COMLEX (if your program requires pre-PhD) and transition fully into research by summer.",
      "Publish at least one first-author paper by the end of year 3 — this is the single strongest predictor of competitive residency placement.",
      "Present at one national conference per year. Build your professional identity in the research community now.",
      "Begin thinking about residency specialties that align with your research. MD/PhD students match best when their research story and clinical specialty are coherent.",
      "Develop one collaboration outside your immediate lab — interdisciplinary work broadens your funding potential and gives you a second reference point.",
    ],
    doneWhen: "You have at least one first-author publication, a clear dissertation arc with 2–3 aims defined, and you can articulate how your research connects to a clinical specialty.",
  },

  // -------------------------------------------------------------------------
  // Post-graduation: Software Engineer
  // -------------------------------------------------------------------------
  {
    track: "software-engineer",
    year: "Year 1",
    focus: "Go from contributor to owner of a system",
    lookOutFor:
      "Junior engineers who get promoted fastest own something end-to-end within 6 months — a service, a pipeline, a feature area. Breadth of contributions matters less than depth of ownership.",
    actions: [
      "In your first 90 days: learn the codebase by fixing bugs. Ship 10+ small PRs before proposing anything architectural.",
      "Identify one system or service that needs an owner and volunteer to be the point person. Maintain it, improve it, document it.",
      "Write design docs for any change that takes more than a week. Get comfortable with the review process even for medium-sized work.",
      "Build on-call confidence: understand your team's alerts, runbooks, and failure modes. Being reliable during incidents builds trust fast.",
      "Learn the adjacent systems your code talks to. Understand at least one layer above and below your primary service.",
    ],
    doneWhen: "You own one system or feature area, you can debug production issues in your domain independently, and you've shipped one project that required a design doc and cross-team coordination.",
  },
  {
    track: "software-engineer",
    year: "Years 2–3",
    focus: "Lead technical projects and develop engineering judgment",
    lookOutFor:
      "The mid-level to senior transition isn't about writing more code — it's about making better technical decisions and multiplying the team's output. Senior engineers are judged on the problems they prevent, not just the features they ship.",
    actions: [
      "Lead a multi-month project end-to-end: scoping, design, implementation, launch, and retrospective. Delegate parts of it.",
      "Mentor one or two junior engineers. Code reviews are a start, but proactive 1:1s and pair programming sessions are what actually accelerate people.",
      "Develop expertise in one area that matters to the business: performance, reliability, security, or scalability. Become the person others consult.",
      "Start identifying technical debt that's costing the team velocity. Write the proposal to fix it and make the case in terms leadership cares about (velocity, reliability, cost).",
      "Decide whether you're on the IC (Staff/Principal) track or moving toward engineering management. Both require investment — the IC path needs deeper technical writing and broader influence, the EM path needs people skills and strategic thinking.",
    ],
    doneWhen: "You've led a project that shipped to production with significant impact, you're regularly consulted on technical decisions outside your immediate team, and you have a clear sense of your next career step.",
  },

  // -------------------------------------------------------------------------
  // Post-graduation: Investment Banking
  // -------------------------------------------------------------------------
  {
    track: "investment-banking",
    year: "Year 1",
    focus: "Survive analyst year and build your deal sheet",
    lookOutFor:
      "First-year analysts are evaluated on reliability, speed, and attitude under pressure. The analysts who get the best staffings (and later, the best exit opportunities) are the ones who never drop a ball and stay composed when deals go sideways at 2am.",
    actions: [
      "Master the core deliverables: pitch books, CIMs, models, and process letters. Speed and accuracy matter — triple-check every number before it goes to a VP.",
      "Build relationships with associates — they control your staffings and write your reviews. Be the analyst they want on their deals.",
      "Track every deal you touch: your deal sheet is your resume for exit opportunities. Note your specific contributions (ran the model, led the data room, etc.).",
      "Start networking for exit opportunities by month 6 — PE/HF recruiting starts absurdly early (often 12 months into your analyst stint).",
      "Take care of your health: establish one non-negotiable habit (gym, sleep minimum, weekend morning) to maintain sanity through the hours.",
    ],
    doneWhen: "You've closed 2–3 deals, your deal sheet has specific contributions documented, your VP and associates trust you with client-facing work, and you've started conversations with headhunters about exits.",
  },
  {
    track: "investment-banking",
    year: "Years 2–3",
    focus: "Execute your exit or commit to the promote",
    lookOutFor:
      "Most banking analysts exit after 2 years to PE, hedge funds, or corporate development. If you're staying for the associate promote, you need to demonstrate client management and deal origination potential. Either way, the clock is ticking — make a decision by month 18.",
    actions: [
      "If pursuing PE: prep for technical interviews (LBO modeling, case studies, deal walk-throughs) starting 12 months in. Target 10+ headhunter relationships.",
      "If pursuing hedge funds: develop an investment thesis, build a stock pitch, and understand public markets positioning. HF interviews test thinking, not just modeling.",
      "If staying in banking: communicate interest in the associate promote to your staffer and group head by month 15. Start taking on more client-facing responsibilities.",
      "Regardless of path: maintain your network outside finance. The people who transition to operating roles, startups, or business school later are those who kept relationships alive.",
      "Consider MBA if you want to pivot — top programs value 2–3 years of banking experience highly, and applications are due in September/January of your target year.",
    ],
    doneWhen: "You've either secured your exit opportunity (PE/HF offer signed) or you've been promoted to associate. Either way, you can point to specific deal outcomes you drove and have a clear 5-year view of where you're headed.",
  },

  // -------------------------------------------------------------------------
  // Post-graduation: Research PhD
  // -------------------------------------------------------------------------
  {
    track: "research-phd",
    year: "Year 1",
    focus: "Pass qualifying exams and lock in your dissertation committee",
    lookOutFor:
      "The first PhD year is about proving you can do independent research at a professional level. Programs vary, but most expect you to clear coursework requirements, pass qualifiers, and begin original work within 12–18 months.",
    actions: [
      "Complete required coursework with strong performance — these grades rarely matter for your career, but failing a qualifier can delay everything by a year.",
      "Formalize your advisor relationship: agree on expectations (meeting cadence, publication targets, timeline to candidacy) in writing or at least in a detailed conversation.",
      "Begin your qualifying exam preparation 3–4 months in advance. Talk to students who passed recently — format and expectations vary wildly by program and committee.",
      "Attend all lab meetings and your department's seminar series. Ask at least one question per month — visibility matters in small academic communities.",
      "Write a 2-page research proposal for your dissertation direction. It will change, but the exercise of articulating it forces clarity.",
    ],
    doneWhen: "You've passed your qualifying exam, your dissertation committee is formed, and you have a clear (if preliminary) research plan that your advisor endorses.",
  },
  {
    track: "research-phd",
    year: "Years 2–3",
    focus: "Produce publications and build your professional reputation",
    lookOutFor:
      "The mid-PhD years are where careers diverge. Students who publish consistently and present at conferences build the reputation that leads to postdoc offers, faculty positions, or industry research roles. Those who wait for the 'perfect result' often leave without publications.",
    actions: [
      "Submit at least one paper per year — even negative results or methods papers count. Consistent output beats waiting for a home run.",
      "Present at 1–2 conferences annually. Oral presentations > posters for visibility, but both count.",
      "Build 2–3 collaborations outside your immediate lab. Interdisciplinary work expands your network and funding potential.",
      "Start thinking about what's next: academia (postdoc → faculty), industry research (e.g., Google DeepMind, Microsoft Research), or applied roles. Each path requires different positioning starting now.",
      "Apply for at least one independent fellowship or grant (NSF GRFP if eligible, or discipline-specific awards). Funded students are more competitive for every next step.",
    ],
    doneWhen: "You have 2+ publications (at least one first-author), you're known at conferences in your subfield, and you have a realistic timeline to defense with your advisor's agreement.",
  },
];

export function milestonesForTrack(track: string) {
  return MILESTONES.filter((m) => m.track === track);
}

/** Post-graduation milestones only (Year 1, Years 2–3). */
export function postGradMilestonesForTrack(track: string) {
  return MILESTONES.filter((m) => m.track === track && (m.year === "Year 1" || m.year === "Years 2–3"));
}

/** Graduate-specific milestones (Graduate Year 1, Graduate Years 2–3). */
export function gradMilestonesForTrack(track: string) {
  return MILESTONES.filter((m) => m.track === track && (m.year === "Graduate Year 1" || m.year === "Graduate Years 2–3"));
}

/** All milestone year labels that apply after the current student year, including post-grad. */
export const POST_GRAD_YEARS: MilestoneYear[] = ["Year 1", "Years 2–3"];

/** Graduate-phase milestone year labels. */
export const GRAD_YEARS: MilestoneYear[] = ["Graduate Year 1", "Graduate Years 2–3"];

/** Whether the given year string indicates a graduate student. */
export function isGradStudent(year: string): boolean {
  return year === "Graduate" || year.toLowerCase().includes("grad") || year.toLowerCase().includes("phd") || year.toLowerCase().includes("mba") || year.toLowerCase().includes("master");
}

/**
 * Classify an opportunity's reach: "school" when it's tied to one seeded
 * campus, or "national" when it's open to students anywhere ("any").
 */
export function opportunityReach(op: { school?: string }): "school" | "national" {
  const s = (op.school ?? "").trim().toLowerCase();
  return s && s !== "any" ? "school" : "national";
}

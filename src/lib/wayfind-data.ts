// Sylo seed dataset. Every fact shown to a student must come from this file.
// Nothing outside this file may be presented as real.

import { createElement, type ReactNode } from "react";
import { Dna, Compass, TrendingUp, Microscope, Sparkles, Code } from "lucide-react";

export type TrackId =
  | "physician-scientist"
  | "product-manager"
  | "software-engineer"
  | "investment-banking"
  | "research-phd"
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

export const YEARS = ["First year", "Sophomore", "Junior", "Senior"];

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
  {
    id: "physician-scientist",
    label: "Physician-Scientist",
    icon: createElement(Dna, { className: "h-5 w-5" }),
    identity: "You want to run the experiment and still see the patient.",
    blurb: "MD/PhD paths are decided by bench research plus a named faculty letter, years before you apply.",

    brandPrograms: [
      { name: "NIH Summer Internship Program", sponsor: "NIH", note: "Paid biomedical research" },
      { name: "SHPEP", sponsor: "AAMC/RWJF", note: "Six-week pre-health enrichment" },
    ],
  },
  {
    id: "product-manager",
    label: "Product Manager",
    icon: createElement(Compass, { className: "h-5 w-5" }),
    identity: "You'd rather ship the thing than write about it.",
    blurb: "APM pipelines screen for shipped work, not coursework, and recruit 12 months ahead.",

    brandPrograms: [
      { name: "Google APM", sponsor: "Google", note: "Associate Product Manager new-grad track" },
      { name: "Meta RPM", sponsor: "Meta", note: "Rotational Product Manager program" },
    ],
  },
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
  // Physician-Scientist
  {
    id: "op-research-methods-seminar",
    name: "Register for BIO 355 Research Methods Seminar",
    track: "physician-scientist",
    category: "Course",
    access: "direct",
    school: "any",
    deadline: "2026-08-18",
    timeframe: "Fall registration closes Aug 18",
    requirements: ["Sophomore standing", "One completed lab science course"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/catalog/bio355",
    timeline: "Offered fall only; PIs recruit assistants out of this seminar in October.",
    leverage:
      "This is the room where lab PIs meet students before they take on research assistants — the mentor comes from here, not from an email.",
    courseCode: "BIO 355",
    gapLabel: "No faculty research mentor by October",
    upstream: "Sophomore standing and one completed lab science course.",
    unlocks: ["Faculty research letter (Nov)", "Physician-Scientist Fellowship application (Jan)"],
    window:
      "Offered fall only — miss it and the mentor relationship slips a full year, not just the course.",
  },

  {
    id: "op-bbrc-scholars",
    name: "Border Biomedical Research Center Scholars",
    track: "physician-scientist",
    category: "Research",
    access: "translated",
    brandEquivalent: "NIH Summer Internship Program",
    missingHere: "No NIH-hosted summer lab site operates on this campus.",
    school: "any",
    deadline: "2026-09-30",
    timeframe: "Closes Sept 30",
    requirements: ["3.0 GPA", "One completed lab science", "Faculty interest statement"],
    contact: "bbrc-scholars@campus.edu",
    link: "https://campus.edu/bbrc-scholars",
    timeline: "Applications reviewed in one round; placements start the following term.",
    leverage: "Paid bench research under a named PI — the exact letter source MD/PhD committees weigh most.",
    unlocks: ["Named-PI research letter"],

  },
  {
    id: "op-pioneer-health",
    name: "Pioneer Health Scholars",
    track: "physician-scientist",
    category: "Fellowship",
    access: "translated",
    brandEquivalent: "SHPEP",
    missingHere: "No SHPEP site is hosted at this school, so the enrichment cohort has to come from inside.",
    school: "any",
    deadline: "2026-10-01",
    timeframe: "Priority deadline Oct 1",
    requirements: ["Declared pre-health", "3.0 GPA", "Sophomore standing or above"],
    contact: "prehealth@campus.edu",
    link: "https://campus.edu/health-scholars",
    timeline: "Priority round in October, rolling review after.",
    leverage: "Guarantees 120 supervised clinical hours plus a committee letter writer.",
  },
  {
    id: "op-clinic-hours",
    name: "Teaching Hospital Volunteer Corps",
    track: "physician-scientist",
    category: "Internship",
    access: "direct",
    school: "any",
    deadline: "2026-08-30",
    timeframe: "Rolling, next intake Aug 30",
    requirements: ["Background check", "Immunization record", "Two shifts per week"],
    contact: "volunteer@teachinghospital.org",
    link: "https://teachinghospital.org/volunteer",
    timeline: "Intake every six weeks; onboarding takes two weeks.",
    leverage: "The cheapest way to start the clinical-hour clock that every application asks for.",
  },
  {
    id: "op-research-minigrant",
    name: "Undergraduate Research Mini-Grant",
    track: "physician-scientist",
    category: "Funding",
    access: "direct",
    school: "any",
    deadline: "2026-08-28",
    timeframe: "Next review Aug 28",
    requirements: ["One faculty sponsor signature", "One-page project note"],
    contact: "ur-grants@campus.edu",
    link: "https://campus.edu/research-grants",
    timeline: "Reviewed monthly; funds released within three weeks.",
    leverage: "$1,500 stipend that turns an unpaid lab shift into a term you can actually afford.",
  },
  {
    id: "op-physio-course",
    name: "Register for BIO 340 Human Physiology",
    track: "physician-scientist",
    category: "Course",
    access: "direct",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Registration closes Sept 5",
    requirements: ["BIO 240 or equivalent"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/catalog/bio340",
    timeline: "Offered Spring only — missing it pushes clinical placement a full year.",
    leverage: "Prerequisite most clinical placements screen for before they take you.",
    courseCode: "BIO 340",
    unlocks: ["Clinical placement eligibility (Spring)"],

  },
  // Product Manager
  {
    id: "op-idea-center",
    name: "Idea Center Product Apprenticeship",
    track: "product-manager",
    category: "Internship",
    access: "direct",
    school: "any",
    deadline: "2026-08-30",
    timeframe: "Cohort closes Aug 30",
    requirements: ["One product or programming course", "Portfolio review", "10 hrs/week"],
    contact: "ideacenter@campus.edu",
    link: "https://campus.edu/idea-center",
    timeline: "One cohort per semester; interviews in the two weeks after close.",
    leverage: "Paid shipping experience on a real product — hands-on PM work that strengthens any APM application.",
  },
  {
    id: "op-product-club",
    name: "Campus Product Guild Case Team",
    track: "product-manager",
    category: "Club",
    access: "direct",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Team selection Sept 5",
    requirements: ["Open to any major", "Attend one info session"],
    contact: "productguild@campus.edu",
    link: "https://campus.edu/product-guild",
    timeline: "Selection in September, competition season through spring.",
    leverage: "Structured case reps are what PM interviews actually test, and nothing else on campus gives them.",
  },
  {
    id: "op-ship-project",
    name: "Faculty Project Lab — Product Track",
    track: "product-manager",
    category: "Research",
    access: "direct",
    school: "any",
    deadline: "2026-09-12",
    timeframe: "Window closes Sept 12",
    requirements: ["Completed CS 201 with C or better", "Sophomore standing"],
    contact: "cs-lab@campus.edu",
    link: "https://campus.edu/project-lab",
    timeline: "Fall application window, demo day in December.",
    leverage: "Two regional employers interview directly from its demo day — the referral pipeline starts here.",
  },
  {
    id: "op-pm-course",
    name: "Register for CS 315 Data Structures II",
    track: "product-manager",
    category: "Course",
    access: "direct",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Registration closes Sept 5",
    requirements: ["CS 201"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/catalog/cs315",
    timeline: "Offered every Fall; gates the project lab's data track.",
    leverage: "The technical baseline PM interviewers assume you already have.",
    courseCode: "CS 315",
  },
  {
    id: "op-transfer-advising",
    name: "Transfer Pathway Advising Intensive",
    track: "product-manager",
    category: "Advising",
    access: "direct",
    school: "any",
    deadline: "2026-09-08",
    timeframe: "Sign-ups close Sept 8",
    requirements: ["Degree-seeking status"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/transfer-intensive",
    timeline: "One intensive per term, three sessions.",
    leverage: "Locks an articulation plan so no credit is lost — the highest-cost mistake at this stage.",
  },
  // Investment Banking
  {
    id: "op-trading-room",
    name: "Trading Room Fellowship",
    track: "investment-banking",
    category: "Fellowship",
    access: "translated",
    brandEquivalent: "Goldman Sachs Undergraduate Camp",
    missingHere: "No bulge-bracket insight program recruits on this campus.",
    school: "any",
    deadline: "2026-10-15",
    timeframe: "Applications due Oct 15",
    requirements: ["FIN 320 completed or concurrent", "Resume review"],
    contact: "tradingroom@campus.edu",
    link: "https://campus.edu/trading-room",
    timeline: "One cohort per year, selection in late October.",
    leverage: "Managed-fund experience substitutes for a sophomore insight program on a resume.",
  },
  {
    id: "op-investment-society",
    name: "Investment Society Analyst Track",
    track: "investment-banking",
    category: "Club",
    access: "translated",
    brandEquivalent: "Jumpstart Advisory Program",
    missingHere: "No diversity finance pipeline recruits here directly.",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Analyst class due Sept 5",
    requirements: ["Any major", "One info session"],
    contact: "investsociety@campus.edu",
    link: "https://campus.edu/investment-society",
    timeline: "Analyst class trains in fall, pitches in spring.",
    leverage: "Alumni place 3–5 analysts a year into regional bank sophomore programs.",
  },
  {
    id: "op-cfa-challenge",
    name: "CFA Research Challenge Campus Team",
    track: "investment-banking",
    category: "Club",
    access: "direct",
    school: "any",
    deadline: "2026-09-18",
    timeframe: "Team selection Sept 18",
    requirements: ["ACCT 201", "Junior standing preferred"],
    contact: "cfa-team@campus.edu",
    link: "https://campus.edu/cfa-challenge",
    timeline: "Selection in September, regional round in February.",
    leverage: "You present to practicing analysts who then serve as referral sources.",
  },
  {
    id: "op-fin-course",
    name: "Register for FIN 320 Corporate Finance",
    track: "investment-banking",
    category: "Course",
    access: "direct",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Registration closes Sept 5",
    requirements: ["ACCT 201"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/catalog/fin320",
    timeline: "Fall only; hard prerequisite for the fellowship.",
    leverage: "Required before analyst interviews — delaying it costs a whole recruiting cycle.",
    courseCode: "FIN 320",
  },
  {
    id: "op-alumni-coffee",
    name: "Alumni Finance Mentor Match",
    track: "investment-banking",
    category: "Advising",
    access: "direct",
    school: "any",
    deadline: "2026-08-26",
    timeframe: "Match round closes Aug 26",
    requirements: ["One-paragraph goal statement"],
    contact: "alumni@campus.edu",
    link: "https://campus.edu/mentor-match",
    timeline: "Matched within two weeks, one call per month.",
    leverage: "A named alumnus is the only referral channel available before junior recruiting.",
  },
  // Research PhD
  {
    id: "op-honors-practicum",
    name: "Honors Research Practicum",
    track: "research-phd",
    category: "Research",
    access: "translated",
    brandEquivalent: "NSF REU",
    missingHere: "No NSF REU site is hosted at this school.",
    school: "any",
    deadline: "2026-09-19",
    timeframe: "Placement closes Sept 19",
    requirements: ["3.2 GPA", "24 completed credits"],
    contact: "honors@campus.edu",
    link: "https://campus.edu/honors-practicum",
    timeline: "Placement in September, mentor assigned in October.",
    leverage: "The only route here to a named research mentor before you transfer or apply.",
  },
  {
    id: "op-douglass-assistantship",
    name: "Institute Research Assistantship",
    track: "research-phd",
    category: "Research",
    access: "translated",
    brandEquivalent: "Leadership Alliance SR-EIP",
    missingHere: "The Leadership Alliance nomination list is not open to non-affiliated students here.",
    school: "any",
    deadline: "2026-09-25",
    timeframe: "Review begins Sept 25",
    requirements: ["Sophomore standing", "Faculty nomination"],
    contact: "institute@campus.edu",
    link: "https://campus.edu/assistantship",
    timeline: "Rolling review from late September.",
    leverage: "Paid, term-long lab role that feeds the campus nomination list for national programs.",
  },
  {
    id: "op-stats-course",
    name: "Register for STAT 300 Applied Statistics with R",
    track: "research-phd",
    category: "Course",
    access: "direct",
    school: "any",
    deadline: "2026-09-05",
    timeframe: "Registration closes Sept 5",
    requirements: ["MATH 130"],
    contact: "advising@campus.edu",
    link: "https://campus.edu/catalog/stat300",
    timeline: "Fall and Spring; unlocks the lab's data track.",
    leverage: "Unlocks eligibility for the data track most faculty projects run on.",
    courseCode: "STAT 300",
  },
  {
    id: "op-conference-travel",
    name: "Undergraduate Conference Travel Award",
    track: "research-phd",
    category: "Funding",
    access: "direct",
    school: "any",
    deadline: "2026-10-10",
    timeframe: "Award cycle closes Oct 10",
    requirements: ["Accepted abstract or faculty letter"],
    contact: "urca@campus.edu",
    link: "https://campus.edu/travel-award",
    timeline: "Two cycles a year; reimbursement after travel.",
    leverage: "A presented poster is the artifact that makes a faculty letter concrete.",
  },
  {
    id: "op-grad-advising",
    name: "Graduate School Application Intensive",
    track: "research-phd",
    category: "Advising",
    access: "direct",
    school: "any",
    deadline: "2026-11-01",
    timeframe: "Sessions begin Nov 1",
    requirements: ["Junior or senior standing"],
    contact: "gradprep@campus.edu",
    link: "https://campus.edu/grad-intensive",
    timeline: "Six weekly sessions through the fall application season.",
    leverage: "Statement-of-purpose review by the faculty who sit on admissions committees.",
  },
];

export const COURSES: Course[] = [
  { code: "BIO 340", title: "Human Physiology", credits: 4, format: "Lecture", workload: "Heavy", timeOfDay: "Morning", style: "Independent", satisfies: "Upper-division biology", tracks: ["physician-scientist"], why: "Prerequisite screened for by every clinical placement in your roadmap." },
  { code: "BIO 355", title: "Research Methods Seminar", credits: 3, format: "Seminar", workload: "Moderate", timeOfDay: "Afternoon", style: "Discussion", satisfies: "Upper-division biology", tracks: ["physician-scientist", "research-phd"], why: "Small seminar where lab PIs meet students before assistantship review." },
  { code: "CHEM 301", title: "Organic Chemistry I", credits: 5, format: "Lecture", workload: "Heavy", timeOfDay: "Morning", style: "Independent", satisfies: "Chemistry sequence", tracks: ["physician-scientist"], why: "Timing here sets your entire MCAT calendar." },
  { code: "STAT 300", title: "Applied Statistics with R", credits: 3, format: "Lecture", workload: "Moderate", timeOfDay: "Afternoon", style: "Independent", satisfies: "Quantitative reasoning", tracks: ["research-phd", "physician-scientist", "investment-banking"], why: "Unlocks the data track on the faculty project lab." },
  { code: "CS 315", title: "Data Structures & Algorithms II", credits: 4, format: "Lecture", workload: "Heavy", timeOfDay: "Morning", style: "Independent", satisfies: "CS core", tracks: ["product-manager", "research-phd"], why: "The technical baseline interviewers assume you already cleared." },
  { code: "CS 340", title: "Product Design Studio", credits: 3, format: "Seminar", workload: "Moderate", timeOfDay: "Afternoon", style: "Discussion", satisfies: "CS elective", tracks: ["product-manager"], why: "Studio critiques produce the portfolio artifact the apprenticeship reviews." },
  { code: "CS 210", title: "Programming II", credits: 4, format: "Lecture", workload: "Moderate", timeOfDay: "Morning", style: "Independent", satisfies: "CS core", tracks: ["product-manager"], why: "Hard gate before any technical apprenticeship intake." },
  { code: "FIN 320", title: "Corporate Finance", credits: 3, format: "Lecture", workload: "Moderate", timeOfDay: "Morning", style: "Independent", satisfies: "Business core", tracks: ["investment-banking"], why: "Required before analyst interviews open." },
  { code: "ACCT 201", title: "Principles of Accounting", credits: 3, format: "Lecture", workload: "Moderate", timeOfDay: "Evening", style: "Independent", satisfies: "Business core", tracks: ["investment-banking"], why: "Prerequisite for the CFA Challenge team selection." },
  { code: "ECON 310", title: "Markets & Institutions Seminar", credits: 3, format: "Seminar", workload: "Light", timeOfDay: "Afternoon", style: "Discussion", satisfies: "Economics elective", tracks: ["investment-banking"], why: "Discussion format that builds the pitch fluency analyst interviews test." },
  { code: "PHIL 230", title: "Logic & Critical Reasoning", credits: 3, format: "Lecture", workload: "Light", timeOfDay: "Evening", style: "Independent", satisfies: "General education", tracks: ["product-manager", "research-phd"], why: "Light load that protects room for lab or apprenticeship hours." },
  { code: "WRIT 250", title: "Writing in the Sciences", credits: 3, format: "Seminar", workload: "Light", timeOfDay: "Afternoon", style: "Discussion", satisfies: "Writing intensive", tracks: ["research-phd", "physician-scientist"], why: "Produces the abstract draft the travel award requires." },
];

export const PERSONAS: Persona[] = [
  {
    id: "maya",
    name: "Maya",
    major: "Biology",
    year: "Sophomore",
    school: "University of Texas at El Paso",
    track: "physician-scientist",
    preferences: { format: "Seminar", workload: "Moderate", style: "Discussion" },
    audit: {
      program: "B.S. Biology, pre-health concentration",
      creditsEarned: 48,
      creditsRequired: 120,
      remaining: ["Upper-division biology (8 credits)", "Chemistry sequence (5 credits)", "Quantitative reasoning (3 credits)", "Writing intensive (3 credits)"],
    },
  },
  {
    id: "alex",
    name: "Alex",
    major: "Computer Science",
    year: "First year",
    school: "Miami Dade College",
    track: "product-manager",
    preferences: { format: "Lecture", workload: "Heavy", style: "Independent" },
    audit: {
      program: "A.S. Computer Science, transfer track",
      creditsEarned: 21,
      creditsRequired: 60,
      remaining: ["CS core (8 credits)", "CS elective (3 credits)", "Quantitative reasoning (3 credits)", "General education (3 credits)"],
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

/** The track's hero "next move": earliest deadline, matching how the roadmap ranks. */
export function heroOpportunityForTrack(track: string) {
  return opportunitiesForTrack(track)
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
}


// ---------------------------------------------------------------------------
// The Long View — general, well-established patterns per track and year.
// Deliberately contains NO program names, deadlines, contacts, or links:
// anything specific must live in OPPORTUNITIES instead.
// ---------------------------------------------------------------------------

export type Milestone = {
  track: TrackId;
  year: "Sophomore" | "Junior" | "Senior";
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
];

export function milestonesForTrack(track: string) {
  return MILESTONES.filter((m) => m.track === track);
}

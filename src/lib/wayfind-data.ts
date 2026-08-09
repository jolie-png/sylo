// Sylo seed dataset. Every fact shown to a student must come from this file.
// Nothing outside this file may be presented as real.

import { createElement, type ReactNode } from "react";
import { Dna, Compass, TrendingUp, Microscope, Sparkles } from "lucide-react";

export type TrackId =
  | "physician-scientist"
  | "product-manager"
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
    identity: "Your goal isn't one of the four above.",
    blurb:
      "Sylo doesn't have verified opportunity data for this path yet — you'll get an honest empty board you can fill with your own steps.",
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
    access: "translated",
    brandEquivalent: "Google APM",
    missingHere: "No large tech company recruits APMs on this campus.",
    school: "any",
    deadline: "2026-08-30",
    timeframe: "Cohort closes Aug 30",
    requirements: ["One product or programming course", "Portfolio review", "10 hrs/week"],
    contact: "ideacenter@campus.edu",
    link: "https://campus.edu/idea-center",
    timeline: "One cohort per semester; interviews in the two weeks after close.",
    leverage: "Paid shipping experience on a real product — the closest local stand-in for an APM internship.",
  },
  {
    id: "op-product-club",
    name: "Campus Product Guild Case Team",
    track: "product-manager",
    category: "Club",
    access: "translated",
    brandEquivalent: "Meta RPM",
    missingHere: "There is no rotational PM pipeline recruiting here, so case reps have to be manufactured.",
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
};

export const MILESTONES: Milestone[] = [
  // Physician-scientist
  {
    track: "physician-scientist",
    year: "Sophomore",
    focus: "Get into a lab and stay there",
    lookOutFor:
      "Depth in one lab usually reads stronger than short stints across several, so an early start compounds.",
  },
  {
    track: "physician-scientist",
    year: "Junior",
    focus: "Turn one lab relationship into a letter",
    lookOutFor:
      "MD/PhD committees weigh sustained time with a single mentor over breadth across several labs.",
  },
  {
    track: "physician-scientist",
    year: "Junior",
    focus: "Start MCAT preparation",
    lookOutFor:
      "Most applicants sit for the MCAT in the spring or summer of junior year, ahead of senior-year applications.",
  },
  {
    track: "physician-scientist",
    year: "Senior",
    focus: "Apply with a complete committee letter",
    lookOutFor:
      "Programs generally expect two or more years of documented research before a strong committee letter is possible.",
  },
  {
    track: "physician-scientist",
    year: "Senior",
    focus: "Have clinical exposure on the record",
    lookOutFor:
      "Admissions reviewers typically look for sustained patient-facing hours alongside the research story.",
  },

  // Product manager
  {
    track: "product-manager",
    year: "Sophomore",
    focus: "Ship something small and real",
    lookOutFor:
      "Early PM screens lean on evidence you have shipped and learned from users, not on coursework alone.",
  },
  {
    track: "product-manager",
    year: "Junior",
    focus: "Land a product-adjacent internship",
    lookOutFor:
      "Most new-grad PM pipelines recruit from prior internships, and those cycles open the summer before junior year ends.",
  },
  {
    track: "product-manager",
    year: "Junior",
    focus: "Practise talking through product decisions",
    lookOutFor:
      "Interviews usually test how you reason about tradeoffs out loud more than any particular framework.",
  },
  {
    track: "product-manager",
    year: "Senior",
    focus: "Convert one project into a case study",
    lookOutFor:
      "Hiring conversations tend to center on one project you can narrate end to end, with the metric you moved.",
  },
  {
    track: "product-manager",
    year: "Senior",
    focus: "Apply early in the fall cycle",
    lookOutFor:
      "New-grad product roles are typically filled in the autumn, well before spring graduation.",
  },

  // Investment banking
  {
    track: "investment-banking",
    year: "Sophomore",
    focus: "Build the technical foundation",
    lookOutFor:
      "Accounting and valuation fluency is assumed by the time interviews start, so it is learned earlier than it is tested.",
  },
  {
    track: "investment-banking",
    year: "Junior",
    focus: "Recruit for the junior-summer internship",
    lookOutFor:
      "Banking recruiting runs unusually early — often more than a year before the internship itself begins.",
  },
  {
    track: "investment-banking",
    year: "Junior",
    focus: "Keep a live network of alumni conversations",
    lookOutFor:
      "Interview invitations frequently come through people who already know you rather than through open applications.",
  },
  {
    track: "investment-banking",
    year: "Senior",
    focus: "Convert the internship into a return offer",
    lookOutFor:
      "Most full-time analyst seats are filled from the previous summer's intern class.",
  },
  {
    track: "investment-banking",
    year: "Senior",
    focus: "Keep a backup path open",
    lookOutFor:
      "Off-cycle and adjacent finance roles keep hiring after the main cycle closes, so the search does not have to end.",
  },

  // Research PhD
  {
    track: "research-phd",
    year: "Sophomore",
    focus: "Find a research question you like",
    lookOutFor:
      "Applications ask what you want to study, and that answer usually comes from time spent in a lab, not from browsing.",
  },
  {
    track: "research-phd",
    year: "Junior",
    focus: "Take ownership of a project",
    lookOutFor:
      "Recommenders write the strongest letters when they can describe work you drove yourself.",
  },
  {
    track: "research-phd",
    year: "Junior",
    focus: "Spend a summer doing full-time research",
    lookOutFor:
      "Funded summer research placements generally recruit in the winter for the following summer.",
  },
  {
    track: "research-phd",
    year: "Senior",
    focus: "Apply in the autumn with three letters ready",
    lookOutFor:
      "PhD applications are typically due in the late autumn or early winter of senior year.",
  },
  {
    track: "research-phd",
    year: "Senior",
    focus: "Contact potential advisors before applying",
    lookOutFor:
      "Fit with a specific advisor often matters as much as the overall strength of the application.",
  },
];

export function milestonesForTrack(track: string) {
  return MILESTONES.filter((m) => m.track === track);
}

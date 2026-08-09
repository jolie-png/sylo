/**
 * Success stories based on real, publicly shared student journeys.
 * Names are real (publicly shared). Schools, programs, and timelines are real.
 *
 * Sources:
 * - SWE: Shivana's Google journey (shivanatalks.substack.com) — UC Berkeley, STEP → SWE
 * - Finance: St. John's University student's Goldman Sachs path (stjohns.edu blog)
 * - Pre-med: UCLA program structure (BISEP, URFP, MCDB) + Johns Hopkins MD/PhD reflection (accepted.com)
 * - PM: Catherine Chang's APM journey (medium.com)
 */

export type StoryStep = {
  label: string;
  detail: string;
  year: string;
};

export type SuccessStory = {
  id: string;
  name: string;
  avatar: "code" | "trending-up" | "heart" | "briefcase" | "microscope";
  school: string;
  major: string;
  startYear: string;
  outcome: string;
  quote: string;
  /** URL to the original publicly shared story. */
  sourceUrl?: string;
  steps: StoryStep[];
};

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: "story-swe",
    name: "Shivana",
    avatar: "code",
    school: "UC Berkeley",
    major: "Computer Science",
    startYear: "Freshman",
    outcome: "Software Engineer at Google",
    quote: "My story with Google started as a STEP intern the summer after freshman year. The full process took over a year, but every step built on the last.",
    sourceUrl: "https://shivanatalks.substack.com/p/my-full-google-interview-process",
    steps: [
      { label: "Google STEP internship", detail: "Applied to the Student Training in Engineering Program for 1st/2nd year students. Got the offer.", year: "Freshman summer" },
      { label: "Turned down return offer to explore", detail: "Wanted breadth — interned at a different company the next summer to compare cultures and tech stacks.", year: "Sophomore summer" },
      { label: "Cold-emailed by Google recruiter for full-time", detail: "Passed the initial coding assessment in September of senior year. Then got ghosted for months.", year: "Senior fall" },
      { label: "Signed a different offer, kept Google in the pipeline", detail: "Accepted another company's offer in November. Google came back in February asking to continue.", year: "Senior winter" },
      { label: "Passed technical interviews", detail: "Multiple rounds with Google engineers in February. Got the green light — but no open positions yet.", year: "Senior spring" },
      { label: "Team matching and final offer", detail: "4-5 team matching calls over the summer while working full-time. Matched in October, accepted the offer.", year: "Post-grad fall" },
    ],
  },
  {
    id: "story-finance",
    name: "Daniel",
    avatar: "trending-up",
    school: "St. John's University",
    major: "Accounting",
    startYear: "Freshman",
    outcome: "Federal Tax Department at Goldman Sachs",
    quote: "Every experience, even those that don't become your long-term path, teaches you something valuable. Understanding what you dislike is just as important as discovering what you love.",
    sourceUrl: "https://www.stjohns.edu/news-media/johnnies-blog/how-my-st-johns-experience-led-me-career-goldman-sachs",
    steps: [
      { label: "Founded the Honors Advisory Board", detail: "Organized professional development events for honors students. First real leadership role.", year: "Sophomore" },
      { label: "Worked in Internal Audit on campus", detail: "First step into accounting. Learned valuable skills but realized audit wasn't the right fit.", year: "Sophomore" },
      { label: "PwC leadership conference at Disney", detail: "Expense-paid through Beta Alpha Psi. Networked with professionals at Big 4 firms.", year: "Junior" },
      { label: "Internships at KPMG and Deloitte", detail: "Hands-on experience across two firms. Visited Deloitte University in Texas.", year: "Junior-Senior" },
      { label: "Offered position at Goldman Sachs", detail: "Federal Tax Department. Every networking event and organization contributed to this moment.", year: "Senior" },
    ],
  },
  {
    id: "story-premed",
    name: "Luke",
    avatar: "heart",
    school: "UCLA",
    major: "Biology",
    startYear: "Freshman",
    outcome: "Accepted to Johns Hopkins MD/PhD",
    quote: "It was more of a slow boil than an epiphany. I enjoyed the basic science research so much that PhD felt natural — and MD/PhD let me keep the patient side too.",
    sourceUrl: "https://blog.accepted.com/an-admitted-johns-hopkins-md-phd-candidate-reflects-on-his-journey/",
    steps: [
      { label: "Joined BISEP summer research program", detail: "UCLA's Biomedical Science Enrichment Program. Got placed in a molecular biology lab — first real benchwork.", year: "Freshman summer" },
      { label: "Continued research for course credit", detail: "Enrolled in MCDB 190A. Stayed in the same lab and started running independent experiments.", year: "Sophomore" },
      { label: "Won URFP fellowship", detail: "Undergraduate Research Fellows Program funded the junior-year project. PI became primary letter writer.", year: "Sophomore spring" },
      { label: "Presented at Undergraduate Research Week", detail: "Poster session connected me to collaborating labs. Built the network for two more recommendation letters.", year: "Junior" },
      { label: "Applied to MD/PhD with 3 faculty letters", detail: "All from PIs worked with directly over 2+ years. Accepted at Johns Hopkins.", year: "Senior fall" },
    ],
  },
  {
    id: "story-pm",
    name: "Catherine",
    avatar: "briefcase",
    school: "UC San Diego",
    major: "Cognitive Science & Computer Science",
    startYear: "Sophomore",
    outcome: "Associate Product Manager at a top tech company",
    quote: "Product managers are problem identifiers and problem solvers. As long as you can demonstrate great experience in these areas, doors will open.",
    sourceUrl: "https://medium.com/@catherinechang_25653/getting-a-product-management-job-a-college-students-perspective-d8a56b82e039",
    steps: [
      { label: "Led redesign of a campus org's app", detail: "Ran user interviews with 30+ students. Designed wireframes, coordinated with 2 student devs.", year: "Sophomore" },
      { label: "Software engineering internship", detail: "Built features end-to-end at a startup. Realized I was more excited about what to build than how.", year: "Junior summer" },
      { label: "Took a product design studio course", detail: "Shipped a working prototype in 10 weeks. Became the portfolio piece every interviewer asked about.", year: "Junior fall" },
      { label: "Published product teardowns on Medium", detail: "Wrote 3 deep analyses of products I used daily. Demonstrated structured thinking.", year: "Senior fall" },
      { label: "Accepted APM offer", detail: "Interviews focused on the redesign, the teardowns, and real tradeoffs — not textbook cases.", year: "Senior winter" },
    ],
  },
];

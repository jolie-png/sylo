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
  /** Optional: custom label used when category is "other". */
  customCategory?: string;
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
  /** Optional LinkedIn profile URL (displayed publicly) */
  linkedin?: string;
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

/** Label for a step, preferring a custom "Other" label when present. */
export function getStepCategoryLabel(step: { category: StepCategory; customCategory?: string }): string {
  if (step.category === "other" && step.customCategory?.trim()) return step.customCategory.trim();
  return getCategoryLabel(step.category);
}

// ---------------------------------------------------------------------------
// Published maps dataset (static for MVP)
// ---------------------------------------------------------------------------

export const PUBLISHED_MAPS: PublishedMap[] = [
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
        timing: "Sophomore fall",
        action: "Joined Howard's Economics Society and started a study group for intermediate microeconomics. Tutored 8 students weekly — first real experience explaining complex ideas to people with different backgrounds.",
        category: "club",
        unlocked: "Built confidence structuring and communicating analytical thinking. Consulting is 80% communication — this was early practice without knowing it.",
      },
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
        action: "Took an independent research project with an Econ professor analyzing market entry strategies for African tech companies. Wrote a 20-page paper and presented at Howard's undergraduate research symposium.",
        category: "course",
        unlocked: "Gave me a unique 'why consulting' answer: 'I've studied strategy academically and want to do it in practice.' Interviewers loved that it wasn't just 'I like problem-solving.'",
      },
      {
        timing: "Junior fall",
        action: "Did 40+ practice cases between September and November — 3 per week with peers, plus monthly sessions with my GFL mentor. Recorded myself and rewatched.",
        category: "other",
        unlocked: "By interview day, casing felt automatic. The mental math and structure came without thinking, which freed me to actually listen to the interviewer.",
      },
      {
        timing: "Junior winter",
        action: "Interviewed for BCG summer internship — two rounds, four cases total. Already knew three of the interviewers from GFL events.",
        category: "application",
        unlocked: "Got the offer within a week. The familiarity from GFL meant the interviews felt like conversations, not interrogations.",
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
    startYear: "Sophomore",
    outcome: "SWE Intern at Microsoft (return offer accepted)",
    timeline: "Sophomore fall → Junior summer",
    steps: [
      {
        timing: "Sophomore fall",
        action: "Joined UF's Society of Women Engineers chapter and became the corporate outreach lead. Organized 4 company tech talks per semester — got to know recruiters personally.",
        category: "club",
        unlocked: "The SWE chapter is how I got my GHC scholarship. Being on the leadership team also gave me a 'teamwork + initiative' behavioral story for every interview.",
      },
      {
        timing: "Sophomore spring",
        action: "Built a personal project — a study group matching app for UF students using React + Firebase. Got 300 users in the first month by posting in class GroupMes.",
        category: "project",
        unlocked: "Had a real deployed project with real users on my resume. Every interviewer asked about it. The architecture decisions (why Firebase, how I handled auth) became my technical discussion topics.",
      },
      {
        timing: "Junior fall",
        action: "Applied to JP Morgan's Code for Good hackathon — a 24-hour event where you build a real app for a nonprofit. They fly you out, feed you, and the hackathon doubles as a recruiting event.",
        category: "networking",
        unlocked: "Got a same-week interview invite from JP Morgan. They watched how I coded in a team for 24 hours — that was my technical screen.",
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
        unlocked: "Got a return offer in August. My skip-level manager specifically said the biweekly feedback requests showed maturity. Starting full-time after graduation.",
      },
    ],
    turningPoint: "Grace Hopper. I almost didn't go because I thought it was 'just a conference.' It's not — it's a career fair where companies hand out interviews because they've already decided they want to hire from that pool. I got my Microsoft pipeline from a 5-minute conversation at a booth. No cold application, no online assessment, no waiting 3 months for a response. If you're eligible for GHC, SHPE, or any similar conference with a career fair, go. It compresses months of recruiting into 48 hours.",
    wouldSkip: "I applied to 80+ companies online before GHC and heard back from maybe 5. The online application grind is brutal and mostly doesn't work for students without Big Tech on their resume already. I wish I'd spent that time doing more LeetCode and preparing for the in-person events where the conversion rate is way higher. I'd also skip spending $200 on AlgoExpert — free NeetCode + LeetCode Discuss was better.",
    advice: "The hack is: don't apply online if you can get in front of a human instead. JP Morgan Code for Good, Grace Hopper, SHPE, Tapia Conference, Google's CSSI, and company-specific diversity programs all let you skip the resume screen. If you're from an underrepresented background, these events exist specifically to give you access. Use them. One conversation at a booth is worth 50 online applications.",
    publishedAt: "2026-08-03",
    isExample: true,
  },
  {
    id: "example-gs-emerging-leaders",
    author: "Tasha",
    track: "investment-banking",
    school: "Spelman College",
    major: "Economics",
    startYear: "Freshman",
    outcome: "Technology Analyst at Goldman Sachs",
    timeline: "Freshman spring → Senior fall",
    steps: [
      {
        timing: "Freshman fall",
        action: "Joined Spelman's Investment Club as a first-year analyst. Did weekly stock pitches and learned how to read financial statements. Didn't know anything about banking yet — this was just exploration.",
        category: "club",
        unlocked: "Built financial vocabulary and learned to present analytical work. The club president later connected me to Goldman alumni for informational interviews.",
      },
      {
        timing: "Freshman spring",
        action: "Applied to Goldman Sachs Possibilities Series — their program for first-year students. Short immersion that introduces you to financial services and gets your name in their system before you've even taken a finance course.",
        category: "fellowship",
        unlocked: "Got on Goldman's radar as a freshman. When Emerging Leaders applications opened the next year, my name was already in their CRM.",
      },
      {
        timing: "Sophomore fall",
        action: "Applied to Goldman Sachs Emerging Leaders Series — a 5-month program for second-year students with technical training, mentorship, and direct transparency into the recruitment process.",
        category: "fellowship",
        unlocked: "Got paired with a Goldman VP mentor who coached me on networking and technicals. The program is explicitly a pipeline to the summer internship — they tell you this on day one.",
      },
      {
        timing: "Sophomore fall",
        action: "Started a research project with my Econ professor analyzing fintech adoption patterns in underbanked communities. Presented findings at Spelman's undergraduate research day.",
        category: "course",
        unlocked: "Gave me a unique perspective on financial inclusion that came up in every Goldman behavioral interview. 'Why finance?' had a real answer beyond 'I want to make money.'",
      },
      {
        timing: "Sophomore winter",
        action: "Attended the in-person Emerging Leaders component at Goldman's NYC office. Met analysts, associates, and MDs. Had lunch with my mentor's team. Felt like a pre-internship.",
        category: "networking",
        unlocked: "Three people from that visit ended up being my interviewers for the summer analyst role. They already knew me.",
      },
      {
        timing: "Junior fall",
        action: "Interviewed for Goldman Sachs Summer Analyst through the Emerging Leaders pipeline. Three rounds — two technical, one behavioral. My ELS mentor told me exactly what to expect.",
        category: "application",
        unlocked: "Got the offer within two weeks. The interview felt like a formality because I'd been in the Goldman ecosystem for 18 months.",
      },
      {
        timing: "Junior summer",
        action: "Goldman Sachs Technology Summer Analyst — 10 weeks on a real trading platform team. Presented to MDs at the final showcase. Volunteered for a second project that wasn't in my scope.",
        category: "internship",
        unlocked: "Return offer came 3 weeks after the internship ended. My manager said the extra project was what moved me from 'good intern' to 'definitely extend.'",
      },
      {
        timing: "Senior fall",
        action: "Accepted full-time Technology Analyst return offer. Spent senior year mentoring freshmen on how to use Possibilities Series and Emerging Leaders the same way.",
        category: "other",
      },
    ],
    turningPoint: "Emerging Leaders Series — it turns you from anonymous applicant into a known quantity. By the time I interviewed, three of my interviewers had already met me in person at the ELS office visit. My mentor had prepped me on exactly what they'd ask. The program doesn't guarantee you the job, but it removes every barrier between you and the interview. You're not competing against 10,000 resumes anymore. You're competing against maybe 50 other ELS participants.",
    wouldSkip: "I applied to 30 random companies on Handshake freshman year and heard back from zero. Spray-and-pray doesn't work when you're at an HBCU with no brand names on your resume yet. I should have focused exclusively on pipeline programs from day one instead of sending resumes into the void for 6 months.",
    advice: "Goldman has a funnel: Possibilities Series (freshman) → Emerging Leaders (sophomore) → Summer Analyst (junior). Each one feeds into the next. If you start at Possibilities, you're in the system for three years before you ever interview for the real thing. Most people don't know this funnel exists — they just cold-apply junior year and wonder why they get rejected. Start freshman year.",
    publishedAt: "2026-08-02",
    isExample: true,
  },
  {
    id: "example-uber-career-prep",
    author: "Marcus",
    track: "software-engineer",
    school: "University of Maryland",
    major: "Computer Science",
    startYear: "Sophomore",
    outcome: "SWE Intern at Uber (return offer accepted)",
    timeline: "Sophomore fall → Junior summer",
    steps: [
      {
        timing: "Sophomore fall",
        action: "Started a LeetCode study group with 4 other CS students — met 3x/week in the library. We held each other accountable and explained problems to each other. Got through 150 problems that semester.",
        category: "club",
        unlocked: "Consistent practice with peers was 10x more effective than grinding alone. Two of my study group members also got FAANG offers — we pushed each other.",
      },
      {
        timing: "Sophomore spring",
        action: "Built a real-time transit tracker for UMD's shuttle system using Python + Flask + Google Maps API. Open-sourced it on GitHub. About 100 students used it daily.",
        category: "project",
        unlocked: "Had a deployed full-stack project with real users to put on my resume. Interviewers asked about the technical decisions (why Flask, how I handled caching, rate limiting).",
      },
      {
        timing: "Sophomore spring",
        action: "Applied to Uber Career Prep — a 6-month unpaid fellowship for underrepresented engineering students. Cohort of 50 fellows, all virtual. Teaches technical interview skills, communication, and self-marketing from actual Uber engineers.",
        category: "fellowship",
        unlocked: "Got matched with an Uber engineer mentor who did weekly 1:1s on DSA problem-solving. More importantly: at the end of the fellowship, fellows get the opportunity to interview for internship and full-time roles at Uber.",
      },
      {
        timing: "Sophomore-Junior summer",
        action: "Spent 6 months in the UCP program doing weekly technical workshops, mock interviews with Uber engineers, and building a portfolio project with my cohort. The curriculum covered exactly what Uber's actual interviews test.",
        category: "course",
        unlocked: "By the end, I could solve Uber-style system design and coding problems because I'd been trained by the people who designed those interviews.",
      },
      {
        timing: "Junior fall",
        action: "Interviewed for Uber's SWE internship through the Career Prep pipeline. The process was the same as external candidates, but I'd been prepped by Uber engineers for 6 months. Two coding rounds + one system design.",
        category: "application",
        unlocked: "Got the internship offer. My interviewer actually recognized my mentor's name when I mentioned the approach I'd learned — small world inside a big company.",
      },
      {
        timing: "Junior summer",
        action: "Uber SWE Intern on the Marketplace Pricing team. Worked on surge pricing algorithms. Shipped a model improvement that reduced price estimation errors by 12% in my test market.",
        category: "internship",
        unlocked: "The 12% improvement got presented at the team all-hands by my manager. That visibility across the org made the return offer decision easy for them. Got the offer before the internship ended.",
      },
    ],
    turningPoint: "The fact that Uber Career Prep literally gives you an interview for the internship at the end. That's not a metaphor — you complete the 6-month fellowship, and then they give you the opportunity to interview for an internship or full-time role at Uber. You don't apply through the website. You don't wait for a recruiter to find your resume. You finish the program and they say 'okay, here's your interview.' I went from zero Big Tech connections to interviewing at Uber because I did a fellowship. That's the whole game.",
    wouldSkip: "I spent months trying to get referrals from random LinkedIn connections at FAANG companies. Most ignored me or gave weak referrals that didn't help. Pipeline programs like UCP are a stronger signal than a referral from someone who's never met you. I'd skip the cold LinkedIn networking and go straight to structured programs that give you real access.",
    advice: "Uber Career Prep gives you the interview. That's the part people don't understand — it's not just workshops and mentorship. At the end of the 6 months, fellows get to interview for internship and full-time roles at Uber directly. No application, no resume screen, no waiting. You do the work in the program, and they give you a shot. It's unpaid, which scares people off, but you're trading 6 months of your time for a guaranteed interview at a company where the normal acceptance rate is under 1%. Apply the moment applications open — cohorts fill fast.",
    publishedAt: "2026-08-04",
    isExample: true,
  },
  {
    id: "example-jpmc-code-for-good",
    author: "Dev",
    track: "software-engineer",
    school: "Georgia Institute of Technology",
    major: "Computer Science",
    startYear: "Sophomore",
    outcome: "SWE Intern at JP Morgan Chase (return offer in hand)",
    timeline: "Sophomore fall → Junior summer",
    steps: [
      {
        timing: "Sophomore fall",
        action: "Joined GT's hackathon organizing club (HackGT) as a logistics volunteer. Helped run events for 1,000+ students. Didn't compete — just got immersed in the hackathon culture and met sponsors.",
        category: "club",
        unlocked: "Learned how hackathons actually work from the inside. When Code for Good came around, I knew exactly how to perform: scope small, ship fast, present well.",
      },
      {
        timing: "Sophomore fall",
        action: "Contributed to an open-source project on GitHub (a Python CLI tool for managing student assignments). Fixed 3 bugs and added a feature. Got my first PR merged by a maintainer I'd never met.",
        category: "project",
        unlocked: "Could credibly say 'I've contributed to real codebases with real code review processes.' Shows you can work in unfamiliar repos — exactly what the Code for Good hackathon tests.",
      },
      {
        timing: "Sophomore spring",
        action: "Heard about JP Morgan's Code for Good hackathon from a friend who got an internship through it the year before. Registered through JPMC's careers site — had to pass an online coding assessment (HackerRank-style, 2 problems) just to get invited to the hackathon.",
        category: "application",
        unlocked: "Passed the initial screen. Got invited to the 24-hour hackathon with about 650 other students across the country.",
      },
      {
        timing: "Sophomore summer",
        action: "Attended Code for Good — a 24-hour hackathon where you're placed on a team of 6-8 students and build a real application for a nonprofit. JP Morgan engineers mentor each team throughout. They're watching how you code, collaborate, and problem-solve the entire time.",
        category: "networking",
        unlocked: "The hackathon IS the interview. There's no separate technical round after this. JPMC engineers evaluate you based on your contributions during the 24 hours — your code, your teamwork, your communication.",
      },
      {
        timing: "Sophomore summer",
        action: "Our team built a volunteer management platform for a local food bank. I owned the backend API and database schema. Presented our solution to JPMC judges at the end. We placed top 10.",
        category: "project",
        unlocked: "Got an email within 2 weeks offering a summer internship at JP Morgan for the following year. No additional interviews needed — the hackathon was the final round.",
      },
      {
        timing: "Junior summer",
        action: "JP Morgan SWE Intern — 10 weeks on a payments infrastructure team. Built a transaction monitoring service. Got strong performance reviews and a return offer with a pre-placement guarantee.",
        category: "internship",
        unlocked: "Return offer came before the internship even ended. Manager said my Code for Good performance was what originally flagged me as a strong candidate.",
      },
    ],
    turningPoint: "Code for Good replaced the entire traditional interview process. No phone screen, no behavioral round, no LeetCode gauntlet. You pass one online assessment, show up to the hackathon, build something real for 24 hours, and they decide based on that. I got my JP Morgan internship from a hackathon — not from grinding 500 LeetCode problems. The hackathon tests what the job actually requires: building software with a team under time pressure.",
    wouldSkip: "I spent weeks prepping for traditional coding interviews that I never ended up needing. If I'd known Code for Good was basically a one-shot interview disguised as a hackathon, I would have spent that time practicing teamwork, system design, and fast prototyping instead of memorizing dynamic programming patterns I never used.",
    advice: "JP Morgan's Code for Good is a 24-hour hackathon that IS the interview. You build something for a nonprofit, JPMC engineers watch how you work, and top performers get internship offers directly — no additional rounds. It's run in multiple cities every year and the bar to enter is just a basic coding assessment. If you can code and work in a team, this is the highest-conversion path into JP Morgan. Register early, it fills up fast.",
    publishedAt: "2026-08-05",
    isExample: true,
  },
  {
    id: "example-first-gen-late-discovery",
    author: "Aaliyah",
    track: "software-engineer",
    school: "University of Texas at Arlington",
    major: "Computer Science",
    startYear: "Freshman",
    outcome: "Software Engineer at Salesforce",
    timeline: "Freshman fall → Senior spring (with 2 wasted years)",
    steps: [
      {
        timing: "Freshman year",
        action: "Applied to 40+ internships on LinkedIn and Handshake. Got zero responses. Didn't understand why — my GPA was 3.7, I'd built projects, I was doing everything 'right.' Nobody told me the real game was pipeline programs, not cold applications.",
        category: "application",
        unlocked: "Nothing. I genuinely thought I wasn't good enough. Considered switching majors.",
      },
      {
        timing: "Sophomore fall",
        action: "Same thing. Applied to 60 more companies. Got 3 OAs, failed all of them because I didn't know LeetCode was a thing. Career center told me to 'network on LinkedIn.' Didn't know a single person in tech.",
        category: "application",
        unlocked: "Still nothing. At this point peers at target schools already had Google STEP and Goldman Possibilities on their resumes. I didn't know those programs existed.",
      },
      {
        timing: "Sophomore spring",
        action: "A TA in my data structures class mentioned ColorStack in passing. I googled it, joined that night. Within a week I was in a Slack channel with 5,000 Black and Hispanic CS students sharing resources I'd never seen: program deadlines, referral chains, interview prep groups.",
        category: "club",
        unlocked: "Found out about Uber Career Prep, Google CSSI, SHPE, Code for Good, Break Through Tech — all at once. Realized I'd missed 2 years of deadlines because nobody at my school knew to tell me.",
      },
      {
        timing: "Junior fall",
        action: "Applied to everything I'd missed: Uber Career Prep, Capital One Summit, SHPE conference. Got into UCP and registered for SHPE. Finally felt like I was playing the same game as students at Columbia and Stanford.",
        category: "fellowship",
        unlocked: "Uber Career Prep gave me 6 months of real interview prep from actual engineers. SHPE's career fair got me face-to-face with 10 companies in one weekend.",
      },
      {
        timing: "Junior fall",
        action: "Attended SHPE National Convention career fair. Talked to Salesforce recruiter for 8 minutes. She said 'We're hiring — can you interview this week?' Got a technical phone screen 4 days later.",
        category: "networking",
        unlocked: "Passed the phone screen. Got invited to a virtual onsite. The Salesforce recruiter later told me my application from sophomore year was in their system but never got reviewed — they get 200K+ applications. The career fair bypassed all of that.",
      },
      {
        timing: "Junior winter",
        action: "Passed Salesforce virtual onsite — 3 rounds, mostly LeetCode medium + one system design. The UCP mock interviews had prepared me for exactly this format. Got the internship offer.",
        category: "application",
        unlocked: "First internship offer after 2 years of silence. Cried in my car in the parking lot.",
      },
      {
        timing: "Junior summer",
        action: "Salesforce SWE Intern on the Commerce Cloud team. Built a feature for merchant analytics dashboards. Got strong reviews and a return offer.",
        category: "internship",
        unlocked: "Return offer + $15K signing bonus. My manager said I was one of the strongest interns — she had no idea I'd spent 2 years getting rejected from everywhere.",
      },
      {
        timing: "Senior fall",
        action: "Accepted Salesforce full-time offer. Started mentoring first-gen freshmen at UTA through a group I cofounded: 'Pipeline or Perish' — a club that literally just shares pipeline program deadlines with students who don't have access.",
        category: "other",
      },
    ],
    turningPoint: "A TA mentioning ColorStack in a random office hours conversation. That's it. One sentence from one person changed my entire trajectory. Before that moment, I didn't know pipeline programs existed. I thought the only way in was cold applications — and I was failing at it for two years while students at better-connected schools were getting handed interviews through programs I'd never heard of. The information gap almost cost me my career in tech.",
    wouldSkip: "Every single cold application I sent freshman and sophomore year. All 100+ of them. Zero percent conversion rate. I'd tell my past self: stop applying online. You're invisible there. Find the programs that bring YOU to the companies instead of throwing your resume into a system designed to filter you out. The time I spent customizing cover letters for companies that never read them could have been spent joining ColorStack, prepping for Code for Good, or getting my SHPE chapter to fund my conference ticket.",
    advice: "If you're first-gen, at a non-target school, or just don't have the alumni network that Ivy kids do — your #1 job freshman year is to find the pipeline programs that exist for you. They're out there: ColorStack, SHPE, Tapia, Code for Good, Uber Career Prep, Break Through Tech, Google CSSI, Capital One Summit. Nobody at your school's career center will tell you about all of them. You have to find them yourself — or use a tool that finds them for you. The information gap is the only thing standing between you and the same opportunities students at target schools get handed.",
    publishedAt: "2026-08-06",
    isExample: true,
  },
];

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function getPublishedMaps(
  filters?: { track?: string; school?: string; query?: string },
  /** Extra maps to merge in (e.g. the user's own posted maps from the store). */
  extra?: PublishedMap[],
): PublishedMap[] {
  let maps = extra?.length ? [...extra, ...PUBLISHED_MAPS] : PUBLISHED_MAPS;
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

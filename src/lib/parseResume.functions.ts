import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient } from "./anthropic.server";
import type { ParsedResumeData } from "./resume-validation";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from "./resume-validation";

// --- Schemas ----------------------------------------------------------------

const Input = z.object({
  fileBase64: z.string().min(1),
  filename: z.string().min(1),
});

const ProfileFieldsSchema = z.object({
  name: z.string().optional().default(""),
  school: z.string().optional().default(""),
  year: z.string().optional().default(""),
  experience: z.string().optional().default(""),
  skills: z.string().optional().default(""),
  priorWork: z.string().optional().default(""),
  clubs: z.string().optional().default(""),
  alreadyDone: z.string().optional().default(""),
});

// --- Types ------------------------------------------------------------------

export type ParseResumeResult = ParsedResumeData | { error: true; message: string };

// --- Claude prompt ----------------------------------------------------------

const RESUME_SYSTEM_PROMPT = `You are a resume parser. Given the text content of a student's resume, extract and return a JSON object with these fields:

- name: The student's full name (usually at the top of the resume)
- school: The university or college name (e.g. "University of Washington", "Columbia University"). Extract exactly as written.
- year: The student's class year or academic standing. If an expected graduation date is given (e.g. "Expected Graduation: June 2028"), convert it to a standing like "Junior" or "Senior" based on how far they are from graduation. If current year is provided, map it: Freshman (3+ years to grad), Sophomore (2-3 years), Junior (1-2 years), Senior (<1 year). If a class standing is explicitly stated (e.g. "Junior"), use that directly.
- experience: A brief summary of their background, projects, and relevant experience (1-3 sentences)
- skills: Comma-separated list of technical skills, tools, and languages they know
- priorWork: Prior internships, jobs, or research positions (brief, comma-separated or short descriptions)
- clubs: Clubs, organizations, or extracurriculars they participate in
- alreadyDone: What they've already accomplished toward career goals (courses, applications, projects)

Rules:
1. Return ONLY a JSON object with these 8 keys. No markdown, no explanation.
2. If a field has no relevant information in the resume, use an empty string "".
3. Keep each field concise — summarize rather than copy verbatim.
4. Use natural, conversational language (this fills a student profile).
5. The name field should be the person's first and last name as written on the resume.
6. For school, extract the full university name exactly as written on the resume.
7. For year, today's date is ${new Date().toISOString().slice(0, 10)}. Use this to calculate standing from graduation dates.

Example output:
{"name":"Jordan Chen","school":"University of Washington","year":"Junior","experience":"Built a full-stack React app for a class project, contributed to an open-source CLI tool","skills":"Python, JavaScript, React, SQL, Git, Figma","priorWork":"Software intern at Acme Corp (Summer 2024), campus IT help desk","clubs":"ACM chapter, hackathon team","alreadyDone":"Applied to Google STEP, completed Coursera ML specialization"}`;

// --- Text extraction --------------------------------------------------------

async function extractText(buffer: Buffer, ext: string): Promise<string> {
  switch (ext) {
    case ".txt":
      return buffer.toString("utf-8");
    case ".pdf": {
      const { extractText: extractPdfText } = await import("unpdf");
      const result = await extractPdfText(new Uint8Array(buffer));
      return (result.text || []).join("\n");
    }
    case ".docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    default:
      throw new Error(`Unsupported extension: ${ext}`);
  }
}

// --- Server function --------------------------------------------------------

export const parseResume = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ParseResumeResult> => {
    // Load .env for local dev (handler runs server-side only)
    try {
      const { config } = await import("dotenv");
      config();
    } catch {
      /* no-op in production */
    }

    // 1. Decode and validate size
    const buffer = Buffer.from(data.fileBase64, "base64");
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return { error: true, message: "File exceeds 5 MB limit." };
    }

    // 2. Validate extension
    const ext = data.filename.slice(data.filename.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
      return { error: true, message: "Unsupported file type. Please upload a PDF file." };
    }

    // 3. Extract text based on extension
    let extractedText: string;
    try {
      extractedText = await extractText(buffer, ext);
    } catch {
      return { error: true, message: "Could not read the file. Please try a different format." };
    }

    if (!extractedText.trim()) {
      return { error: true, message: "No text content found in the file." };
    }

    // 4. Send to Claude for structured parsing
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return { error: true, message: "Resume parsing isn't available in this demo. Fill in the fields below manually instead." };
    }

    try {
      const client = createAnthropicClient(anthropicKey);
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: RESUME_SYSTEM_PROMPT,
        messages: [{ role: "user", content: extractedText.slice(0, 15000) }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      const json = extractJson(text);
      if (!json) {
        return { error: true, message: "Could not structure the resume data. Please try again." };
      }

      const parsed = ProfileFieldsSchema.safeParse(json);
      if (!parsed.success) {
        return { error: true, message: "Could not structure the resume data. Please try again." };
      }

      return parsed.data;
    } catch {
      return { error: true, message: "Resume analysis failed. Please try again." };
    }
  });

// --- Helpers ----------------------------------------------------------------

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* next */
    }
  }
  return null;
}

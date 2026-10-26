/* The fix kit.

   The audit tells a company what is wrong. The fix kit hands them the file.
   Every generator below emits a real artifact — not advice about an artifact.

   Where a fact is not knowable from the crawl, generators emit an explicit
   `[FILL: ...]` placeholder. That is deliberate. A plausible-looking invented
   CAGE code would be worse than a blank one, because someone would ship it. */

export interface Contact {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface ServiceLine {
  name: string;
  description: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FirmProfile {
  company: string;
  domain: string;
  siteUrl: string;
  location: string;
  /** One sentence. What the firm does, in plain words. */
  summary: string;
  services: ServiceLine[];
  differentiators: string[];
  naics: string[];
  cage?: string;
  uei?: string;
  setAside?: string;
  certifications: string[];
  vehicles: string[];
  agencies: string[];
  clearance?: string;
  address?: string;
  contact: Contact;
  faqs: FaqEntry[];
  /** Contract types worked under: FFP, T&M, CPFF, IDIQ. */
  contractTypes: string[];
}

export type ArtifactLanguage = "text" | "json" | "html" | "markdown" | "javascript";

export interface Artifact {
  id: string;
  name: string;
  filename: string;
  language: ArtifactLanguage;
  /** What this file does and where it goes. */
  description: string;
  /** Which failing audit check this artifact answers. */
  fixes: string;
  content: string;
}

export const FILL = (what: string): string => `[FILL: ${what}]`;

export function value(input: string | undefined, what: string): string {
  return input && input.trim().length > 0 ? input.trim() : FILL(what);
}

export function list(input: readonly string[], what: string): string {
  return input.length > 0 ? input.join(", ") : FILL(what);
}

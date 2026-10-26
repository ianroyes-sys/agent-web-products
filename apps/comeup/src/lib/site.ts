export const SITE = {
  name: "Come Up",
  tagline: "You already know enough. This tells you what to do with it.",
  job: "You have a skill and no plan. Turn what you already know into a paid offer — and get your first 30 days.",
  parent: "Royz Media Group",
  parentUrl: "https://royzmediagroup.com",
  expert: "Ian Royes",
} as const;

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured && configured.length > 0 ? configured : "http://localhost:4803";
}

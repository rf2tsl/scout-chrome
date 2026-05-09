const LINKEDIN_PROFILE_RE = /^https:\/\/(www\.)?linkedin\.com\/in\/[^/?#]+\/?/;

export function isLinkedinProfileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return LINKEDIN_PROFILE_RE.test(url);
}

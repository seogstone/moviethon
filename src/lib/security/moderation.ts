import { BAD_WORDS } from "@/lib/constants";

export function containsBlockedLanguage(text: string): boolean {
  const normalized = text.toLowerCase();
  return BAD_WORDS.some((word) => normalized.includes(word));
}

export function sanitizeCommentBody(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

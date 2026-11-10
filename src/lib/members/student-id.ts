import { createHmac } from "node:crypto";

// Student IDs verify a member at sign-up. They are never stored: the database
// keeps only the keyed digest produced here (table member_student_ids).

/** Digits only, or null when the input is not a 10-digit student ID. */
export function normalizeStudentId(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** Hex HMAC-SHA256 of a student ID, or null when the ID is malformed. */
export function studentIdDigest(studentId: string, secret: string): string | null {
  if (!secret) {
    throw new Error("MEMBER_VERIFICATION_SECRET is not set.");
  }
  const normalized = normalizeStudentId(studentId);
  return normalized ? createHmac("sha256", secret).update(normalized).digest("hex") : null;
}

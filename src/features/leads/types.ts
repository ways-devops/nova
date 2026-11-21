export type FormState = { error?: string; saved?: boolean };

export type ActionResult =
  | { ok: true; clientId?: string }
  | { ok: false; error: string };

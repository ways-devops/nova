"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createSession, destroySession } from "@/lib/auth/session";
import {
  checkLoginAllowed,
  registerFailedLogin,
  resetLoginAttempts,
} from "@/lib/auth/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginState = { error?: string };

// Валидный хеш-пустышка, чтобы время ответа не выдавало, существует ли email.
const DUMMY_HASH = bcrypt.hashSync("nova-crm-dummy-password", 12);

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Неверные данные" };
  }
  const { email, password } = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${ip}:${email}`;

  const gate = checkLoginAllowed(key);
  if (!gate.allowed) {
    const minutes = Math.ceil(gate.retryAfterSec / 60);
    return {
      error: `Слишком много попыток. Повторите через ${minutes} мин.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    registerFailedLogin(key);
    return { error: "Неверный email или пароль" };
  }

  resetLoginAttempts(key);
  await createSession({ userId: user.id, email: user.email });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

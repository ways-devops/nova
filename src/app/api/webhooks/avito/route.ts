import { after, NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/auth/safe-equal";
import { handleAvitoWebhook } from "@/features/avito/webhook";

export const dynamic = "force-dynamic";

/**
 * Webhook Авито. Подлинность проверяем секретом в адресе (?token=…),
 * так как Авито не подписывает события. Отвечаем сразу (Авито ждёт ответ
 * считанные секунды), а сохранение выполняем после ответа.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.AVITO_WEBHOOK_SECRET?.trim();
  const token = req.nextUrl.searchParams.get("token");
  if (!secret || !token || !safeEqual(token, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  after(async () => {
    try {
      await handleAvitoWebhook(body);
    } catch (e) {
      console.error("[avito webhook]", e instanceof Error ? e.message : e);
    }
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

// /api/webhooks/avito и /api/cron открыты для внешних сервисов,
// но каждый проверяет собственный секрет (AVITO_WEBHOOK_SECRET / CRON_SECRET).
const PUBLIC_PATHS = [
  "/login",
  "/offline",
  "/api/auth/clear",
  "/api/webhooks/avito",
  "/api/cron",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isPublic) {
    // Webhook'и внешних сервисов (этап 4) должны будут получить собственную
    // проверку подписи и быть добавлены сюда явно.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)",
  ],
};

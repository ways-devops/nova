"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.mobile);

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex h-14 items-center justify-center text-xs font-medium ${
                  active ? "text-indigo-600" : "text-slate-500"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/settings"
            className={`flex h-14 items-center justify-center text-xs font-medium ${
              pathname.startsWith("/settings") ||
              pathname.startsWith("/clients") ||
              pathname.startsWith("/messages") ||
              pathname.startsWith("/analytics")
                ? "text-indigo-600"
                : "text-slate-500"
            }`}
          >
            Ещё
          </Link>
        </li>
      </ul>
    </nav>
  );
}

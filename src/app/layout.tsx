import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nova CRM", template: "%s · Nova CRM" },
  description: "Персональная CRM для бухгалтерского аутсорсинга",
  manifest: "/manifest.json",
  applicationName: "Nova CRM",
  appleWebApp: {
    capable: true,
    title: "Nova CRM",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="font-sans antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

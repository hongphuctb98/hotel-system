import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "@/app/globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body>{children}</body>
    </html>
  );
}


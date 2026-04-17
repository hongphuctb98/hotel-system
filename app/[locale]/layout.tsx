import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AntdProvider } from "@/providers/AntdProvider";
import { TimezoneProvider } from "@/providers/TimezoneProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotel Management System",
  description: "Production-ready hotel management system",
  icons: { icon: "https://www.bing.com/th/id/OIP.f4HQmH-0buCH5-bUJJ7eUQHaHa?w=193&h=193&c=8&rs=1&qlt=90&o=6&pid=3.1&rm=2" },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <ThemeProvider>
          <AntdProvider>
            <TimezoneProvider>{children}</TimezoneProvider>
          </AntdProvider>
        </ThemeProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}

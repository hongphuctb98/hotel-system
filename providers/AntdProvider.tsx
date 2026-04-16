"use client";

import { App, ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import { usePathname } from "next/navigation";
import { useThemeStore } from "./ThemeProvider";
import { lightTheme, darkTheme } from "@/theme/themeConfig";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  // Derive locale from the URL path (e.g. /vi/... → "vi") instead of calling
  // useLocale() from next-intl, which would create a dependency on
  // NextIntlClientProvider before it has a chance to fully initialise.
  const pathname = usePathname();
  const locale = pathname?.startsWith("/vi") ? "vi" : "en";
  const { isDark } = useThemeStore();

  const antdLocale = locale === "vi" ? viVN : enUS;
  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <AntdRegistry>
      <ConfigProvider locale={antdLocale} theme={activeTheme}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}

"use client";

import { ConfigProvider } from "antd";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import { useLocale } from "next-intl";
import { useThemeStore } from "./ThemeProvider";
import { lightTheme, darkTheme } from "@/theme/themeConfig";

export function AntdProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const { isDark } = useThemeStore();

  const antdLocale = locale === "vi" ? viVN : enUS;
  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <AntdRegistry>
      <ConfigProvider locale={antdLocale} theme={activeTheme}>
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}

import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: "#1677ff",
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f5f7fa",
    colorBorder: "#e8ecf0",
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorText: "#1a1a2e",
    colorTextSecondary: "#6b7280",
    boxShadow:
      "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)",
  },
  components: {
    Layout: {
      headerBg: "#ffffff",
      siderBg: "#ffffff",
      bodyBg: "#f5f7fa",
    },
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Table: {
      headerBg: "#fafafa",
      rowHoverBg: "#f0f7ff",
    },
    Card: {
      paddingLG: 20,
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#4096ff",
    colorBgContainer: "#1e1e2e",
    colorBgLayout: "#12121f",
    colorBorder: "#2d2d3d",
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    colorText: "#e2e8f0",
    colorTextSecondary: "#94a3b8",
  },
  components: {
    Layout: {
      headerBg: "#1e1e2e",
      siderBg: "#1e1e2e",
      bodyBg: "#12121f",
    },
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Table: {
      headerBg: "#2d2d3d",
    },
  },
};

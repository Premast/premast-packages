import { theme } from "antd";
import { designTokens as t } from "./tokens.js";

export const antdTheme = {
  algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
  token: {
    colorPrimary: t.accent,
    colorBgBase: t.bg,
    colorBgContainer: t.surface,
    colorBgLayout: t.bg,
    colorBgElevated: t.surfaceRaised,
    colorText: t.text,
    colorTextSecondary: t.textMuted,
    colorBorder: t.border,
    colorBorderSecondary: t.borderSecondary,
    borderRadius: t.buttonRadius,
    fontFamily: t.fontSans,
  },
  components: {
    Button: {
      borderRadius: t.buttonRadius,
    },
    Menu: {
      itemBg: "transparent",
      subMenuItemBg: "transparent",
    },
    Layout: {
      siderBg: t.surface,
      headerBg: t.surface,
      bodyBg: t.bg,
    },
  },
};

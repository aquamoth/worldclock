import { Platform, PlatformColor, type ColorValue } from "react-native";

export interface SemanticTheme {
  readonly background: ColorValue;
  readonly surface: ColorValue;
  readonly primary: ColorValue;
  readonly secondary: ColorValue;
  readonly border: ColorValue;
  readonly accent: ColorValue;
  readonly destructive: ColorValue;
  readonly disabled: ColorValue;
  readonly virtualBackground: ColorValue;
  readonly localSurface: ColorValue;
  readonly localBorder: ColorValue;
}

export const semanticThemes = {
  light: {
    background: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#171916",
    secondary: "#52584F",
    border: "#666D63",
    accent: "#175F48",
    destructive: "#B3261E",
    disabled: "#5E655C",
    virtualBackground: "#DDEFE8",
    localSurface: "#E7F1EC",
    localBorder: "#175F48",
  },
  dark: {
    background: "#11130F",
    surface: "#1D211B",
    primary: "#F4F6EF",
    secondary: "#B9C0B4",
    border: "#8A9585",
    accent: "#79D8B4",
    destructive: "#FF9B8F",
    disabled: "#AAB2A5",
    virtualBackground: "#173A31",
    localSurface: "#25332C",
    localBorder: "#79D8B4",
  },
} as const;

const android = (resource: string): ColorValue =>
  PlatformColor(`@android:color/${resource}`);

let cachedDynamicThemes:
  | { readonly light: SemanticTheme; readonly dark: SemanticTheme }
  | undefined;

const dynamicThemes = () => {
  cachedDynamicThemes ??= {
    light: {
      background: android("system_neutral1_50"),
      surface: android("system_neutral1_10"),
      primary: android("system_neutral1_900"),
      secondary: android("system_neutral2_700"),
      border: android("system_neutral2_500"),
      accent: android("system_accent1_600"),
      destructive: semanticThemes.light.destructive,
      disabled: android("system_neutral2_500"),
      virtualBackground: android("system_accent2_100"),
      localSurface: android("system_accent1_100"),
      localBorder: android("system_accent1_600"),
    },
    dark: {
      background: android("system_neutral1_900"),
      surface: android("system_neutral1_800"),
      primary: android("system_neutral1_50"),
      secondary: android("system_neutral2_200"),
      border: android("system_neutral2_400"),
      accent: android("system_accent1_200"),
      destructive: semanticThemes.dark.destructive,
      disabled: android("system_neutral2_400"),
      virtualBackground: android("system_accent2_800"),
      localSurface: android("system_accent1_700"),
      localBorder: android("system_accent1_200"),
    },
  };
  return cachedDynamicThemes;
};

const supportsDynamicColor = (): boolean =>
  Platform.OS === "android" && Number(Platform.Version) >= 31;

export const resolveSemanticTheme = (
  scheme: "light" | "dark",
): SemanticTheme =>
  supportsDynamicColor() ? dynamicThemes()[scheme] : semanticThemes[scheme];

const channel = (hex: string, index: number): number => {
  const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number =>
  0.2126 * channel(hex, 1) +
  0.7152 * channel(hex, 3) +
  0.0722 * channel(hex, 5);

export const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

export interface PresentationViewport {
  readonly width: number;
  readonly height: number;
  readonly fontScale: number;
}

export interface PresentationPolicy {
  readonly stackDenseContent: boolean;
  readonly horizontalPadding: number;
  readonly contentMaxWidth: number;
  readonly modalMaxHeight: number;
}

export const resolvePresentation = ({
  width,
  height,
  fontScale,
}: PresentationViewport): PresentationPolicy => {
  const horizontalPadding = width <= 360 ? 12 : 20;
  return {
    stackDenseContent: width <= 360 || fontScale >= 1.6,
    horizontalPadding,
    contentMaxWidth: Math.min(width - horizontalPadding * 2, 680),
    modalMaxHeight: Math.max(height - 48, 0),
  };
};

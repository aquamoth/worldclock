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
  },
} as const;

export type SemanticTheme =
  (typeof semanticThemes)[keyof typeof semanticThemes];

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

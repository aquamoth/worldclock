import {
  contrastRatio,
  resolvePresentation,
  semanticThemes,
} from "./presentation";

describe("semantic presentation", () => {
  it.each(["light", "dark"] as const)(
    "%s keeps text and meaningful boundaries above WCAG thresholds",
    (scheme) => {
      const colors = semanticThemes[scheme];

      expect(contrastRatio(colors.primary, colors.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.primary, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.secondary, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.accent, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.destructive, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.disabled, colors.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.border, colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(colors.primary, colors.virtualBackground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(colors.accent, colors.virtualBackground)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each([
    [320, 568, 1, true, 12, 296, 520],
    [320, 568, 1.35, true, 12, 296, 520],
    [320, 568, 2, true, 12, 296, 520],
    [411, 914, 1, false, 20, 371, 866],
    [411, 914, 1.35, false, 20, 371, 866],
    [411, 914, 2, true, 20, 371, 866],
  ])(
    "resolves %d×%d at font scale %s",
    (width, height, fontScale, stackDenseContent, horizontalPadding, contentMaxWidth, modalMaxHeight) => {
      expect(resolvePresentation({ width, height, fontScale })).toEqual({
        stackDenseContent,
        horizontalPadding,
        contentMaxWidth,
        modalMaxHeight,
      });
    },
  );
});

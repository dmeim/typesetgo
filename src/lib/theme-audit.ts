import { colorDistance, compositeThemeColor, contrastRatio, deriveThemeTyping, deriveThemeUI, EDGE_SHARE, ROLE_DISTANCE, SURFACE_STEPS } from "@/lib/colors";
import type { ThemeColors, ThemeUIColors } from "@/types/theme";

type Surface = keyof typeof SURFACE_STEPS;

const surfaceFor = (ui: ThemeUIColors, role: Surface) => ({
  card: ui.card,
  popover: ui.popover,
  muted: ui.muted,
  secondary: ui.secondary,
  accent: ui.accent,
  status: ui.successSurface,
  border: ui.border,
})[role];

/**
 * Guarantees the derivation should hold for a palette: separated surface layers, distinct
 * confusable roles, and readable mistakes. Returns the failed checks, e.g. `muted~card`.
 */
export function auditPalette(colors: ThemeColors): string[] {
  const ui = deriveThemeUI(colors);
  const typing = deriveThemeTyping(colors, ui);
  const layers = { background: ui.background, card: ui.card, popover: ui.popover };
  const failures: string[] = [];
  for (const role of Object.keys(SURFACE_STEPS) as Surface[]) {
    const surfaces = role === "status" ? [ui.successSurface, ui.warningSurface, ui.destructiveSurface] : [surfaceFor(ui, role)];
    for (const [layer, minimum] of Object.entries(SURFACE_STEPS[role])) {
      // Card and popover keep their authored side, so at white/black they may stop short of the step.
      const floor = role === "card" || role === "popover" ? 1 + (minimum - 1) * EDGE_SHARE : minimum;
      if (surfaces.some((surface) => contrastRatio(surface, layers[layer as keyof typeof layers]) < floor - 1e-9)) {
        failures.push(`${role}~${layer}`);
      }
    }
  }
  // Separation only nudges surfaces that need it; an already-distinct authored card is kept verbatim.
  const authoredCard = compositeThemeColor(colors.bg.surface, ui.background);
  if (contrastRatio(authoredCard, ui.background) >= SURFACE_STEPS.card.background && ui.card !== authoredCard) {
    failures.push("card-identity");
  }
  if (colorDistance(ui.destructive, ui.primary) < ROLE_DISTANCE.destructive) failures.push("destructive~primary");
  if ([typing.correct, typing.upcoming, typing.default].some((neighbor) =>
    colorDistance(typing.incorrect, neighbor) < ROLE_DISTANCE.incorrect)) failures.push("incorrect~text");
  for (const role of ["upcoming", "default"] as const) {
    if (colorDistance(typing[role], typing.correct) < ROLE_DISTANCE.upcoming) failures.push(`${role}~correct`);
  }
  const exerciseSurfaces = [ui.background, ui.card, ui.popover];
  if (exerciseSurfaces.some((surface) => contrastRatio(typing.incorrect, surface) < 4.5)) failures.push("incorrect<4.5");
  return failures;
}

import { ThemeGallery as ProfileThemeGallery } from "@/components/profile/ThemeGallery";
import type { LabState } from "./useLabSettings";

/** The real theme gallery, driven by the mockups' local (unsaved) theme. */
export function ThemeGallery({ lab }: { lab: LabState }) {
  return <ProfileThemeGallery selection={lab.theme} onSelect={lab.setTheme} />;
}

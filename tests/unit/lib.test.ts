import { describe, it, expect } from "vitest";
import { getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";

// Test manifest for sound tests
const TEST_SOUND_MANIFEST: SoundManifest = {
  typing: {
    creamy: ["creamy_01.wav", "creamy_02.wav", "creamy_03.wav"],
    bubbles: ["bubbles_01.wav"],
  },
  warning: {
    clock: ["clock.wav"],
  },
  error: {},
};

describe("sounds", () => {
  describe("getRandomSoundUrl", () => {
    it("returns a valid URL for existing sound pack", () => {
      const url = getRandomSoundUrl(TEST_SOUND_MANIFEST, "typing", "creamy");
      expect(url).toMatch(/^\/sounds\/typing\/creamy\/creamy_\d+\.wav$/);
    });

    it("returns null for non-existent category", () => {
      const url = getRandomSoundUrl(TEST_SOUND_MANIFEST, "nonexistent", "creamy");
      expect(url).toBeNull();
    });

    it("returns null for non-existent pack", () => {
      const url = getRandomSoundUrl(TEST_SOUND_MANIFEST, "typing", "nonexistent");
      expect(url).toBeNull();
    });

    it("returns null when manifest is null", () => {
      const url = getRandomSoundUrl(null, "typing", "creamy");
      expect(url).toBeNull();
    });
  });
});

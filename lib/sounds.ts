export type SoundManifest = {
  [category: string]: {
    [pack: string]: string[];
  };
};

export const getRandomSoundUrl = (
  manifest: SoundManifest | null,
  category: string,
  pack: string
): string | null => {
  if (!manifest) return null;
  
  const categoryData = manifest[category];
  if (!categoryData) return null;

  const files = categoryData[pack];
  if (!files || !Array.isArray(files) || files.length === 0) {
    return null;
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  return `/sounds/${category}/${pack}/${randomFile}`;
};

// Initial fallback (optional, but good for SSR or initial render before fetch)
export const INITIAL_SOUND_MANIFEST: SoundManifest = {
  typing: {
    bubbles: [],
    creamy: [],
    hitmarker: [],
    plink: [],
    punch: [],
    robo: [],
    typewriter: []
  },
  warning: {
    clock: []
  },
  error: {}
};

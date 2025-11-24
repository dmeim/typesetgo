import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the response structure
export type SoundManifest = {
  [category: string]: {
    [pack: string]: string[];
  };
};

export async function GET() {
  const soundsDir = path.join(process.cwd(), 'public', 'sounds');
  const manifest: SoundManifest = {};

  try {
    // Categories: typing, warning, error, etc.
    const categories = fs.readdirSync(soundsDir).filter((file) => {
      return fs.statSync(path.join(soundsDir, file)).isDirectory();
    });

    for (const category of categories) {
      manifest[category] = {};
      const categoryPath = path.join(soundsDir, category);

      // Packs: bubbles, creamy, etc.
      const packs = fs.readdirSync(categoryPath).filter((file) => {
        return fs.statSync(path.join(categoryPath, file)).isDirectory();
      });

      for (const pack of packs) {
        const packPath = path.join(categoryPath, pack);
        
        // Files: .wav, .mp3, etc.
        const files = fs.readdirSync(packPath).filter((file) => {
          const lower = file.toLowerCase();
          return lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg');
        });

        if (files.length > 0) {
          manifest[category][pack] = files;
        }
      }
    }

    return NextResponse.json(manifest);
  } catch (error) {
    console.error('Error reading sounds directory:', error);
    return NextResponse.json({ error: 'Failed to load sounds' }, { status: 500 });
  }
}

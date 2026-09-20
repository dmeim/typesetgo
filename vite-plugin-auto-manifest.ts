import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { createThemeCatalogEntry } from "./src/lib/theme-catalog.ts";

/**
 * Vite plugin that auto-generates manifest.json files for data directories.
 * Just drop files in the folder - no manual manifest updates needed!
 * 
 * Scans:
 * - /public/themes/*.json -> generates themes manifest
 * - /public/words/*.json -> generates words manifest  
 * - /public/quotes/*.json -> generates quotes manifest
 * - /public/sounds/{category}/{pack}/*.wav -> generates sounds manifest
 */
export function autoManifestPlugin(): Plugin {
  const publicDir = path.resolve(process.cwd(), "public");

  function generateThemesManifest() {
    const themesDir = path.join(publicDir, "themes");
    if (!fs.existsSync(themesDir)) return;

    const files = fs.readdirSync(themesDir);
    const themes = files
      .filter((f) => f.endsWith(".json") && f !== "manifest.json" && f !== "catalog.json")
      .map((f) => f.replace(".json", ""));

    // Sort with typesetgo first
    themes.sort((a, b) => {
      if (a === "typesetgo") return -1;
      if (b === "typesetgo") return 1;
      return a.localeCompare(b);
    });

    const manifest = {
      themes,
      default: themes.includes("typesetgo") ? "typesetgo" : themes[0] || "",
    };

    fs.writeFileSync(
      path.join(themesDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    const catalog = {
      version: 1,
      themes: themes.map((id) => createThemeCatalogEntry(id, JSON.parse(fs.readFileSync(path.join(themesDir, `${id}.json`), "utf8")))),
    };
    fs.writeFileSync(path.join(themesDir, "catalog.json"), JSON.stringify(catalog) + "\n");
    console.log(`[auto-manifest] Generated themes manifest: ${themes.length} themes`);
  }

  function generateWordsManifest() {
    const wordsDir = path.join(publicDir, "words");
    if (!fs.existsSync(wordsDir)) return;

    const files = fs.readdirSync(wordsDir);
    const difficulties = files
      .filter((f) => f.endsWith(".json") && f !== "manifest.json" && f !== "filter_words.json")
      .map((f) => f.replace(".json", ""));

    // Define preferred order
    const order = ["beginner", "easy", "medium", "hard", "expert"];
    difficulties.sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });

    const manifest = {
      difficulties,
      default: difficulties.includes("beginner") ? "beginner" : difficulties[0] || "",
    };

    fs.writeFileSync(
      path.join(wordsDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    console.log(`[auto-manifest] Generated words manifest: ${difficulties.length} difficulties`);
  }

  function generateQuotesManifest() {
    const quotesDir = path.join(publicDir, "quotes");
    if (!fs.existsSync(quotesDir)) return;

    const files = fs.readdirSync(quotesDir);
    const lengths = files
      .filter((f) => f.endsWith(".json") && f !== "manifest.json")
      .map((f) => f.replace(".json", ""));

    // Define preferred order
    const order = ["short", "medium", "long", "xl"];
    lengths.sort((a, b) => {
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });

    const manifest = {
      lengths,
      default: lengths.includes("medium") ? "medium" : lengths[0] || "",
    };

    fs.writeFileSync(
      path.join(quotesDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    console.log(`[auto-manifest] Generated quotes manifest: ${lengths.length} lengths`);
  }

  function generateSoundsManifest() {
    const soundsDir = path.join(publicDir, "sounds");
    if (!fs.existsSync(soundsDir)) return;

    const manifest: Record<string, Record<string, string[]>> = {};

    const categories = fs.readdirSync(soundsDir).filter((f) => {
      const fullPath = path.join(soundsDir, f);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const category of categories) {
      const categoryPath = path.join(soundsDir, category);
      const packs = fs.readdirSync(categoryPath).filter((f) => {
        const fullPath = path.join(categoryPath, f);
        return fs.statSync(fullPath).isDirectory();
      });

      manifest[category] = {};

      for (const pack of packs) {
        const packPath = path.join(categoryPath, pack);
        const files = fs.readdirSync(packPath).filter((f) => f.endsWith(".wav"));
        if (files.length > 0) {
          manifest[category][pack] = files.sort();
        }
      }

      // Remove empty categories
      if (Object.keys(manifest[category]).length === 0) {
        delete manifest[category];
      }
    }

    fs.writeFileSync(
      path.join(soundsDir, "manifest.json"),
      JSON.stringify(manifest, null, 2) + "\n"
    );
    
    const totalPacks = Object.values(manifest).reduce(
      (sum, cat) => sum + Object.keys(cat).length,
      0
    );
    console.log(`[auto-manifest] Generated sounds manifest: ${totalPacks} packs`);
  }

  function generateAllManifests() {
    generateThemesManifest();
    generateWordsManifest();
    generateQuotesManifest();
    generateSoundsManifest();
  }

  return {
    name: "auto-manifest",
    
    // Generate on build start
    buildStart() {
      generateAllManifests();
    },

    // Watch for changes in dev mode
    configureServer(server) {
      // Generate initially
      generateAllManifests();

      // Watch public directories for changes
      const watchDirs = [
        path.join(publicDir, "themes"),
        path.join(publicDir, "words"),
        path.join(publicDir, "quotes"),
        path.join(publicDir, "sounds"),
      ];

      for (const dir of watchDirs) {
        if (fs.existsSync(dir)) {
          server.watcher.add(dir);
        }
      }

      const regenerate = (file: string) => {
        if (["manifest.json", "catalog.json"].includes(path.basename(file))) return;
        if (file.includes("/public/themes/") && file.endsWith(".json")) {
          generateThemesManifest();
        } else if (file.includes("/public/words/") && file.endsWith(".json")) {
          generateWordsManifest();
        } else if (file.includes("/public/quotes/") && file.endsWith(".json")) {
          generateQuotesManifest();
        } else if (file.includes("/public/sounds/") && file.endsWith(".wav")) {
          generateSoundsManifest();
        }
      };
      server.watcher.on("add", regenerate);
      server.watcher.on("unlink", regenerate);
      server.watcher.on("change", regenerate);
    },
  };
}

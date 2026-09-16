import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import catalog from "../../public/fonts/catalog.json";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const css = postcss.parse(read("src/fonts.css"));
const faces: Record<string, string>[] = [];
css.walkAtRules("font-face", (rule) => {
  const face: Record<string, string> = {};
  rule.walkDecls((declaration) => { face[declaration.prop] = declaration.value; });
  faces.push(face);
});

describe("local webfont loading contract", () => {
  it("retains the downloadable catalog and required weights/styles", () => {
    // Weights requested by index.html before self-hosting; OpenDyslexic also
    // supplies real regular/bold italic faces from its upstream distribution.
    const required: Record<string, number[]> = {
      "Atkinson Hyperlegible": [400, 700], "Fira Code": [400, 500, 600, 700],
      "IBM Plex Mono": [400, 500, 600, 700], Inconsolata: [400, 500, 600, 700],
      Inter: [400, 500, 600, 700], "JetBrains Mono": [400, 500, 600, 700],
      Lato: [400, 700], Lexend: [300, 400, 500, 600, 700], Lora: [400, 500, 600, 700],
      Merriweather: [400, 700], Montserrat: [400, 500, 600, 700], Nunito: [400, 500, 600, 700],
      "Open Sans": [400, 500, 600, 700], "Playfair Display": [400, 500, 600, 700],
      Poppins: [400, 500, 600, 700], Roboto: [400, 500, 700], "Roboto Mono": [400, 500, 600, 700],
      "Source Code Pro": [400, 500, 600, 700], "Space Mono": [400, 700], OpenDyslexic: [400, 700],
    };
    expect(catalog.fonts.map((font) => font.family).sort()).toEqual(Object.keys(required).sort());
    expect(catalog.fonts.map((font) => font.key).sort()).toEqual(
      TYPING_FONT_OPTIONS.filter((font) => font.isWebFont).map((font) => font.value).sort(),
    );
    expect(TYPING_FONT_OPTIONS.filter((font) => !font.isWebFont).map((font) => font.value)).toEqual([
      "courier-new", "arial", "verdana", "trebuchet-ms", "comic-sans", "georgia", "times-new-roman",
    ]);
    for (const [family, weights] of Object.entries(required)) {
      for (const style of family === "OpenDyslexic" ? ["normal", "italic"] : ["normal"]) {
        for (const weight of weights) {
          expect(faces.some((face) => {
            const [min, max = min] = face["font-weight"].split(" ").map(Number);
            return face["font-family"] === `"${family}"` && face["font-style"] === style
              && weight >= min && weight <= max;
          }), `${family} ${style} ${weight}`).toBe(true);
        }
      }
    }
  });

  it("ships every declared WOFF2 and license intact with its coverage descriptors", () => {
    const declared: string[] = [];
    for (const font of catalog.fonts) {
      const license = read("public" + font.license.path);
      expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
      expect(license).toMatch(/copyright/i);
      expect(createHash("sha256").update(license).digest("hex")).toBe(font.license.sha256);
      for (const asset of font.assets) {
        const face = faces.find((item) => item.src === `url("${asset.path}") format("woff2")`);
        expect(face, asset.path).toBeDefined();
        expect(face?.["font-family"]).toBe(`"${font.family}"`);
        expect(face?.["font-weight"]).toBe(asset.weight);
        expect(face?.["font-style"]).toBe(asset.style);
        expect(face?.["unicode-range"]).toBe("unicodeRange" in asset ? asset.unicodeRange : undefined);
        expect(face?.["font-display"]).toBe("swap");
        const data = readFileSync(path.join(root, "public", asset.path));
        expect(data.subarray(0, 4).toString()).toBe("wOF2");
        expect(data.byteLength).toBe(asset.bytes);
        expect(createHash("sha256").update(data).digest("hex")).toBe(asset.sha256);
        declared.push(asset.path);
      }
    }
    expect(faces).toHaveLength(declared.length);
    const shipped = readdirSync(path.join(root, "public/fonts"), { recursive: true })
      .map(String).filter((file) => file.endsWith(".woff2")).map((file) => "/fonts/" + file);
    expect(shipped.sort()).toEqual(declared.sort());
  });

  it("loads local definitions through the shared stylesheet without provider links or preloads", () => {
    expect(read("src/index.css")).toContain('@import "./fonts.css";');
    expect(read("index.html")).not.toMatch(/fonts\.(googleapis|gstatic|cdnfonts)\.com|rel="preconnect"|as="font"/);
    for (const face of faces) {
      expect(face.src).toMatch(/^url\("\/fonts\/[^"\s]+\.woff2"\) format\("woff2"\)$/);
    }
  });
});

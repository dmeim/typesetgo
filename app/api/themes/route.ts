import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface ThemeData {
  name: string;
  colors: {
    backgroundColor: string;
    cursor: string;
    ghostCursor: string;
    defaultText: string;
    upcomingText: string;
    correctText: string;
    incorrectText: string;
    buttonUnselected: string;
    buttonSelected: string;
  };
}

export async function GET() {
  try {
    const themesDir = path.join(process.cwd(), "public", "themes");
    
    // Check if directory exists
    if (!fs.existsSync(themesDir)) {
      return NextResponse.json({ themes: [] });
    }

    const files = fs.readdirSync(themesDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const themes: ThemeData[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(themesDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      
      try {
        const colors = JSON.parse(content);
        const name = file.replace(".json", "");
        
        // Format name: capitalize first letter of each word
        const formattedName = name
          .split(/[-_]/)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        themes.push({
          name: formattedName,
          colors,
        });
      } catch {
        // Skip invalid JSON files
        console.error(`Invalid JSON in theme file: ${file}`);
      }
    }

    // Sort themes: TypeSetGo first, then alphabetically
    themes.sort((a, b) => {
      if (a.name === "Typesetgo") return -1;
      if (b.name === "Typesetgo") return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ themes });
  } catch (error) {
    console.error("Error reading themes:", error);
    return NextResponse.json({ themes: [] }, { status: 500 });
  }
}


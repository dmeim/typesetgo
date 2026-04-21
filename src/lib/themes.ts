import type {
  ThemeCategory,
  ThemeDefinition,
  ThemeManifest,
  ThemeColors,
  GroupedThemes,
  CategoryConfig,
} from "@/types/theme";

// Re-export types for convenience
export type { ThemeCategory, ThemeDefinition, ThemeManifest, ThemeColors, GroupedThemes };

// Category display order and names
export const CATEGORY_CONFIG: Record<ThemeCategory, CategoryConfig> = {
  // Featured
  default: { displayName: "Featured", order: 0 },
  // Technical/Developer
  editor: { displayName: "Editor/IDE", order: 1 },
  brand: { displayName: "Brand", order: 2 },
  // Productivity/Utility
  productivity: { displayName: "Productivity", order: 3 },
  utility: { displayName: "Utility", order: 4 },
  // Design/Visual
  aesthetic: { displayName: "Aesthetic", order: 5 },
  "color-theory": { displayName: "Color Theory", order: 6 },
  // Animals
  animals: { displayName: "Animals", order: 7 },
  // Nature/Environment
  nature: { displayName: "Nature", order: 8 },
  seasons: { displayName: "Seasons", order: 9 },
  biomes: { displayName: "Biomes", order: 10 },
  plants: { displayName: "Plants", order: 11 },
  weather: { displayName: "Weather", order: 12 },
  space: { displayName: "Space", order: 13 },
  time: { displayName: "Time of Day", order: 14 },
  // Era/Culture
  retro: { displayName: "Retro/Tech", order: 15 },
  cultural: { displayName: "Cultural", order: 16 },
  books: { displayName: "Books", order: 17 },
  mythology: { displayName: "Mythology", order: 18 },
  cities: { displayName: "Cities", order: 19 },
  subject: { displayName: "School Subjects", order: 20 },
  // Entertainment/Media
  gaming: { displayName: "Gaming", order: 21 },
  movies: { displayName: "Movies", order: 22 },
  "tv-shows": { displayName: "TV Shows", order: 23 },
  anime: { displayName: "Anime", order: 24 },
  // Lifestyle
  music: { displayName: "Music", order: 25 },
  "music-bands": { displayName: "Music (Bands)", order: 26 },
  "music-artists": { displayName: "Music (Artists)", order: 27 },
  sports: { displayName: "Sports", order: 28 },
  food: { displayName: "Food", order: 29 },
  fun: { displayName: "Fun", order: 30 },
  holiday: { displayName: "Holiday", order: 31 },
  // Collections/Misc
  zodiac: { displayName: "Zodiac", order: 32 },
  gemstones: { displayName: "Gemstones", order: 33 },
  instruments: { displayName: "Instruments", order: 34 },
  dance: { displayName: "Dance", order: 35 },
  vehicles: { displayName: "Vehicles", order: 36 },
  comics: { displayName: "Comics", order: 37 },
  "historical-era": { displayName: "Historical Eras", order: 38 },
  emotions: { displayName: "Emotions", order: 39 },
  textiles: { displayName: "Fabrics & Textures", order: 40 },
};

// Cache for loaded data
let cachedManifest: ThemeManifest | null = null;
const themeCache: Record<string, ThemeDefinition> = {};

// Display name overrides for themes that need special capitalization
const THEME_DISPLAY_NAMES: Record<string, string> = {
  // Brand/product names with specific capitalization
  "typesetgo": "TypeSetGo",
  "github": "GitHub",
  "gitlab": "GitLab",
  "solarized": "Solarized",
  "vim": "Vim",
  "youtube": "YouTube",
  "webstorm": "WebStorm",
  "jetbrains-darcula": "JetBrains Darcula",
  "bioshock": "BioShock",
  "linkedin": "LinkedIn",
  "playstation": "PlayStation",
  "stackoverflow": "Stack Overflow",
  "intellij": "IntelliJ",
  "jetbrains-fleet": "JetBrains Fleet",
  "github-actions": "GitHub Actions",
  "hashicorp": "HashiCorp",
  "datadog": "Datadog",
  "cloudflare": "Cloudflare",
  "postman": "Postman",
  
  "notepad-plus-plus": "Notepad++",
  "digitalocean": "DigitalOcean",
  "mongodb": "MongoDB",
  "tiktok": "TikTok",
  "epic-games": "Epic Games",
  "nvidia": "NVIDIA",
  "amd": "AMD",

  // All-caps acronyms
  "aws": "AWS",
  "dos": "DOS",
  "tron": "TRON",
  "y2k": "Y2K",
  "ibm": "IBM",
  "html": "HTML",
  "css": "CSS",
  "edm": "EDM",
  "ac-dc": "AC/DC",
  
  // Roman numerals
  "apple-ii": "Apple II",
  
  // Version numbers/letters that should be uppercase
  "windows-xp": "Windows XP",
  
  // Hyphenated style
  "lo-fi": "Lo-Fi",
  
  // Special characters (accent)
  "pokemon": "Pokémon",
  "rose-pine": "Rosé Pine",
  
  // Apostrophes and special formatting
  "st-patricks": "St. Patrick's",
  "new-years": "New Year's",
  "valentines": "Valentine's",
  "day-of-dead": "Day of the Dead",
  
  // Title case with lowercase articles/prepositions
  "league-of-legends": "League of Legends",
  "fourth-of-july": "Fourth of July",
  "cinco-de-mayo": "Cinco de Mayo",
  "shades-of-purple": "Shades of Purple",
  
  // TV Shows
  "game-of-thrones": "Game of Thrones",
  "the-office": "The Office",
  "squid-game": "Squid Game",
  "the-mandalorian": "The Mandalorian",
  "peaky-blinders": "Peaky Blinders",
  
  // Movies
  "lord-of-the-rings": "Lord of the Rings",
  "harry-potter": "Harry Potter",
  
  // Retro
  "nuclear-fallout": "Nuclear Fallout",
  
  // Anime
  "attack-on-titan": "Attack on Titan",
  "demon-slayer": "Demon Slayer",
  "one-piece": "One Piece",
  "my-hero-academia": "My Hero Academia",
  "sailor-moon": "Sailor Moon",
  "death-note": "Death Note",
  "solo-leveling": "Solo Leveling",
  "jujutsu-kaisen": "Jujutsu Kaisen",

  // Gaming
  "crash-bandicoot": "Crash Bandicoot",
  "rainbow-six-siege": "Rainbow Six Siege",
  "nba2k": "NBA 2K",
  "super-smash-bros": "Super Smash Bros.",
  "plants-vs-zombies": "Plants vs. Zombies",
  "ratchet-and-clank": "Ratchet & Clank",
  "lego": "LEGO",
  "cyberpunk-2077": "Cyberpunk 2077",
  "horizon-zero-dawn": "Horizon Zero Dawn",
  "persona-5": "Persona 5",
  "last-of-us": "Last of Us",
  "ghost-of-tsushima": "Ghost of Tsushima",
  "metal-gear-solid": "Metal Gear Solid",
  "resident-evil": "Resident Evil",
  "it-takes-two": "It Takes Two",
  "disco-elysium": "Disco Elysium",
  "no-mans-sky": "No Man's Sky",
  "death-stranding": "Death Stranding",

  // Movies (new)
  "wall-e": "WALL\u00B7E",
  "spider-man": "Spider-Man",
  "guardians-of-the-galaxy": "Guardians of the Galaxy",
  "back-to-the-future": "Back to the Future",
  "the-wizard-of-oz": "The Wizard of Oz",
  "how-to-train-your-dragon": "How to Train Your Dragon",
  "pride-and-prejudice": "Pride and Prejudice",
  "mad-max": "Mad Max",
  "the-dark-knight": "The Dark Knight",
  "john-wick": "John Wick",
  "grand-budapest-hotel": "Grand Budapest Hotel",

  // TV Shows (new)
  "avatar-the-last-airbender": "Avatar: The Last Airbender",
  "spongebob": "SpongeBob",
  "phineas-and-ferb": "Phineas and Ferb",
  "the-last-of-us": "The Last of Us",
  "black-mirror": "Black Mirror",
  "the-bear": "The Bear",
  "band-of-brothers": "Band of Brothers",
  "mr-robot": "Mr. Robot",

  // Anime (new)
  "chainsaw-man": "Chainsaw Man",
  "spy-x-family": "SPY x FAMILY",
  "haikyuu": "Haikyu!!",
  "cardcaptor-sakura": "Cardcaptor Sakura",
  "mob-psycho-100": "Mob Psycho 100",
  "fullmetal-alchemist": "Fullmetal Alchemist",
  "cowboy-bebop": "Cowboy Bebop",
  "neon-genesis-evangelion": "Neon Genesis Evangelion",
  "steins-gate": "Steins;Gate",
  "hunter-x-hunter": "Hunter x Hunter",
  "tokyo-ghoul": "Tokyo Ghoul",
  "sword-art-online": "Sword Art Online",
  "vinland-saga": "Vinland Saga",
  "dandadan": "DAN DA DAN",

  // Food (new)
  "smores": "S'mores",
  "bubble-tea": "Bubble Tea",

  // Music (genres)
  "r-and-b": "R&B",
  "k-pop": "K-Pop",
  "bossa-nova": "Bossa Nova",
  "drum-and-bass": "Drum and Bass",

  // Music (Bands)
  "linkin-park": "Linkin Park",
  "three-days-grace": "Three Days Grace",
  "bring-me-the-horizon": "Bring Me the Horizon",
  "falling-in-reverse": "Falling in Reverse",
  "red-hot-chili-peppers": "Red Hot Chili Peppers",
  "foo-fighters": "Foo Fighters",
  "breaking-benjamin": "Breaking Benjamin",
  "green-day": "Green Day",
  "imagine-dragons": "Imagine Dragons",
  "avenged-sevenfold": "Avenged Sevenfold",
  "my-chemical-romance": "My Chemical Romance",
  "fall-out-boy": "Fall Out Boy",
  "panic-at-the-disco": "Panic! at the Disco",
  "the-academy-is": "The Academy Is...",
  "the-beatles": "The Beatles",
  "pierce-the-veil": "Pierce the Veil",
  "sleeping-with-sirens": "Sleeping with Sirens",
  "weezer": "Weezer",
  "cobra-starship": "Cobra Starship",
  "creed": "Creed",
  "nickelback": "Nickelback",
  "staind": "Staind",
  "three-doors-down": "3 Doors Down",
  "matchbox-twenty": "Matchbox Twenty",
  "puddle-of-mudd": "Puddle of Mudd",
  "alice-in-chains": "Alice in Chains",
  "system-of-a-down": "System of a Down",
  "rage-against-the-machine": "Rage Against the Machine",
  "stone-temple-pilots": "Stone Temple Pilots",
  "pearl-jam": "Pearl Jam",

  // Music (Artists)
  "avril-lavigne": "Avril Lavigne",
  "amy-lee": "Amy Lee",
  "corey-taylor": "Corey Taylor",
  "myles-kennedy": "Myles Kennedy",
  "lzzy-hale": "Lzzy Hale",
  "chris-daughtry": "Chris Daughtry",
  "lacey-sturm": "Lacey Sturm",
  "devin-townsend": "Devin Townsend",
  "zakk-wylde": "Zakk Wylde",
  "joe-satriani": "Joe Satriani",
  "lindsey-stirling": "Lindsey Stirling",
  "ed-sheeran": "Ed Sheeran",
  "lana-del-rey": "Lana Del Rey",
  "john-mayer": "John Mayer",
  "norah-jones": "Norah Jones",
  "michael-buble": "Michael Bublé",
  "scott-stapp": "Scott Stapp",
  "rob-thomas": "Rob Thomas",
  "aaron-lewis": "Aaron Lewis",
  "billie-eilish": "Billie Eilish",
  "post-malone": "Post Malone",
  "taylor-swift": "Taylor Swift",
  "kendrick-lamar": "Kendrick Lamar",
  "frank-ocean": "Frank Ocean",
  "the-weeknd": "The Weeknd",
  "dua-lipa": "Dua Lipa",

  // Retro (new)
  "mid-autumn": "Mid-Autumn",
  "wabi-sabi": "Wabi-Sabi",
  "tie-dye": "Tie-Dye",

  // Books
  "1984": "1984",
  "the-great-gatsby": "The Great Gatsby",
  "to-kill-a-mockingbird": "To Kill a Mockingbird",
  "moby-dick": "Moby-Dick",
  "wuthering-heights": "Wuthering Heights",
  "jane-eyre": "Jane Eyre",
  "dracula-book": "Dracula",
  "the-catcher-in-the-rye": "The Catcher in the Rye",
  "little-women": "Little Women",
  "alice-in-wonderland": "Alice in Wonderland",
  "the-picture-of-dorian-gray": "The Picture of Dorian Gray",
  "don-quixote": "Don Quixote",
  "a-tale-of-two-cities": "A Tale of Two Cities",
  "the-secret-garden": "The Secret Garden",
  "the-hobbit": "The Hobbit",
  "dune-book": "Dune",
  "brave-new-world": "Brave New World",
  "fahrenheit-451": "Fahrenheit 451",
  "the-odyssey": "The Odyssey",
  "crime-and-punishment": "Crime and Punishment",
  "anna-karenina": "Anna Karenina",
  "les-miserables": "Les Misérables",
  "war-and-peace": "War and Peace",

  // Mythology
  "chinese-mythology": "Chinese Mythology",

  "polynesian-mythology": "Polynesian Mythology",
  "japanese-mythology": "Japanese Mythology",
  "native-american": "Native American",

  // Cities
  "rio-de-janeiro": "Rio de Janeiro",
  "hong-kong": "Hong Kong",
  "san-francisco": "San Francisco",
  "buenos-aires": "Buenos Aires",
  "kuiper-belt": "Kuiper Belt",

  // Productivity
  "pair-programming": "Pair Programming",
  "crunch-time": "Crunch Time",
  "retro-meeting": "Retro Meeting",

  // Fun
  "escape-room": "Escape Room",
  "bubble-wrap": "Bubble Wrap",
  "magic-show": "Magic Show",
  "whack-a-mole": "Whack-a-Mole",

  // Cultural
  "greek-isles": "Greek Isles",

  // Sports
  "hot-spring": "Hot Spring",

  // School Subjects
  "music-theory": "Music Theory",
  "computer-science": "Computer Science",
  "foreign-language": "Foreign Language",
  "environmental-science": "Environmental Science",

  // Batch 2 — Gaming
  "monster-hunter": "Monster Hunter",
  "mega-man": "Mega Man",
  "pac-man": "Pac-Man",
  "street-fighter": "Street Fighter",
  "mortal-kombat": "Mortal Kombat",
  "kingdom-hearts": "Kingdom Hearts",
  "fire-emblem": "Fire Emblem",
  "alan-wake": "Alan Wake",
  "outer-wilds": "Outer Wilds",
  "lies-of-p": "Lies of P",
  "armored-core": "Armored Core",
  "death-loop": "Deathloop",
  "deep-rock-galactic": "Deep Rock Galactic",
  "half-life": "Half-Life",

  // Batch 2 — Movies
  "the-godfather": "The Godfather",
  "pulp-fiction": "Pulp Fiction",
  "fight-club": "Fight Club",
  "everything-everywhere": "Everything Everywhere All at Once",
  "la-la-land": "La La Land",
  "the-prestige": "The Prestige",
  "eternal-sunshine": "Eternal Sunshine",
  "ex-machina": "Ex Machina",
  "the-truman-show": "The Truman Show",
  "spirited-away": "Spirited Away",
  "princess-mononoke": "Princess Mononoke",
  "howls-moving-castle": "Howl's Moving Castle",

  // Batch 2 — TV Shows
  "the-wire": "The Wire",
  "schitts-creek": "Schitt's Creek",
  "parks-and-rec": "Parks and Rec",
  "brooklyn-nine-nine": "Brooklyn Nine-Nine",
  "better-call-saul": "Better Call Saul",
  "true-detective": "True Detective",
  "house-of-the-dragon": "House of the Dragon",
  "fallout-show": "Fallout",
  "3-body-problem": "3 Body Problem",
  "white-lotus": "White Lotus",

  // Batch 2 — Anime
  "one-punch-man": "One-Punch Man",
  "code-geass": "Code Geass",
  "psycho-pass": "Psycho-Pass",
  "made-in-abyss": "Made in Abyss",
  "mushoku-tensei": "Mushoku Tensei",
  "re-zero": "Re:Zero",
  "bocchi-the-rock": "Bocchi the Rock!",
  "oshi-no-ko": "Oshi no Ko",
  "blue-lock": "Blue Lock",
  "cyberpunk-edgerunners": "Cyberpunk: Edgerunners",
  "samurai-champloo": "Samurai Champloo",
  "ranking-of-kings": "Ranking of Kings",
  "blue-exorcist": "Blue Exorcist",
  "fire-force": "Fire Force",
  "kaiju-no-8": "Kaiju No. 8",

  // Batch 2 — Music Bands
  "led-zeppelin": "Led Zeppelin",
  "pink-floyd": "Pink Floyd",
  "the-rolling-stones": "The Rolling Stones",
  "black-sabbath": "Black Sabbath",
  "deep-purple": "Deep Purple",
  "iron-maiden": "Iron Maiden",
  "judas-priest": "Judas Priest",
  "type-o-negative": "Type O Negative",
  "nine-inch-nails": "Nine Inch Nails",
  "the-cure": "The Cure",
  "depeche-mode": "Depeche Mode",
  "joy-division": "Joy Division",
  "arctic-monkeys": "Arctic Monkeys",
  "the-strokes": "The Strokes",
  "queens-of-the-stone-age": "Queens of the Stone Age",
  "smashing-pumpkins": "Smashing Pumpkins",
  "collective-soul": "Collective Soul",
  "our-lady-peace": "Our Lady Peace",
  "the-wallflowers": "The Wallflowers",
  "goo-goo-dolls": "Goo Goo Dolls",
  "third-eye-blind": "Third Eye Blind",
  "vertical-horizon": "Vertical Horizon",
  "eve-6": "Eve 6",
  "marcy-playground": "Marcy Playground",
  "theory-of-a-deadman": "Theory of a Deadman",
  "alter-bridge": "Alter Bridge",
  "in-this-moment": "In This Moment",
  "nothing-more": "Nothing More",
  "thousand-foot-krutch": "Thousand Foot Krutch",
  "the-letter-black": "The Letter Black",
  "we-are-the-fallen": "We Are the Fallen",
  "from-ashes-to-new": "From Ashes to New",

  // Batch 2 — Music Artists
  "chester-bennington": "Chester Bennington",
  "chris-cornell": "Chris Cornell",
  "eddie-vedder": "Eddie Vedder",
  "kurt-cobain": "Kurt Cobain",
  "layne-staley": "Layne Staley",
  "scott-weiland": "Scott Weiland",
  "shannon-hoon": "Shannon Hoon",
  "dave-grohl": "Dave Grohl",
  "jerry-cantrell": "Jerry Cantrell",
  "mark-tremonti": "Mark Tremonti",
  "brent-smith": "Brent Smith",
  "jacoby-shaddix": "Jacoby Shaddix",
  "sully-erna": "Sully Erna",
  "david-draiman": "David Draiman",
  "serj-tankian": "Serj Tankian",
  "brandon-boyd": "Brandon Boyd",
  "maynard-james-keenan": "Maynard James Keenan",
  "chino-moreno": "Chino Moreno",
  "amy-winehouse": "Amy Winehouse",
  "freddie-mercury": "Freddie Mercury",
  "david-bowie": "David Bowie",
  "dolly-parton": "Dolly Parton",
  "johnny-cash": "Johnny Cash",
  "willie-nelson": "Willie Nelson",
  "stevie-nicks": "Stevie Nicks",
  "robert-plant": "Robert Plant",
  "ozzy-osbourne": "Ozzy Osbourne",
  "james-hetfield": "James Hetfield",
  "trent-reznor": "Trent Reznor",

  // Batch 2 — Books
  "the-count-of-monte-cristo": "The Count of Monte Cristo",
  "treasure-island": "Treasure Island",
  "the-brothers-karamazov": "The Brothers Karamazov",
  "heart-of-darkness": "Heart of Darkness",
  "the-sun-also-rises": "The Sun Also Rises",
  "great-expectations": "Great Expectations",
  "the-scarlet-letter": "The Scarlet Letter",
  "catch-22": "Catch-22",
  "slaughterhouse-five": "Slaughterhouse-Five",
  "dantes-inferno": "Dante's Inferno",
  "paradise-lost": "Paradise Lost",
  "the-iliad": "The Iliad",
  "the-alchemist": "The Alchemist",
  "hundred-years-of-solitude": "One Hundred Years of Solitude",
  "kafka-on-the-shore": "Kafka on the Shore",

  // Batch 2 — Cities
  "cape-town": "Cape Town",
  "mexico-city": "Mexico City",

  // Batch 2 — Comics
  "saga-comic": "Saga",
  "ghost-in-the-shell": "Ghost in the Shell",
  "scott-pilgrim": "Scott Pilgrim",
  "the-boys": "The Boys",
  "v-for-vendetta": "V for Vendetta",
  "sin-city": "Sin City",

  // Batch 2 — Historical Eras
  "silk-road": "Silk Road",
  "industrial-revolution": "Industrial Revolution",
  "space-race": "Space Race",
  "gold-rush": "Gold Rush",
  "belle-epoque": "Belle Époque",
  "bronze-age": "Bronze Age",
  "iron-age": "Iron Age",
  "viking-age": "Viking Age",
  "cold-war": "Cold War",
  "ancient-greece": "Ancient Greece",
  "ottoman-empire": "Ottoman Empire",

  // Batch 2 — Mythology
  "hawaiian-mythology": "Hawaiian Mythology",
  "finnish-mythology": "Finnish Mythology",
  "korean-mythology": "Korean Mythology",

  // Batch 2 — Weather
  "rainbow-after-storm": "Rainbow After Storm",
  "dust-devil": "Dust Devil",
  "ice-storm": "Ice Storm",
  "sea-fog": "Sea Fog",
  "ball-lightning": "Ball Lightning",
  "mammatus-clouds": "Mammatus Clouds",
  "deep-sea-vent": "Deep-Sea Vent",
  "salt-flat": "Salt Flat",

  // Batch 2 — Gemstones
  "lapis-lazuli": "Lapis Lazuli",
  "obsidian-stone": "Obsidian",
  "turquoise-gem": "Turquoise",

  // Batch 2 — Emotions
  "serenity-mood": "Serenity",
  "euphoria-mood": "Euphoria",
  "nostalgia-mood": "Nostalgia",

  // Batch 2 — Vehicles
  "steam-train": "Steam Train",
  "hot-air-balloon": "Hot Air Balloon",
  "rocket-ship": "Rocket Ship",
  "cable-car": "Cable Car",
  "cardinal-bird": "Cardinal",
  "arctic-fox": "Arctic Fox",
  "manta-ray": "Manta Ray",
  "horseshoe-crab": "Horseshoe Crab",

  // Batch 2 — Dance
  "tap-dance": "Tap Dance",
  "line-dance": "Line Dance",
  "bass-guitar": "Bass Guitar",

  // Batch 2 — Food
  "pad-thai": "Pad Thai",
  "dim-sum": "Dim Sum",
  "creme-brulee": "Crème Brûlée",

  // Batch 2 — Productivity
  "inbox-zero": "Inbox Zero",
  "time-boxing": "Time Boxing",
  "demo-day": "Demo Day",
  "on-call": "On-Call",

  // Batch 2 — Misc
  "spring-pool": "Spring Pool",
  "kelp-forest": "Kelp Forest",
  "ring-nebula": "Ring Nebula",
  "dark-matter": "Dark Matter",
  "cosmic-dust": "Cosmic Dust",
  "oort-cloud": "Oort Cloud",
  "lagrange-point": "Lagrange Point",
  "pulsar-editor": "Pulsar",
  "lite-xl": "Lite XL",
};

// Format theme name for display (capitalize first letter of each word)
const formatThemeName = (name: string): string => {
  // Check for override first
  if (THEME_DISPLAY_NAMES[name]) {
    return THEME_DISPLAY_NAMES[name];
  }
  
  // Default: capitalize first letter of each word
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Fetch theme manifest from /public/themes/manifest.json
export async function fetchThemeManifest(): Promise<ThemeManifest> {
  if (cachedManifest) {
    return cachedManifest;
  }

  try {
    const res = await fetch("/themes/manifest.json");
    if (!res.ok) {
      console.error("Failed to load theme manifest");
      return { themes: [], default: "typesetgo" };
    }
    cachedManifest = await res.json();
    return cachedManifest!;
  } catch (e) {
    console.error("Failed to load theme manifest:", e);
    return { themes: [], default: "typesetgo" };
  }
}

// Get manifest from cache
export function getThemeManifestFromCache(): ThemeManifest | null {
  return cachedManifest;
}

// Fetch a single theme by name from /public/themes/
export async function fetchTheme(themeName: string): Promise<ThemeDefinition | null> {
  const key = themeName.toLowerCase();
  
  // Return from cache if available
  if (themeCache[key]) {
    return themeCache[key];
  }

  try {
    const res = await fetch(`/themes/${key}.json`);
    if (!res.ok) return null;
    
    const data = await res.json();
    
    // Parse the new theme format
    const theme: ThemeDefinition = {
      id: key,
      name: formatThemeName(key),
      category: data.category || "default",
      dark: data.dark,
      light: data.light || null,
    };
    
    // Cache the loaded theme
    themeCache[key] = theme;
    return theme;
  } catch (e) {
    console.error(`Failed to load theme: ${themeName}`, e);
    return null;
  }
}

// Fetch all available themes from /public/themes/
export async function fetchAllThemes(): Promise<ThemeDefinition[]> {
  const manifest = await fetchThemeManifest();
  
  const themes = await Promise.all(
    manifest.themes.map((name) => fetchTheme(name))
  );
  
  // Filter out any failed loads and sort (TypeSetGo first, then alphabetically)
  return themes
    .filter((t): t is ThemeDefinition => t !== null)
    .sort((a, b) => {
      if (a.name.toLowerCase() === "typesetgo") return -1;
      if (b.name.toLowerCase() === "typesetgo") return 1;
      return a.name.localeCompare(b.name);
    });
}

// Group themes by category
export function groupThemesByCategory(themes: ThemeDefinition[]): GroupedThemes[] {
  const groups: Record<ThemeCategory, ThemeDefinition[]> = {
    // Featured
    default: [],
    // Technical/Developer
    editor: [],
    brand: [],
    // Productivity/Utility
    productivity: [],
    utility: [],
    // Design/Visual
    aesthetic: [],
    "color-theory": [],
    // Animals
    animals: [],
    // Nature/Environment
    nature: [],
    seasons: [],
    biomes: [],
    plants: [],
    weather: [],
    space: [],
    time: [],
    // Era/Culture
    retro: [],
    cultural: [],
    books: [],
    mythology: [],
    cities: [],
    subject: [],
    // Entertainment/Media
    gaming: [],
    movies: [],
    "tv-shows": [],
    anime: [],
    // Lifestyle
    music: [],
    "music-bands": [],
    "music-artists": [],
    sports: [],
    food: [],
    fun: [],
    holiday: [],
    // Collections/Misc
    zodiac: [],
    gemstones: [],
    instruments: [],
    dance: [],
    vehicles: [],
    comics: [],
    "historical-era": [],
    emotions: [],
    textiles: [],
  };

  // Group themes
  for (const theme of themes) {
    const category = theme.category || "default";
    if (groups[category]) {
      groups[category].push(theme);
    } else {
      groups.default.push(theme);
    }
  }

  // Sort themes within each category alphabetically
  for (const category of Object.keys(groups) as ThemeCategory[]) {
    groups[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Build sorted grouped array
  const result: GroupedThemes[] = [];
  const sortedCategories = (Object.keys(CATEGORY_CONFIG) as ThemeCategory[]).sort(
    (a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order
  );

  for (const category of sortedCategories) {
    if (groups[category].length > 0) {
      result.push({
        category,
        displayName: CATEGORY_CONFIG[category].displayName,
        themes: groups[category],
      });
    }
  }

  return result;
}

// Get a theme synchronously from cache (returns null if not loaded yet)
export function getThemeFromCache(themeName: string): ThemeDefinition | null {
  return themeCache[themeName.toLowerCase()] || null;
}

// Default theme definition (TypeSetGo)
export function getDefaultTheme(): ThemeDefinition {
  return {
    id: "typesetgo",
    name: "TypeSetGo",
    category: "default",
    dark: {
      bg: {
        base: "#323437",
        surface: "#2c2e31",
        elevated: "#37383b",
        overlay: "rgba(0, 0, 0, 0.5)",
      },
      text: {
        primary: "#d1d5db",
        secondary: "#4b5563",
        muted: "rgba(75, 85, 99, 0.6)",
        inverse: "#ffffff",
      },
      interactive: {
        primary: {
          DEFAULT: "#3cb5ee",
          muted: "rgba(60, 181, 238, 0.3)",
          subtle: "rgba(60, 181, 238, 0.1)",
        },
        secondary: {
          DEFAULT: "#0097b2",
          muted: "rgba(0, 151, 178, 0.3)",
          subtle: "rgba(0, 151, 178, 0.1)",
        },
        accent: {
          DEFAULT: "#a855f7",
          muted: "rgba(168, 85, 247, 0.3)",
          subtle: "rgba(168, 85, 247, 0.1)",
        },
      },
      status: {
        success: {
          DEFAULT: "#22c55e",
          muted: "rgba(34, 197, 94, 0.3)",
          subtle: "rgba(34, 197, 94, 0.1)",
        },
        error: {
          DEFAULT: "#ef4444",
          muted: "rgba(239, 68, 68, 0.3)",
          subtle: "rgba(239, 68, 68, 0.1)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          muted: "rgba(245, 158, 11, 0.3)",
          subtle: "rgba(245, 158, 11, 0.1)",
        },
      },
      border: {
        default: "rgba(75, 85, 99, 0.3)",
        subtle: "rgba(75, 85, 99, 0.15)",
        focus: "#3cb5ee",
      },
      typing: {
        cursor: "#3cb5ee",
        cursorGhost: "#a855f7",
        correct: "#d1d5db",
        incorrect: "#ef4444",
        upcoming: "#4b5563",
        default: "#4b5563",
      },
    },
    light: null,
  };
}

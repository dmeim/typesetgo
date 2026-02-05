// convex/lib/raceWords.ts
// Word lists for server-side race text generation
// These are subsets of the main word lists for use in Convex functions

export const RACE_WORDS = {
  beginner: [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
    "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
    "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
    "an", "will", "my", "one", "all", "would", "there", "their", "what", "so",
    "up", "out", "if", "about", "who", "get", "which", "go", "me", "when",
    "can", "like", "time", "no", "just", "him", "know", "take", "people", "into",
    "year", "your", "good", "some", "could", "them", "see", "other", "than", "then",
    "now", "look", "only", "come", "its", "over", "think", "also", "back", "after",
  ],
  easy: [
    "after", "again", "air", "also", "always", "animal", "another", "answer", "around",
    "back", "because", "been", "before", "being", "between", "book", "both", "boy",
    "called", "came", "change", "children", "city", "close", "could", "country",
    "day", "different", "does", "down", "each", "earth", "end", "even", "every",
    "example", "eye", "face", "family", "far", "father", "feet", "find", "first",
    "follow", "food", "form", "found", "four", "from", "girl", "give", "good", "got",
    "great", "group", "hand", "hard", "has", "have", "head", "heard", "help", "here",
    "high", "home", "house", "idea", "important", "into", "just", "keep", "kind",
    "know", "land", "large", "last", "later", "learn", "leave", "left", "let", "letter",
    "life", "light", "line", "list", "little", "live", "long", "look", "made", "make",
    "man", "many", "may", "mean", "men", "might", "mile", "more", "most", "mother",
    "mountain", "move", "much", "must", "name", "near", "need", "never", "new", "next",
  ],
  medium: [
    "ability", "absolute", "accept", "account", "achieve", "across", "action", "activity",
    "actually", "address", "advantage", "advice", "affect", "afraid", "afternoon", "against",
    "agree", "almost", "along", "already", "although", "always", "amount", "ancient",
    "announce", "anything", "appear", "approach", "argue", "arrange", "arrive", "article",
    "assume", "attempt", "attend", "attention", "audience", "author", "available", "average",
    "avoid", "beautiful", "become", "before", "begin", "behavior", "behind", "believe",
    "benefit", "besides", "better", "between", "beyond", "billion", "birthday", "board",
    "border", "bottle", "bottom", "branch", "breath", "bridge", "bright", "bring", "broad",
    "brother", "budget", "building", "business", "button", "camera", "campaign", "capital",
    "career", "careful", "carry", "category", "cause", "center", "central", "century",
    "certain", "certainly", "challenge", "champion", "chance", "change", "chapter", "character",
    "charge", "cheap", "check", "choice", "choose", "church", "circle", "citizen", "civil",
  ],
  hard: [
    "abbreviation", "abolish", "absolution", "abundance", "acceleration", "accommodate",
    "accomplishment", "accountability", "accumulation", "acknowledge", "acquaintance",
    "acquisition", "administration", "advertisement", "aesthetic", "affirmation", "aggregate",
    "algorithm", "allegiance", "allocation", "amalgamation", "ambiguous", "ameliorate",
    "amplification", "anachronism", "analogous", "annihilation", "anticipation", "apocalypse",
    "appreciation", "apprehension", "approximation", "arbitrary", "archaeology", "architecture",
    "articulation", "assassination", "assimilation", "astronomical", "authenticate", "authorization",
    "autonomous", "bibliography", "biodegradable", "bureaucracy", "calculation", "calibration",
    "capitalization", "cardiovascular", "categorization", "catastrophe", "certification",
    "characteristic", "chronological", "circumference", "classification", "collaboration",
    "commemoration", "communication", "compartmentalize", "compatibility", "compensation",
    "comprehension", "concentration", "configuration", "congratulation", "consciousness",
    "constellation", "constitutional", "contamination", "contemplation", "contradiction",
    "controversial", "conventional", "correspondence", "crystallization", "customization",
  ],
  expert: [
    "acknowledgement", "antidisestablishmentarianism", "autobiographical", "bureaucratization",
    "characteristically", "circumnavigation", "compartmentalization", "conceptualization",
    "constitutionalization", "counterrevolutionary", "deindustrialization", "dematerialization",
    "disproportionately", "electroencephalogram", "electromagnetism", "entrepreneurship",
    "environmentalism", "existentialism", "experimentalism", "extraordinarily", "fundamentalism",
    "heterogeneously", "hippopotomonstrosesquippedaliophobia", "homogeneously", "hypersensitivity",
    "immunodeficiency", "imperceptibility", "impressionistically", "inconsequentially",
    "indistinguishable", "industrialization", "infrastructural", "institutionalization",
    "intellectualization", "interconnectedness", "interdisciplinary", "internationalization",
    "jurisprudentially", "knowledgeability", "macroenvironmental", "materialization",
    "microelectronics", "miscommunication", "multidimensional", "neuropsychological",
    "nondenominational", "overcompensation", "oversimplification", "parameterization",
    "personalization", "phenomenologically", "phosphorescence", "photosynthetically",
    "physiotherapeutic", "postmodernistically", "preposterousness", "professionalization",
    "psychopharmacology", "reconceptualization", "revolutionization", "sentimentalization",
    "straightforwardness", "telecommunication", "thermodynamically", "transcendentalism",
    "transnationalization", "ultraconservative", "unconstitutionality", "underrepresentation",
  ],
};

// Generate race text by selecting random words from the appropriate difficulty
export function generateRaceText(
  difficulty: string,
  wordCount: number
): string {
  const difficultyKey = difficulty.toLowerCase() as keyof typeof RACE_WORDS;
  const words = RACE_WORDS[difficultyKey] || RACE_WORDS.medium;
  
  const selectedWords: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    selectedWords.push(words[randomIndex]);
  }
  
  return selectedWords.join(" ");
}

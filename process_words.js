const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, 'public/words');
const FILTER_FILE = path.join(WORDS_DIR, 'filter_words.json');

const DIFFICULTY_FILES = {
  beginner: 'beginner.json',
  easy: 'easy.json',
  medium: 'medium.json',
  hard: 'hard.json',
  expert: 'expert.json'
};

const SOURCE_FILES = [
  'english_1k.json',
  'english_5k.json',
  'english_10k.json',
  'english_25k.json',
  'english_450k.json'
];

// Load filter list
let filterList = [];
try {
  const filterData = fs.readFileSync(FILTER_FILE, 'utf8');
  filterList = JSON.parse(filterData);
  console.log(`Loaded ${filterList.length} filter words.`);
} catch (e) {
  console.error('Error loading filter list:', e);
  process.exit(1);
}

const filterSet = new Set(filterList.map(w => w.toLowerCase()));

// Validity checks
function isValidWord(word) {
  if (!word) return false;
  const w = word.toLowerCase();
  
  // 1. Real word check (basic heuristics)
  // Must contain only letters
  if (!/^[a-z]+$/.test(w)) return false;
  
  // Must not have 3 consecutive identical characters (e.g. 'aaa')
  if (/(.)\1\1/.test(w)) return false;
  
  // Must contain at least one vowel (including y)
  if (!/[aeiouy]/.test(w)) return false;

  // 2. Profanity/Appropriateness check
  if (filterSet.has(w)) return false;

  return true;
}

function getDifficulty(word) {
  const len = word.length;
  if (len < 5) return 'beginner';      // 1-4
  if (len >= 5 && len < 7) return 'easy'; // 5-6
  if (len >= 7 && len < 9) return 'medium'; // 7-8
  if (len >= 9 && len < 13) return 'hard'; // 9-12
  if (len >= 13) return 'expert';      // 13+
  return null;
}

// Load existing difficulty lists
const difficultyWords = {};
for (const [key, filename] of Object.entries(DIFFICULTY_FILES)) {
  try {
    const filePath = path.join(WORDS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      difficultyWords[key] = JSON.parse(data); // Keep as array to preserve order
    } else {
      difficultyWords[key] = [];
    }
  } catch (e) {
    console.error(`Error loading ${filename}:`, e);
    difficultyWords[key] = [];
  }
}

// Use Sets to track uniqueness efficiently during processing
const uniqueSets = {};
for (const key of Object.keys(DIFFICULTY_FILES)) {
  uniqueSets[key] = new Set(difficultyWords[key].map(w => w.toLowerCase()));
}

// Process source files
for (const sourceFile of SOURCE_FILES) {
  const sourcePath = path.join(WORDS_DIR, sourceFile);
  if (!fs.existsSync(sourcePath)) {
    console.log(`Source file ${sourceFile} not found, skipping.`);
    continue;
  }

  console.log(`Processing ${sourceFile}...`);
  try {
    const data = fs.readFileSync(sourcePath, 'utf8');
    const json = JSON.parse(data);
    
    // Handle both array and object formats (just in case)
    const words = Array.isArray(json) ? json : (json.words || []);

    let addedCount = 0;
    let skippedCount = 0;

    for (const word of words) {
      if (isValidWord(word)) {
        const diff = getDifficulty(word);
        if (diff) {
          const wLower = word.toLowerCase();
          if (!uniqueSets[diff].has(wLower)) {
            uniqueSets[diff].add(wLower);
            difficultyWords[diff].push(wLower); // Append to array
            addedCount++;
          }
        }
      } else {
        skippedCount++;
      }
    }
    console.log(`  Added: ${addedCount}, Skipped/Duplicate: ${skippedCount}`);

  } catch (e) {
    console.error(`Error processing ${sourceFile}:`, e);
  }
}

// Write back to files
console.log('Writing updated lists...');
for (const [key, filename] of Object.entries(DIFFICULTY_FILES)) {
  const filePath = path.join(WORDS_DIR, filename);
  const words = difficultyWords[key];
  
  // Optional: We could sort here, but preserving frequency (insertion order) might be better
  // defined by the processing order of 1k -> 450k.
  // The existing words are kept at the start.
  
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
  console.log(`  Updated ${filename}: ${words.length} words`);
}

console.log('Done.');

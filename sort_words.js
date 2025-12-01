const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, 'public/words');

const DIFFICULTY_FILES = [
  'beginner.json',
  'easy.json',
  'medium.json',
  'hard.json',
  'expert.json'
];

console.log('Sorting word lists...');

for (const filename of DIFFICULTY_FILES) {
  const filePath = path.join(WORDS_DIR, filename);
  
  if (fs.existsSync(filePath)) {
    try {
      console.log(`Reading ${filename}...`);
      const data = fs.readFileSync(filePath, 'utf8');
      const words = JSON.parse(data);
      
      if (Array.isArray(words)) {
        console.log(`  Sorting ${words.length} words...`);
        words.sort((a, b) => a.localeCompare(b));
        
        fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
        console.log(`  Saved sorted ${filename}`);
      } else {
        console.warn(`  Warning: ${filename} does not contain an array.`);
      }
    } catch (e) {
      console.error(`  Error processing ${filename}:`, e);
    }
  } else {
    console.log(`  File ${filename} not found.`);
  }
}

console.log('Done.');

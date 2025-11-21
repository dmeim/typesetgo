# Content Management

## Overview

TypeSetGo manages its typing content (words and quotes) via static JSON files located in the `public/` directory. This simple, file-based approach allows for easy addition of new content without database migrations.

## Word Lists

Located in `public/words/`.
Used for **Time** and **Words** modes.

Files are categorized by difficulty:
-   `beginner.json`: Simple, short words.
-   `easy.json`: Common words.
-   `medium.json`: Standard vocabulary.
-   `hard.json`: Complex words.
-   `extreme.json`: Very long, obscure, or technical words.
-   `expert.json` (mapped from extreme in UI): High complexity.

### Format
Each file is a simple JSON array of strings:
```json
[
  "word1",
  "word2",
  "word3"
]
```

## Quotes

Located in `public/quotes/`.
Used for **Quote** mode.

Files are categorized by length:
-   `short.json`: Short quotes (approx < 50 chars).
-   `medium.json`: Medium length.
-   `long.json`: Long paragraphs.
-   `xl.json`: Very long texts.

### Format
Each file is a JSON array of Quote objects:
```json
[
  {
    "quote": "The actual text to be typed.",
    "author": "Author Name",
    "source": "Book or Movie Title",
    "context": "Optional context or year",
    "date": "Year or Date string"
  }
]
```

## Utilities

### `analyze_quotes.js`

A utility script is provided in the root directory to analyze the quote database.

**Usage:**
```bash
node analyze_quotes.js
```

**Functions:**
-   Counts total unique quotes across all files.
-   Checks for duplicates.
-   Generates a histogram of quote lengths to help categorize them correctly (e.g., ensuring `short.json` doesn't contain long quotes).

## Adding Content

To add new words or quotes:
1.  Open the relevant JSON file in `public/`.
2.  Append the new entry following the existing format.
3.  Ensure valid JSON syntax (commas between items).
4.  (Optional) Run `node analyze_quotes.js` to verify integrity if you modified quotes.

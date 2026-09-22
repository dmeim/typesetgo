/** Gross WPM is all typed characters / five / elapsed minutes. */
export function calculateWpm(characterCount: number, elapsedMs: number): number {
  return elapsedMs > 0 ? characterCount / 5 / (elapsedMs / 60000) : 0;
}

/** Empty input starts at 100%; an all-wrong attempt remains 0%. */
export function calculateAccuracy(correctCharacters: number, typedCharacters: number): number {
  return typedCharacters > 0 ? correctCharacters / typedCharacters * 100 : 100;
}

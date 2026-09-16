/** Completion follows submitted words and the final word, rather than raw input length. */
export function hasCompletedPrompt(typedText: string, targetText: string): boolean {
  if (!targetText) return false;
  const targetWords = targetText.split(" ");
  const typedWords = typedText.split(" ");
  const finalIndex = targetWords.length - 1;
  return typedWords.length - 1 > finalIndex || (
    typedWords.length - 1 === finalIndex &&
    typedWords[finalIndex].length >= targetWords[finalIndex].length
  );
}

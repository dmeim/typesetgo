import { useEffect, useState } from "react";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import { fetchQuotes, type QuotesManifest } from "@/lib/quotes";
import { fetchWords } from "@/lib/words";

const EMPTY_WORDS: string[] = [];
const EMPTY_QUOTES: Quote[] = [];
type Dataset = { key: string; words: string[]; quotes: Quote[]; error: boolean };

/** Only data loaded for the selected configuration can generate its prompt. */
export function usePracticeDataset(settings: SettingsState, quotesManifest: QuotesManifest | null) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const key = settings.mode === "quote" ? `quotes:${settings.quoteLength}`
    : settings.mode === "preset" || settings.mode === "plan" ? "none" : `words:${settings.difficulty}`;
  const quoteLengthsKey = settings.mode === "quote" && settings.quoteLength === "all" ? quotesManifest?.lengths.join(",") : undefined;
  useEffect(() => {
    let cancelled = false;
    if (key === "none") return;
    const isQuote = key.startsWith("quotes:");
    if (key === "quotes:all" && quoteLengthsKey === undefined) return;
    const load = async () => {
      try {
        const quotes = isQuote
          ? (await Promise.all((key === "quotes:all" ? quoteLengthsKey!.split(",").filter(Boolean) : [key.slice(7)]).map(fetchQuotes))).flat()
          : EMPTY_QUOTES;
        const words = isQuote ? EMPTY_WORDS : await fetchWords(key.slice(6));
        if (!cancelled) setDataset({ key, words, quotes, error: !(words.length || quotes.length) });
      } catch {
        if (!cancelled) setDataset({ key, words: [], quotes: [], error: true });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [key, quoteLengthsKey, retryVersion]);
  const current = dataset?.key === key ? dataset : null;
  return { key, wordPool: current?.words ?? EMPTY_WORDS, quotes: current?.quotes ?? EMPTY_QUOTES,
    status: key === "none" ? "ready" as const : !current ? "loading" as const : current.error ? "error" as const : "ready" as const,
    retry: () => { setDataset(null); setRetryVersion((version) => version + 1); },
  };
}

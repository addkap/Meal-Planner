// Searching foods and recipes by name for the food logger. Every word must match; names that start with the
// words, her own and scanned foods, and the friendly recipe-ingredient names rank first.

export interface Searchable { id: string; name: string; boost?: number }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');

export function makeIndex<T extends Searchable>(items: T[]) {
  const rows = items.map((item) => ({ item, text: ` ${norm(item.name).replace(/\s+/g, ' ')} ` }));
  return (query: string, limit = 40): T[] => {
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored: { item: T; score: number }[] = [];
    for (const r of rows) {
      let score = 0;
      let ok = true;
      for (const word of words) {
        // plurals: "eggs" finds "egg", "tomatoes" finds "tomato"
        const w = [word, word.replace(/es$/, ''), word.replace(/s$/, '')].find((v) => v.length >= 2 && r.text.includes(v)) ?? word;
        const at = r.text.indexOf(w);
        if (at < 0) { ok = false; break; }
        if (r.text.indexOf(` ${w}`) >= 0) score += 3; // matches the start of a word
        if (at === 1) score += 4; // the name starts with it
      }
      if (!ok) continue;
      if (words.length > 1 && r.text.includes(` ${words.join(' ')}`)) score += 5; // the words together, in order ("olive oil")
      score += (r.item.boost ?? 0) - r.text.length / 40;
      scored.push({ item: r.item, score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
  };
}

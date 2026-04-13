interface Props {
  genres: string[][]; // array of genre arrays from watch history
}

const GENRE_COLORS: Record<string, string> = {
  Action:          "#E50914",
  Adventure:       "#F5A623",
  Animation:       "#8B5CF6",
  Comedy:          "#F59E0B",
  Crime:           "#991B1B",
  Documentary:     "#64748B",
  Drama:           "#3B82F6",
  Family:          "#22C55E",
  Fantasy:         "#A855F7",
  History:         "#78350F",
  Horror:          "#7F1D1D",
  Music:           "#EC4899",
  Mystery:         "#475569",
  Romance:         "#F472B6",
  "Science Fiction": "#06B6D4",
  "TV Movie":      "#94A3B8",
  Thriller:        "#EF4444",
  War:             "#44403C",
  Western:         "#CA8A04",
};

function colorFor(g: string): string {
  return GENRE_COLORS[g] ?? "#A0A0B0";
}

export default function GenreBreakdown({ genres }: Props) {
  const counts = new Map<string, number>();
  for (const arr of genres) {
    for (const g of arr) counts.set(g, (counts.get(g) ?? 0) + 1);
  }

  const total  = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  if (total === 0) {
    return (
      <div className="text-sm text-[#505060]">
        Mark some movies as watched (click the eye icon) to see your genre breakdown.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stacked proportional bar */}
      <div className="flex w-full h-2 rounded-full overflow-hidden bg-[#1A1A28]">
        {sorted.map(([g, c]) => (
          <div
            key={g}
            title={`${g} · ${c}`}
            style={{ width: `${(c / total) * 100}%`, background: colorFor(g) }}
          />
        ))}
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {sorted.slice(0, 10).map(([g, c]) => (
          <div key={g} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: colorFor(g) }}
            />
            <span className="text-white truncate">{g}</span>
            <span className="ml-auto text-[#505060] font-mono">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

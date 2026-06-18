export const SET_COLORS = [
  { id: "emerald", label: "초록", hex: "#34d399", dot: "bg-emerald-400", border: "border-emerald-400", ring: "ring-emerald-400", cardBg: "bg-emerald-50", cardBorder: "border-emerald-200", accent: "text-emerald-600" },
  { id: "blue",    label: "파랑", hex: "#60a5fa", dot: "bg-blue-400",    border: "border-blue-400",    ring: "ring-blue-400",    cardBg: "bg-blue-50",    cardBorder: "border-blue-200",    accent: "text-blue-600" },
  { id: "violet",  label: "보라", hex: "#a78bfa", dot: "bg-violet-400",  border: "border-violet-400",  ring: "ring-violet-400",  cardBg: "bg-violet-50",  cardBorder: "border-violet-200",  accent: "text-violet-600" },
  { id: "rose",    label: "장미", hex: "#fb7185", dot: "bg-rose-400",    border: "border-rose-400",    ring: "ring-rose-400",    cardBg: "bg-rose-50",    cardBorder: "border-rose-200",    accent: "text-rose-600" },
  { id: "amber",   label: "주황", hex: "#fbbf24", dot: "bg-amber-400",   border: "border-amber-400",   ring: "ring-amber-400",   cardBg: "bg-amber-50",   cardBorder: "border-amber-200",   accent: "text-amber-600" },
  { id: "cyan",    label: "하늘", hex: "#22d3ee", dot: "bg-cyan-400",    border: "border-cyan-400",    ring: "ring-cyan-400",    cardBg: "bg-cyan-50",    cardBorder: "border-cyan-200",    accent: "text-cyan-600" },
  { id: "pink",    label: "핑크", hex: "#f472b6", dot: "bg-pink-400",    border: "border-pink-400",    ring: "ring-pink-400",    cardBg: "bg-pink-50",    cardBorder: "border-pink-200",    accent: "text-pink-600" },
  { id: "slate",   label: "회색", hex: "#94a3b8", dot: "bg-slate-400",   border: "border-slate-400",   ring: "ring-slate-400",   cardBg: "bg-slate-50",   cardBorder: "border-slate-200",   accent: "text-slate-600" },
] as const;

export function getSetColor(colorId: string) {
  return SET_COLORS.find((c) => c.id === colorId) ?? SET_COLORS[0]!;
}

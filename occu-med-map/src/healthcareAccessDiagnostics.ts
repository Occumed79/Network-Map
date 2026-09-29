export const ACCESS_COLORS: Record<number, string> = { 1:"#10b981", 2:"#84cc16", 3:"#f59e0b", 4:"#f97316", 5:"#ef4444" };

export function healthcareAccessStateStyle(score:number|null, enabled:boolean, filter:number|null) {
  if (score === null || !Number.isFinite(score)) return { fillColor:"#0a1830", fillOpacity:0.18, lineOpacity:0.6, lineWidth:1 };
  if (!enabled) return { fillColor:"#11243f", fillOpacity:0.12, lineOpacity:0.8, lineWidth:1 };
  const level=Math.max(1,Math.min(5,Math.round(score)));
  const matches=filter===null||filter===level;
  return { fillColor:ACCESS_COLORS[level], fillOpacity:matches?0.32:0.015, lineOpacity:matches?0.65:0.08, lineWidth:matches?1.2:0.3 };
}

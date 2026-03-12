export const distSq = (v: {x: number, y: number}, w: {x: number, y: number}) => Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);

export const closestPointOnSegment = (p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) => {
  const l2 = distSq(v, w);
  if (l2 === 0) return v;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
};

export function getSplinePoints(pts: {x: number, y: number}[], tension: number, segments: number) {
  if (pts.length < 2) return pts.map(p => ({...p, ratio: 0, segmentIdx: 0}));
  
  if (pts.length === 2) {
    const p0 = pts[0];
    const p3 = pts[1];
    const dx = Math.abs(p3.x - p0.x);
    const offset = Math.max(100, dx * 0.4);
    const p1 = { x: p0.x + offset, y: p0.y };
    const p2 = { x: p3.x - offset, y: p3.y };

    const res = [];
    for (let t = 0; t <= segments; t++) {
      const st = t / segments;
      const mt = 1 - st;
      const x = mt*mt*mt*p0.x + 3*mt*mt*st*p1.x + 3*mt*st*st*p2.x + st*st*st*p3.x;
      const y = mt*mt*mt*p0.y + 3*mt*mt*st*p1.y + 3*mt*st*st*p2.y + st*st*st*p3.y;
      res.push({ x, y, ratio: st, segmentIdx: 0 });
    }
    return res;
  }

  let p = [...pts];
  const extendedP = [p[0], ...p, p[p.length - 1]];
  const res = [];
  const totalPoints = p.length;
  const totalSegments = totalPoints - 1;

  for (let i = 1; i < extendedP.length - 2; i++) {
    const p1 = extendedP[i]; const p2 = extendedP[i + 1];
    const segmentIdx = i - 1;
    for (let t = 0; t <= segments; t++) {
      const st = t / segments;
      const st2 = st * st; const st3 = st2 * st;
      const h1 = 2 * st3 - 3 * st2 + 1; const h2 = -2 * st3 + 3 * st2;
      const h3 = st3 - 2 * st2 + st; const h4 = st3 - st2;
      const t1x = tension * (p2.x - extendedP[i-1].x); const t1y = tension * (p2.y - extendedP[i-1].y);
      const t2x = tension * (extendedP[i+2].x - p1.x); const t2y = tension * (extendedP[i+2].y - p1.y);
      const x = h1 * p1.x + h2 * p2.x + h3 * t1x + h4 * t2x;
      const y = h1 * p1.y + h2 * p2.y + h3 * t1y + h4 * t2y;
      const globalRatio = (segmentIdx + st) / totalSegments;
      res.push({ x, y, ratio: globalRatio, segmentIdx });
    }
  }
  return res;
}

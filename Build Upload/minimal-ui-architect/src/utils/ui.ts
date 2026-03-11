export const getTextShadow = (stroke: number, scale: number) => {
  const effectiveStroke = stroke * Math.pow(scale, 1.5);
  if (effectiveStroke <= 0) return 'none';
  const shadows = [];
  for (let angle = 0; angle < 360; angle += 15) {
    const rad = angle * (Math.PI / 180);
    shadows.push(`${(Math.cos(rad) * effectiveStroke).toFixed(2)}px ${(Math.sin(rad) * effectiveStroke).toFixed(2)}px 0 #000`);
  }
  return shadows.join(', ');
};

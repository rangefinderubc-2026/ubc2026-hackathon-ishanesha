type Props = { glint?: string; size?: number; title?: string };

const FRAME = "#F3EFE4";

// 12 × 5 grid: two 5 × 5 square rings (cols 0–4 and 7–11) plus a bridge (cols 5–6, row 2)
const FRAME_CELLS: [number, number][] = (() => {
  const cells: [number, number][] = [];
  for (const off of [0, 7]) {
    for (let c = 0; c < 5; c++) cells.push([off + c, 0], [off + c, 4]);
    for (let r = 1; r <= 3; r++) cells.push([off, r], [off + 4, r]);
  }
  cells.push([5, 2], [6, 2]);
  return cells;
})();
const GLINT_CELLS: [number, number][] = [[1, 1], [8, 1]];

export default function PixelGlasses({ glint = "#CFB991", size = 28, title = "Rangefinder" }: Props) {
  return (
    <svg
      width={size}
      height={(size * 5) / 12}
      viewBox="0 0 12 5"
      shapeRendering="crispEdges"
      role="img"
      aria-label={title}
      className="shrink-0"
    >
      <title>{title}</title>
      {FRAME_CELLS.map(([x, y]) => (
        <rect key={`f-${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={FRAME} />
      ))}
      {GLINT_CELLS.map(([x, y]) => (
        <rect
          key={`g-${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={glint}
          className="transition-[fill] duration-[400ms] ease-[ease] motion-reduce:transition-none"
        />
      ))}
    </svg>
  );
}

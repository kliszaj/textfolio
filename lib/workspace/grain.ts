// The desk top's wood, shared by the 3D desk (model.ts) and About's shelf
// (AboutShelf), so the two are the same birch.

// The ivory work surface, the birch edge under it, and the plywood
// laminations that show along that edge.
export const DESK_SURFACE = "#eee8d7";
export const DESK_EDGE = "#c7b293";
export const DESK_LAMINATION = "#8b765b";

// The sequence the desk's textures are drawn from: seeded, so the grain is
// the same on every load.
export function seededRandom(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Faint grain running the length of the top: thin wavering lines over a few
// soft bands, drawn on a 2048x1024 canvas (scale the context for another
// size). rand is the caller's, so a model drawing more textures after it
// carries on through the same sequence.
export function drawDeskGrain(ctx: CanvasRenderingContext2D, rand: () => number) {
  ctx.fillStyle = DESK_SURFACE;
  ctx.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(196,170,128,${0.03 + rand() * 0.04})`;
    ctx.lineWidth = 12 + rand() * 36;
    const y = rand() * 1024;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 2048; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.002 + i) * 18);
    ctx.stroke();
  }
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = `rgba(160,128,86,${0.03 + rand() * 0.06})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    const y = rand() * 1024, wave = 4 + rand() * 10, phase = rand() * 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 2048; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.003 + phase) * wave + Math.sin(x * 0.011 + phase * 2) * 2);
    ctx.stroke();
  }
}

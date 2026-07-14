// Renders a crawled trust graph ({ nodes, edges, levels }) onto a <canvas>
// using a simple concentric layout, grouped by BFS hop distance from the
// origin. No physics simulation — deliberately simple and deterministic.

function short(address) {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

export function renderGraph(canvas, { nodes, edges, levels }, origin) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (nodes.length === 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxLevel = Math.max(...levels.values(), 1);
  const ringGap = Math.min(cx, cy) / (maxLevel + 1);

  const byLevel = new Map();
  for (const node of nodes) {
    const lvl = levels.get(node) ?? 0;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(node);
  }

  const pos = new Map();
  for (const [lvl, group] of byLevel) {
    const radius = lvl * ringGap;
    group.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / group.length - Math.PI / 2;
      const x = lvl === 0 ? cx : cx + radius * Math.cos(angle);
      const y = lvl === 0 ? cy : cy + radius * Math.sin(angle);
      pos.set(node, { x, y });
    });
  }

  // Edges
  ctx.strokeStyle = "rgba(120, 130, 150, 0.45)";
  ctx.lineWidth = 1.25;
  for (const [from, to] of edges) {
    const a = pos.get(from);
    const b = pos.get(to);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Nodes
  for (const node of nodes) {
    const p = pos.get(node);
    if (!p) continue;
    const isOrigin = node === origin;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isOrigin ? 9 : 6, 0, Math.PI * 2);
    ctx.fillStyle = isOrigin ? "#6ea8ff" : "#8fd3a0";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#cfd6e4";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(short(node), p.x, p.y + (isOrigin ? 22 : 18));
  }
}

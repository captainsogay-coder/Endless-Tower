/**
 * Uniform grid for fast radius queries. Rebuilt every simulation step; designed
 * to stay cheap with thousands of entities (no per-frame allocation).
 */
export class SpatialHash {
  constructor(width, height, cellSize) {
    this.cell = cellSize;
    this.cols = Math.ceil(width / cellSize) + 2;
    this.rows = Math.ceil(height / cellSize) + 2;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    this.used = [];
  }

  clear() {
    for (let i = 0; i < this.used.length; i++) this.cells[this.used[i]].length = 0;
    this.used.length = 0;
  }

  cellIndex(x, y) {
    let cx = Math.floor(x / this.cell) + 1;
    let cy = Math.floor(y / this.cell) + 1;
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  insert(item) {
    const i = this.cellIndex(item.x, item.y);
    const cell = this.cells[i];
    if (cell.length === 0) this.used.push(i);
    cell.push(item);
  }

  /** Returns the item within radius r (plus item.radius) maximising score(item); null if none. */
  best(x, y, r, score) {
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c) + 1);
    const x1 = Math.min(this.cols - 1, Math.floor((x + r) / c) + 1);
    const y0 = Math.max(0, Math.floor((y - r) / c) + 1);
    const y1 = Math.min(this.rows - 1, Math.floor((y + r) / c) + 1);
    let best = null;
    let bestScore = -Infinity;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        for (let k = 0; k < cell.length; k++) {
          const it = cell[k];
          const dx = it.x - x;
          const dy = it.y - y;
          const rr = r + (it.radius || 0);
          if (dx * dx + dy * dy > rr * rr) continue;
          const s = score(it);
          if (s > bestScore) { bestScore = s; best = it; }
        }
      }
    }
    return best;
  }

  /** Calls fn(item) for every item within radius r. */
  each(x, y, r, fn) {
    const c = this.cell;
    const x0 = Math.max(0, Math.floor((x - r) / c) + 1);
    const x1 = Math.min(this.cols - 1, Math.floor((x + r) / c) + 1);
    const y0 = Math.max(0, Math.floor((y - r) / c) + 1);
    const y1 = Math.min(this.rows - 1, Math.floor((y + r) / c) + 1);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        for (let k = 0; k < cell.length; k++) {
          const it = cell[k];
          const dx = it.x - x;
          const dy = it.y - y;
          const rr = r + (it.radius || 0);
          if (dx * dx + dy * dy <= rr * rr) fn(it);
        }
      }
    }
  }
}

/*
 * board.js — pure match-3 grid logic. No DOM, no sound, no timing.
 *
 * The grid is grid[row][col] = tile, where a tile is { id, kind }.
 * `kind` is an animal id; `id` is unique per tile so the view can follow a
 * tile while it moves. Positions are { r, c } objects.
 */
(function (AL) {
  'use strict';

  AL.BOARD_SIZE = 7;

  let nextTileId = 1;

  function createTile(kind) {
    return { id: nextTileId++, kind: kind };
  }

  function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function shuffleInPlace(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
  }

  class Board {
    /**
     * @param {number}   size  the board is size x size
     * @param {string[]} kinds animal ids allowed on this board
     * @param {(kind: string) => boolean} fits does a kind follow the secret rule?
     * @param {number}   fitShare chance that a new tile is a rule-fitting animal
     */
    constructor(size, kinds, fits, fitShare) {
      this.size = size;
      this.kinds = kinds;
      this.fits = fits;
      this.fitting = kinds.filter(fits);
      this.others = kinds.filter(function (k) { return !fits(k); });
      this.fitShare = fitShare;
      this.grid = [];
    }

    /** A random kind for a new tile, rule-fitting with probability fitShare. */
    randomKind() {
      if (!this.others.length) return randomItem(this.fitting);
      return Math.random() < this.fitShare ? randomItem(this.fitting) : randomItem(this.others);
    }

    static areAdjacent(a, b) {
      return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    }

    inside(pos) {
      return pos.r >= 0 && pos.c >= 0 && pos.r < this.size && pos.c < this.size;
    }

    get(pos) { return this.grid[pos.r][pos.c]; }

    set(pos, tile) { this.grid[pos.r][pos.c] = tile; }

    /** All tiles, row by row. */
    tiles() {
      const all = [];
      this.grid.forEach(function (row) { row.forEach(function (t) { if (t) all.push(t); }); });
      return all;
    }

    // ---------------------------------------------------------------- setup

    /**
     * Fill a fresh board that has no ready-made lines and at least one
     * valid move (a swap that makes a line of rule-fitting animals).
     */
    generate() {
      for (let attempt = 0; attempt < 500; attempt++) {
        this.fillWithoutLines();
        if (!this.hasValidMove()) this.plantValidMove();
        if (this.findLines().length === 0 && this.hasValidMove()) return;
      }
      // Practically unreachable; the reshuffle after each turn is a second safety net.
    }

    fillWithoutLines() {
      this.grid = [];
      for (let r = 0; r < this.size; r++) {
        this.grid.push([]);
        for (let c = 0; c < this.size; c++) {
          let kind = this.randomKind();
          for (let tries = 0; tries < 20 && this.completesLine(r, c, kind); tries++) kind = this.randomKind();
          this.grid[r].push(createTile(kind));
        }
      }
    }

    /** Would `kind` at (r, c) finish a line with the cells already filled to its left or above? */
    completesLine(r, c, kind) {
      const g = this.grid;
      const left = c >= 2 && g[r][c - 1].kind === kind && g[r][c - 2].kind === kind;
      const above = r >= 2 && g[r - 1][c].kind === kind && g[r - 2][c].kind === kind;
      return left || above;
    }

    /**
     * Force a valid move by placing    X X .
     *                                  . . X   (swap the right column → X X X)
     */
    plantValidMove() {
      const fitting = this.fitting, others = this.others;
      if (!fitting.length) return;
      const kind = randomItem(fitting);
      const r = Math.floor(Math.random() * (this.size - 1));
      const c = Math.floor(Math.random() * (this.size - 2));
      this.set({ r: r, c: c }, createTile(kind));
      this.set({ r: r, c: c + 1 }, createTile(kind));
      this.set({ r: r + 1, c: c + 2 }, createTile(kind));
      if (this.get({ r: r, c: c + 2 }).kind === kind && others.length) {
        this.set({ r: r, c: c + 2 }, createTile(randomItem(others)));
      }
    }

    // ---------------------------------------------------------------- lines

    /** Every horizontal and vertical run of 3+ identical animals: [{ kind, cells }]. */
    findLines() {
      const lines = [];
      const n = this.size;
      for (let i = 0; i < n; i++) {
        this.collectRuns(lines, function (k) { return { r: i, c: k }; });  // row i
        this.collectRuns(lines, function (k) { return { r: k, c: i }; });  // column i
      }
      return lines;
    }

    /** Scan one row or column (`at(k)` gives the k-th cell) for runs of 3+. */
    collectRuns(lines, at) {
      let start = 0;
      while (start < this.size) {
        const tile = this.get(at(start));
        let end = start + 1;
        while (tile && end < this.size) {
          const next = this.get(at(end));
          if (!next || next.kind !== tile.kind) break;
          end++;
        }
        if (tile && end - start >= 3) {
          const cells = [];
          for (let k = start; k < end; k++) cells.push(at(k));
          lines.push({ kind: tile.kind, cells: cells });
        }
        start = end;
      }
    }

    /**
     * Lines that contain at least one of the given tile ids. Used so that only
     * lines created by the latest swap / fall count, not old leftover lines.
     */
    linesThrough(tileIds) {
      return this.findLines().filter(function (line) {
        return line.cells.some(function (pos) { return tileIds.has(this.get(pos).id); }, this);
      }, this);
    }

    // ---------------------------------------------------------------- moves

    swap(a, b) {
      const t = this.get(a);
      this.set(a, this.get(b));
      this.set(b, t);
    }

    /** A random valid move { a, b, lines }, or null if there is none. */
    findValidMove() {
      const moves = [];
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          [{ r: r, c: c + 1 }, { r: r + 1, c: c }].forEach(function (b) {
            const a = { r: r, c: c };
            if (!this.inside(b)) return;
            const ta = this.get(a), tb = this.get(b);
            if (ta.kind === tb.kind) return;
            this.swap(a, b);
            const lines = this.linesThrough(new Set([ta.id, tb.id]))
              .filter(function (line) { return this.fits(line.kind); }, this);
            this.swap(a, b);
            if (lines.length) moves.push({ a: a, b: b, lines: lines });
          }, this);
        }
      }
      return moves.length ? randomItem(moves) : null;
    }

    hasValidMove() {
      return this.findValidMove() !== null;
    }

    // ---------------------------------------------------------------- clearing

    removeCells(cells) {
      cells.forEach(function (pos) { this.set(pos, null); }, this);
    }

    /**
     * Let tiles fall into the gaps and drop new tiles in from the top.
     * Returns what moved, for the view to animate:
     *   falls:  [{ tile, r, c, fromR }]  existing tiles that slid down
     *   spawns: [{ tile, r, c, fromR }]  new tiles; fromR is above the board (< 0)
     */
    collapse() {
      const falls = [], spawns = [];
      const n = this.size;
      for (let c = 0; c < n; c++) {
        let write = n - 1;
        for (let r = n - 1; r >= 0; r--) {
          const tile = this.grid[r][c];
          if (!tile) continue;
          if (write !== r) {
            this.grid[write][c] = tile;
            this.grid[r][c] = null;
            falls.push({ tile: tile, r: write, c: c, fromR: r });
          }
          write--;
        }
        const missing = write + 1;
        for (let r = write; r >= 0; r--) {
          const tile = createTile(this.randomKind());
          this.grid[r][c] = tile;
          spawns.push({ tile: tile, r: r, c: c, fromR: r - missing });
        }
      }
      // New tiles aren't on screen yet, so if they would leave no valid move,
      // quietly pick other animals for them. Reshuffles become rare.
      for (let tries = 0; tries < 10 && spawns.length && !this.hasValidMove(); tries++) {
        spawns.forEach(function (s) { s.tile.kind = this.randomKind(); }, this);
      }
      return { falls: falls, spawns: spawns };
    }

    /**
     * Mix the same tiles into a new arrangement with no lines and at least one
     * valid move. If the tiles can't make one, start over with new tiles.
     */
    shuffle() {
      const tiles = this.tiles();
      for (let attempt = 0; attempt < 300; attempt++) {
        shuffleInPlace(tiles);
        for (let i = 0; i < tiles.length; i++) {
          this.grid[Math.floor(i / this.size)][i % this.size] = tiles[i];
        }
        if (this.findLines().length === 0 && this.hasValidMove()) return;
      }
      this.generate();
    }
  }

  AL.Board = Board;
})(window.AL = window.AL || {});

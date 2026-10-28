/*
 * boardView.js — draws the board in the DOM, animates it, and turns taps and
 * swipes into swap requests.
 *
 * Each tile is an absolutely positioned <div class="tile"> moved with
 * transform: translate(col * 100%, row * 100%) (100% = one tile), so CSS
 * transitions do the sliding and falling. The inner .tile-face carries the
 * emoji and the pop / wobble / hint animations.
 *
 * The view asks its `controller` (the current Game) whether input is allowed
 * and calls controller.trySwap(a, b).
 */
(function (AL) {
  'use strict';

  const SWAP_MS = 320;
  const POP_MS = 480;
  const WOBBLE_MS = 750;
  const FALL_BASE_MS = 260;
  const FALL_ROW_MS = 60;   // falling further takes a bit longer
  const SWIPE_FRACTION = 0.35; // of a tile's width

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  class BoardView {
    constructor(el) {
      this.el = el;
      this.size = AL.BOARD_SIZE;
      this.nodes = new Map(); // tile id -> element
      this.controller = null;
      this.selected = null;   // { r, c } chosen by the first tap of tap-tap
      this.drag = null;
      this.bindInput();
    }

    // ---------------------------------------------------------------- drawing

    reset() {
      this.el.innerHTML = '';
      this.nodes.clear();
      this.selected = null;
    }

    updateCellSize() {
      this.el.style.setProperty('--cell', (this.el.clientWidth / this.size) + 'px');
    }

    createNode(tile) {
      const node = document.createElement('div');
      node.className = 'tile';
      const face = document.createElement('span');
      face.className = 'tile-face';
      face.textContent = AL.ANIMALS[tile.kind].emoji;
      node.appendChild(face);
      this.el.appendChild(node);
      this.nodes.set(tile.id, node);
      return node;
    }

    position(node, r, c, ms, delayMs) {
      node.style.transitionDuration = (ms || 0) + 'ms';
      node.style.transitionDelay = (delayMs || 0) + 'ms';
      node.style.transform = 'translate(' + (c * 100) + '%, ' + (r * 100) + '%)';
    }

    /** Force the browser to apply styles now, so the next change animates. */
    flush() {
      void this.el.offsetWidth;
    }

    /** Make the DOM match the board (new tiles appear, missing ones go). */
    render(board, ms) {
      const seen = new Set();
      board.grid.forEach(function (row, r) {
        row.forEach(function (tile, c) {
          seen.add(tile.id);
          const existing = this.nodes.get(tile.id);
          this.position(existing || this.createNode(tile), r, c, existing ? ms : 0);
        }, this);
      }, this);
      this.nodes.forEach(function (node, id) {
        if (!seen.has(id)) { node.remove(); this.nodes.delete(id); }
      }, this);
    }

    // ---------------------------------------------------------------- animations

    /** All animals tumble in from the top at level start. */
    async introDrop(board) {
      const n = this.size;
      const placed = [];
      board.grid.forEach(function (row, r) {
        row.forEach(function (tile, c) {
          const node = this.createNode(tile);
          this.position(node, r - n, c, 0);
          placed.push({ node: node, r: r, c: c });
        }, this);
      }, this);
      this.flush();
      const duration = 650;
      let longest = 0;
      placed.forEach(function (p) {
        // Stagger column by column, bottom row first, like pouring animals in.
        const delay = p.c * 45 + (n - 1 - p.r) * 35;
        longest = Math.max(longest, delay);
        this.position(p.node, p.r, p.c, duration, delay);
      }, this);
      await wait(duration + longest + 50);
      placed.forEach(function (p) { p.node.style.transitionDelay = '0ms'; });
    }

    async moveTiles(list) {
      list.forEach(function (m) {
        const node = this.nodes.get(m.tile.id);
        if (node) this.position(node, m.r, m.c, SWAP_MS);
      }, this);
      await wait(SWAP_MS);
    }

    /** Rule-fitting tiles sparkle and disappear. */
    async sparkle(tiles) {
      tiles.forEach(function (tile) {
        const node = this.nodes.get(tile.id);
        if (!node) return;
        node.classList.add('pop');
        this.burst(node);
      }, this);
      await wait(POP_MS);
      tiles.forEach(function (tile) {
        const node = this.nodes.get(tile.id);
        if (node) node.remove();
        this.nodes.delete(tile.id);
      }, this);
    }

    /** A little ring of sparkles where a tile was. */
    burst(node) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.style.transform = node.style.transform;
      const dist = this.el.clientWidth / this.size * 0.75;
      const glyphs = ['✨', '⭐', '✨', '💛', '✨', '⭐'];
      glyphs.forEach(function (glyph, i) {
        const angle = (i / glyphs.length) * Math.PI * 2 + Math.random() * 0.5;
        const bit = document.createElement('i');
        bit.textContent = glyph;
        bit.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
        bit.style.setProperty('--dy', (Math.sin(angle) * dist) + 'px');
        spark.appendChild(bit);
      });
      this.el.appendChild(spark);
      setTimeout(function () { spark.remove(); }, 800);
    }

    /** Tiles that don't follow the rule shake their heads and stay. */
    async wobble(tiles) {
      const nodes = tiles.map(function (t) { return this.nodes.get(t.id); }, this).filter(Boolean);
      nodes.forEach(function (node) {
        node.classList.remove('wobble');
        void node.offsetWidth; // restart the animation if it is already running
        node.classList.add('wobble');
      });
      await wait(WOBBLE_MS);
      nodes.forEach(function (node) { node.classList.remove('wobble'); });
    }

    async drop(moves) {
      moves.spawns.forEach(function (s) {
        this.position(this.createNode(s.tile), s.fromR, s.c, 0);
      }, this);
      this.flush();
      let longest = 0;
      moves.falls.concat(moves.spawns).forEach(function (m) {
        const node = this.nodes.get(m.tile.id);
        if (!node) return;
        const ms = FALL_BASE_MS + FALL_ROW_MS * (m.r - m.fromR);
        longest = Math.max(longest, ms);
        this.position(node, m.r, m.c, ms);
      }, this);
      await wait(longest + 30);
    }

    /** Spin everything small, rearrange (doShuffle changes the board), spin back. */
    async shuffle(board, doShuffle) {
      this.select(null);
      this.el.classList.add('shuffling');
      await wait(350);
      doShuffle();
      this.render(board, 550);
      await wait(600);
      this.el.classList.remove('shuffling');
      await wait(300);
    }

    showHint(tiles) {
      this.clearHint();
      tiles.forEach(function (tile) {
        const node = this.nodes.get(tile.id);
        if (node) node.classList.add('hint');
      }, this);
    }

    clearHint() {
      this.el.querySelectorAll('.tile.hint').forEach(function (n) { n.classList.remove('hint'); });
    }

    select(pos) {
      this.el.querySelectorAll('.tile.selected').forEach(function (n) { n.classList.remove('selected'); });
      this.selected = pos;
      if (!pos || !this.controller) return;
      const node = this.nodes.get(this.controller.board.get(pos).id);
      if (node) node.classList.add('selected');
    }

    // ---------------------------------------------------------------- input
    // Pointer events cover mouse, touch and pen. Drag past ~1/3 of a tile = swipe;
    // otherwise it is a tap (tap one animal, then a neighbour, to swap).

    ready() {
      return !!this.controller && this.controller.canInteract();
    }

    bindInput() {
      this.el.addEventListener('pointerdown', this.onDown.bind(this));
      this.el.addEventListener('pointermove', this.onMove.bind(this));
      this.el.addEventListener('pointerup', this.onUp.bind(this));
      this.el.addEventListener('pointercancel', function () { this.drag = null; }.bind(this));
    }

    cellAt(e) {
      const rect = this.el.getBoundingClientRect();
      const pos = {
        r: Math.floor((e.clientY - rect.top) / rect.height * this.size),
        c: Math.floor((e.clientX - rect.left) / rect.width * this.size)
      };
      return pos.r >= 0 && pos.c >= 0 && pos.r < this.size && pos.c < this.size ? pos : null;
    }

    onDown(e) {
      if (!this.ready()) return;
      const pos = this.cellAt(e);
      if (!pos) return;
      e.preventDefault();
      this.drag = { start: pos, x: e.clientX, y: e.clientY, id: e.pointerId, swiped: false };
      try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    }

    onMove(e) {
      const d = this.drag;
      if (!d || d.swiped || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      const tilePx = this.el.getBoundingClientRect().width / this.size;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < tilePx * SWIPE_FRACTION) return;
      d.swiped = true;
      const target = Math.abs(dx) > Math.abs(dy)
        ? { r: d.start.r, c: d.start.c + Math.sign(dx) }
        : { r: d.start.r + Math.sign(dy), c: d.start.c };
      this.select(null);
      if (target.r >= 0 && target.c >= 0 && target.r < this.size && target.c < this.size && this.ready()) {
        this.controller.trySwap(d.start, target);
      }
    }

    onUp(e) {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      this.drag = null;
      if (!d.swiped) this.tap(d.start);
    }

    tap(pos) {
      if (!this.ready()) return;
      const sel = this.selected;
      if (sel && sel.r === pos.r && sel.c === pos.c) {
        this.select(null);
      } else if (sel && AL.Board.areAdjacent(sel, pos)) {
        this.select(null);
        this.controller.trySwap(sel, pos);
      } else {
        this.select(pos);
        AL.Sound.play('tap');
      }
    }
  }

  AL.BoardView = BoardView;
})(window.AL = window.AL || {});

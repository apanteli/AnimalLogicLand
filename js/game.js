/*
 * game.js — one play-through of one level: the turn flow
 * (swap → check the secret rule → clear / wobble → cascade), progress,
 * moves, the rule-guess state and the owl hint timer.
 *
 * It owns the Board (pure logic) and drives a BoardView (animations) through
 * async methods, and reports to the screen code through `hooks`:
 *   onUpdate(game)   progress / lightbulb changed
 *   onHint(shown)    the owl should appear / leave
 *   onWin(result)    { stars, bonus, moves }
 */
(function (AL) {
  'use strict';

  const HINT_DELAY_MS = 20000; // owl helps after 20 s without a valid match
  const GUESS_AFTER = 3;       // correct matches before the lightbulb appears
  const GUESS_RETRY_AFTER = 2; // more correct matches after a wrong guess

  /** All distinct cells of several lines (L/T shapes share a corner). */
  function uniqueCells(lines) {
    const seen = new Set();
    const cells = [];
    lines.forEach(function (line) {
      line.cells.forEach(function (pos) {
        const key = pos.r + ',' + pos.c;
        if (!seen.has(key)) { seen.add(key); cells.push(pos); }
      });
    });
    return cells;
  }

  class Game {
    constructor(level, view, hooks) {
      this.level = level;
      this.view = view;
      this.hooks = hooks;
      this.fitsKind = function (kind) { return AL.fitsRule(level.rule, AL.ANIMALS[kind]); };
      this.board = new AL.Board(AL.BOARD_SIZE, level.animals, this.fitsKind, level.fitShare || 0.5);

      this.progress = 0;        // rule-fitting tiles cleared
      this.moves = 0;           // swaps that made a line (fitting or not)
      this.correctMatches = 0;  // rule-fitting lines cleared
      this.guessUnlockAt = GUESS_AFTER;
      this.bonus = false;       // rule guessed correctly

      this.busy = false;        // animating a turn
      this.paused = false;      // a popup is open
      this.over = false;        // level won
      this.destroyed = false;   // player left the level
      this.hintTimer = null;
      this.hintShown = false;
    }

    async start() {
      this.busy = true;
      this.board.generate();
      this.view.controller = this;
      this.view.reset();
      this.emit();
      await this.view.introDrop(this.board);
      if (this.destroyed) return;
      this.busy = false;
      this.resetHintTimer();
    }

    destroy() {
      this.destroyed = true;
      this.over = true;
      clearTimeout(this.hintTimer);
      if (this.view.controller === this) this.view.controller = null;
    }

    canInteract() {
      return !this.busy && !this.paused && !this.over;
    }

    canGuess() {
      return !this.bonus && !this.over && this.correctMatches >= this.guessUnlockAt;
    }

    pause() { this.paused = true; }
    resume() { this.paused = false; }

    emit() {
      if (!this.destroyed) this.hooks.onUpdate(this);
    }

    tilesIn(lines) {
      return uniqueCells(lines).map(function (pos) { return this.board.get(pos); }, this);
    }

    // ---------------------------------------------------------------- a turn

    /** The player swapped the animals at a and b (called by the view). */
    async trySwap(a, b) {
      if (!this.canInteract() || !AL.Board.areAdjacent(a, b)) return;
      this.busy = true;
      this.clearHint();

      const board = this.board, view = this.view;
      const ta = board.get(a), tb = board.get(b);
      board.swap(a, b);
      await view.moveTiles([{ tile: ta, r: b.r, c: b.c }, { tile: tb, r: a.r, c: a.c }]);
      if (this.destroyed) return;

      const lines = board.linesThrough(new Set([ta.id, tb.id]));
      const fit = lines.filter(function (l) { return this.fitsKind(l.kind); }, this);
      const misfit = lines.filter(function (l) { return !this.fitsKind(l.kind); }, this);

      if (fit.length === 0) {
        if (misfit.length) {
          // A real line, but these animals don't follow the rule: wobble, then slide back.
          this.moves++;
          AL.Sound.play('wobble');
          await view.wobble(this.tilesIn(misfit));
        } else {
          AL.Sound.play('nope');
        }
        board.swap(a, b);
        await view.moveTiles([{ tile: ta, r: a.r, c: a.c }, { tile: tb, r: b.r, c: b.c }]);
        if (this.destroyed) return;
        this.busy = false;
        return;
      }

      this.moves++;
      if (misfit.length) view.wobble(this.tilesIn(misfit)); // e.g. a cross-shaped swap
      await this.clearAndCascade(fit);
    }

    /** Clear rule-fitting lines, let tiles fall, and repeat for chain reactions. */
    async clearAndCascade(fitLines) {
      const board = this.board, view = this.view;
      let combo = 0;

      while (fitLines.length) {
        const cells = uniqueCells(fitLines);
        this.correctMatches += fitLines.length;
        this.progress = Math.min(this.level.goal, this.progress + cells.length);

        AL.Sound.play('match', combo);
        await view.sparkle(cells.map(function (pos) { return board.get(pos); }));
        if (this.destroyed) return;
        board.removeCells(cells);
        this.emit();

        const drop = board.collapse();
        await view.drop(drop);
        if (this.destroyed) return;

        // Only lines that include a tile that just moved count as new matches.
        const movedIds = new Set(drop.falls.concat(drop.spawns).map(function (m) { return m.tile.id; }));
        const lines = board.linesThrough(movedIds);
        fitLines = lines.filter(function (l) { return this.fitsKind(l.kind); }, this);
        const misfit = lines.filter(function (l) { return !this.fitsKind(l.kind); }, this);
        if (misfit.length) view.wobble(this.tilesIn(misfit));
        combo++;
      }

      this.resetHintTimer();
      if (this.progress >= this.level.goal) {
        this.finish();
        return;
      }
      if (!board.hasValidMove()) {
        AL.Sound.play('shuffle');
        await view.shuffle(board, function () { board.shuffle(); });
        if (this.destroyed) return;
      }
      this.busy = false;
    }

    finish() {
      this.over = true;
      clearTimeout(this.hintTimer);
      this.clearHint();
      const limits = this.level.stars;
      const stars = this.moves <= limits[0] ? 3 : this.moves <= limits[1] ? 2 : 1;
      this.emit();
      this.hooks.onWin({ stars: stars, bonus: this.bonus, moves: this.moves });
    }

    // ---------------------------------------------------------------- rule guess

    /** Returns true if the picked choice is the secret rule. */
    guess(choice) {
      if (!this.canGuess()) return false;
      if (choice.correct) {
        this.bonus = true;
      } else {
        this.guessUnlockAt = this.correctMatches + GUESS_RETRY_AFTER;
      }
      this.emit();
      return !!choice.correct;
    }

    // ---------------------------------------------------------------- owl hint

    resetHintTimer() {
      clearTimeout(this.hintTimer);
      if (this.over) return;
      this.hintTimer = setTimeout(this.showHint.bind(this), HINT_DELAY_MS);
    }

    showHint() {
      if (this.over) return;
      if (this.busy || this.paused) { this.resetHintTimer(); return; }
      const move = this.board.findValidMove();
      if (move) {
        this.hintShown = true;
        this.view.showHint([this.board.get(move.a), this.board.get(move.b)]);
        this.hooks.onHint(true);
        AL.Sound.play('hoot');
      }
      this.resetHintTimer(); // remind again later if still stuck
    }

    clearHint() {
      if (!this.hintShown) return;
      this.hintShown = false;
      this.view.clearHint();
      this.hooks.onHint(false);
    }
  }

  AL.Game = Game;
})(window.AL = window.AL || {});

/*
 * ui.js — screens and popups: the level map, the game screen chrome
 * (progress bar, lightbulb, owl), the rule-guess popup, the win popup,
 * mute and language toggles, and saving results.
 */
(function (AL) {
  'use strict';

  const MAP_ROW_PX = 120; // vertical space per level node on the map

  function $(id) { return document.getElementById(id); }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  /** Zig-zag spots for n level nodes, level 1 at the bottom (percent units). */
  function mapSpots(n) {
    const spots = [];
    for (let i = 0; i < n; i++) {
      spots.push({
        x: i % 2 === 0 ? 30 : 70,
        y: n === 1 ? 50 : 88 - i * (76 / (n - 1))
      });
    }
    return spots;
  }

  /** A smooth SVG path through the spots (viewBox 0 0 100 100). */
  function pathThrough(points) {
    let d = 'M ' + points[0].x + ' ' + points[0].y;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], midY = (a.y + b.y) / 2;
      d += ' C ' + a.x + ' ' + midY + ', ' + b.x + ' ' + midY + ', ' + b.x + ' ' + b.y;
    }
    return d;
  }

  function starsHtml(record) {
    let html = '<span class="node-stars">';
    for (let i = 0; i < 3; i++) html += '<span class="star' + (i < record.stars ? ' on' : '') + '">★</span>';
    if (record.bonus) html += '<span class="bonus">🌟</span>';
    return html + '</span>';
  }

  const UI = {
    state: null,      // saved progress (see storage.js)
    view: null,       // the shared BoardView
    game: null,       // the Game being played, if any
    levelIndex: 0,
    guessing: false,
    toastTimer: null,

    init: function () {
      this.state = AL.Storage.load();
      AL.Sound.muted = this.state.muted;
      this.view = new AL.BoardView($('board-grid'));

      this.bindButtons();
      this.setLang(this.state.lang);
      this.refreshMuteButtons();

      // Keep the board a square that fits the space left on screen.
      if (window.ResizeObserver) new ResizeObserver(this.fitBoard.bind(this)).observe($('board-wrap'));
      window.addEventListener('resize', this.fitBoard.bind(this));

      // Browsers only start audio after a gesture.
      document.addEventListener('pointerdown', function () { AL.Sound.unlock(); });

      this.showMap();
    },

    bindButtons: function () {
      const self = this;
      document.querySelectorAll('.btn-mute').forEach(function (btn) {
        btn.addEventListener('click', function () { self.toggleMute(); });
      });
      $('btn-lang').addEventListener('click', function () {
        self.setLang(self.state.lang === 'en' ? 'el' : 'en');
        AL.Storage.save(self.state);
        AL.Sound.play('tap');
      });
      $('btn-home').addEventListener('click', function () { AL.Sound.play('tap'); self.showMap(); });
      $('btn-bulb').addEventListener('click', function () { self.openGuess(); });
      $('btn-guess-close').addEventListener('click', function () { self.closeGuess(); });
      $('btn-win-map').addEventListener('click', function () { self.showMap(); });
      $('btn-win-replay').addEventListener('click', function () { self.startLevel(self.levelIndex); });
      $('btn-win-next').addEventListener('click', function () { self.startLevel(self.levelIndex + 1); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !$('modal-guess').classList.contains('hidden')) self.closeGuess();
      });
    },

    showScreen: function (name) {
      ['map', 'game'].forEach(function (n) {
        $('screen-' + n).classList.toggle('hidden', n !== name);
      });
    },

    showModal: function (id) { $(id).classList.remove('hidden'); },
    hideModal: function (id) { $(id).classList.add('hidden'); },

    // ---------------------------------------------------------------- settings

    setLang: function (code) {
      this.state.lang = code;
      AL.I18n.setLang(code);
      $('btn-lang').textContent = code === 'el' ? 'ΕΛ' : 'EN';
      if (!$('screen-map').classList.contains('hidden')) this.renderMap();
    },

    toggleMute: function () {
      this.state.muted = !this.state.muted;
      AL.Sound.muted = this.state.muted;
      AL.Storage.save(this.state);
      this.refreshMuteButtons();
      AL.Sound.play('tap');
    },

    refreshMuteButtons: function () {
      const muted = this.state.muted;
      document.querySelectorAll('.btn-mute').forEach(function (btn) {
        btn.textContent = muted ? '🔇' : '🔊';
        btn.setAttribute('aria-pressed', String(muted));
      });
    },

    // ---------------------------------------------------------------- map

    record: function (level) {
      return this.state.levels[level.id] || { stars: 0, bonus: false };
    },

    totalStars: function () {
      return AL.LEVELS.reduce(function (sum, level) {
        const rec = this.record(level);
        return sum + rec.stars + (rec.bonus ? 1 : 0);
      }.bind(this), 0);
    },

    showMap: function () {
      if (this.game) { this.game.destroy(); this.game = null; }
      this.hideModal('modal-win');
      this.hideModal('modal-guess');
      this.setOwl(false);
      this.showScreen('map');
      this.renderMap();
      // Level 1 is at the bottom; scroll there when the map is taller than the screen.
      const scroller = $('map-scroll');
      scroller.scrollTop = scroller.scrollHeight;
    },

    renderMap: function () {
      const self = this;
      const levels = AL.LEVELS;
      const spots = mapSpots(levels.length);
      $('map').style.minHeight = (levels.length * MAP_ROW_PX) + 'px';
      $('map-road').setAttribute('d', pathThrough(spots));
      $('map-dots').setAttribute('d', pathThrough(spots));

      const holder = $('map-nodes');
      holder.innerHTML = '';
      levels.forEach(function (level, i) {
        const unlocked = i < self.state.unlocked;
        const rec = self.record(level);
        const btn = document.createElement('button');
        btn.className = 'level-node' +
          (unlocked ? '' : ' locked') +
          (unlocked && rec.stars === 0 ? ' current' : '');
        btn.style.left = spots[i].x + '%';
        btn.style.top = spots[i].y + '%';
        btn.innerHTML =
          '<span class="node-icon">' + (unlocked ? level.icon : '🔒') + '</span>' +
          '<span class="node-num">' + (i + 1) + '</span>' +
          (unlocked ? starsHtml(rec) : '');
        btn.setAttribute('aria-label', AL.t('level') + ' ' + (i + 1) + (unlocked ? '' : ', ' + AL.t('locked')));
        btn.addEventListener('click', function () {
          if (unlocked) {
            AL.Sound.play('tap');
            self.startLevel(i);
          } else {
            AL.Sound.play('nope');
            btn.classList.remove('shake');
            void btn.offsetWidth;
            btn.classList.add('shake');
          }
        });
        holder.appendChild(btn);
      });
      $('total-stars').textContent = this.totalStars();
    },

    // ---------------------------------------------------------------- game screen

    startLevel: function (index) {
      if (index >= AL.LEVELS.length) { this.showMap(); return; }
      if (this.game) this.game.destroy();
      this.hideModal('modal-win');
      this.hideModal('modal-guess');
      this.levelIndex = index;
      this.showScreen('game');
      this.setOwl(false);
      this.lastBulbVisible = false;
      this.fitBoard();

      const self = this;
      this.game = new AL.Game(AL.LEVELS[index], this.view, {
        onUpdate: function (game) { self.onUpdate(game); },
        onHint: function (shown) { self.setOwl(shown); },
        onWin: function (result) { self.onWin(result); }
      });
      this.game.start();
    },

    fitBoard: function () {
      const wrap = $('board-wrap');
      const size = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight));
      if (size <= 0) return;
      const board = $('board');
      board.style.width = size + 'px';
      board.style.height = size + 'px';
      this.view.updateCellSize();
    },

    onUpdate: function (game) {
      const pct = Math.round(100 * game.progress / game.level.goal);
      $('progress-fill').style.width = pct + '%';
      $('progress').setAttribute('aria-valuenow', String(pct));
      $('progress').classList.toggle('full', pct >= 100);

      const bulb = $('btn-bulb');
      const canGuess = game.canGuess();
      bulb.classList.toggle('invisible', !canGuess && !game.bonus);
      bulb.classList.toggle('earned', game.bonus);
      bulb.disabled = !canGuess;
      bulb.textContent = game.bonus ? '🌟' : '💡';
      if (canGuess && !this.lastBulbVisible) AL.Sound.play('bulb');
      this.lastBulbVisible = canGuess;
    },

    setOwl: function (shown) {
      $('owl').classList.toggle('show', shown);
    },

    // ---------------------------------------------------------------- rule guess

    openGuess: function () {
      const game = this.game;
      if (!game || !game.canGuess()) return;
      AL.Sound.play('tap');
      game.pause();
      const self = this;
      const box = $('guess-choices');
      box.innerHTML = '';
      shuffled(game.level.choices).forEach(function (choice) {
        const btn = document.createElement('button');
        btn.className = 'choice';
        const pic = document.createElement('span');
        pic.className = 'choice-pic' + (Array.from(choice.pic.replace('\n', '')).length > 3 ? ' long' : '');
        pic.textContent = choice.pic;
        const label = document.createElement('span');
        label.className = 'choice-label';
        label.textContent = AL.I18n.pick(choice.label);
        btn.appendChild(pic);
        btn.appendChild(label);
        btn.addEventListener('click', function () { self.chooseGuess(choice, btn); });
        box.appendChild(btn);
      });
      this.showModal('modal-guess');
    },

    chooseGuess: async function (choice, btn) {
      if (this.guessing || !this.game) return;
      this.guessing = true;
      const right = this.game.guess(choice);
      btn.classList.add(right ? 'right' : 'wrong');
      AL.Sound.play(right ? 'star' : 'softNo');
      this.toast(right ? '🌟 ' + AL.t('bonus') : '🙂 ' + AL.t('tryLater'));
      await wait(1000);
      this.guessing = false;
      this.closeGuess();
    },

    closeGuess: function () {
      this.hideModal('modal-guess');
      if (this.game) this.game.resume();
    },

    // ---------------------------------------------------------------- winning

    saveResult: function (level, result) {
      const rec = this.record(level);
      this.state.levels[level.id] = {
        stars: Math.max(rec.stars, result.stars),
        bonus: rec.bonus || result.bonus
      };
      this.state.unlocked = Math.min(AL.LEVELS.length, Math.max(this.state.unlocked, this.levelIndex + 2));
      AL.Storage.save(this.state);
    },

    onWin: async function (result) {
      const game = this.game;
      const level = game.level;
      this.saveResult(level, result);
      this.hideModal('modal-guess');
      this.setOwl(false);
      await wait(500);
      if (this.game !== game) return; // player already left

      const isLast = this.levelIndex === AL.LEVELS.length - 1;
      const correct = level.choices.filter(function (c) { return c.correct; })[0];
      $('win-burst').textContent = isLast ? '🏆' : '🎉';
      $('win-title').textContent = AL.t(isLast ? 'allDone' : 'great');
      $('win-rule-pic').textContent = correct ? correct.pic : level.icon;
      $('win-rule-text').textContent = AL.I18n.pick(level.ruleText);
      $('btn-win-next').classList.toggle('hidden', isLast);
      const stars = document.querySelectorAll('#win-stars .big-star');
      stars.forEach(function (s) { s.classList.remove('on'); });
      $('win-bonus').classList.add('hidden');

      AL.Sound.play('win');
      this.confetti();
      this.showModal('modal-win');

      // Stars pop in one by one.
      for (let i = 0; i < result.stars; i++) {
        await wait(420);
        if (this.game !== game) return;
        stars[i].classList.add('on');
        AL.Sound.play('star');
      }
      if (result.bonus) {
        await wait(420);
        if (this.game !== game) return;
        $('win-bonus').classList.remove('hidden');
        AL.Sound.play('bulb');
      }
    },

    confetti: function () {
      const layer = $('confetti');
      layer.innerHTML = '';
      const colours = ['#ff7eb6', '#ffd23f', '#7ee081', '#6ec8ff', '#b18cff', '#ff9f43'];
      for (let i = 0; i < 40; i++) {
        const bit = document.createElement('i');
        bit.style.left = (Math.random() * 100) + '%';
        bit.style.background = colours[i % colours.length];
        bit.style.animationDelay = (Math.random() * 0.6) + 's';
        bit.style.animationDuration = (2 + Math.random() * 1.5) + 's';
        bit.style.setProperty('--drift', (Math.random() * 140 - 70) + 'px');
        layer.appendChild(bit);
      }
      setTimeout(function () { layer.innerHTML = ''; }, 4500);
    },

    toast: function (text) {
      const el = $('toast');
      el.textContent = text;
      el.classList.remove('hidden');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 1800);
    }
  };

  AL.UI = UI;
})(window.AL = window.AL || {});

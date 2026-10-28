/*
 * storage.js — saves progress, stars and settings in localStorage.
 * Every access is wrapped in try/catch: private browsing or blocked storage
 * just means progress is not remembered, the game still works.
 *
 * Saved shape:
 *   { lang: 'en', muted: false, unlocked: 1,
 *     levels: { "<levelId>": { stars: 0..3, bonus: true|false } } }
 *
 * `unlocked` + `levels` is the "progress" part that cloud.js also syncs;
 * lang and muted stay per device.
 */
(function (AL) {
  'use strict';

  const KEY = 'animal-logic-land:v1';

  function defaults() {
    const browserLang = (navigator.language || 'en').toLowerCase();
    return {
      lang: browserLang.indexOf('el') === 0 ? 'el' : 'en',
      muted: false,
      unlocked: 1,   // how many levels are open (level 1 always is)
      levels: {}
    };
  }

  AL.Storage = {
    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        const saved = raw ? JSON.parse(raw) : {};
        return this.normalize(Object.assign(defaults(), saved));
      } catch (e) {
        return defaults();
      }
    },

    save: function (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        /* storage unavailable: ignore */
      }
    },

    /** Fix up `unlocked` so it agrees with the finished levels. Mutates and returns `progress`. */
    normalize: function (progress) {
      progress.levels = progress.levels || {};
      // A finished level always unlocks the next one (also covers saves made
      // before more levels were added).
      AL.LEVELS.forEach(function (level, i) {
        const rec = progress.levels[level.id];
        if (rec && rec.stars > 0) progress.unlocked = Math.max(progress.unlocked | 0, i + 2);
      });
      progress.unlocked = Math.max(1, Math.min(AL.LEVELS.length, progress.unlocked | 0));
      return progress;
    },

    /**
     * Combine progress from two devices. Progress only ever grows, so taking
     * the best of each level never loses anything.
     */
    mergeProgress: function (a, b) {
      const levels = {};
      [a.levels || {}, b.levels || {}].forEach(function (source) {
        Object.keys(source).forEach(function (id) {
          const have = levels[id] || { stars: 0, bonus: false };
          const rec = source[id] || {};
          levels[id] = { stars: Math.max(have.stars, rec.stars | 0), bonus: have.bonus || !!rec.bonus };
        });
      });
      return this.normalize({ unlocked: Math.max(a.unlocked | 0, b.unlocked | 0), levels: levels });
    },

    /** Do two progress records hold the same stars and unlocks? */
    sameProgress: function (a, b) {
      if ((a.unlocked | 0) !== (b.unlocked | 0)) return false;
      const la = a.levels || {}, lb = b.levels || {};
      const ids = Object.keys(la).concat(Object.keys(lb));
      return ids.every(function (id) {
        const x = la[id] || {}, y = lb[id] || {};
        return (x.stars | 0) === (y.stars | 0) && !!x.bonus === !!y.bonus;
      });
    }
  };
})(window.AL = window.AL || {});

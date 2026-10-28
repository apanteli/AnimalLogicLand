/*
 * storage.js — saves progress, stars and settings in localStorage.
 * Every access is wrapped in try/catch: private browsing or blocked storage
 * just means progress is not remembered, the game still works.
 *
 * Saved shape:
 *   { lang: 'en', muted: false, unlocked: 1,
 *     levels: { "<levelId>": { stars: 0..3, bonus: true|false } } }
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
        const state = Object.assign(defaults(), saved);
        state.levels = state.levels || {};
        state.unlocked = Math.max(1, Math.min(AL.LEVELS.length, state.unlocked | 0));
        return state;
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
    }
  };
})(window.AL = window.AL || {});

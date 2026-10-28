/*
 * sound.js — tiny synthesized sound effects with the Web Audio API.
 * No audio files needed. Browsers only allow audio after a user gesture,
 * so the AudioContext is created on the first tap (see Sound.unlock).
 */
(function (AL) {
  'use strict';

  let ctx = null;

  /** Play one soft note. `at` is seconds from now. */
  function note(freq, at, dur, opts) {
    opts = opts || {};
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    const vol = opts.vol || 0.15;
    // Quick fade-in and a smooth fade-out avoid clicks.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Frequency `semitones` above `base`. */
  function up(base, semitones) { return base * Math.pow(2, semitones / 12); }

  const EFFECTS = {
    tap: function () { note(660, 0, 0.08, { type: 'triangle', vol: 0.08 }); },

    // A swap that makes no line at all: two soft low blips.
    nope: function () {
      note(300, 0, 0.1, { type: 'triangle', vol: 0.07 });
      note(260, 0.09, 0.12, { type: 'triangle', vol: 0.07 });
    },

    // Rising chime; each chain reaction (combo) starts a little higher.
    match: function (combo) {
      const base = up(523.25, Math.min(combo, 5) * 2);
      [0, 4, 7, 12].forEach(function (st, i) {
        note(up(base, st), i * 0.07, 0.28, { type: 'triangle', vol: 0.12 });
      });
    },

    // Gentle "boing" for animals that don't follow the rule.
    wobble: function () {
      note(240, 0, 0.3, { slideTo: 170, vol: 0.16 });
      note(200, 0.16, 0.3, { slideTo: 150, vol: 0.12 });
    },

    star: function () {
      [0, 7, 12, 19].forEach(function (st, i) {
        note(up(880, st), i * 0.05, 0.25, { vol: 0.08 });
      });
    },

    bulb: function () {
      note(700, 0, 0.15, { vol: 0.08 });
      note(1050, 0.1, 0.25, { vol: 0.08 });
    },

    // Owl: "hoo-hoo".
    hoot: function () {
      note(420, 0, 0.28, { slideTo: 360, vol: 0.14 });
      note(400, 0.38, 0.4, { slideTo: 330, vol: 0.14 });
    },

    softNo: function () {
      note(440, 0, 0.18, { type: 'triangle', vol: 0.08 });
      note(370, 0.16, 0.28, { type: 'triangle', vol: 0.08 });
    },

    shuffle: function () {
      for (let i = 0; i < 6; i++) note(400 + Math.random() * 500, i * 0.06, 0.1, { type: 'triangle', vol: 0.06 });
    },

    // Little fanfare.
    win: function () {
      const tune = [[0, 0], [4, 0.15], [7, 0.3], [12, 0.45], [7, 0.62], [12, 0.78]];
      tune.forEach(function (n) { note(up(523.25, n[0]), n[1], 0.35, { type: 'triangle', vol: 0.13 }); });
      note(up(261.63, 0), 0.78, 0.8, { vol: 0.1 });
      note(up(261.63, 7), 0.78, 0.8, { vol: 0.08 });
    }
  };

  AL.Sound = {
    muted: false,

    /** Create/resume the audio context. Call from a user gesture. */
    unlock: function () {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },

    play: function (name, arg) {
      if (this.muted) return;
      this.unlock();
      if (!ctx || !EFFECTS[name]) return;
      try { EFFECTS[name](arg || 0); } catch (e) { /* never let sound break the game */ }
    }
  };
})(window.AL = window.AL || {});

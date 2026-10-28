/*
 * i18n.js — the few UI labels in English and Greek.
 * Static HTML uses data-i18n="key" (text) and data-i18n-aria="key"
 * (aria-label + tooltip). Level texts are { en, el } objects read with AL.I18n.pick().
 */
(function (AL) {
  'use strict';

  const STRINGS = {
    en: {
      title: 'Animal Logic Land',
      whatsRule: "What's the rule?",
      tryLater: 'Try again later!',
      bonus: 'Bonus star!',
      great: 'Well done!',
      allDone: 'You did them all!',
      ruleWas: 'The secret rule was:',
      level: 'Level',
      locked: 'Locked',
      home: 'Map',
      replay: 'Play again',
      next: 'Next level',
      close: 'Close',
      mute: 'Sound on / off',
      lang: 'Language',
      account: 'Grown-ups: save progress',
      grownUps: 'For grown-ups',
      gateQuestion: 'What is {a} × {b}?',
      gateWrong: 'Not quite. Ask a grown-up!',
      ok: 'OK',
      syncInfo: 'Sign in to keep the stars on all your devices.',
      signIn: 'Sign in with Google',
      signOut: 'Sign out',
      signedInAs: 'Signed in as',
      signInFailed: "Sign-in didn't work. Please try again."
    },
    el: {
      title: 'Η Χώρα των Έξυπνων Ζώων',
      whatsRule: 'Ποιος είναι ο κανόνας;',
      tryLater: 'Δοκίμασε ξανά αργότερα!',
      bonus: 'Αστέρι μπόνους!',
      great: 'Μπράβο!',
      allDone: 'Τα κατάφερες όλα!',
      ruleWas: 'Ο μυστικός κανόνας ήταν:',
      level: 'Επίπεδο',
      locked: 'Κλειδωμένο',
      home: 'Χάρτης',
      replay: 'Ξανά',
      next: 'Επόμενο επίπεδο',
      close: 'Κλείσιμο',
      mute: 'Ήχος ναι / όχι',
      lang: 'Γλώσσα',
      account: 'Για μεγάλους: αποθήκευση προόδου',
      grownUps: 'Για μεγάλους',
      gateQuestion: 'Πόσο κάνει {a} × {b};',
      gateWrong: 'Όχι ακριβώς. Ζήτα βοήθεια από έναν μεγάλο!',
      ok: 'OK',
      syncInfo: 'Συνδεθείτε για να κρατάτε τα αστέρια σε όλες τις συσκευές σας.',
      signIn: 'Σύνδεση με Google',
      signOut: 'Αποσύνδεση',
      signedInAs: 'Λογαριασμός:',
      signInFailed: 'Η σύνδεση δεν πέτυχε. Δοκιμάστε ξανά.'
    }
  };

  let lang = 'en';

  AL.I18n = {
    languages: Object.keys(STRINGS),

    get lang() { return lang; },

    /** Switch language and relabel everything in the page. */
    setLang: function (code) {
      lang = STRINGS[code] ? code : 'en';
      document.documentElement.lang = lang;
      document.title = this.t('title');
      this.apply(document);
    },

    /** A UI label in the current language (falls back to English). */
    t: function (key) {
      return STRINGS[lang][key] || STRINGS.en[key] || key;
    },

    /** Read a { en, el } text object from level data. */
    pick: function (texts) {
      return (texts && (texts[lang] || texts.en)) || '';
    },

    apply: function (root) {
      root.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = AL.I18n.t(el.dataset.i18n);
      });
      root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        const label = AL.I18n.t(el.dataset.i18nAria);
        el.setAttribute('aria-label', label);
        el.title = label;
      });
    }
  };

  AL.t = function (key) { return AL.I18n.t(key); };
})(window.AL = window.AL || {});

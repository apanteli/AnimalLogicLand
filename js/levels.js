/*
 * levels.js — the level list. Each level is plain data, so adding a level is
 * just adding an object to the array (the map grows automatically).
 *
 *   id       unique id, used as the save-game key (never reuse one)
 *   icon     emoji shown on the level map
 *   animals  animal ids (see animals.js) that can appear; 5–6 works best
 *   rule     the secret rule (see AL.fitsRule) — which animals "count"
 *   fitShare (optional, default 0.5) chance that a new tile follows the rule;
 *            higher = easier and fewer "no moves left" reshuffles
 *   goal     how many rule-fitting tiles must be cleared to fill the bar
 *   stars    [maxMovesFor3Stars, maxMovesFor2Stars]; anything more = 1 star.
 *            A "move" is a swap that makes a line (fitting or not).
 *   ruleText the rule in words, shown when the level is won
 *   choices  the 3 picture answers for the "What's the rule?" lightbulb.
 *            Exactly one has `correct: true`. `pic` may contain '\n'.
 */
(function (AL) {
  'use strict';

  AL.LEVELS = [
    {
      id: 1,
      icon: '🐶',
      animals: ['dog', 'cat', 'frog', 'fish'],
      rule: { id: 'dog' },
      fitShare: 0.45,
      goal: 15,
      stars: [7, 11],
      ruleText: { en: 'Only dogs count!', el: 'Μετράνε μόνο τα σκυλάκια!' },
      choices: [
        { pic: '🐶', correct: true, label: { en: 'Only dogs', el: 'Μόνο σκυλάκια' } },
        { pic: '🐱', label: { en: 'Only cats', el: 'Μόνο γατούλες' } },
        { pic: '🐸', label: { en: 'Only frogs', el: 'Μόνο βατραχάκια' } }
      ]
    },
    {
      id: 2,
      icon: '🐟',
      animals: ['fish', 'whale', 'frog', 'dog', 'bird', 'monkey'],
      rule: { habitat: 'water' },
      fitShare: 0.55,
      goal: 18,
      stars: [9, 14],
      ruleText: { en: 'Only animals that live in water!', el: 'Μόνο ζώα που ζουν στο νερό!' },
      choices: [
        { pic: '🌊', correct: true, label: { en: 'Live in water', el: 'Ζουν στο νερό' } },
        { pic: '🌳', label: { en: 'Live on land', el: 'Ζουν στη στεριά' } },
        { pic: '☁️', label: { en: 'Can fly', el: 'Πετάνε' } }
      ]
    },
    {
      id: 3,
      icon: '🐦',
      animals: ['bird', 'eagle', 'bat', 'penguin', 'chick', 'cat'],
      rule: { habitat: 'air' },
      fitShare: 0.55,
      goal: 18,
      stars: [9, 14],
      ruleText: { en: 'Only animals that can fly!', el: 'Μόνο ζώα που πετάνε!' },
      choices: [
        { pic: '☁️', correct: true, label: { en: 'Can fly', el: 'Πετάνε' } },
        { pic: '🐦🐧', label: { en: 'All birds', el: 'Όλα τα πουλιά' } },
        { pic: '🌊', label: { en: 'Live in water', el: 'Ζουν στο νερό' } }
      ]
    },
    {
      id: 4,
      icon: '🐘',
      animals: ['dog', 'elephant', 'frog', 'chick', 'fish', 'bird'],
      rule: { legs: 4 },
      fitShare: 0.55,
      goal: 18,
      stars: [9, 14],
      ruleText: { en: 'Only animals with 4 legs!', el: 'Μόνο ζώα με 4 πόδια!' },
      choices: [
        { pic: '🦵🦵\n🦵🦵', correct: true, label: { en: '4 legs', el: '4 πόδια' } },
        { pic: '🦵🦵', label: { en: '2 legs', el: '2 πόδια' } },
        { pic: '🌳', label: { en: 'Live on land', el: 'Ζουν στη στεριά' } }
      ]
    },
    {
      id: 5,
      icon: '🐭',
      animals: ['rabbit', 'mouse', 'cat', 'elephant', 'fish', 'bird'],
      rule: { habitat: 'land', size: 'small' },
      fitShare: 0.55,
      goal: 18,
      stars: [9, 14],
      ruleText: { en: 'Only small animals that live on land!', el: 'Μόνο μικρά ζώα της στεριάς!' },
      choices: [
        { pic: '🌳🐭', correct: true, label: { en: 'Small, on land', el: 'Μικρά, στη στεριά' } },
        { pic: '🌳🐘', label: { en: 'Big, on land', el: 'Μεγάλα, στη στεριά' } },
        { pic: '🐭🐟🐦', label: { en: 'All small animals', el: 'Όλα τα μικρά ζώα' } }
      ]
    }
  ];

  // Sanity-check the data so mistakes in new levels show up in the console.
  AL.LEVELS.forEach(function (level) {
    const fitting = level.animals.filter(function (id) {
      if (!AL.ANIMALS[id]) { console.warn('Level ' + level.id + ': unknown animal "' + id + '"'); return false; }
      return AL.fitsRule(level.rule, AL.ANIMALS[id]);
    });
    if (fitting.length === 0) console.warn('Level ' + level.id + ': no animal fits the rule');
    if (fitting.length === level.animals.length) console.warn('Level ' + level.id + ': every animal fits the rule');
    if (level.choices.filter(function (c) { return c.correct; }).length !== 1) {
      console.warn('Level ' + level.id + ': needs exactly one correct choice');
    }
  });
})(window.AL = window.AL || {});

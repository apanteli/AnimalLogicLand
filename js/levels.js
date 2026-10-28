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
 *            A choice's optional `rule` is only used by the check at the
 *            bottom of this file: a wrong answer must differ from the real
 *            rule for at least one animal on the board, or nobody could tell.
 */
(function (AL) {
  'use strict';

  /** Ready-made guess pictures, reused across levels. */
  const C = {
    water:    { pic: '🌊', label: { en: 'Live in water', el: 'Ζουν στο νερό' }, rule: { habitat: 'water' } },
    land:     { pic: '🌳', label: { en: 'Live on land', el: 'Ζουν στη στεριά' }, rule: { habitat: 'land' } },
    fly:      { pic: '☁️', label: { en: 'Can fly', el: 'Πετάνε' }, rule: { habitat: 'air' } },
    noFly:    { pic: '🚫☁️', label: { en: "Can't fly", el: 'Δεν πετάνε' }, rule: { not: { habitat: 'air' } } },
    notWater: { pic: '🚫🌊', label: { en: 'Not water animals', el: 'Όχι ζώα του νερού' }, rule: { not: { habitat: 'water' } } },
    legs0:    { pic: '🚫🦵', label: { en: 'No legs', el: 'Χωρίς πόδια' }, rule: { legs: 0 } },
    legs2:    { pic: '🦵🦵', label: { en: '2 legs', el: '2 πόδια' }, rule: { legs: 2 } },
    legs4:    { pic: '🦵🦵\n🦵🦵', label: { en: '4 legs', el: '4 πόδια' }, rule: { legs: 4 } },
    legs6:    { pic: '🦵🦵🦵\n🦵🦵🦵', label: { en: '6 legs', el: '6 πόδια' }, rule: { legs: 6 } },
    big:      { pic: '🐘🐻', label: { en: 'Big animals', el: 'Μεγάλα ζώα' }, rule: { size: 'big' } },
    small:    { pic: '🐭🐰', label: { en: 'Small animals', el: 'Μικρά ζώα' }, rule: { size: 'small' } },
    fur:      { pic: '🧸', label: { en: 'Have fur', el: 'Έχουν γούνα' }, rule: { covering: 'fur' } },
    noFur:    { pic: '🚫🧸', label: { en: 'No fur', el: 'Χωρίς γούνα' }, rule: { not: { covering: 'fur' } } },
    feathers: { pic: '🐦🐧', label: { en: 'Have feathers', el: 'Έχουν πούπουλα' }, rule: { covering: 'feathers' } },
    scales:   { pic: '🐟🐍', label: { en: 'Have scales', el: 'Έχουν λέπια' }, rule: { covering: 'scales' } },
    shell:    { pic: '🐢🐌', label: { en: 'Have a shell', el: 'Έχουν καβούκι' }, rule: { covering: 'shell' } },
    farm:     { pic: '🚜', label: { en: 'Farm animals', el: 'Ζώα της φάρμας' }, rule: { farm: true } },
    notFarm:  { pic: '🚫🚜', label: { en: 'Not farm animals', el: 'Όχι ζώα της φάρμας' }, rule: { farm: false } },
    green:    { pic: '💚', label: { en: 'Green animals', el: 'Πράσινα ζώα' }, rule: { colour: 'green' } },
    yellow:   { pic: '💛', label: { en: 'Yellow animals', el: 'Κίτρινα ζώα' }, rule: { colour: 'yellow' } },
    blue:     { pic: '💙', label: { en: 'Blue animals', el: 'Μπλε ζώα' }, rule: { colour: 'blue' } },
    orange:   { pic: '🧡', label: { en: 'Orange animals', el: 'Πορτοκαλί ζώα' }, rule: { colour: 'orange' } },
    grey:     { pic: '🐘🐭🦈', label: { en: 'Grey animals', el: 'Γκρι ζώα' }, rule: { colour: 'grey' } }
  };

  /** "Only <animal>" picture choice. */
  function only(id, en, el) {
    return { pic: AL.ANIMALS[id].emoji, label: { en: en, el: el }, rule: { id: id } };
  }

  /** A choice of your own. */
  function pick(pic, en, el, rule) {
    return { pic: pic, label: { en: en, el: el }, rule: rule };
  }

  /** Mark a choice as the right answer. */
  function right(choice) {
    return Object.assign({}, choice, { correct: true });
  }

  AL.LEVELS = [
    // ------------------------------------------------ 1–5: first steps
    {
      id: 1, icon: '🐶',
      animals: ['dog', 'cat', 'frog', 'fish'],
      rule: { id: 'dog' },
      fitShare: 0.45, goal: 15, stars: [7, 11],
      ruleText: { en: 'Only dogs count!', el: 'Μετράνε μόνο τα σκυλάκια!' },
      choices: [right(only('dog', 'Only dogs', 'Μόνο σκυλάκια')), only('cat', 'Only cats', 'Μόνο γατούλες'), only('frog', 'Only frogs', 'Μόνο βατραχάκια')]
    },
    {
      id: 2, icon: '🐟',
      animals: ['fish', 'whale', 'frog', 'dog', 'bird', 'monkey'],
      rule: { habitat: 'water' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals that live in water!', el: 'Μόνο ζώα που ζουν στο νερό!' },
      choices: [right(C.water), C.land, C.fly]
    },
    {
      id: 3, icon: '🐦',
      animals: ['bird', 'eagle', 'bat', 'penguin', 'chick', 'cat'],
      rule: { habitat: 'air' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals that can fly!', el: 'Μόνο ζώα που πετάνε!' },
      choices: [right(C.fly), pick('🐦🐧', 'All birds', 'Όλα τα πουλιά', { covering: 'feathers' }), C.water]
    },
    {
      id: 4, icon: '🐘',
      animals: ['dog', 'elephant', 'frog', 'chick', 'fish', 'bird'],
      rule: { legs: 4 },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with 4 legs!', el: 'Μόνο ζώα με 4 πόδια!' },
      choices: [right(C.legs4), C.legs2, C.land]
    },
    {
      id: 5, icon: '🐭',
      animals: ['rabbit', 'mouse', 'cat', 'elephant', 'fish', 'bird'],
      rule: { habitat: 'land', size: 'small' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only small animals that live on land!', el: 'Μόνο μικρά ζώα της στεριάς!' },
      choices: [
        right(pick('🌳🐭', 'Small, on land', 'Μικρά, στη στεριά')),
        pick('🌳🐘', 'Big, on land', 'Μεγάλα, στη στεριά', { habitat: 'land', size: 'big' }),
        pick('🐭🐟🐦', 'All small animals', 'Όλα τα μικρά ζώα', { size: 'small' })
      ]
    },

    // ------------------------------------------------ 6–10: who is it? big or small?
    {
      id: 6, icon: '🐱',
      animals: ['cat', 'dog', 'fox', 'tiger', 'mouse'],
      rule: { id: 'cat' },
      fitShare: 0.45, goal: 15, stars: [7, 11],
      ruleText: { en: 'Only cats count!', el: 'Μετράνε μόνο οι γατούλες!' },
      choices: [right(only('cat', 'Only cats', 'Μόνο γατούλες')), only('fox', 'Only foxes', 'Μόνο αλεπούδες'), C.orange]
    },
    {
      id: 7, icon: '🐸',
      animals: ['frog', 'turtle', 'crocodile', 'fish', 'dog'],
      rule: { id: 'frog' },
      fitShare: 0.45, goal: 15, stars: [7, 11],
      ruleText: { en: 'Only frogs count!', el: 'Μετράνε μόνο τα βατραχάκια!' },
      choices: [right(only('frog', 'Only frogs', 'Μόνο βατραχάκια')), only('turtle', 'Only turtles', 'Μόνο χελώνες'), C.green]
    },
    {
      id: 8, icon: '🐹',
      animals: ['dog', 'cat', 'mouse', 'rabbit', 'fish', 'bird'],
      rule: { id: ['dog', 'cat'] },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Dogs and cats count!', el: 'Μετράνε τα σκυλάκια και οι γατούλες!' },
      choices: [
        right(pick('🐶🐱', 'Dogs and cats', 'Σκυλάκια και γατούλες')),
        only('dog', 'Only dogs', 'Μόνο σκυλάκια'),
        pick('🌳🐭', 'Small, on land', 'Μικρά, στη στεριά', { habitat: 'land', size: 'small' })
      ]
    },
    {
      id: 9, icon: '🐻',
      animals: ['elephant', 'lion', 'bear', 'mouse', 'rabbit', 'cat'],
      rule: { size: 'big' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only big animals!', el: 'Μόνο μεγάλα ζώα!' },
      choices: [right(C.big), C.small, only('lion', 'Only lions', 'Μόνο λιοντάρια')]
    },
    {
      id: 10, icon: '🐰',
      animals: ['mouse', 'rabbit', 'chick', 'elephant', 'giraffe', 'bear'],
      rule: { size: 'small' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only small animals!', el: 'Μόνο μικρά ζώα!' },
      choices: [right(C.small), C.big, C.legs4]
    },

    // ------------------------------------------------ 11–15: fur, feathers, scales, shells, farm
    {
      id: 11, icon: '🐧',
      animals: ['chick', 'penguin', 'bird', 'eagle', 'bat', 'cat'],
      rule: { covering: 'feathers' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with feathers!', el: 'Μόνο ζώα με πούπουλα!' },
      choices: [right(C.feathers), C.fly, C.legs2]
    },
    {
      id: 12, icon: '🦁',
      animals: ['dog', 'cat', 'lion', 'bat', 'chick', 'frog'],
      rule: { covering: 'fur' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with fur!', el: 'Μόνο ζώα με γούνα!' },
      choices: [right(C.fur), C.legs4, C.land]
    },
    {
      id: 13, icon: '🐍',
      animals: ['fish', 'snake', 'crocodile', 'frog', 'dog', 'bird'],
      rule: { covering: 'scales' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with scales!', el: 'Μόνο ζώα με λέπια!' },
      choices: [right(C.scales), C.water, C.legs0]
    },
    {
      id: 14, icon: '🐮',
      animals: ['cow', 'pig', 'horse', 'chick', 'lion', 'elephant'],
      rule: { farm: true },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only farm animals!', el: 'Μόνο ζώα της φάρμας!' },
      choices: [right(C.farm), C.legs4, C.big]
    },
    {
      id: 15, icon: '🐢',
      animals: ['turtle', 'snail', 'crocodile', 'fish', 'frog', 'mouse'],
      rule: { covering: 'shell' },
      fitShare: 0.5, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with a shell!', el: 'Μόνο ζώα με καβούκι!' },
      choices: [right(C.shell), C.green, C.water]
    },

    // ------------------------------------------------ 16–20: legs and homes
    {
      id: 16, icon: '🐌',
      animals: ['fish', 'snake', 'whale', 'snail', 'dog', 'bird'],
      rule: { legs: 0 },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with no legs!', el: 'Μόνο ζώα χωρίς πόδια!' },
      choices: [right(C.legs0), C.water, C.scales]
    },
    {
      id: 17, icon: '🐥',
      animals: ['chick', 'penguin', 'bat', 'dog', 'cat', 'fish'],
      rule: { legs: 2 },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with 2 legs!', el: 'Μόνο ζώα με 2 πόδια!' },
      choices: [right(C.legs2), C.fly, C.feathers]
    },
    {
      id: 18, icon: '🐞',
      animals: ['bee', 'butterfly', 'ladybug', 'bird', 'bat', 'snail'],
      rule: { legs: 6 },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals with 6 legs!', el: 'Μόνο ζώα με 6 πόδια!' },
      choices: [right(C.legs6), C.fly, C.legs2]
    },
    {
      id: 19, icon: '🌳',
      animals: ['dog', 'elephant', 'snake', 'fish', 'bird', 'whale'],
      rule: { habitat: 'land' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only animals that live on land!', el: 'Μόνο ζώα της στεριάς!' },
      choices: [right(C.land), C.legs4, C.water]
    },
    {
      id: 20, icon: '🦒',
      animals: ['giraffe', 'whale', 'eagle', 'mouse', 'bee', 'fish'],
      rule: { size: 'big' },
      fitShare: 0.55, goal: 18, stars: [9, 14],
      ruleText: { en: 'Only big animals — on land, in water and in the sky!', el: 'Μόνο μεγάλα ζώα — στη στεριά, στο νερό και στον ουρανό!' },
      choices: [right(pick('🦒🐳', 'Big animals', 'Μεγάλα ζώα')), C.land, C.small]
    },

    // ------------------------------------------------ 21–25: colours
    {
      id: 21, icon: '💚',
      animals: ['frog', 'snake', 'turtle', 'fish', 'pig', 'mouse'],
      rule: { colour: 'green' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only green animals!', el: 'Μόνο πράσινα ζώα!' },
      choices: [right(C.green), C.water, C.legs4]
    },
    {
      id: 22, icon: '🦈',
      animals: ['elephant', 'mouse', 'shark', 'chick', 'frog', 'lion'],
      rule: { colour: 'grey' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only grey animals!', el: 'Μόνο γκρι ζώα!' },
      choices: [right(C.grey), C.big, C.legs4]
    },
    {
      id: 23, icon: '💛',
      animals: ['chick', 'bee', 'giraffe', 'frog', 'fish', 'pig'],
      rule: { colour: 'yellow' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only yellow animals!', el: 'Μόνο κίτρινα ζώα!' },
      choices: [right(C.yellow), C.fly, pick('🐥🐸', 'Small animals', 'Μικρά ζώα', { size: 'small' })]
    },
    {
      id: 24, icon: '🦋',
      animals: ['fish', 'whale', 'butterfly', 'frog', 'chick', 'pig'],
      rule: { colour: 'blue' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only blue animals!', el: 'Μόνο μπλε ζώα!' },
      choices: [right(C.blue), C.water, C.legs0]
    },
    {
      id: 25, icon: '🐝',
      animals: ['frog', 'turtle', 'chick', 'bee', 'elephant', 'fish'],
      rule: { colour: ['green', 'yellow'] },
      fitShare: 0.6, goal: 21, stars: [10, 15],
      ruleText: { en: 'Green and yellow animals!', el: 'Πράσινα και κίτρινα ζώα!' },
      choices: [right(pick('💚💛', 'Green and yellow', 'Πράσινα και κίτρινα')), C.green, pick('🐥🐸', 'Small animals', 'Μικρά ζώα', { size: 'small' })]
    },

    // ------------------------------------------------ 26–30: everyone except…
    {
      id: 26, icon: '🙀',
      animals: ['cat', 'dog', 'rabbit', 'mouse', 'fox'],
      rule: { not: { id: 'cat' } },
      fitShare: 0.7, goal: 21, stars: [10, 15],
      ruleText: { en: 'Everyone except cats!', el: 'Όλοι εκτός από τις γατούλες!' },
      choices: [
        right(pick('🚫🐱', 'Not cats', 'Όχι γατούλες')),
        only('cat', 'Only cats', 'Μόνο γατούλες'),
        pick('🚫🐶', 'Not dogs', 'Όχι σκυλάκια', { not: { id: 'dog' } })
      ]
    },
    {
      id: 27, icon: '🏖️',
      animals: ['dog', 'bird', 'chick', 'fish', 'whale', 'frog'],
      rule: { not: { habitat: 'water' } },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Everyone except water animals!', el: 'Όλοι εκτός από τα ζώα του νερού!' },
      choices: [right(C.notWater), C.land, pick('🚫🐟', 'Not fish', 'Όχι ψάρια', { not: { id: 'fish' } })]
    },
    {
      id: 28, icon: '🐊',
      animals: ['dog', 'cat', 'rabbit', 'frog', 'chick', 'fish'],
      rule: { not: { covering: 'fur' } },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only animals without fur!', el: 'Μόνο ζώα χωρίς γούνα!' },
      choices: [right(C.noFur), C.fur, C.water]
    },
    {
      id: 29, icon: '🦊',
      animals: ['cow', 'pig', 'chick', 'lion', 'fox', 'eagle'],
      rule: { farm: false },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Everyone except farm animals!', el: 'Όλοι εκτός από τα ζώα της φάρμας!' },
      choices: [right(C.notFarm), C.farm, C.big]
    },
    {
      id: 30, icon: '🐔',
      animals: ['penguin', 'chick', 'dog', 'bird', 'eagle', 'bee'],
      rule: { not: { habitat: 'air' } },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: "Only animals that can't fly!", el: 'Μόνο ζώα που δεν πετάνε!' },
      choices: [right(C.noFly), C.feathers, C.land]
    },

    // ------------------------------------------------ 31–35: two clues at once
    {
      id: 31, icon: '🐝',
      animals: ['bird', 'bee', 'butterfly', 'eagle', 'mouse', 'fish'],
      rule: { habitat: 'air', size: 'small' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only small animals that can fly!', el: 'Μόνο μικρά ζώα που πετάνε!' },
      choices: [right(pick('☁️🐝', 'Small and can fly', 'Μικρά που πετάνε')), C.fly, pick('🐭🐝', 'Small animals', 'Μικρά ζώα', { size: 'small' })]
    },
    {
      id: 32, icon: '🐧',
      animals: ['penguin', 'chick', 'chicken', 'bird', 'eagle', 'cat'],
      rule: { covering: 'feathers', not: { habitat: 'air' } },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: "Only birds that can't fly!", el: 'Μόνο πουλιά που δεν πετάνε!' },
      choices: [right(pick('🐧🐔', "Birds that can't fly", 'Πουλιά που δεν πετάνε')), C.feathers, C.noFly]
    },
    {
      id: 33, icon: '🐍',
      animals: ['snake', 'snail', 'fish', 'whale', 'dog', 'chick'],
      rule: { habitat: 'land', legs: 0 },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only land animals with no legs!', el: 'Μόνο ζώα της στεριάς χωρίς πόδια!' },
      choices: [right(pick('🌳🚫🦵', 'On land, no legs', 'Στη στεριά, χωρίς πόδια')), C.legs0, only('snake', 'Only snakes', 'Μόνο φίδια')]
    },
    {
      id: 34, icon: '🐯',
      animals: ['lion', 'bear', 'tiger', 'mouse', 'rabbit', 'elephant'],
      rule: { covering: 'fur', size: 'big' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only big animals with fur!', el: 'Μόνο μεγάλα ζώα με γούνα!' },
      choices: [right(pick('🧸🐻', 'Big and furry', 'Μεγάλα με γούνα')), C.big, C.fur]
    },
    {
      id: 35, icon: '🐠',
      animals: ['fish', 'frog', 'turtle', 'whale', 'dolphin', 'mouse'],
      rule: { habitat: 'water', size: 'small' },
      fitShare: 0.55, goal: 21, stars: [10, 15],
      ruleText: { en: 'Only small animals that live in water!', el: 'Μόνο μικρά ζώα του νερού!' },
      choices: [right(pick('🌊🐟', 'Small, in water', 'Μικρά, στο νερό')), C.water, pick('🐭🐸', 'Small animals', 'Μικρά ζώα', { size: 'small' })]
    },

    // ------------------------------------------------ 36–40: this OR that
    {
      id: 36, icon: '🐬',
      animals: ['bird', 'bat', 'fish', 'whale', 'dog', 'lion'],
      rule: { habitat: ['air', 'water'] },
      fitShare: 0.6, goal: 24, stars: [11, 17],
      ruleText: { en: 'Animals that fly or live in water!', el: 'Ζώα που πετάνε ή ζουν στο νερό!' },
      choices: [right(pick('☁️🌊', 'Fly or in water', 'Πετάνε ή στο νερό')), C.fly, C.water]
    },
    {
      id: 37, icon: '🐢',
      animals: ['snake', 'fish', 'turtle', 'snail', 'frog', 'mouse'],
      rule: { covering: ['scales', 'shell'] },
      fitShare: 0.6, goal: 24, stars: [11, 17],
      ruleText: { en: 'Animals with scales or a shell!', el: 'Ζώα με λέπια ή καβούκι!' },
      choices: [right(pick('🐟🐢', 'Scales or a shell', 'Λέπια ή καβούκι')), C.scales, C.water]
    },
    {
      id: 38, icon: '🐵',
      animals: ['dog', 'chick', 'bird', 'fish', 'snake', 'bee'],
      rule: { legs: [2, 4] },
      fitShare: 0.6, goal: 24, stars: [11, 17],
      ruleText: { en: 'Animals with 2 or 4 legs!', el: 'Ζώα με 2 ή 4 πόδια!' },
      choices: [right(pick('2️⃣🦵4️⃣', '2 or 4 legs', '2 ή 4 πόδια')), C.legs4, C.legs0]
    },
    {
      id: 39, icon: '🐘',
      animals: ['frog', 'snake', 'elephant', 'mouse', 'chick', 'pig'],
      rule: { colour: ['green', 'grey'] },
      fitShare: 0.6, goal: 24, stars: [11, 17],
      ruleText: { en: 'Green and grey animals!', el: 'Πράσινα και γκρι ζώα!' },
      choices: [right(pick('💚🐘', 'Green or grey', 'Πράσινα ή γκρι')), C.green, pick('🐭🐸', 'Small animals', 'Μικρά ζώα', { size: 'small' })]
    },
    {
      id: 40, icon: '🐭',
      animals: ['dog', 'cat', 'mouse', 'rabbit', 'hamster', 'fox'],
      rule: { id: ['dog', 'cat', 'mouse'] },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Dogs, cats and mice!', el: 'Σκυλάκια, γατούλες και ποντικάκια!' },
      choices: [
        right(pick('🐶🐱🐭', 'Dogs, cats and mice', 'Σκυλάκια, γατούλες, ποντικάκια')),
        pick('🐶🐱', 'Dogs and cats', 'Σκυλάκια και γατούλες', { id: ['dog', 'cat'] }),
        pick('🚫🦊', 'Not foxes', 'Όχι αλεπούδες', { not: { id: 'fox' } })
      ]
    },

    // ------------------------------------------------ 41–45: detective clues
    {
      id: 41, icon: '🐹',
      animals: ['mouse', 'rabbit', 'hamster', 'chick', 'lion', 'fish'],
      rule: { habitat: 'land', size: 'small', covering: 'fur' },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Small furry animals that live on land!', el: 'Μικρά ζώα με γούνα που ζουν στη στεριά!' },
      choices: [
        right(pick('🌳🐭🧸', 'Small, furry, on land', 'Μικρά, με γούνα, στη στεριά')),
        pick('🌳🐭', 'Small, on land', 'Μικρά, στη στεριά', { habitat: 'land', size: 'small' }),
        C.fur
      ]
    },
    {
      id: 42, icon: '🐳',
      animals: ['whale', 'dolphin', 'shark', 'fish', 'elephant', 'crocodile'],
      rule: { size: 'big', legs: 0 },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Only big animals with no legs!', el: 'Μόνο μεγάλα ζώα χωρίς πόδια!' },
      choices: [
        right(pick('🐳🚫🦵', 'Big, no legs', 'Μεγάλα, χωρίς πόδια')),
        pick('🌊🐳', 'Big, in water', 'Μεγάλα, στο νερό', { habitat: 'water', size: 'big' }),
        C.legs0
      ]
    },
    {
      id: 43, icon: '🐔',
      animals: ['chick', 'chicken', 'penguin', 'eagle', 'cow', 'cat'],
      rule: { covering: 'feathers', habitat: 'land' },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Only animals with feathers that live on land!', el: 'Μόνο ζώα με πούπουλα που ζουν στη στεριά!' },
      choices: [right(pick('🌳🐔', 'Feathers, on land', 'Πούπουλα, στη στεριά')), C.feathers, C.farm]
    },
    {
      id: 44, icon: '🐸',
      animals: ['frog', 'whale', 'turtle', 'dolphin', 'fish', 'crocodile'],
      rule: { habitat: 'water', not: { covering: 'scales' } },
      fitShare: 0.6, goal: 24, stars: [11, 17],
      ruleText: { en: 'Water animals without scales!', el: 'Ζώα του νερού χωρίς λέπια!' },
      choices: [
        right(pick('🌊🚫🐟', 'In water, no scales', 'Στο νερό, χωρίς λέπια')),
        C.water,
        pick('🌊🐳', 'Big, in water', 'Μεγάλα, στο νερό', { habitat: 'water', size: 'big' })
      ]
    },
    {
      id: 45, icon: '🐁',
      animals: ['mouse', 'chick', 'fish', 'bird', 'bee', 'elephant'],
      rule: { size: 'small', not: { habitat: 'air' } },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: "Small animals that can't fly!", el: 'Μικρά ζώα που δεν πετάνε!' },
      choices: [right(pick('🐭🚫☁️', "Small, can't fly", 'Μικρά, δεν πετάνε')), pick('🐭🐝', 'Small animals', 'Μικρά ζώα', { size: 'small' }), C.land]
    },

    // ------------------------------------------------ 46–50: master detective
    {
      id: 46, icon: '🐕',
      animals: ['dog', 'cat', 'lion', 'frog', 'crocodile', 'bat'],
      rule: { legs: 4, covering: 'fur' },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Animals with 4 legs and fur!', el: 'Ζώα με 4 πόδια και γούνα!' },
      choices: [right(pick('4️⃣🦵🧸', '4 legs and fur', '4 πόδια και γούνα')), C.legs4, C.fur]
    },
    {
      id: 47, icon: '🦁',
      animals: ['lion', 'giraffe', 'bear', 'elephant', 'shark', 'rabbit'],
      rule: { size: 'big', not: { colour: 'grey' } },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Big animals that are not grey!', el: 'Μεγάλα ζώα που δεν είναι γκρι!' },
      choices: [
        right(pick('🐻🚫🐘', 'Big, not grey', 'Μεγάλα, όχι γκρι')),
        C.big,
        pick('🚫🐘🐭', 'Not grey', 'Όχι γκρι', { not: { colour: 'grey' } })
      ]
    },
    {
      id: 48, icon: '🐶',
      animals: ['dog', 'cat', 'frog', 'chick', 'bird', 'fish'],
      rule: { not: { covering: ['feathers', 'scales'] } },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Everyone except birds and fish!', el: 'Όλοι εκτός από πουλιά και ψάρια!' },
      choices: [
        right(pick('🚫🐦🐟', 'Not birds or fish', 'Όχι πουλιά ή ψάρια')),
        pick('🚫🐦', 'Not birds', 'Όχι πουλιά', { not: { covering: 'feathers' } }),
        C.land
      ]
    },
    {
      id: 49, icon: '🦉',
      animals: ['fish', 'frog', 'whale', 'elephant', 'mouse', 'lion'],
      rule: { any: [{ habitat: 'water', size: 'small' }, { habitat: 'land', size: 'big' }] },
      fitShare: 0.55, goal: 24, stars: [11, 17],
      ruleText: { en: 'Small water animals and big land animals!', el: 'Μικρά ζώα του νερού και μεγάλα ζώα της στεριάς!' },
      choices: [
        right(pick('🐟🐘', 'Small in water, big on land', 'Μικρά στο νερό, μεγάλα στη στεριά')),
        C.water,
        pick('🐘🐳', 'Big animals', 'Μεγάλα ζώα', { size: 'big' })
      ]
    },
    {
      id: 50, icon: '🏆',
      animals: ['dog', 'cat', 'mouse', 'chick', 'elephant', 'frog'],
      rule: { habitat: 'land', size: 'small', legs: 4 },
      fitShare: 0.55, goal: 27, stars: [12, 18],
      ruleText: { en: 'Small land animals with 4 legs!', el: 'Μικρά ζώα της στεριάς με 4 πόδια!' },
      choices: [
        right(pick('🌳🐭4️⃣', 'Small, on land, 4 legs', 'Μικρά, στη στεριά, 4 πόδια')),
        pick('🌳🐭', 'Small, on land', 'Μικρά, στη στεριά', { habitat: 'land', size: 'small' }),
        C.legs4
      ]
    }
  ];

  // Sanity-check the data so mistakes in new levels show up in the console.
  const seenIds = new Set();
  AL.LEVELS.forEach(function (level) {
    const where = 'Level ' + level.id + ': ';
    if (seenIds.has(level.id)) console.warn(where + 'duplicate id');
    seenIds.add(level.id);

    const animals = level.animals.filter(function (id) {
      if (!AL.ANIMALS[id]) console.warn(where + 'unknown animal "' + id + '"');
      return !!AL.ANIMALS[id];
    }).map(function (id) { return AL.ANIMALS[id]; });
    /** Which of this level's animals a rule picks, e.g. "dog,cat". */
    function picks(rule) {
      return animals.filter(function (a) { return AL.fitsRule(rule, a); }).map(function (a) { return a.id; }).join(',');
    }

    const fitting = picks(level.rule);
    if (!fitting) console.warn(where + 'no animal fits the rule');
    if (fitting.split(',').length === animals.length) console.warn(where + 'every animal fits the rule');

    const correct = level.choices.filter(function (c) { return c.correct; });
    if (correct.length !== 1) console.warn(where + 'needs exactly one correct choice');
    level.choices.forEach(function (choice) {
      if (!choice.rule) return;
      const same = picks(choice.rule) === fitting;
      if (choice.correct && !same) console.warn(where + 'correct choice "' + choice.label.en + '" does not match the rule');
      if (!choice.correct && same) console.warn(where + 'wrong choice "' + choice.label.en + '" looks exactly like the rule on this board');
    });
  });
})(window.AL = window.AL || {});

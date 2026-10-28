/*
 * animals.js — every animal that can appear on a board, with the attributes
 * that the secret rules can test.
 *
 *   habitat:  'land' | 'water' | 'air'   ('air' = the animal can fly)
 *   legs:     0 | 2 | 4 | 6
 *   size:     'small' | 'big'
 *   colour:   main colour as kids would name it
 *   covering: 'fur' | 'feathers' | 'scales' | 'skin' | 'shell' | 'other'
 *   farm:     true for farm animals (defaults to false)
 *
 * Some animals are borderline for a child (does a monkey have 2 legs or 4?
 * is a pig "big"?). Levels avoid an animal when its borderline attribute is
 * the one the rule is about.
 *
 * To add an animal: add one line here, then use its id in a level's `animals`.
 *
 * All scripts share one global namespace object, `AL` (Animal Logic), so the
 * game works from a plain file:// double-click as well as from a web server.
 */
(function (AL) {
  'use strict';

  AL.ANIMALS = {
    // land
    dog:       { emoji: '🐶', habitat: 'land',  legs: 4, size: 'small', colour: 'brown',  covering: 'fur' },
    cat:       { emoji: '🐱', habitat: 'land',  legs: 4, size: 'small', colour: 'orange', covering: 'fur' },
    rabbit:    { emoji: '🐰', habitat: 'land',  legs: 4, size: 'small', colour: 'white',  covering: 'fur' },
    mouse:     { emoji: '🐭', habitat: 'land',  legs: 4, size: 'small', colour: 'grey',   covering: 'fur' },
    hamster:   { emoji: '🐹', habitat: 'land',  legs: 4, size: 'small', colour: 'orange', covering: 'fur' },
    fox:       { emoji: '🦊', habitat: 'land',  legs: 4, size: 'small', colour: 'orange', covering: 'fur' },
    monkey:    { emoji: '🐵', habitat: 'land',  legs: 2, size: 'small', colour: 'brown',  covering: 'fur' },
    chick:     { emoji: '🐥', habitat: 'land',  legs: 2, size: 'small', colour: 'yellow', covering: 'feathers', farm: true },
    chicken:   { emoji: '🐔', habitat: 'land',  legs: 2, size: 'small', colour: 'white',  covering: 'feathers', farm: true },
    snake:     { emoji: '🐍', habitat: 'land',  legs: 0, size: 'small', colour: 'green',  covering: 'scales' },
    snail:     { emoji: '🐌', habitat: 'land',  legs: 0, size: 'small', colour: 'brown',  covering: 'shell' },
    elephant:  { emoji: '🐘', habitat: 'land',  legs: 4, size: 'big',   colour: 'grey',   covering: 'skin' },
    lion:      { emoji: '🦁', habitat: 'land',  legs: 4, size: 'big',   colour: 'yellow', covering: 'fur' },
    tiger:     { emoji: '🐯', habitat: 'land',  legs: 4, size: 'big',   colour: 'orange', covering: 'fur' },
    bear:      { emoji: '🐻', habitat: 'land',  legs: 4, size: 'big',   colour: 'brown',  covering: 'fur' },
    giraffe:   { emoji: '🦒', habitat: 'land',  legs: 4, size: 'big',   colour: 'yellow', covering: 'fur' },
    cow:       { emoji: '🐮', habitat: 'land',  legs: 4, size: 'big',   colour: 'white',  covering: 'fur',  farm: true },
    horse:     { emoji: '🐴', habitat: 'land',  legs: 4, size: 'big',   colour: 'brown',  covering: 'fur',  farm: true },
    pig:       { emoji: '🐷', habitat: 'land',  legs: 4, size: 'big',   colour: 'pink',   covering: 'skin', farm: true },
    // water
    frog:      { emoji: '🐸', habitat: 'water', legs: 4, size: 'small', colour: 'green',  covering: 'skin' },
    turtle:    { emoji: '🐢', habitat: 'water', legs: 4, size: 'small', colour: 'green',  covering: 'shell' },
    fish:      { emoji: '🐟', habitat: 'water', legs: 0, size: 'small', colour: 'blue',   covering: 'scales' },
    penguin:   { emoji: '🐧', habitat: 'water', legs: 2, size: 'small', colour: 'black',  covering: 'feathers' },
    crocodile: { emoji: '🐊', habitat: 'water', legs: 4, size: 'big',   colour: 'green',  covering: 'scales' },
    whale:     { emoji: '🐳', habitat: 'water', legs: 0, size: 'big',   colour: 'blue',   covering: 'skin' },
    dolphin:   { emoji: '🐬', habitat: 'water', legs: 0, size: 'big',   colour: 'blue',   covering: 'skin' },
    shark:     { emoji: '🦈', habitat: 'water', legs: 0, size: 'big',   colour: 'grey',   covering: 'skin' },
    // air
    bird:      { emoji: '🐦', habitat: 'air',   legs: 2, size: 'small', colour: 'blue',   covering: 'feathers' },
    bat:       { emoji: '🦇', habitat: 'air',   legs: 2, size: 'small', colour: 'black',  covering: 'fur' },
    bee:       { emoji: '🐝', habitat: 'air',   legs: 6, size: 'small', colour: 'yellow', covering: 'other' },
    butterfly: { emoji: '🦋', habitat: 'air',   legs: 6, size: 'small', colour: 'blue',   covering: 'other' },
    ladybug:   { emoji: '🐞', habitat: 'air',   legs: 6, size: 'small', colour: 'red',    covering: 'other' },
    eagle:     { emoji: '🦅', habitat: 'air',   legs: 2, size: 'big',   colour: 'brown',  covering: 'feathers' }
  };

  // Every animal also knows its own id (so a rule can say { id: 'dog' }),
  // and anything not marked as a farm animal is not one.
  Object.keys(AL.ANIMALS).forEach(function (id) {
    const animal = AL.ANIMALS[id];
    animal.id = id;
    if (animal.farm === undefined) animal.farm = false;
  });

  /**
   * Does an animal follow a rule? A rule lists attribute values that must
   * ALL match:
   *   { habitat: 'land', size: 'small' }      small AND on land
   *   { legs: [2, 4] }                        an array means "any of these"
   *   { not: { id: 'cat' } }                  everyone except cats
   *   { any: [{ id: 'dog' }, { id: 'cat' }] } dogs OR cats
   * `not` and `any` take rules themselves, so they can be combined.
   */
  AL.fitsRule = function (rule, animal) {
    return Object.keys(rule).every(function (key) {
      const wanted = rule[key];
      if (key === 'not') return !AL.fitsRule(wanted, animal);
      if (key === 'any') return wanted.some(function (r) { return AL.fitsRule(r, animal); });
      return Array.isArray(wanted) ? wanted.indexOf(animal[key]) !== -1 : animal[key] === wanted;
    });
  };
})(window.AL = window.AL || {});

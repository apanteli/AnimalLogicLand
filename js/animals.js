/*
 * animals.js — every animal that can appear on a board, with the attributes
 * that the secret rules can test.
 *
 *   habitat: 'land' | 'water' | 'air'   ('air' = the animal can fly)
 *   legs:    0 | 2 | 4
 *   size:    'small' | 'big'
 *   colour:  main colour (not used by the first 5 levels, ready for new rules)
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
    dog:      { emoji: '🐶', habitat: 'land',  legs: 4, size: 'small', colour: 'brown'  },
    cat:      { emoji: '🐱', habitat: 'land',  legs: 4, size: 'small', colour: 'orange' },
    rabbit:   { emoji: '🐰', habitat: 'land',  legs: 4, size: 'small', colour: 'white'  },
    mouse:    { emoji: '🐭', habitat: 'land',  legs: 4, size: 'small', colour: 'grey'   },
    monkey:   { emoji: '🐵', habitat: 'land',  legs: 2, size: 'small', colour: 'brown'  },
    chick:    { emoji: '🐥', habitat: 'land',  legs: 2, size: 'small', colour: 'yellow' },
    elephant: { emoji: '🐘', habitat: 'land',  legs: 4, size: 'big',   colour: 'grey'   },
    lion:     { emoji: '🦁', habitat: 'land',  legs: 4, size: 'big',   colour: 'yellow' },
    // water
    frog:     { emoji: '🐸', habitat: 'water', legs: 4, size: 'small', colour: 'green'  },
    turtle:   { emoji: '🐢', habitat: 'water', legs: 4, size: 'small', colour: 'green'  },
    fish:     { emoji: '🐟', habitat: 'water', legs: 0, size: 'small', colour: 'blue'   },
    whale:    { emoji: '🐳', habitat: 'water', legs: 0, size: 'big',   colour: 'blue'   },
    penguin:  { emoji: '🐧', habitat: 'water', legs: 2, size: 'small', colour: 'black'  },
    // air
    bird:     { emoji: '🐦', habitat: 'air',   legs: 2, size: 'small', colour: 'blue'   },
    eagle:    { emoji: '🦅', habitat: 'air',   legs: 2, size: 'big',   colour: 'brown'  },
    bat:      { emoji: '🦇', habitat: 'air',   legs: 2, size: 'small', colour: 'black'  }
  };

  // Every animal also knows its own id, so a rule can say { id: 'dog' }.
  Object.keys(AL.ANIMALS).forEach(function (id) { AL.ANIMALS[id].id = id; });

  /**
   * Does an animal follow a rule?
   * A rule lists attribute values that must ALL match, e.g.
   *   { habitat: 'land', size: 'small' }
   * A value can also be an array meaning "any of these", e.g. { legs: [2, 4] }.
   */
  AL.fitsRule = function (rule, animal) {
    return Object.keys(rule).every(function (key) {
      const wanted = rule[key];
      return Array.isArray(wanted) ? wanted.indexOf(animal[key]) !== -1 : animal[key] === wanted;
    });
  };
})(window.AL = window.AL || {});

/*
 * firebase-config.js — turns on "parent sign-in" and cloud saves.
 *
 * Leave this as null and the game works exactly as before (progress saved on
 * this device only, no sign-in button, nothing extra downloaded).
 *
 * To turn it on, paste your Firebase web app config (see README → Cloud saves):
 *
 *   AL.FIREBASE_CONFIG = {
 *     apiKey: 'AIza...',
 *     authDomain: 'your-project.firebaseapp.com',
 *     projectId: 'your-project',
 *     appId: '1:1234567890:web:abcdef'
 *   };
 *
 * These values are not secret and are safe to commit: who can read and write
 * what is enforced by the rules in firestore.rules.
 */
(function (AL) {
  'use strict';
  AL.FIREBASE_CONFIG = null;
})(window.AL = window.AL || {});

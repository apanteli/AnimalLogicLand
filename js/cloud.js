/*
 * cloud.js — optional cloud saves: a grown-up signs in with Google and the
 * child's stars follow them to every device.
 *
 * Uses Firebase Authentication + Cloud Firestore. The Firebase SDK is only
 * downloaded when AL.FIREBASE_CONFIG is set (firebase-config.js), so the game
 * stays library-free and offline-capable otherwise.
 *
 * Each signed-in account has one document, players/{uid}:
 *   { unlocked, levels: { "<levelId>": { stars, bonus } }, updatedAt }
 * Writes always merge with what is already there (best result per level),
 * so two devices can never overwrite each other's stars.
 */
(function (AL) {
  'use strict';

  const SDK_URL = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const SDK_FILES = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
  const COLLECTION = 'players';

  let auth = null;
  let db = null;
  let stopListening = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(script);
    });
  }

  AL.Cloud = {
    available: false, // configured and the SDK loaded
    user: null,       // the signed-in Firebase user, or null
    handlers: {},     // { onUser(user), onProgress(progressOrNull) }

    /** Returns true if cloud saves can be used on this page. */
    init: async function (handlers) {
      this.handlers = handlers;
      // Google sign-in needs a real web address (http/https), not file://.
      if (!AL.FIREBASE_CONFIG || location.protocol === 'file:') return false;
      try {
        if (!window.firebase) {
          for (const file of SDK_FILES) await loadScript(SDK_URL + file);
        }
        window.firebase.initializeApp(AL.FIREBASE_CONFIG);
        auth = window.firebase.auth();
        db = window.firebase.firestore();
      } catch (e) {
        console.warn('Cloud saves are not available:', e);
        return false;
      }
      this.available = true;
      auth.onAuthStateChanged(this.setUser.bind(this));
      return true;
    },

    setUser: function (user) {
      if (stopListening) { stopListening(); stopListening = null; }
      this.user = user || null;
      if (this.user) {
        // Live updates: stars won on another device show up here too.
        const self = this;
        stopListening = this.doc().onSnapshot(function (snap) {
          self.handlers.onProgress(snap.exists ? snap.data() : null);
        }, function (err) {
          console.warn('Cloud sync error:', err);
        });
      }
      this.handlers.onUser(this.user);
    },

    doc: function () {
      return db.collection(COLLECTION).doc(this.user.uid);
    },

    signIn: async function () {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
          await auth.signInWithRedirect(provider);
        } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
          throw e;
        }
      }
    },

    signOut: function () {
      return auth.signOut();
    },

    /** Merge this device's progress into the cloud copy. Safe to call often. */
    push: async function (progress) {
      if (!this.user) return;
      const ref = this.doc();
      try {
        await db.runTransaction(async function (tx) {
          const snap = await tx.get(ref);
          const merged = AL.Storage.mergeProgress(snap.exists ? snap.data() : {}, progress);
          merged.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
          tx.set(ref, merged);
        });
      } catch (e) {
        // Offline or similar: local progress is kept, and the next push sends it all again.
        console.warn('Cloud save failed:', e);
      }
    }
  };
})(window.AL = window.AL || {});

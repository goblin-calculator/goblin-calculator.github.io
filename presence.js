const firebaseConfig = {
  apiKey: "AIzaSyAgRUHJbc9qoN7_XbS1keYhaCddpmPDkVg",
  authDomain: "goblin-calculator.firebaseapp.com",
  databaseURL: "https://goblin-calculator-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "goblin-calculator",
  storageBucket: "goblin-calculator.firebasestorage.app",
  messagingSenderId: "286192851220",
  appId: "1:286192851220:web:e85d1e52b8d6d9ab5cca01",
  measurementId: "G-LT7TCPEJF3"
};

(function initPresence() {
  const countEl = document.getElementById("liveUsersCount");
  const badgeEl = document.getElementById("liveUsersBadge");
  const CONNECT_TIMEOUT_MS = 10000;
  const HEARTBEAT_INTERVAL_MS = 30000;
  const RECONCILE_INTERVAL_MS = 60000;
  const STALE_AFTER_MS = 90000;

  function hideBadge() {
    if (badgeEl) badgeEl.style.display = "none";
  }

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE_")) {
    hideBadge();
    console.warn("[presence] Firebase config not set yet — live user count is disabled. " + "See the setup guide to add your config to presence.js.");
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.error("[presence] Firebase failed to initialize:", err);
    hideBadge();
    return;
  }

  const db = firebase.database();
  const presenceRef = db.ref("presence");
  const myPresenceRef = presenceRef.push();
  const connectedRef = db.ref(".info/connected");

  let gotConnection = false;

  const connectTimeoutTimer = setTimeout(() => {
    if (!gotConnection) hideBadge();
  }, CONNECT_TIMEOUT_MS);

  function reconcileStalePresence() {
    if (!gotConnection) return;
    presenceRef.once("value").then(snap => {
      const now = Date.now();
      const staleBefore = now - STALE_AFTER_MS;
      snap.forEach(child => {
        const data = child.val();
        if (child.key === myPresenceRef.key) return;
        if (!data || typeof data.connectedAt !== "number" || data.connectedAt < staleBefore) {
          presenceRef.child(child.key).remove();
        }
      });
    }).catch(() => {});
  }

  connectedRef.on("value", snap => {
    if (snap.val() === true) {
      gotConnection = true;
      clearTimeout(connectTimeoutTimer);
      if (badgeEl) badgeEl.style.display = "";
      myPresenceRef.onDisconnect().remove();
      myPresenceRef.set({ connectedAt: firebase.database.ServerValue.TIMESTAMP });
      reconcileStalePresence();
      setInterval(() => {
        if (gotConnection) {
          myPresenceRef.update({ connectedAt: firebase.database.ServerValue.TIMESTAMP });
        }
      }, HEARTBEAT_INTERVAL_MS);
    }
  });

  presenceRef.on("value", snap => {
    const count = Math.max(0, snap.numChildren());
    if (countEl) {
      countEl.textContent = `${count} Online`;
    }
  }, err => {
    console.error("[presence] read failed:", err);
    hideBadge();
  });

  setInterval(reconcileStalePresence, RECONCILE_INTERVAL_MS);
})();

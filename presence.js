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
  const HEARTBEAT_INTERVAL_MS = 20000;
  const RECONCILE_INTERVAL_MS = 20000;
  const STALE_AFTER_MS = 45000;
  const DISPLAY_REFRESH_MS = 5000;
  const HIDDEN_GRACE_MS = 30000;

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
  let heartbeatTimer = null;
  let displayTimer = null;
  let hiddenRemovalTimer = null;
  let presenceIsSet = false;
  let latestSnapshot = {};

  const connectTimeoutTimer = setTimeout(() => {
    if (!gotConnection) hideBadge();
  }, CONNECT_TIMEOUT_MS);

  function isFresh(data, now) {
    return !!data && typeof data.connectedAt === "number" && now - data.connectedAt <= STALE_AFTER_MS;
  }

  function updateDisplayFromCache() {
    if (!countEl) return;
    const now = Date.now();
    let count = 0;
    Object.keys(latestSnapshot).forEach(key => {
      if (key === myPresenceRef.key) {
        count += 1;
        return;
      }
      if (isFresh(latestSnapshot[key], now)) count += 1;
    });
    countEl.textContent = `${count} Online`;
  }

  function reconcileStalePresence() {
    if (!gotConnection) return;
    presenceRef.once("value").then(snap => {
      const now = Date.now();
      snap.forEach(child => {
        if (child.key === myPresenceRef.key) return;
        const data = child.val();
        if (!isFresh(data, now)) presenceRef.child(child.key).remove();
      });
    }).catch(() => {});
  }

  function writePresence() {
    myPresenceRef.set({ connectedAt: firebase.database.ServerValue.TIMESTAMP });
    presenceIsSet = true;
  }

  function removePresence() {
    if (!presenceIsSet) return;
    myPresenceRef.remove();
    presenceIsSet = false;
  }

  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      if (gotConnection && presenceIsSet) {
        myPresenceRef.update({ connectedAt: firebase.database.ServerValue.TIMESTAMP });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function startDisplayLoop() {
    if (displayTimer) return;
    displayTimer = setInterval(updateDisplayFromCache, DISPLAY_REFRESH_MS);
  }

  connectedRef.on("value", snap => {
    if (snap.val() === true) {
      gotConnection = true;
      clearTimeout(connectTimeoutTimer);
      if (badgeEl) badgeEl.style.display = "";
      myPresenceRef.onDisconnect().remove();
      if (document.visibilityState !== "hidden") writePresence();
      reconcileStalePresence();
      startHeartbeat();
      startDisplayLoop();
    } else {
      gotConnection = false;
      presenceIsSet = false;
    }
  });

  presenceRef.on("value", snap => {
    const next = {};
    snap.forEach(child => {
      next[child.key] = child.val();
    });
    latestSnapshot = next;
    updateDisplayFromCache();
  }, err => {
    console.error("[presence] read failed:", err);
    hideBadge();
  });

  setInterval(reconcileStalePresence, RECONCILE_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (hiddenRemovalTimer) clearTimeout(hiddenRemovalTimer);
      hiddenRemovalTimer = setTimeout(() => {
        removePresence();
      }, HIDDEN_GRACE_MS);
    } else {
      if (hiddenRemovalTimer) {
        clearTimeout(hiddenRemovalTimer);
        hiddenRemovalTimer = null;
      }
      if (gotConnection && !presenceIsSet) writePresence();
    }
  });

  window.addEventListener("pagehide", removePresence);
  window.addEventListener("beforeunload", removePresence);
})();

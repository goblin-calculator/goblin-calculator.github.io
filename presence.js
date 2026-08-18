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
  const RECONCILE_INTERVAL_MS = 300000;
  const RECONCILE_CHANCE = 0.1;

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
  const countRef = db.ref("onlineCount");
  const connectedRef = db.ref(".info/connected");

  let gotConnection = false;

  const connectTimeoutTimer = setTimeout(() => {
    if (!gotConnection) hideBadge();
  }, CONNECT_TIMEOUT_MS);

  connectedRef.on("value", snap => {
    if (snap.val() === true) {
      gotConnection = true;
      clearTimeout(connectTimeoutTimer);
      if (badgeEl) badgeEl.style.display = "";
      myPresenceRef.onDisconnect().remove();
      countRef.onDisconnect().set(firebase.database.ServerValue.increment(-1)).then(() => {
        myPresenceRef.set({ connectedAt: firebase.database.ServerValue.TIMESTAMP });
        countRef.set(firebase.database.ServerValue.increment(1));
      });
    }
  });

  countRef.on("value", snap => {
    const count = Math.max(0, snap.val() || 0);
    if (countEl) {
      countEl.textContent = count === 1 ? "1 user online" : `${count} users online`;
    }
  }, err => {
    console.error("[presence] read failed:", err);
    hideBadge();
  });

  setInterval(() => {
    if (!gotConnection || Math.random() > RECONCILE_CHANCE) return;
    presenceRef.once("value").then(snap => {
      countRef.set(snap.numChildren());
    }).catch(() => {});
  }, RECONCILE_INTERVAL_MS);
})();

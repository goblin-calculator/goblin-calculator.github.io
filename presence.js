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

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE_")) {
    if (badgeEl) badgeEl.style.display = "none";
    console.warn(
      "[presence] Firebase config not set yet — live user count is disabled. " +
      "See the setup guide to add your config to presence.js."
    );
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.error("[presence] Firebase failed to initialize:", err);
    if (badgeEl) badgeEl.style.display = "none";
    return;
  }

  const db = firebase.database();

  const presenceRef = db.ref("presence");
  const myPresenceRef = presenceRef.push();

  const connectedRef = db.ref(".info/connected");

  connectedRef.on("value", (snap) => {
    if (snap.val() === true) {
      myPresenceRef.onDisconnect().remove().then(() => {
        myPresenceRef.set({
          connectedAt: firebase.database.ServerValue.TIMESTAMP,
        });
      });
    }
  });

  presenceRef.on("value", (snap) => {
    const count = snap.numChildren();
    if (countEl) {
      countEl.textContent = count === 1 ? "1 user online" : `${count} users online`;
    }
  });

  window.addEventListener("beforeunload", () => {
    myPresenceRef.remove();
  });
})();

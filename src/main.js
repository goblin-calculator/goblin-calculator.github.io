import { __deferredInitialRenderCallbacks, __set___deferredInitialRenderDone, __set_currentSeason, currentSeason, getRealSeason, previewSeason, runDeferredInitialRender, setPreviewSeason } from './calculator.js';
import { initMainViewRouting, renderSeasonToggle } from './ui.js';
import './prices.js';
import './storage.js';
import './inprogress.js';

(function restoreRedirectedPath() {
  try {
    const redirect = sessionStorage.getItem('gc_redirect_path');
    if (redirect) {
      sessionStorage.removeItem('gc_redirect_path');
      if (redirect !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(null, '', redirect);
      }
    }
  } catch (e) {
    console.error('Redirect restore failed:', e);
  }
})();

setInterval(() => {
  const real = getRealSeason();
  if (real !== currentSeason) {
    const wasFollowingReal = previewSeason === currentSeason;
    __set_currentSeason(real);
    if (wasFollowingReal) {
      setPreviewSeason(currentSeason);
    } else {
      renderSeasonToggle();
    }
  }
}, 6e4);

setTimeout(() => {
  try {
    runDeferredInitialRender();
  } catch (e) {
    console.error("runDeferredInitialRender failed:", e);
  } finally {
    __set___deferredInitialRenderDone(true);
    while (__deferredInitialRenderCallbacks.length) {
      const cb = __deferredInitialRenderCallbacks.shift();
      try {
        cb();
      } catch (e) {
        console.error("Deferred-init callback failed:", e);
      }
    }
    try {
      initMainViewRouting();
    } catch (e) {
      console.error("initMainViewRouting failed:", e);
    }
  }
}, 0);
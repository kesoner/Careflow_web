/* On-demand playback of the original CareFlow concept film. */
(() => {
  'use strict';
  const script = document.currentScript;
  const assetBase = new URL('assets/media/', script?.src || document.baseURI);
  const filmURL = new URL('careflow-emotional.mp4', assetBase).href;
  const posterURL = new URL('careflow-emotional-poster.jpg', assetBase).href;

  function init() {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const dialog = document.createElement('dialog');
    dialog.id = 'film-dialog';
    dialog.className = 'film-dialog';
    dialog.setAttribute('aria-labelledby', 'film-title');
    dialog.setAttribute('data-lenis-prevent', '');
    dialog.dataset.phase = 'closed';
    dialog.innerHTML = `
      <div class="film-window">
        <div class="film-topbar">
          <div><span class="film-badge">45 秒介紹影片</span><h2 id="film-title">CareFlow<span class="film-title-sep">｜</span><span class="film-title-copy">一份安排，一份安心。</span></h2></div>
          <button class="film-close" type="button" aria-label="關閉影片"><span aria-hidden="true">×</span></button>
        </div>
        <video class="film-video" controls playsinline preload="none" aria-label="CareFlow 介紹影片"></video>
        <div class="film-bottom"><p class="film-status" role="status" aria-live="polite"></p><a class="film-direct" target="_blank" rel="noopener">開啟原始影片 <span aria-hidden="true">↗</span></a></div>
      </div>`;
    document.body.append(dialog);

    const windowEl = dialog.querySelector('.film-window');
    const video = dialog.querySelector('video');
    const closeButton = dialog.querySelector('.film-close');
    const status = dialog.querySelector('.film-status');
    video.poster = posterURL;
    dialog.querySelector('.film-direct').href = filmURL;
    let opener = null, animation = null, sequence = 0, requested = false;

    function announceOverlay(phase) {
      document.body.classList.toggle('film-open', dialog.open);
      window.dispatchEvent(new CustomEvent('careflow:overlaychange', {
        detail: {open: dialog.open || Boolean(window.CareFlowSite?.getOverlayState().open), source: 'film', phase}
      }));
    }

    function restoreFocus() {
      if (opener?.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) opener.focus({preventScroll: true});
      else {
        // A play link inside the mobile menu becomes hidden when that menu closes.
        const menu = document.querySelector('.menu-toggle');
        if (menu?.getClientRects().length) menu.focus({preventScroll: true});
      }
    }

    function resetVideo() {
      video.pause();
      try { video.currentTime = 0; } catch (_) { /* Metadata may not have loaded yet. */ }
      video.removeAttribute('src');
      video.load();
      status.textContent = '';
    }

    function finishClose(token) {
      if (token !== sequence || requested) return;
      animation?.cancel(); animation = null;
      resetVideo();
      if (dialog.open) dialog.close();
      dialog.dataset.phase = 'closed';
      announceOverlay('closed');
      restoreFocus();
      window.CareFlowMotion?.refresh();
    }

    function close() {
      if (!dialog.open || dialog.dataset.phase === 'closing') return;
      requested = false;
      const token = ++sequence;
      video.pause();
      try { video.currentTime = 0; } catch (_) { /* An unloaded film has no seekable range. */ }
      animation?.cancel(); animation = null;
      dialog.dataset.phase = 'closing';
      announceOverlay('closing');
      if (reduced.matches || !windowEl.animate) return finishClose(token);
      animation = windowEl.animate([{opacity: 1, transform: 'translateY(0)'}, {opacity: 0, transform: 'translateY(12px)'}], {duration: 180, easing: 'ease-in', fill: 'forwards'});
      animation.finished.then(() => finishClose(token)).catch(() => {});
    }

    async function closeOtherOverlays() {
      const site = window.CareFlowSite;
      if (site?.getOverlayState().dialog.phase !== 'closed') await site?.closePanel(false);
      if (!site || site.getOverlayState().menu.phase === 'closed') return;
      await new Promise(resolve => {
        const onChange = event => {
          if (event.detail?.source !== 'menu' || event.detail.phase !== 'closed') return;
          window.removeEventListener('careflow:overlaychange', onChange); resolve();
        };
        window.addEventListener('careflow:overlaychange', onChange);
        const menu = document.querySelector('.menu-toggle');
        if (menu?.getAttribute('aria-expanded') === 'true') menu.click();
      });
    }

    function show(trigger) {
      if (!requested) return;
      const token = ++sequence;
      animation?.cancel(); animation = null;
      if (!dialog.open) {
        opener = trigger || document.activeElement;
        dialog.showModal();
      }
      dialog.dataset.phase = 'open';
      status.textContent = '影片載入中…';
      announceOverlay('open');
      closeButton.focus({preventScroll: true});
      if (!reduced.matches && windowEl.animate) {
        animation = windowEl.animate([{opacity: 0, transform: 'translateY(18px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 280, easing: 'cubic-bezier(.19,1,.22,1)'});
      }
      if (!video.getAttribute('src')) video.src = filmURL;
      video.muted = false;
      // Invoked from a deliberate play button; no autoplay or media request on page load.
      video.play().catch(() => {
        if (token === sequence && requested && !video.error) status.textContent = '按下影片的播放鍵開始。';
      });
    }

    function open(trigger) {
      requested = true;
      if (dialog.open && dialog.dataset.phase !== 'closing') return;
      if (window.CareFlowSite?.getOverlayState().open) closeOtherOverlays().then(() => show(trigger));
      else show(trigger);
    }

    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-play-film]');
      if (!trigger) return;
      event.preventDefault(); open(trigger);
    });
    closeButton.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => {
      if (dialog.open || dialog.dataset.phase === 'closed') return;
      requested = false; sequence++; animation?.cancel(); animation = null;
      resetVideo(); dialog.dataset.phase = 'closed'; announceOverlay('closed'); restoreFocus();
    });
    video.addEventListener('playing', () => { status.textContent = ''; });
    video.addEventListener('canplay', () => { if (!video.paused) status.textContent = ''; });
    video.addEventListener('waiting', () => { if (requested) status.textContent = '影片載入中…'; });
    video.addEventListener('error', () => { if (requested) status.textContent = '影片暫時無法載入，請開啟原始影片。'; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
    window.CareFlowFilm = {open, close, getState: () => ({open: dialog.open, phase: dialog.dataset.phase, paused: video.paused, currentTime: video.currentTime, hasSource: Boolean(video.getAttribute('src'))})};
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true}); else init();
})();

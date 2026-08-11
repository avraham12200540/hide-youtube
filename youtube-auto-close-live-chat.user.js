// ==UserScript==
// @name         YouTube Auto Close Live Chat
// @namespace    local.youtube.auto-close-chat
// @version      1.0.0
// @description  Automatically closes YouTube live chat and live chat replay panels.
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const TAG = '[YouTube Auto Close Chat]';
  const CHAT_SELECTOR = 'ytd-live-chat-frame';
  const FALLBACK_ATTR = 'data-auto-chat-hidden';
  let scheduled = false;

  function isRelevantPage() {
    return location.pathname === '/watch' || location.pathname.startsWith('/live/');
  }

  function isAlreadyClosed(frame) {
    if (!frame || !frame.isConnected) return true;

    if (
      frame.hasAttribute('collapsed') ||
      frame.getAttribute('collapsed') === 'true' ||
      frame.hasAttribute('hidden') ||
      frame.hasAttribute(FALLBACK_ATTR)
    ) {
      return true;
    }

    const style = getComputedStyle(frame);
    return style.display === 'none' || style.visibility === 'hidden';
  }

  function getHideButton(frame) {
    const toggleArea = frame.querySelector('#show-hide-button');
    if (toggleArea) {
      return (
        toggleArea.querySelector('button') ||
        toggleArea.querySelector('[role="button"]') ||
        toggleArea
      );
    }

    const candidates = frame.querySelectorAll('button, [role="button"]');
    for (const candidate of candidates) {
      const label = `${candidate.getAttribute('aria-label') || ''} ${candidate.textContent || ''}`
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (
        /hide chat|close chat|hide live chat|close live chat/.test(label) ||
        /הסתר.*צ.?אט|סגור.*צ.?אט|הסתרת.*צ.?אט/.test(label)
      ) {
        return candidate;
      }
    }

    return null;
  }

  function fallbackHide(frame) {
    if (!frame || !frame.isConnected || isAlreadyClosed(frame)) return;
    frame.setAttribute(FALLBACK_ATTR, 'true');
    frame.style.setProperty('display', 'none', 'important');
    console.debug(TAG, 'Chat panel hidden with fallback.');
  }

  function closeChat() {
    scheduled = false;
    if (!isRelevantPage()) return;

    const frame = document.querySelector(CHAT_SELECTOR);
    if (!frame || isAlreadyClosed(frame)) return;

    const button = getHideButton(frame);
    if (button) {
      button.click();
      console.debug(TAG, 'Chat close toggle clicked.');

      setTimeout(() => {
        if (!frame.isConnected || isAlreadyClosed(frame)) return;

        const retryButton = getHideButton(frame);
        if (retryButton && retryButton !== button) {
          retryButton.click();
        }

        setTimeout(() => fallbackHide(frame), 350);
      }, 350);
      return;
    }

    setTimeout(() => {
      if (!frame.isConnected || isAlreadyClosed(frame)) return;
      const lateButton = getHideButton(frame);
      if (lateButton) {
        lateButton.click();
      } else {
        fallbackHide(frame);
      }
    }, 500);
  }

  function scheduleClose() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(closeChat);
  }

  const observer = new MutationObserver(scheduleClose);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['collapsed', 'hidden']
  });

  document.addEventListener('yt-navigate-finish', scheduleClose, true);
  window.addEventListener('popstate', scheduleClose, true);
  setInterval(scheduleClose, 2000);
  scheduleClose();
})();

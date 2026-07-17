/**
 * Cats & Rats — background (cleanroom)
 * Ensures toolbar popup is always set (Zen/Firefox + Chromium).
 */

const POPUP = "popup.html";

function wireAction() {
  try {
    chrome.action.setPopup({ popup: POPUP });
  } catch (_) {}
  try {
    chrome.action.setTitle({ title: "Cats & Rats" });
  } catch (_) {}
  try {
    if (chrome.action.setIcon) {
      chrome.action.setIcon({
        path: {
          16: "icons/icon16.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png",
        },
      });
    }
  } catch (_) {}
}

function wireSidebar() {
  try {
    if (chrome.sidebarAction && chrome.sidebarAction.setPanel) {
      chrome.sidebarAction.setPanel({ panel: POPUP });
    }
  } catch (_) {}
  try {
    if (chrome.sidebarAction && chrome.sidebarAction.setTitle) {
      chrome.sidebarAction.setTitle({ title: "Cats & Rats" });
    }
  } catch (_) {}
}

wireAction();
wireSidebar();

chrome.runtime.onInstalled.addListener((details) => {
  wireAction();
  wireSidebar();
  // Nudge: open popup help page on first install is optional — skip for clean UX
  if (details.reason === "install") {
    console.log("Cats & Rats installed — pin the toolbar icon if it is not visible.");
  }
});

chrome.runtime.onStartup.addListener(() => {
  wireAction();
  wireSidebar();
});

// If something cleared the popup, restore it on click fallback
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(() => {
    wireAction();
    try {
      if (chrome.sidebarAction && chrome.sidebarAction.open) {
        chrome.sidebarAction.open();
      }
    } catch (_) {}
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ping") {
    sendResponse({ ok: true });
    return false;
  }
  return false;
});

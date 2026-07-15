// ========================================================
// Colorizer JSON Creator — Popup Connector
// Handles launching the full-screen editor in a new tab
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const btnLaunch = document.getElementById('btn-launch-creator');
  if (btnLaunch) {
    btnLaunch.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('modules/colorizer-creator/colorizer-creator.html') });
      } else {
        // Fallback for direct browser testing
        window.open('colorizer-creator.html', '_blank');
      }
    });
  }
});

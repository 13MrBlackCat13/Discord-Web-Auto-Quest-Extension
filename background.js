chrome.runtime.onInstalled.addListener(() => {
  console.info('Discord Auto Quest extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVersion') {
    const manifest = chrome.runtime.getManifest();
    sendResponse({ version: manifest.version });
    return false;
  } else if (request.action === 'executeQuestCode') {
    if (sender.tab && sender.tab.id) {
      const manifest = chrome.runtime.getManifest();
      const delayConfig = request.delayConfig || { enabled: true, min: 10, max: 30 };
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        func: (version, delay) => {
          window.__QUEST_VERSION = version;
          window.__QUEST_DELAY_CONFIG = delay;
        },
        args: [manifest.version, delayConfig],
        world: 'MAIN'
      }).then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          files: ['quest-code.js'],
          world: 'MAIN'
        });
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('Error injecting quest code:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    } else {
      sendResponse({ success: false, error: 'No tab ID found' });
      return false;
    }
  }
});

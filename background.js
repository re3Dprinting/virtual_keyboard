// background.js (MV3 service worker)
chrome.runtime.onInstalled.addListener(async () => {
  const { openedFirstTime } = await chrome.storage.local.get('openedFirstTime');
  if (openedFirstTime == null) {
    await chrome.storage.local.set({ openedFirstTime: true });
  }
});


// ---------- helpers ----------
const storageGet = (keys) =>
  new Promise((res) => chrome.storage.local.get(keys, (v) => res(v)));

const storageSet = (obj) =>
  new Promise((res) => chrome.storage.local.set(obj, () => res()));

const getActiveTabId = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
};

const sendToActiveTab = async (msg) => {
  const tabId = await getActiveTabId();
  if (tabId) {
    try { await chrome.tabs.sendMessage(tabId, msg); } catch (e) { /* ignore */ }
  }
};

// ---------- icon handling (MV3 uses chrome.action) ----------
async function vkeyboard_loadPageIcon(tabId) {
  const { keyboardEnabled } = await storageGet(['keyboardEnabled']);
  let path = 'buttons/keyboard_3.png';
  if (keyboardEnabled === 'demand') path = 'buttons/keyboard_2.png';
  else if (keyboardEnabled !== 'false') path = 'buttons/keyboard_1.png';

  try { await chrome.action.setIcon({ tabId, path }); } catch (e) { /* ignore */ }
}

// Enable/disable the Action (since MV3 can’t hide like pageAction did)
async function setActionEnabled(tabId, enabled) {
  try {
    if (enabled) await chrome.action.enable(tabId);
    else await chrome.action.disable(tabId);
  } catch (e) { /* ignore */ }
}

// ---------- message router (MV3 uses runtime.onMessage) ----------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request?.method) {
      case 'getLocalStorage': {
        const v = await storageGet([request.key]);
        sendResponse({ data: v[request.key] });
        break;
      }

      case 'getSmallKeyboardCoords': {
        const keys = [
          'smallKeyboard', 'smallKeyboardTop', 'smallKeyboardBottom',
          'smallKeyboardRight', 'smallKeyboardLeft'
        ];
        const v = await storageGet(keys);
        sendResponse({
          smallKeyboard: v.smallKeyboard,
          smallKeyboardTop: v.smallKeyboardTop,
          smallKeyboardBottom: v.smallKeyboardBottom,
          smallKeyboardRight: v.smallKeyboardRight,
          smallKeyboardLeft: v.smallKeyboardLeft
        });
        break;
      }

      case 'loadKeyboardSettings': {
        const keys = [
          'openedFirstTime','capsLock','smallKeyboard','touchEvents',
          'keyboardLayout1','urlButton','keyboardEnabled'
        ];
        const v = await storageGet(keys);
        sendResponse({
          openedFirstTime: v.openedFirstTime,
          capsLock: v.capsLock,
          smallKeyboard: v.smallKeyboard,
          touchEvents: v.touchEvents,
          keyboardLayout1: v.keyboardLayout1,
          urlButton: v.urlButton,
          keyboardEnabled: v.keyboardEnabled
        });
        break;
      }

      case 'initLoadKeyboardSettings': {
        const keys = [
          'hardwareAcceleration','zoomLevel','autoTrigger','repeatLetters',
          'intelligentScroll','autoTriggerLinks','autoTriggerAfter'
        ];
        const v = await storageGet(keys);
        sendResponse({
          hardwareAcceleration: v.hardwareAcceleration,
          zoomLevel: v.zoomLevel,
          autoTrigger: v.autoTrigger,
          repeatLetters: v.repeatLetters,
          intelligentScroll: v.intelligentScroll,
          autoTriggerLinks: v.autoTriggerLinks,
          autoTriggerAfter: v.autoTriggerAfter
        });
        break;
      }

      case 'setLocalStorage': {
        await storageSet({ [request.key]: request.value });
        sendResponse({ data: 'ok' });
        break;
      }

      case 'openFromIframe':
      case 'clickFromIframe': {
        await sendToActiveTab(request);
        // no explicit response needed
        sendResponse({});
        break;
      }

      case 'toogleKeyboard': {
        const { keyboardEnabled } = await storageGet(['keyboardEnabled']);
        const next =
          keyboardEnabled !== 'false' ? 'false' : 'true';
        await storageSet({ keyboardEnabled: next });

        const tabId = await getActiveTabId();
        if (tabId != null) {
          await vkeyboard_loadPageIcon(tabId);
          await chrome.tabs.sendMessage(
            tabId,
            next === 'false' ? 'closeKeyboard' : 'openKeyboard'
          );
        }
        sendResponse({ data: 'ok' });
        break;
      }

      case 'toogleKeyboardOn': {
        await storageSet({ keyboardEnabled: 'true' });
        const tabId = await getActiveTabId();
        if (tabId != null) {
          await vkeyboard_loadPageIcon(tabId);
          await chrome.tabs.sendMessage(tabId, 'openKeyboard');
        }
        sendResponse({ data: 'ok' });
        break;
      }

      case 'toogleKeyboardDemand': {
        await storageSet({ keyboardEnabled: 'demand' });
        const tabId = await getActiveTabId();
        if (tabId != null) {
          await vkeyboard_loadPageIcon(tabId);
          await chrome.tabs.sendMessage(tabId, 'openKeyboard');
        }
        sendResponse({ data: 'ok' });
        break;
      }

      case 'toogleKeyboardOff': {
        await storageSet({ keyboardEnabled: 'false' });
        const tabId = await getActiveTabId();
        if (tabId != null) {
          await vkeyboard_loadPageIcon(tabId);
          await chrome.tabs.sendMessage(tabId, 'closeKeyboard');
        }
        sendResponse({ data: 'ok' });
        break;
      }

      case 'openUrlBar': {
        await sendToActiveTab('openUrlBar');
        sendResponse({ data: 'ok' });
        break;
      }

      case 'createTab': {
        const url = request.url || '';
        if (url.includes('options.html')) { sendResponse({ blocked: true }); break; }
        if (url) await chrome.tabs.create({ url });
        sendResponse({});
        break;
      }


      default:
        sendResponse({});
    }
  })();

  // Keep the message channel open for async replies
  return true;
});

// ---------- tab updates ----------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const { toogleKeyboard } = await storageGet(['toogleKeyboard']); // note: original typo preserved
  if (toogleKeyboard !== 'false') {
    await setActionEnabled(tabId, true);
    await vkeyboard_loadPageIcon(tabId);
  } else {
    await storageSet({ keyboardEnabled: 'true' });
    await setActionEnabled(tabId, false);
  }
});

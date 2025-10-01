document.addEventListener('DOMContentLoaded', () => {
  const byId = (id) => document.getElementById(id);

  const ask = (msg) => chrome.runtime.sendMessage(msg, () => { /* ignore */ });

  // Toggle On
  const btnOn = byId('btn_on') || byId('toggleOn') || byId('on');
  if (btnOn) btnOn.addEventListener('click', () => {
    ask({ method: 'toogleKeyboardOn' });
  });

  // Toggle Off
  const btnOff = byId('btn_off') || byId('toggleOff') || byId('off');
  if (btnOff) btnOff.addEventListener('click', () => {
    ask({ method: 'toogleKeyboardOff' });
  });

  // Demand
  const btnDemand = byId('btn_demand') || byId('toggleDemand') || byId('demand');
  if (btnDemand) btnDemand.addEventListener('click', () => {
    ask({ method: 'toogleKeyboardDemand' });
  });

  // Open URL bar
  const btnUrl = byId('btn_url') || byId('openUrlBar') || byId('url');
  if (btnUrl) btnUrl.addEventListener('click', () => {
    ask({ method: 'openUrlBar' });
  });

  // Options page
  const btnOpts = byId('btn_options') || byId('openOptions') || byId('options');
  if (btnOpts) btnOpts.addEventListener('click', () => {
    // Prefer native API in MV3
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
});

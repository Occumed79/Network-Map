(() => {
  const tools = [
    ['coverage', 'Coverage'],
    ['liveFinder', 'Live Finder'],
    ['radius', 'Radius Tool'],
    ['directories', 'Directories'],
    ['priceFinder', 'Price Finder'],
    ['myClinics', 'My Clinics'],
    ['compare', 'Compare'],
  ];
  const modalTitles = {
    directories: 'Provider Directories',
    priceFinder: 'Provider Price Finder',
    myClinics: 'My Clinics',
    compare: 'City Comparison',
  };
  let activeTool = null;
  let closing = false;

  const fallbackIconRe = /[📡⭕📁💲📤⊞◎🏥🗺️🔎💉📊📍✕×●◈🌐💰💲⚠]/g;
  let pictographRe = null;
  try { pictographRe = new RegExp('\\p{Extended_Pictographic}', 'gu'); } catch {}

  function stripIcons(value) {
    let text = String(value || '');
    if (pictographRe) text = text.replace(pictographRe, '');
    return text.replace(fallbackIconRe, '').replace(/\s+/g, ' ').trim();
  }

  function cleanText(value) {
    return stripIcons(value).replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function buttonTool(button) {
    const text = cleanText(button && button.textContent);
    const found = tools.find(([, label]) => text.includes(label.toUpperCase()));
    return found ? found[0] : null;
  }

  function modalTool(modal) {
    const text = cleanText((modal.querySelector('.modal-title') || modal).textContent);
    return Object.entries(modalTitles).find(([, title]) => text.includes(title.toUpperCase()))?.[0] || null;
  }

  function setMode(tool) {
    activeTool = tool || null;
    document.body.dataset.occumedActiveTool = activeTool || '';
    document.querySelectorAll('.hdr-btn,.om-tool-btn').forEach((button) => {
      const key = button.dataset.omTool || buttonTool(button);
      button.classList.toggle('om-mode-active', Boolean(activeTool && key === activeTool));
      button.setAttribute('aria-pressed', String(Boolean(activeTool && key === activeTool)));
    });
  }

  function closePanel(panel) {
    const close = panel && panel.querySelector('.rp-close');
    if (close) close.click();
  }

  function closeModal(modal) {
    const close = modal && modal.querySelector('.modal-close');
    if (close) close.click();
  }

  function closeConflicts(tool) {
    if (closing) return;
    closing = true;
    setTimeout(() => { closing = false; }, 150);
    document.querySelectorAll('.right-panel.open').forEach((panel) => { if (tool !== 'coverage') closePanel(panel); });
    document.querySelectorAll('.live-panel.open').forEach((panel) => { if (tool !== 'liveFinder') closePanel(panel); });
    document.querySelectorAll('.modal-backdrop.open').forEach((modal) => {
      const key = modalTool(modal);
      if (key && key !== tool) closeModal(modal);
    });
  }

  function originalButtonFor(tool) {
    return Array.from(document.querySelectorAll('.hdr-btn')).find((button) => buttonTool(button) === tool);
  }

  function buildToolSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('om-tool-section')) return;
    const section = document.createElement('section');
    section.id = 'om-tool-section';
    section.className = 'om-tool-section';
    const title = document.createElement('div');
    title.className = 'om-tool-title';
    title.textContent = 'Network Tools';
    section.appendChild(title);

    tools.forEach(([key, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.omTool = key;
      button.className = 'om-tool-btn';
      button.textContent = label;
      button.addEventListener('click', () => {
        setMode(key);
        const original = originalButtonFor(key);
        if (original) original.click();
        setTimeout(() => closeConflicts(key), 0);
        setTimeout(reconcile, 80);
      });
      section.appendChild(button);
    });

    const hero = sidebar.querySelector('.hero-card');
    if (hero && hero.nextSibling) sidebar.insertBefore(section, hero.nextSibling);
    else sidebar.insertBefore(section, sidebar.firstChild);
  }

  function scrubVisibleText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const edits = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const before = node.nodeValue || '';
      let after = stripIcons(before)
        .replace(/OSM facilities/g, 'provider results')
        .replace(/OpenStreetMap/g, 'provider source')
        .replace(/Could not reach provider source/g, 'Provider search failed');
      if (node.parentElement && node.parentElement.classList.contains('modal-close')) after = after || 'Close';
      if (node.parentElement && node.parentElement.classList.contains('rp-close')) after = after || 'Close';
      if (after !== before) edits.push([node, after]);
    }
    edits.forEach(([node, value]) => { node.nodeValue = value; });
    document.querySelectorAll('.modal-close,.rp-close').forEach((button) => {
      if (!stripIcons(button.textContent)) button.textContent = 'Close';
    });
  }

  function labelCards() {
    document.querySelectorAll('.local-pop-card').forEach((card) => {
      const text = cleanText(card.textContent);
      card.classList.toggle('om-radius-card', text.includes('RADIUS EXTRACTOR'));
      card.classList.toggle('om-pop-card', text.includes('LOCAL POPULATION ESTIMATE'));
    });
  }

  function parseCoords(text) {
    const match = String(text || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    return { lat: Number(match[1]), lng: Number(match[2]) };
  }

  function isUsPoint(lat, lng) {
    return (lat >= 24.3 && lat <= 49.6 && lng >= -125 && lng <= -66.7) ||
      (lat >= 51.2 && lat <= 71.6 && lng >= -170 && lng <= -129.5) ||
      (lat >= 18.8 && lat <= 22.5 && lng >= -160.8 && lng <= -154.6);
  }

  function guardCenters() {
    document.querySelectorAll('.live-panel.open, .local-pop-card').forEach((panel) => {
      const text = panel.textContent || '';
      if (!/active center|center:/i.test(text)) return;
      const coords = parseCoords(text);
      if (!coords || isUsPoint(coords.lat, coords.lng)) return;
      if (!panel.querySelector('.om-invalid-center-note')) {
        const note = document.createElement('div');
        note.className = 'om-invalid-center-note';
        note.textContent = 'No provider search was run because the selected point is outside the supported provider coverage area.';
        panel.appendChild(note);
      }
    });
  }

  function syncMode() {
    const openModal = Array.from(document.querySelectorAll('.modal-backdrop.open')).map(modalTool).find(Boolean);
    if (openModal) return setMode(openModal);
    if (document.querySelector('.live-panel.open')) return setMode('liveFinder');
    if (document.querySelector('.right-panel.open')) return setMode('coverage');
    if (document.querySelector('.om-radius-card')) return setMode('radius');
    setMode(null);
  }

  function neutralizeInlineColorNoise() {
    document.querySelectorAll('.sidebar [style], .right-panel [style], .live-panel [style], .modal-card [style], .local-pop-card [style]').forEach((el) => {
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'OPTION') return;
      el.style.color = '';
      el.style.textShadow = 'none';
      el.style.boxShadow = '';
      if (el.style.background && el.offsetWidth <= 14 && el.offsetHeight <= 14) el.style.display = 'none';
    });
  }

  function reconcile() {
    buildToolSidebar();
    labelCards();
    scrubVisibleText();
    guardCenters();
    neutralizeInlineColorNoise();
    syncMode();
    document.querySelectorAll('.om-radius-card').forEach((card) => {
      card.classList.toggle('om-radius-visible', activeTool === 'radius');
    });
  }

  function onClick(event) {
    const button = event.target.closest && event.target.closest('.hdr-btn, .hero-btn, .om-tool-btn');
    if (!button) return;
    const tool = button.dataset.omTool || buttonTool(button);
    if (!tool) return;
    setMode(tool);
    setTimeout(() => closeConflicts(tool), 0);
    setTimeout(reconcile, 80);
    setTimeout(reconcile, 220);
  }

  function injectStyles() {
    if (document.getElementById('occumed-liquid-glass-mode-controller-styles')) return;
    const style = document.createElement('style');
    style.id = 'occumed-liquid-glass-mode-controller-styles';
    style.textContent = `
      :root{--om-bg:#050914;--om-panel:linear-gradient(145deg,rgba(20,26,40,.82),rgba(8,12,22,.70));--om-edge:rgba(205,221,244,.18);--om-text:#e6edf7;--om-muted:#8d9eb7;--om-soft:#b8c7dc;--om-accent:#cfe3ff;--om-shadow:0 28px 90px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.08)}
      .app-header{display:none!important}.app-body{top:0!important;height:100vh!important}.hdr-actions{display:none!important}.hero-actions{display:none!important}.mico,.pcico,.legend-dot,.tz-dot,.hdr-brand-dot{display:none!important}
      .sidebar{width:332px!important;background:var(--om-panel)!important;border-right:1px solid var(--om-edge)!important;box-shadow:18px 0 70px rgba(0,0,0,.38),inset -1px 0 0 rgba(255,255,255,.05)!important;backdrop-filter:blur(34px) saturate(150%)!important;-webkit-backdrop-filter:blur(34px) saturate(150%)!important;color:var(--om-text)!important}
      .map-wrap{left:332px!important;width:calc(100% - 332px)!important}.hero-card,.sb-section,.right-panel.open,.live-panel.open,.modal-card,.local-pop-card{background:var(--om-panel)!important;border:1px solid var(--om-edge)!important;box-shadow:var(--om-shadow)!important;backdrop-filter:blur(30px) saturate(150%)!important;-webkit-backdrop-filter:blur(30px) saturate(150%)!important;color:var(--om-text)!important}
      .hero-title,.sb-lbl,.rp-title,.modal-title,.local-pop-title{color:var(--om-text)!important;letter-spacing:.10em!important;text-transform:uppercase!important}.hero-sub,.tog-lbl,.legend-lbl,.local-pop-row span,.local-pop-meta{color:var(--om-muted)!important}
      .om-tool-section{margin:12px 12px 14px;padding:12px;border:1px solid var(--om-edge);border-radius:18px;background:rgba(255,255,255,.035);box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.om-tool-title{font:700 10px/1.2 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--om-muted);margin-bottom:10px}.om-tool-btn{width:100%;height:34px;margin:0 0 7px;border-radius:12px;border:1px solid rgba(205,221,244,.14);background:rgba(255,255,255,.035);color:var(--om-soft);font:700 10px/1 'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:0 12px;cursor:pointer}.om-tool-btn:hover,.om-tool-btn.om-mode-active{background:rgba(207,227,255,.10);border-color:rgba(207,227,255,.32);color:var(--om-text);box-shadow:0 0 22px rgba(207,227,255,.10),inset 0 1px 0 rgba(255,255,255,.10)}
      .mbtn,.vbtn,.fbtn,.hdr-btn,.hero-btn,.drivetime-btn,.export-btn,.tab-btn,.rp-close,.modal-close{background:rgba(255,255,255,.04)!important;border-color:rgba(205,221,244,.16)!important;color:var(--om-soft)!important;box-shadow:none!important;text-shadow:none!important}.mbtn.active,.vbtn.active,.fbtn.active,.tab-btn.active,.hdr-btn.active,.hdr-btn.om-mode-active{background:rgba(207,227,255,.10)!important;border-color:rgba(207,227,255,.34)!important;color:var(--om-text)!important;box-shadow:0 0 22px rgba(207,227,255,.10)!important}
      .tog-slider{background:rgba(205,221,244,.12)!important;border:1px solid rgba(205,221,244,.16)!important;box-shadow:none!important}.tog-switch input:checked+.tog-slider{background:rgba(207,227,255,.22)!important}.br-fill{background:linear-gradient(90deg,rgba(142,158,183,.45),rgba(207,227,255,.70))!important;box-shadow:none!important}.br-hdr span,.legend-row span,.tog-row span,.pcrow span{color:var(--om-muted)!important}.badge{background:rgba(207,227,255,.12)!important;color:var(--om-text)!important}
      .modal-backdrop.open{background:rgba(3,6,13,.76)!important;backdrop-filter:blur(18px) saturate(130%)!important;-webkit-backdrop-filter:blur(18px) saturate(130%)!important}body[data-occumed-active-tool="directories"] .right-panel.open,body[data-occumed-active-tool="directories"] .live-panel.open,body[data-occumed-active-tool="priceFinder"] .right-panel.open,body[data-occumed-active-tool="priceFinder"] .live-panel.open,body[data-occumed-active-tool="myClinics"] .right-panel.open,body[data-occumed-active-tool="myClinics"] .live-panel.open,body[data-occumed-active-tool="compare"] .right-panel.open,body[data-occumed-active-tool="compare"] .live-panel.open,body[data-occumed-active-tool="radius"] .right-panel.open,body[data-occumed-active-tool="radius"] .live-panel.open{visibility:hidden!important;pointer-events:none!important}
      .om-radius-card:not(.om-radius-visible){display:none!important}body[data-occumed-active-tool="radius"] .om-radius-card.om-radius-visible{position:fixed!important;top:110px!important;left:20px!important;right:auto!important;transform:none!important;width:292px!important;max-height:calc(100vh - 140px)!important;overflow:auto!important;z-index:900!important}
      .om-invalid-center-note{margin-top:10px;padding:10px 12px;border-radius:12px;color:var(--om-text);background:rgba(255,255,255,.05);border:1px solid var(--om-edge);font:600 10px/1.45 'IBM Plex Mono',ui-monospace,monospace}
      #map span,#map div.leaflet-marker-icon,#map .leaflet-tooltip{filter:saturate(.68)!important}.cursor-light{opacity:.18!important}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyles();
    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(() => {
      clearTimeout(observer._timer);
      observer._timer = setTimeout(reconcile, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style'] });
    reconcile();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

(() => {
  const tools = [
    ['coverage', 'COVERAGE'],
    ['liveFinder', 'LIVE FINDER'],
    ['radius', 'RADIUS TOOL'],
    ['directories', 'DIRECTORIES'],
    ['priceFinder', 'PRICE FINDER'],
    ['myClinics', 'MY CLINICS'],
    ['compare', 'COMPARE'],
  ];
  const modalTitles = {
    directories: 'PROVIDER DIRECTORIES',
    priceFinder: 'PROVIDER PRICE FINDER',
    myClinics: 'MY CLINICS',
    compare: 'CITY COMPARISON',
  };
  let activeTool = null;
  let closing = false;

  function cleanText(value) {
    return String(value || '').replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function buttonTool(button) {
    const text = cleanText(button && button.textContent);
    const found = tools.find(([, label]) => text.includes(label));
    return found ? found[0] : null;
  }

  function modalTool(modal) {
    const text = cleanText((modal.querySelector('.modal-title') || modal).textContent);
    return Object.entries(modalTitles).find(([, title]) => text.includes(title))?.[0] || null;
  }

  function setMode(tool) {
    activeTool = tool || null;
    document.body.dataset.occumedActiveTool = activeTool || '';
    document.querySelectorAll('.hdr-btn').forEach((button) => {
      const toolKey = buttonTool(button);
      button.classList.toggle('om-mode-active', Boolean(activeTool && toolKey === activeTool));
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

    document.querySelectorAll('.right-panel.open').forEach((panel) => {
      if (tool !== 'coverage') closePanel(panel);
    });
    document.querySelectorAll('.live-panel.open').forEach((panel) => {
      if (tool !== 'liveFinder') closePanel(panel);
    });
    document.querySelectorAll('.modal-backdrop.open').forEach((modal) => {
      const key = modalTool(modal);
      if (key && key !== tool) closeModal(modal);
    });
  }

  function labelCards() {
    document.querySelectorAll('.local-pop-card').forEach((card) => {
      const text = cleanText(card.textContent);
      card.classList.toggle('om-radius-card', text.includes('RADIUS EXTRACTOR'));
      card.classList.toggle('om-pop-card', text.includes('LOCAL POPULATION ESTIMATE'));
    });
  }

  function replaceText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const edits = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const before = node.nodeValue || '';
      const after = before
        .replace(/OSM facilities/g, 'provider results')
        .replace(/OpenStreetMap/g, 'provider source');
      if (after !== before) edits.push([node, after]);
    }
    edits.forEach(([node, value]) => { node.nodeValue = value; });
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

  function reconcile() {
    labelCards();
    replaceText();
    guardCenters();
    syncMode();
    document.querySelectorAll('.om-radius-card').forEach((card) => {
      card.classList.toggle('om-radius-visible', activeTool === 'radius');
    });
  }

  function onClick(event) {
    const button = event.target.closest && event.target.closest('.hdr-btn, .hero-btn');
    if (!button) return;
    const tool = buttonTool(button);
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
      :root{--om-glass-bg:linear-gradient(145deg,rgba(22,30,52,.72),rgba(6,12,26,.56));--om-glass-edge:rgba(169,206,255,.22);--om-glass-shadow:0 26px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.08)}
      .right-panel.open,.live-panel.open,.modal-card,.local-pop-card{background:var(--om-glass-bg)!important;border:1px solid var(--om-glass-edge)!important;box-shadow:var(--om-glass-shadow)!important;backdrop-filter:blur(30px) saturate(170%)!important;-webkit-backdrop-filter:blur(30px) saturate(170%)!important}
      .hdr-btn.om-mode-active,.hdr-btn.active{background:linear-gradient(180deg,rgba(125,211,252,.25),rgba(59,130,246,.12))!important;border-color:rgba(125,211,252,.52)!important;color:#dff7ff!important;box-shadow:0 0 0 1px rgba(125,211,252,.16),0 0 24px rgba(56,189,248,.22),inset 0 1px 0 rgba(255,255,255,.12)!important}
      .modal-backdrop.open{background:radial-gradient(circle at 50% 45%,rgba(59,130,246,.11),rgba(0,3,12,.76) 62%)!important;backdrop-filter:blur(18px) saturate(140%)!important;-webkit-backdrop-filter:blur(18px) saturate(140%)!important}
      body[data-occumed-active-tool="directories"] .right-panel.open,body[data-occumed-active-tool="directories"] .live-panel.open,body[data-occumed-active-tool="priceFinder"] .right-panel.open,body[data-occumed-active-tool="priceFinder"] .live-panel.open,body[data-occumed-active-tool="myClinics"] .right-panel.open,body[data-occumed-active-tool="myClinics"] .live-panel.open,body[data-occumed-active-tool="compare"] .right-panel.open,body[data-occumed-active-tool="compare"] .live-panel.open,body[data-occumed-active-tool="radius"] .right-panel.open,body[data-occumed-active-tool="radius"] .live-panel.open{visibility:hidden!important;pointer-events:none!important}
      .om-radius-card:not(.om-radius-visible){display:none!important}
      body[data-occumed-active-tool="radius"] .om-radius-card.om-radius-visible{position:absolute!important;top:50%!important;left:50%!important;right:auto!important;transform:translate(-50%,-50%)!important;width:min(520px,calc(100vw - 48px))!important;max-height:min(76vh,680px)!important;overflow:auto!important;z-index:430!important}
      .om-invalid-center-note{margin-top:10px;padding:10px 12px;border-radius:12px;color:#fecaca;background:rgba(239,68,68,.12);border:1px solid rgba(252,165,165,.25);font:600 10px/1.45 'IBM Plex Mono',ui-monospace,monospace}
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
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });
    reconcile();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

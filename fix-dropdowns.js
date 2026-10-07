(() => {
  window.__fixDropdowns?.close?.();
  const MIN_OPTIONS = 15, MAX_RESULTS = 60;
  const host = document.createElement('div');
  host.id = 'fix-dropdowns-overlay';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    *{box-sizing:border-box}.panel{position:absolute;top:24px;right:24px;width:min(420px,calc(100vw - 24px));height:min(440px,calc(100dvh - 48px));display:flex;flex-direction:column;overflow:hidden;background:#fff;color:#17212b;border:1px solid #c9d3db;border-radius:14px;box-shadow:0 16px 50px #17212b44;font:14px/1.4 system-ui,-apple-system,sans-serif;pointer-events:auto}
    .head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;cursor:grab;touch-action:none;user-select:none}.head.dragging{cursor:grabbing}.grip{color:#8995a0;font-size:20px}.title{font-weight:700;font-size:17px;flex:1}.close{border:0;background:#eef2f5;border-radius:7px;padding:6px 9px;cursor:pointer;font:inherit}
    .controls{padding:0 16px 8px}.field-label{display:block;font-size:12px;color:#54616c;margin-bottom:4px}select,input{display:block;width:100%;padding:9px 11px;border:1px solid #a3afb9;border-radius:8px;font:inherit;background:#fff;color:inherit}select{margin-bottom:8px}input{font-size:16px}input:focus,select:focus,button:focus-visible{outline:2px solid #2766c7;outline-offset:2px}
    .meta{padding:0 16px 9px;color:#54616c;font-size:12px}.results{flex:1;min-height:0;overflow:auto;padding:0 8px 8px;overscroll-behavior:contain}.result{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;border-radius:8px;background:none;color:inherit;padding:10px;cursor:pointer;font:inherit}.result:hover,.result.active{background:#e7f0ff}.option{flex:1;min-width:0;overflow-wrap:anywhere}.selected{font-size:11px;color:#2766c7}.empty{padding:20px 10px;color:#54616c}.status{padding:10px 16px;border-top:1px solid #e5e9ed;color:#4a5965;font-size:12px;flex-shrink:0}.help{color:#7a8792;margin-top:4px}
    @media(max-width:480px){.panel{top:12px;right:12px;height:min(440px,calc(100dvh - 24px))}}
  </style><section class="panel" role="dialog" aria-label="Search dropdown" aria-modal="false"><div class="head" title="Drag to move"><span class="grip" aria-hidden="true">⠿</span><span class="title">Search dropdown</span><button class="close" type="button" aria-label="Close">✕</button></div><div class="controls"><label class="field-label" for="fd-field">Dropdown</label><select id="fd-field" aria-label="Choose dropdown"></select><input type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="fd-results" placeholder="Search this dropdown…" aria-label="Search dropdown options" autocomplete="off"></div><div class="meta"></div><div id="fd-results" class="results" role="listbox" aria-label="Matching options"></div><div class="status"><div class="message" aria-live="polite">Choose a dropdown above, then search its options.</div><div class="help">Drag header to move · ↑ ↓ then Enter · Esc to close</div></div></section>`;
  document.documentElement.appendChild(host);
  const panel = root.querySelector('.panel'), header = root.querySelector('.head');
  const input = root.querySelector('input'), field = root.querySelector('select');
  const meta = root.querySelector('.meta'), results = root.querySelector('.results'), status = root.querySelector('.message');
  const identities = new WeakMap();
  let nextId = 0, matches = [], active = -1, timer, closed = false, drag;
  const normalize = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const subsequence = (needle, word) => {
    let position = 0;
    for (const character of needle) { position = word.indexOf(character, position); if (position < 0) return false; position++; }
    return true;
  };
  const oneEdit = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length >= b.length) i++;
      if (b.length >= a.length) j++;
    }
    return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
  };
  const score = (query, label) => {
    if (!query) return 1;
    const text = normalize(label), words = text.split(' ');
    if (query.length === 1) return words.some(word => word.startsWith(query)) ? 40 : 0;
    if (text === query) return 100;
    if (text.startsWith(query)) return 80;
    if (text.includes(query)) return 60;
    const tokens = query.split(' ');
    if (tokens.every(token => words.some(word => word.startsWith(token)))) return 40;
    if (tokens.every(token => words.some(word => word.includes(token)))) return 25;
    if (tokens.every(token => words.some(word => token.length >= 4 ? oneEdit(token, word) || subsequence(token, word) : word.startsWith(token)))) return 5;
    return 0;
  };
  const available = option => !option.disabled && !option.hidden && !option.closest('optgroup[disabled]') && option.value !== '';
  const selectName = (select, index) => {
    const labelledBy = (select.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
    const label = select.labels?.[0]?.textContent || select.getAttribute('aria-label') || labelledBy || select.name || select.id;
    return (label || `Dropdown ${index + 1}`).replace(/\s+/g, ' ').trim();
  };
  const eligible = () => Array.from(document.querySelectorAll('select')).filter(select =>
    !select.matches(':disabled') && !select.multiple && Array.from(select.options).filter(available).length >= MIN_OPTIONS
  );
  const setActive = index => {
    active = Math.max(0, Math.min(index, matches.length - 1));
    results.querySelectorAll('.result').forEach((button, i) => {
      button.classList.toggle('active', i === active);
      button.setAttribute('aria-selected', String(i === active));
      if (i === active) { input.setAttribute('aria-activedescendant', button.id); button.scrollIntoView({ block: 'nearest' }); }
    });
  };
  const choose = item => {
    if (!item.select.isConnected || item.select.matches(':disabled') || !Array.from(item.select.options).includes(item.option) || !available(item.option)) {
      status.textContent = 'That option changed. Search again.'; render(); return;
    }
    item.select.selectedIndex = Array.prototype.indexOf.call(item.select.options, item.option);
    item.select.dispatchEvent(new Event('input', { bubbles: true }));
    item.select.dispatchEvent(new Event('change', { bubbles: true }));
    status.textContent = `Selected “${item.label}”.`;
    render();
    input.focus();
  };
  const render = () => {
    if (closed) return;
    const selects = eligible(), selectedField = field.value;
    field.replaceChildren();
    selects.forEach((select, index) => {
      if (!identities.has(select)) identities.set(select, String(++nextId));
      field.add(new Option(`${selectName(select, index)} (${Array.from(select.options).filter(available).length})`, identities.get(select)));
    });
    if (Array.from(field.options).some(option => option.value === selectedField)) field.value = selectedField;
    const select = selects.find(select => identities.get(select) === field.value);
    const query = normalize(input.value), all = [];
    input.disabled = !select;
    if (select) Array.from(select.options).forEach(option => {
      if (!available(option)) return;
      const label = option.label.replace(/\s+/g, ' ').trim(), rank = score(query, label);
      if (rank) all.push({ select, option, label, rank });
    });
    all.sort((a, b) => b.rank - a.rank || a.label.localeCompare(b.label));
    matches = all.slice(0, MAX_RESULTS);
    active = -1;
    input.removeAttribute('aria-activedescendant');
    meta.textContent = `${all.length.toLocaleString()} ${query ? 'match' : 'option'}${all.length === 1 ? '' : query ? 'es' : 's'}${all.length > MAX_RESULTS ? ` · first ${MAX_RESULTS} shown — narrow your search` : ''}`;
    if (query && all.length && all.every(item => item.rank === 5)) meta.textContent = `${all.length} close matches · no exact matches${all.length > MAX_RESULTS ? ` · first ${MAX_RESULTS} shown` : ''}`;
    results.replaceChildren(); results.scrollTop = 0;
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.textContent = !select ? `No supported dropdowns with at least ${MIN_OPTIONS} choices found. Custom widgets may not expose a native dropdown.` : 'No matches. Try fewer words or another dropdown.';
      results.appendChild(empty); return;
    }
    const fragment = document.createDocumentFragment();
    matches.forEach((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.id = `fd-option-${index}`; button.className = 'result'; button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false');
      const label = document.createElement('span'); label.className = 'option'; label.textContent = item.label; button.appendChild(label);
      if (item.option.selected) { const selected = document.createElement('span'); selected.className = 'selected'; selected.textContent = '✓ Selected'; button.appendChild(selected); }
      button.addEventListener('click', () => choose(item)); fragment.appendChild(button);
    });
    results.appendChild(fragment);
    if (query) setActive(0);
  };
  const clamp = (left, top) => {
    const bounds = panel.getBoundingClientRect(); panel.style.right = 'auto';
    panel.style.left = `${Math.max(8, Math.min(left, window.innerWidth - bounds.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(top, window.innerHeight - bounds.height - 8))}px`;
  };
  header.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    const bounds = panel.getBoundingClientRect(); drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: bounds.left, top: bounds.top };
    header.setPointerCapture(event.pointerId); header.classList.add('dragging'); event.preventDefault();
  });
  header.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) clamp(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y); });
  const endDrag = () => { drag = null; header.classList.remove('dragging'); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => header.addEventListener(type, endDrag));
  const onResize = () => { const bounds = panel.getBoundingClientRect(); clamp(bounds.left, bounds.top); };
  const onDocumentKey = event => { if (event.key === 'Escape') close(); };
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target || target.getRootNode() === root) return false;
      return target.closest('select,fieldset') || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('select') || node.querySelector('select')));
    });
    if (!relevant) return;
    clearTimeout(timer); timer = setTimeout(render, 80);
  });
  const close = () => {
    closed = true; clearTimeout(timer); observer.disconnect(); document.removeEventListener('keydown', onDocumentKey); window.removeEventListener('resize', onResize); host.remove();
    if (window.__fixDropdowns?.close === close) delete window.__fixDropdowns;
  };
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'multiple', 'label', 'value'] });
  root.querySelector('.close').addEventListener('click', close);
  field.addEventListener('change', () => { input.value = ''; status.textContent = 'Choose an option to update the original dropdown.'; render(); input.focus(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(active < 0 ? event.key === 'ArrowDown' ? 0 : matches.length - 1 : active + (event.key === 'ArrowDown' ? 1 : -1)); }
    else if (event.key === 'Enter' && matches[active]) { event.preventDefault(); choose(matches[active]); }
  });
  document.addEventListener('keydown', onDocumentKey); window.addEventListener('resize', onResize);
  window.__fixDropdowns = { close };
  render(); input.focus();
})();

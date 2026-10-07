(() => {
  const previous = window.__fixDropdowns;
  if (previous?.close) previous.close();

  const MIN_OPTIONS = 15;
  const MAX_RESULTS = 60;
  const host = document.createElement('div');
  host.id = 'fix-dropdowns-overlay';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    *{box-sizing:border-box} .panel{position:absolute;top:min(8vh,60px);left:50%;transform:translateX(-50%);width:min(580px,calc(100vw - 24px));max-height:min(80vh,680px);display:flex;flex-direction:column;overflow:hidden;background:#fff;color:#17212b;border:1px solid #c9d3db;border-radius:14px;box-shadow:0 16px 50px #17212b55;font:14px/1.4 system-ui,-apple-system,sans-serif;pointer-events:auto}
    .head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px}.title{font-weight:700;font-size:17px;flex:1}.close{border:0;background:#eef2f5;border-radius:7px;padding:6px 9px;cursor:pointer;font:inherit}
    input{margin:0 16px 8px;padding:11px 12px;width:calc(100% - 32px);border:1px solid #8e9ba5;border-radius:8px;font:inherit;font-size:16px;outline:none}input:focus{border-color:#2766c7;box-shadow:0 0 0 2px #2766c733}
    .meta{padding:0 16px 9px;color:#54616c;font-size:12px}.results{overflow:auto;padding:0 8px 8px}.result{display:block;width:100%;text-align:left;border:0;border-radius:8px;background:none;color:inherit;padding:9px 10px;cursor:pointer;font:inherit}.result:hover,.result.active{background:#e7f0ff}.group{display:block;color:#566675;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}.option{display:block;overflow-wrap:anywhere}.empty{padding:16px;color:#54616c}.status{padding:8px 16px;border-top:1px solid #e5e9ed;color:#4a5965;font-size:12px}
  </style><section class="panel" role="dialog" aria-label="Search dropdowns" aria-modal="false"><div class="head"><span class="title">Search dropdowns</span><button class="close" type="button" aria-label="Close">✕</button></div><input type="search" placeholder="Search options, e.g. solar roof pro" aria-label="Search dropdown options" autocomplete="off"><div class="meta"></div><div class="results" role="listbox"></div><div class="status" aria-live="polite">Searches options already present on this page.</div></section>`;
  document.documentElement.appendChild(host);

  const input = root.querySelector('input');
  const meta = root.querySelector('.meta');
  const results = root.querySelector('.results');
  const status = root.querySelector('.status');
  let matches = [];
  let active = 0;
  let timer;
  let closed = false;
  const normalize = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const subsequence = (needle, haystack) => {
    let position = 0;
    for (const character of needle) {
      position = haystack.indexOf(character, position);
      if (position < 0) return false;
      position++;
    }
    return true;
  };
  const score = (query, label) => {
    if (!query) return 1;
    const text = normalize(label);
    if (text === query) return 100;
    if (text.startsWith(query)) return 80;
    if (text.includes(query)) return 60;
    const words = text.split(' ');
    const tokens = query.split(' ');
    if (tokens.every(token => words.some(word => word.startsWith(token)))) return 40;
    if (tokens.every(token => words.some(word => word.includes(token)))) return 25;
    if (query.length >= 4 && subsequence(query.replaceAll(' ', ''), text.replaceAll(' ', ''))) return 5;
    return 0;
  };
  const selectName = (select, index) => {
    const label = select.labels?.[0]?.textContent || select.getAttribute('aria-label') || select.name || select.id;
    return (label || `Dropdown ${index + 1}`).replace(/\s+/g, ' ').trim();
  };
  const eligible = () => Array.from(document.querySelectorAll('select')).filter(select =>
    !select.disabled && !select.multiple && Array.from(select.options).filter(option => !option.disabled && option.value !== '').length >= MIN_OPTIONS
  );
  const setActive = index => {
    active = Math.max(0, Math.min(index, matches.length - 1));
    results.querySelectorAll('.result').forEach((button, i) => {
      button.classList.toggle('active', i === active);
      button.setAttribute('aria-selected', String(i === active));
      if (i === active) button.scrollIntoView({ block: 'nearest' });
    });
  };
  const choose = item => {
    if (!item.select.isConnected || !item.option.isConnected || item.option.disabled) {
      status.textContent = 'That option changed. Search again.';
      render();
      return;
    }
    item.select.selectedIndex = Array.prototype.indexOf.call(item.select.options, item.option);
    item.select.dispatchEvent(new Event('input', { bubbles: true }));
    item.select.dispatchEvent(new Event('change', { bubbles: true }));
    status.textContent = `Selected “${item.label}” in ${item.group}.`;
    input.value = '';
    render();
    input.focus();
  };
  const render = () => {
    if (closed) return;
    const selects = eligible();
    const query = normalize(input.value);
    const all = [];
    selects.forEach((select, index) => {
      const group = selectName(select, index);
      Array.from(select.options).forEach(option => {
        if (option.disabled || option.value === '') return;
        const label = option.textContent.replace(/\s+/g, ' ').trim();
        const rank = score(query, label);
        if (rank) all.push({ select, option, label, group, rank });
      });
    });
    all.sort((a, b) => b.rank - a.rank || a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
    matches = all.slice(0, MAX_RESULTS);
    active = 0;
    meta.textContent = `${selects.length} large dropdown${selects.length === 1 ? '' : 's'} · ${all.length} matching option${all.length === 1 ? '' : 's'}${all.length > MAX_RESULTS ? ` · showing first ${MAX_RESULTS}` : ''}`;
    results.replaceChildren();
    if (!selects.length || !matches.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = !selects.length ? `No dropdowns with at least ${MIN_OPTIONS} options found.` : 'No matching options.';
      results.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    matches.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === 0));
      if (index === 0) button.classList.add('active');
      const group = document.createElement('span');
      group.className = 'group';
      group.textContent = item.group;
      const label = document.createElement('span');
      label.className = 'option';
      label.textContent = item.label;
      button.append(group, label);
      button.addEventListener('click', () => choose(item));
      fragment.appendChild(button);
    });
    results.appendChild(fragment);
  };
  const close = () => {
    closed = true;
    clearTimeout(timer);
    observer.disconnect();
    document.removeEventListener('keydown', onDocumentKey);
    host.remove();
    if (window.__fixDropdowns?.close === close) delete window.__fixDropdowns;
  };
  const onDocumentKey = event => {
    if (event.key === 'Escape') close();
  };
  const observer = new MutationObserver(records => {
    if (!records.some(record => record.target.getRootNode() !== root)) return;
    clearTimeout(timer);
    timer = setTimeout(render, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label'] });
  root.querySelector('.close').addEventListener('click', close);
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Enter' && matches[active]) {
      event.preventDefault();
      choose(matches[active]);
    }
  });
  document.addEventListener('keydown', onDocumentKey);
  window.__fixDropdowns = { close };
  render();
  input.focus();
})();

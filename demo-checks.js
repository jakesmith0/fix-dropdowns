// This checks only the demo fixtures, using the same embedded bookmarklet as the install link.
document.querySelector('#run-checks').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  const output = document.querySelector('#checks-status');
  output.replaceChildren();
  const pause = () => new Promise(resolve => setTimeout(resolve, 150));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  document.querySelector('#install').click();
  await pause();
  const root = document.querySelector('#fix-dropdowns-overlay')?.shadowRoot;
  if (!root) { output.textContent = 'The browser blocked the bookmarklet. Try clicking the install button manually.'; button.disabled = false; return; }
  const field = root.querySelector('select'), input = root.querySelector('input');
  const chooseField = name => {
    const option = Array.from(field.options).find(option => option.text.startsWith(name));
    assert(option, `${name} did not appear in the picker`);
    field.value = option.value;
    field.dispatchEvent(new Event('change'));
  };
  const search = value => { input.value = value; input.dispatchEvent(new Event('input')); };
  const selectResult = label => {
    const result = Array.from(root.querySelectorAll('.result')).find(button => button.querySelector('.option').textContent === label);
    assert(result, `${label} was not found`);
    result.click();
  };
  let passed = 0, total = 0;
  const check = async (name, run) => {
    total++;
    const line = document.createElement('div');
    try { await run(); passed++; line.textContent = `✓ ${name}`; }
    catch (error) { line.textContent = `✕ ${name}: ${error.message}`; }
    output.append(line);
  };
  await check('Native selection sends input and change events', async () => {
    chooseField('Manufacturer'); search('clenergy'); selectResult('Clenergy Technology Co Ltd'); await pause();
    assert(document.querySelector('#manufacturer').value === 'item-1', 'Native value unchanged');
    const log = document.querySelector('#events').textContent;
    assert(log.includes('input: manufacturer') && log.includes('change: manufacturer'), 'Missing events');
  });
  await check('Dependent products update; each search stays in one dropdown', () => {
    chooseField('Product'); search('solar roof pro');
    assert(root.querySelectorAll('.result').length === 2, 'Unexpected matches');
    selectResult('PV-ezRack SolarRoof Pro Pantile - PRO02');
    assert(document.querySelector('#product').value === 'item-1', 'Product unchanged');
    search('France'); assert(root.querySelectorAll('.result').length === 0, 'Country leaked into product search');
  });
  await check('Grouped choices and accents work; disabled choices are omitted', () => {
    chooseField('Grouped equipment'); search('cafe'); selectResult('Café mounting kit');
    assert(document.querySelector('#grouped').value === 'cafe', 'Grouped value unchanged');
    search('unavailable'); assert(root.querySelectorAll('.result').length === 0, 'Disabled option was searchable');
  });
  await check('Styled wrapper follows its hidden native dropdown', () => {
    chooseField('Warehouse'); search('warehouse 17'); selectResult('Warehouse 17');
    assert(document.querySelector('#wrapped-trigger').textContent.includes('Warehouse 17'), 'Wrapper display unchanged');
  });
  await check('Dynamically added 1,000-option dropdown is searchable', async () => {
    document.querySelector('#add-dynamic').click(); await pause(); chooseField('Part number');
    search('ZX-0999'); selectResult('Part ZX-0999');
    assert(document.querySelector('#dynamic').value === 'item-1000', 'Dynamic value unchanged');
  });
  await check('Custom-only, small, multiple and disabled controls are skipped', () => {
    const text = Array.from(field.options).map(option => option.text).join('|');
    assert(!/Custom colour|Small dropdown|Multiple selection|Disabled equipment/.test(text), 'Unsupported field included');
  });
  const summary = document.createElement('strong');
  summary.textContent = `${passed}/${total} checks passed`;
  output.prepend(summary);
  button.disabled = false;
});

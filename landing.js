const manufacturer = document.querySelector('#manufacturer');
const product = document.querySelector('#product');
const country = document.querySelector('#country');
const title = document.querySelector('#order-title');
const summary = document.querySelector('#order-summary');
const brands = ['Clenergy Technology Co Ltd', 'JA Solar Technology', 'Acme Solar', 'Bright Roof Systems', ...Array.from({ length: 26 }, (_, i) => `Sample Supplier ${String(i + 1).padStart(2, '0')}`)];
document.querySelector('.install-steps a').addEventListener('click', () => { document.querySelector('#setup details').open = true; });
function addOptions(select, values) { values.forEach((label, i) => select.add(new Option(label, `item-${i + 1}`))); }
addOptions(manufacturer, brands);
const names = new Intl.DisplayNames(['en'], { type: 'region' });
addOptions(country, 'GB FR DE ES NL BE AT CH IT PT IE DK SE NO FI IS PL CZ SK HU RO BG GR HR SI RS BA ME AL MK EE LV LT UA MD TR CY MT US CA MX BR AR CL CO PE EC UY AU NZ JP KR CN TW IN ID MY SG TH VN PH ZA EG MA KE NG GH IL JO AE SA QA OM BH KW'.split(' ').map(code => names.of(code)));
function updateSummary() {
  const manufacturerName = manufacturer.value ? manufacturer.selectedOptions[0].text : '';
  const productName = product.value ? product.selectedOptions[0].text : '';
  const countryName = country.value ? country.selectedOptions[0].text : '';
  title.textContent = manufacturerName && productName && countryName ? 'All set — your sample order is complete' : 'Your sample order';
  const choices = [manufacturerName, productName, countryName].filter(Boolean);
  summary.textContent = choices.length ? choices.join(' · ') : 'Choose a manufacturer to get started.';
}
manufacturer.addEventListener('change', () => {
  product.replaceChildren(new Option(manufacturer.value ? 'Choose a product' : 'Choose a manufacturer first', ''));
  product.disabled = !manufacturer.value;
  if (manufacturer.value) {
    const featured = manufacturer.value === 'item-1' ? ['PV-ezRack SolarRoof Pro Pantile — PRO02', 'PV-ezRack SolarRoof Pro Universal — PRO04'] : manufacturer.value === 'item-2' ? ['JA Solar JAM54D41-440/LB', 'JA Solar JAM72D40-575/MB'] : [];
    addOptions(product, [...featured, ...Array.from({ length: 45 }, (_, i) => `${manufacturer.selectedOptions[0].text} — Sample kit ${String(i + 1).padStart(2, '0')}`)]);
  }
  updateSummary();
});
product.addEventListener('change', updateSummary);
country.addEventListener('change', updateSummary);
document.querySelector('#reset-demo').addEventListener('click', () => {
  manufacturer.value = ''; country.value = '';
  manufacturer.dispatchEvent(new Event('change', { bubbles: true }));
});
document.querySelector('#copy-address').addEventListener('click', async () => {
  const address = document.querySelector('#bookmarklet-address');
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(address.value); status.textContent = 'Copied. Paste it into your bookmark’s address.'; }
  catch { address.focus(); address.select(); status.textContent = 'Address selected. Copy it with your browser’s Copy command.'; }
});

import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

const source = await readFile('fix-dropdowns.js', 'utf8');
const { code, error } = await minify(source, { compress: true, mangle: true, format: { comments: false } });
if (error || !code) throw error || new Error('Minification failed');
const bookmarklet = `javascript:${encodeURIComponent(code)}`;
const page = (await readFile('index.template.html', 'utf8')).replaceAll('{{BOOKMARKLET}}', bookmarklet);
const tests = (await readFile('tests.template.html', 'utf8')).replaceAll('{{BOOKMARKLET}}', bookmarklet);
await Promise.all([
  writeFile('index.html', page),
  writeFile('tests.html', tests),
]);
console.log(`Built self-contained bookmarklet (${bookmarklet.length} characters).`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run after a Vite build. Embed the built app, fonts and icon in one offline HTML file.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = name => fs.readFileSync(path.join(dist, name), 'utf8');
let html = read('index.html');
const script = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link[^>]+href="([^"]+\/assets\/[^" ]+\.css)"[^>]*>/);
if (!script || !style) throw new Error('Expected one Vite entry script and stylesheet. Run the production build first.');
const assetPath = url => url.slice(url.indexOf('/assets/') + 1);
let javascript = read(assetPath(script[1]));
if (/\bimport\s*\(/.test(javascript)) throw new Error('Dynamic chunks need explicit embedding before exporting.');
javascript = javascript.replaceAll('cpp-quote-builder:studio:quotes:v2', 'cpp-quote-builder:standalone:quotes:v2');
// The old local comparison server is unrelated to an offline copy.
javascript = javascript.replaceAll('http://127.0.0.1:4174/cp-payroll-quote-calculator/', 'https://github.com/mthom1212-spec/cp-payroll-quote-calculator/tree/codex/quote-builder-workspace');
const css = read(assetPath(style[1]));
const fonts = read('fonts/fonts.css').replace(/url\(\.\/([^)]+)\)/g, (_, name) => {
  const bytes = fs.readFileSync(path.join(dist, 'fonts', name));
  return `url(data:font/ttf;base64,${bytes.toString('base64')})`;
});
const icon = fs.readFileSync(path.join(dist, 'quote-mark.svg')).toString('base64');
const licenses = ['DM-Sans-OFL.txt', 'Source-Serif-4-OFL.txt'].map(name => `${name}\n${read('fonts/' + name)}`).join('\n\n');
html = html.replace(script[0], '')
  .replace(style[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace(/<link[^>]+href="[^"]*fonts\/fonts.css"[^>]*>/, () => `<style>${fonts}</style>`)
  .replace(/href="[^"]*quote-mark.svg"/, `href="data:image/svg+xml;base64,${icon}"`)
  .replace('</body>', () => `<script type="module">${javascript.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`)
  .replace('</html>', () => `<!-- Embedded font licenses\n${licenses.replaceAll('-->', '-- >')}\n-->\n</html>`);
const out = path.join(root, 'exports', 'Quote-Studio.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Created ${out} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);

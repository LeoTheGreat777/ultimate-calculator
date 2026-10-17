#!/usr/bin/env node
// Puts the site together for deploying: the same app as public/, but faster to load the first time.
//
//     npm ci                          # once: installs esbuild (the minifier), pinned in package-lock.json
//     node tools/build.mjs            # public/ -> build/
//     node tools/build.mjs IN OUT     # another folder (deploy.yml builds the preview branch this way)
//
// What changes compared with public/:
// - every <script src="js/NAME.js?v=..."> in index.html is joined, in the same order, into one minified js/app.js,
//   and index.html loads that one file instead (one download instead of ~25). New scripts are picked up by
//   themselves, since the list comes from index.html.
// - styles.css is minified.
// - everything else (sw.js, icons, manifest) is copied as it is.
// The scripts are plain scripts that share globals, so joining them changes nothing: their top-level names stay global
// and keep their names (esbuild only renames names inside functions when it isn't bundling modules).
// Nobody edits build/: edit public/ as always. GitHub runs this before testing and deploying (Pages and Docker).
import {transform} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(process.argv[2] || path.join(root, 'public'));
const out = path.resolve(process.argv[3] || path.join(root, 'build'));
const BUNDLE = 'js/app.js';

function fail(message) {
  console.error('build: ' + message);
  process.exit(1);
}

const page = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const SCRIPT = /<script src="(js\/[\w.-]+\.js)\?v=([\w.-]+)"><\/script>\n?/g;
const scripts = [...page.matchAll(SCRIPT)];
if (!scripts.length) fail('no <script src="js/...?v=..."> found in index.html');
const version = scripts[0][2];
if (scripts.some(m => m[2] !== version)) fail('the scripts in index.html carry different ?v= versions');
const names = scripts.map(m => m[1]);
if (names.includes(BUNDLE)) fail(`public/${BUNDLE} would be overwritten by the bundle; rename it`);
// a script in public/js/ that index.html doesn't load is a mistake: it would never run
const unused = fs.readdirSync(path.join(src, 'js')).filter(f => f.endsWith('.js') && !names.includes('js/' + f));
if (unused.length) fail('not loaded by index.html (add a <script> line for it): ' + unused.join(', '));

// Each file ends with a newline and ; so a file without a final ; can't run into the next one.
const joined = names.map(n => `// ${n}\n${fs.readFileSync(path.join(src, n), 'utf8')}\n;\n`).join('');
const js = await transform(joined, {loader: 'js', minify: true, legalComments: 'none', target: 'esnext', sourcefile: BUNDLE});
const css = await transform(fs.readFileSync(path.join(src, 'styles.css'), 'utf8'),
  {loader: 'css', minify: true, legalComments: 'none', target: 'esnext', sourcefile: 'styles.css'});

// The script tags are replaced by one, where the first of them was; their comment line goes too.
let html = page.replace(/<!--[^>]*Plain scripts[^>]*-->\n?/, '');
let first = true;
html = html.replace(SCRIPT, () => (first ? (first = false, `<script src="${BUNDLE}?v=${version}"></script>\n`) : ''));

fs.rmSync(out, {recursive: true, force: true});
fs.cpSync(src, out, {recursive: true, filter: f => !names.includes(path.relative(src, f).split(path.sep).join('/'))});
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, BUNDLE), js.code);
fs.writeFileSync(path.join(out, 'styles.css'), css.code);
for (const w of [...js.warnings, ...css.warnings]) console.warn('build warning: ' + w.text);

const size = files => files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`build: ${path.relative(root, out) || out} from ${path.relative(root, src) || src}, v${version}`);
console.log(`  ${names.length} scripts ${kb(size(names.map(n => path.join(src, n))))} -> ${BUNDLE} ${kb(Buffer.byteLength(js.code))}`);
console.log(`  styles.css ${kb(size([path.join(src, 'styles.css')]))} -> ${kb(Buffer.byteLength(css.code))}`);

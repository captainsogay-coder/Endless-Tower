// Production build for static hosting (GitHub Pages / any CDN).
//   - bundles and minifies the ES modules into one hashed file (cache-safe)
//   - minifies and hashes the stylesheet
//   - rewrites index.html to point at the hashed assets (relative paths, so the
//     site works both at a custom domain root and under /<repo>/ on github.io)
//   - adds CNAME, .nojekyll, 404.html and the favicon
// Usage: npm run build   →   dist/
import { build } from 'esbuild';
import { readFile, writeFile, rm, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, basename } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'dist');

// never ship side tiers that no longer describe the units (re-measure with `npm run ratings`)
{
  const { registerRoster, ROSTER } = await import('../src/units/roster.js');
  const { isStale } = await import('../src/meta/sideTiers.js');
  registerRoster();
  const stale = ROSTER.filter((d) => isStale(d)).map((d) => d.id);
  if (stale.length) {
    console.error(`side tiers are out of date for: ${stale.join(', ')} – run: npm run ratings`);
    process.exit(1);
  }
}

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'assets'), { recursive: true });

const js = await build({
  entryPoints: [join(ROOT, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020', 'chrome90', 'firefox90', 'safari15'],
  outdir: join(OUT, 'assets'),
  entryNames: 'game-[hash]',
  sourcemap: true,
  metafile: true,
  legalComments: 'none',
  logLevel: 'warning',
});
const css = await build({
  entryPoints: [join(ROOT, 'styles.css')],
  bundle: true,
  minify: true,
  outdir: join(OUT, 'assets'),
  entryNames: 'styles-[hash]',
  metafile: true,
  logLevel: 'warning',
});

const outName = (meta, ext) => basename(Object.keys(meta.outputs).find((f) => f.endsWith(ext)));
const jsFile = outName(js.metafile, '.js');
const cssFile = outName(css.metafile, '.css');

let html = await readFile(join(ROOT, 'index.html'), 'utf8');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`index.html: expected to find ${from}`);
  html = html.replace(from, to);
};
swap('<link rel="stylesheet" href="styles.css" />', `<link rel="stylesheet" href="assets/${cssFile}" />`);
swap('<script type="module" src="src/main.js"></script>', `<script type="module" src="assets/${jsFile}"></script>`);
await writeFile(join(OUT, 'index.html'), html);

await copyFile(join(ROOT, 'favicon.svg'), join(OUT, 'favicon.svg'));
if (existsSync(join(ROOT, 'CNAME'))) await copyFile(join(ROOT, 'CNAME'), join(OUT, 'CNAME'));
await writeFile(join(OUT, '.nojekyll'), '');
await writeFile(
  join(OUT, '404.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Endless Tower</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#ebe7de;font:16px system-ui,sans-serif;text-align:center}a{color:#e3a33b}</style></head>
<body><div><h1>Page not found</h1><p><a id="home" href="/">Play Endless Tower</a></p></div>
<script>
// On project pages (user.github.io/repo/) the game lives under the first path segment.
var seg = location.hostname.endsWith('github.io') ? '/' + (location.pathname.split('/')[1] || '') + '/' : '/';
document.getElementById('home').href = seg;
setTimeout(function () { location.replace(seg); }, 2500);
</script></body></html>`,
);
await writeFile(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');

const kb = (meta) => Object.values(meta.outputs).reduce((s, o) => s + (o.bytes || 0), 0) / 1024;
console.log(`dist/ built: assets/${jsFile} + assets/${cssFile} (${(kb(js.metafile) + kb(css.metafile)).toFixed(0)} KB incl. sourcemap)`);

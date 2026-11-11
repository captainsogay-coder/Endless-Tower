# Deploying Endless Tower

The game is a static site. `npm run build` produces `dist/`:
- one minified, content-hashed JS bundle and stylesheet,
- `index.html`, `404.html`, `favicon.svg`, `robots.txt`, `.nojekyll`,
- `CNAME` (`endlesstower.com`).

All asset paths are relative, so the same build works at a custom-domain root and under `https://<user>.github.io/<repo>/`.

```bash
npm ci
npm test
npm run build            # → dist/
npm run preview          # build, then serve dist/ at http://localhost:8080
node scripts/e2e.mjs http://localhost:8080   # browser end-to-end checks (needs Playwright)
```

## GitHub Pages (automated)

`.github/workflows/deploy.yml` runs on every push to `main` and can also be started by hand from the Actions tab. It:
1. installs, tests and builds,
2. force-pushes `dist/` to the `gh-pages` branch,
3. checks that GitHub Pages is serving that branch, and tries to enable it if not.

`.github/workflows/ci.yml` runs the tests and a build on every other branch and on pull requests.

The live game is at **https://captainsogay-coder.github.io/Endless-Tower/**.

**If the site shows a 404:** GitHub didn't switch Pages on by itself. The run summary will show a warning. Fix it once, in the GitHub web UI: go to Settings → Pages → Build and deployment and set:
- **Source:** Deploy from a branch
- **Branch:** `gh-pages`, folder `/ (root)`

Then Save. The site appears within a minute or two, and every later push to `main` updates it automatically.

## Custom domain: endlesstower.com

> **Status: not configured.** The repository deliberately ships **without** a `CNAME` file right now. With branch-based Pages, a `CNAME` file switches the site to the custom domain and redirects github.io visitors there. Until `endlesstower.com` has DNS pointing at GitHub, that redirect would send everyone to a domain that doesn't resolve, which shows up as an HTTPS/DNS error in the browser. Do the steps below in order.

1. **Own the domain.** Register `endlesstower.com` with a registrar if you haven't already.
2. **Verify the domain** (recommended; prevents domain takeover). Go to GitHub → your profile **Settings** → **Pages** → **Add a domain**, enter `endlesstower.com`, and add the TXT record GitHub shows at your DNS provider.
3. **Add DNS records** at your DNS provider:

   | Type | Name / host | Value |
   | --- | --- | --- |
   | A | `@` (apex) | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | AAAA | `@` | `2606:50c0:8000::153` |
   | AAAA | `@` | `2606:50c0:8001::153` |
   | AAAA | `@` | `2606:50c0:8002::153` |
   | AAAA | `@` | `2606:50c0:8003::153` |
   | CNAME | `www` | `captainsogay-coder.github.io` |

   These are GitHub's published Pages addresses; check them against GitHub's documentation ("Managing a custom domain for your GitHub Pages site") when you set this up.
4. **Wait for DNS to resolve.** Check that `dig +short endlesstower.com A` lists the four `185.199.x.153` addresses.
5. **Turn the domain on.** Add a file named `CNAME` at the repository root containing `endlesstower.com`, and push it to `main`. The build copies it into the published site; don't add it only through the Settings page, because each deploy replaces the `gh-pages` branch.
6. **Enforce HTTPS.** In Settings → Pages, wait for "DNS check successful", then tick **Enforce HTTPS** once the certificate has been issued (this can take up to an hour).

## Runtime robustness

- **Loading screen:** shown until the game reports it has booted.
- **Error screen:** if a script fails to load or the game throws during start-up, the player sees an error with a Reload button instead of a blank page. There is also a 20 s timeout for very slow connections.
- **Old browsers:** browsers without ES-module support get a clear "browser too old" message.
- **Saving:** progress (Tokens, unlocked units, battle plan) is saved in `localStorage`. If storage is unavailable (e.g. some private modes) the game still runs, and Battle Plans warns that progress won't persist.
- **Debug parameters:** URL parameters (`?seed`, `?realm`, `?tokens`) only work on `localhost`. On the public site players cannot choose a battlefield or grant themselves currency.

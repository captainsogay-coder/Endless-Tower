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

`.github/workflows/deploy.yml` runs on every push to `main` and can also be started by hand. It installs, tests, builds and publishes `dist/` with the official Pages actions. `.github/workflows/ci.yml` runs the tests and a build on every other branch and on pull requests.

### One-time setup (repository owner, in the GitHub web UI)

1. **Get the code onto `main`.** The repository currently has only the `claude/endless-tower-core-zoe5z4` branch. Merge it into `main`, or create `main` from it. The deploy workflow only runs from `main`.
2. **Enable Pages.** Go to Settings → Pages → Build and deployment → Source, and choose **GitHub Actions**.
3. **Run the workflow.** Push to `main`, or go to Actions → *Deploy to GitHub Pages* → Run workflow. The site then appears at `https://captainsogay-coder.github.io/Endless-Tower/`.

## Custom domain: endlesstower.com

> **Status: not verified.** I could not check DNS from the build environment, so nothing here confirms that `endlesstower.com` points at GitHub Pages or that you own it. Treat the domain as **not live** until the steps below are done and GitHub shows a green "DNS check successful".

With Actions-based deployments, GitHub reads the custom domain from **repository settings**, not from the `CNAME` file. The file is shipped in `dist/` anyway for hosts that use it.

1. **Own the domain.** Register `endlesstower.com` with a registrar if you haven't already.
2. **Verify the domain** (recommended; prevents domain takeover). Go to GitHub → your profile **Settings** → **Pages** → **Add a domain**, enter `endlesstower.com`, and add the TXT record GitHub shows at your DNS provider. It has the form `_github-pages-challenge-captainsogay-coder.endlesstower.com`.
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

   Remove any other A, AAAA or ALIAS records on the apex. These are GitHub's published Pages addresses; check them against GitHub's documentation ("Managing a custom domain for your GitHub Pages site") when you set this up.
4. **Set the domain on the repository.** Go to Settings → Pages → Custom domain, enter `endlesstower.com` and save. Wait for the DNS check to pass; propagation can take up to 24 hours.
5. **Tick "Enforce HTTPS"** once GitHub has issued the certificate.
6. **Confirm it works** from your own machine, then test the live site with `node scripts/e2e.mjs https://endlesstower.com`:
   ```bash
   dig +short endlesstower.com A          # should list the four 185.199.x.153 addresses
   dig +short www.endlesstower.com CNAME  # should be captainsogay-coder.github.io.
   ```

## Runtime robustness

- **Loading screen:** shown until the game reports it has booted.
- **Error screen:** if a script fails to load or the game throws during start-up, the player sees an error with a Reload button instead of a blank page. There is also a 20 s timeout for very slow connections.
- **Old browsers:** browsers without ES-module support get a clear "browser too old" message.
- **Saving:** progress (Tokens, unlocked units, battle plan) is saved in `localStorage`. If storage is unavailable (e.g. some private modes) the game still runs, and Battle Plans warns that progress won't persist.
- **Debug parameters:** URL parameters (`?seed`, `?realm`, `?tokens`) only work on `localhost`. On the public site players cannot choose a battlefield or grant themselves currency.

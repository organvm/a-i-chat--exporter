# GreasyFork listing packet — staged, one human sign-in from live

**Status:** STAGED. Everything below is ready to paste. The only irreducible human
step is the GreasyFork account sign-in (no account exists under any owner handle —
verified 2026-07-08 against `greasyfork.org/en/users?q=` for `4444j99`, `organvm`,
`padavano`, `ajp41890`), because signing in creates the account. Total effort: ~3 minutes.
Lever: `L-GREASYFORK-PUBLISH` in `organvm/limen` → `his-hand-levers.json`.

## Why this listing exists

The upstream GreasyFork listing ([456055](https://greasyfork.org/scripts/456055-chatgpt-exporter),
24k installs) belongs to `pionxzh` — we cannot update it. Our fork's Buy-Pro rail
(MONETA, `mint.4444j99.dev`) only reaches users through a listing we own. Until it
exists, the mint-armed userscript is installable from:

- Landing page: <https://chatgpt-exporter-e08.pages.dev/> (Cloudflare Pages, auto-deploys on master)
- Direct: <https://chatgpt-exporter-e08.pages.dev/chatgpt.user.js>
- GitHub raw: <https://raw.githubusercontent.com/organvm/a-i-chat--exporter/master/dist/chatgpt.user.js>

## The one human step

1. Go to <https://greasyfork.org/en/users/sign_in> → **Sign in with GitHub**
   (creates the GreasyFork account bound to the GitHub identity; no password to manage).

## Then (either the human or any agent in a signed-in browser session)

2. **Post the script:** <https://greasyfork.org/en/script_versions/new>
   - Choose **"Sync from URL"** (this is the organ, not the one-off: every master
     merge that rebuilds `dist/` propagates to GreasyFork automatically on its
     daily sync, or instantly via "Update from sync source").
   - Sync URL: `https://raw.githubusercontent.com/organvm/a-i-chat--exporter/master/dist/chatgpt.user.js`
3. Fields:
   - **Name** (comes from the userscript `@name`): ChatGPT Exporter
   - **License:** MIT (upstream `pionxzh/chatgpt-exporter` is MIT; attribution below satisfies it)
   - **Description** (from `@description` or override):
     > Export ChatGPT conversations to Markdown, HTML, JSON, PNG, or text — one
     > click, runs entirely in your browser. Sovereign Pro tier: bulk export and
     > multi-provider support unlocked by an offline-verified licence key from the
     > seller's own Bitcoin mint (no payment processor, nothing to phone home to).
   - **Additional info** (paste as-is):
     > Maintained fork of [pionxzh/chatgpt-exporter](https://github.com/pionxzh/chatgpt-exporter)
     > (MIT). Source, issues, and landing page:
     > [organvm/a-i-chat--exporter](https://github.com/organvm/a-i-chat--exporter) ·
     > [install page](https://chatgpt-exporter-e08.pages.dev/).
     > The free tier is untouched: single-conversation export in every format, no
     > account, no tracking. **Pro** (bulk export, multi-provider) is unlocked by a
     > licence key minted at [mint.4444j99.dev](https://mint.4444j99.dev) and
     > verified **offline** against the mint's public key — a purchased key works
     > forever, with zero network calls and nothing a third party can revoke.
4. Submit. Record the resulting listing URL in
   `organvm/a-i-chat--exporter` README (Distribution table) and close the lever.

## Post-publish verification (any agent can run)

```bash
curl -s "https://greasyfork.org/en/scripts?q=chatgpt+exporter" | grep -i organvm  # listing visible
# and the served code must carry the mint:
curl -s <greasyfork code URL> | grep -c "mint.4444j99.dev"   # expect >= 1
```

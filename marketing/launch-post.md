# ChatGPT Exporter — Launch Post (Build in Public)

> **Ground truth:** This is a Tampermonkey userscript that exports ChatGPT
> conversations to Markdown, HTML, JSON, PNG, and plain text.
> ~24k total installs on GreasyFork (since 2022-12), ~10 new installs/day.
> Free + Pro tier (Pro: bulk export, JSON import, TavernAI/Ooba conversion).

---

## Show HN

**Title:** Show HN: ChatGPT Exporter – export your conversations to Markdown,
HTML, JSON, PNG, or text (24k installs, open source)

**Body:**

ChatGPT's web interface has no export button. Your conversations live inside
OpenAI's DOM and API responses. If you want to save a thread, back up your
history, or feed conversations into another tool, you're on your own.

I've been maintaining a userscript that fixes this. It runs in Tampermonkey,
injects an Export menu into the ChatGPT sidebar, and downloads your
conversations in five formats:

- **Markdown** — with YAML front matter, preserved LaTeX, footnotes
- **HTML** — self-contained, dark/light mode, KaTeX-rendered math
- **JSON** — raw API format (matching OpenAI's official export schema)
- **PNG** — full-thread screenshot via html2canvas (2x resolution, UI chrome
  hidden)
- **Plain text** — stripped markdown, copied to clipboard

The free tier handles single-conversation export — what ~95% of users need.
There's a Pro tier (Lemon Squeezy checkout) that adds:
- Bulk export (select N conversations, download a ZIP)
- Import OpenAI's official conversations.json for re-export
- TavernAI and Ooba JSONL/JSON conversion for character-chat frontends

Technical stack: TypeScript + Preact, compiled to a single userscript via
vite-plugin-monkey. The exporter layer uses mdast for AST-based markdown
normalization, html2canvas for screenshots, and JSZip for bulk archives. Rate
limiting for bulk API fetches uses a 200ms/1600ms backoff queue to stay under
ChatGPT's throttles.

~24,000 total installs on GreasyFork, ~10 new installs/day, 9 localized
languages, 80 feedback threads. MIT license. The Free tier has no ads, nags,
or feature degradation.

GitHub: https://github.com/organvm-iii-ergon/a-i-chat--exporter
Install: https://greasyfork.org/scripts/456055-chatgpt-exporter

I'd love feedback on:
1. Formats you'd want that aren't here (PDF? EPUB?)
2. The Pro pricing — too much, too little, wrong structure?
3. Any Chrome API changes breaking userscripts for you lately

---

## Reddit (r/selfhosted + r/ChatGPT)

**Title:** I maintain an open-source ChatGPT exporter — 5 formats, 24k
installs, free + pro [userscript]

**Body:**

ChatGPT conversations are ephemeral by design — no native export, no bulk
download, no way to produce archival copies. OpenAI's data export gives you a
single massive JSON file that's hard to work with directly.

I maintain a userscript (Tampermonkey/Violentmonkey) that adds export buttons
to the ChatGPT sidebar. It converts any conversation to:

- Markdown (YAML front matter, LaTeX preserved)
- HTML (self-contained, dark mode support)
- JSON (official API schema, also TavernAI/Ooba formats)
- PNG screenshot (full thread, 2x resolution)
- Plain text (clipboard)

Free tier does single-conversation export. Pro (one-time purchase via Lemon
Squeezy) adds bulk export, conversations.json import, and character-chat
format conversion.

Runs entirely in your browser. Your data never hits a server. No accounts
required.

~24k total installs over ~3.5 years, ~10 new/day, 9 languages. MIT licensed.

Install: https://greasyfork.org/scripts/456055-chatgpt-exporter
GitHub: https://github.com/organvm-iii-ergon/a-i-chat--exporter

---

## X / Twitter

**Thread:**

1/ ChatGPT conversations disappear into a black hole. No export button. No
bulk download. Just a JSON dump nobody can use.

I built a browser userscript that fixes this. 24k people use it. Here's what
it does 🧵

2/ It's a Tampermonkey script. Install it, open ChatGPT, and you get an Export
menu in your sidebar. One click downloads your conversation in 5 formats:

→ Markdown (.md with YAML front matter)
→ HTML (dark mode, KaTeX math)
→ JSON (raw API format)
→ PNG (full-thread screenshot)
→ Plain text (clipboard)

3/ Free tier covers single-conversation export. Pro adds:

→ Bulk export to ZIP
→ Import OpenAI's official JSON
→ TavernAI / Ooba format conversion

No servers, no accounts, no data leaves your browser.

4/ Stack: TypeScript + Preact, compiled to one .user.js file. mdast for
markdown AST processing, html2canvas for screenshots, JSZip for bulk
archives, Lemon Squeezy for Pro checkout.

5/ 24k installs. 9 languages. 80 feedback threads. 3.5 years of maintenance.
MIT license.

Install → https://greasyfork.org/scripts/456055-chatgpt-exporter
GitHub → https://github.com/organvm-iii-ergon/a-i-chat--exporter

---

## Meta (for SEO / landing page)

**One-liner:** Export ChatGPT conversations to Markdown, HTML, JSON, PNG, or
plain text — one click, no servers, open source.

**Elevator pitch:** ChatGPT Exporter is a browser userscript (Tampermonkey)
that adds export functionality the ChatGPT interface doesn't provide natively.
5 formats, 9 languages, 24k+ users. Free for single conversations, Pro for
bulk workflows.

---

## Pro Tier Copy (for Lemon Squeezy checkout page)

**Headline:** Bulk export, import, and format conversion for power users

**Body:** The free tier handles single-conversation export. If you're a
researcher, writer, or developer who needs to export hundreds of
conversations — or import and re-process OpenAI's official data export — Pro
unlocks:

- **Bulk export** — Select conversations by project or by list, download a ZIP
  of Markdown, HTML, or JSON files
- **Official JSON import** — Upload OpenAI's conversations.json, re-export
  selected conversations in any format
- **TavernAI & Ooba conversion** — Export individual conversations as .jsonl
  (SillyTavern) or .json (text-generation-webui)
- **Conversation management** — Archive or delete API-loaded conversations in
  bulk from the export dialog

One-time purchase. Lifetime license key stored in your browser. No recurring
fees, no account required, no telemetry.

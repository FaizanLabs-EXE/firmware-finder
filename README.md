# FirmwareVault

**FirmwareVault** is a GitHub Pages frontend + Google Apps Script backend for discovering **publicly accessible firmware links** by brand/model.

> It is a discovery/indexing tool, not a firmware host. It does not bypass logins, paid downloads, DRM, CAPTCHAs, private repositories, or access controls.

## What is included

- Responsive glassmorphism UI; no PNGs, no image/assets folder.
- Brand + exact model search.
- Public discovery from:
  - Internet Archive Advanced Search
  - GitHub public repository search
  - Community-submitted links stored in Google Sheets
- Relevance scoring.
- Result sorting.
- One-click original-source download/open.
- Copy direct URL.
- Community submission form.
- SHA-256 field for user-provided verification metadata.
- Basic anti-paywall/login URL filtering.
- Search log in Google Sheets.
- GitHub Pages compatible static frontend.
- Apps Script backend with JSON/JSONP responses.
- Your signature: **╰─➤ ⚡ 𝐁𝐔𝐈𝐋𝐓 𝐁𝐘 𝐅𝐀𝐈𝐙𝐀𝐍™**

## Architecture

```text
GitHub Pages
  └─ index.html + styles.css + app.js + config.js
                 │
                 │ JSONP
                 ▼
Google Apps Script Web App
  ├─ public discovery
  │   ├─ Internet Archive
  │   └─ GitHub REST API
  ├─ Community index
  │   └─ Google Sheets
  └─ Search log
```

The browser is sent to the **original public URL** for a download. The Apps Script server does not proxy large firmware files, which keeps your bandwidth and Apps Script execution usage low.

## Setup — Google Apps Script

1. Open Google Apps Script and create a **standalone project**.
2. Replace `Code.gs` with the repository's `Code.gs`.
3. Open **Project Settings → Script properties** only if you want to manage the sheet ID manually. The included setup does not require it.
4. Run `initialize()` once from the Apps Script editor.
5. Approve the requested permissions.
6. Open **Deploy → New deployment → Web app**.
7. Set:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Copy the deployed URL ending in `/exec`.

Google documents Apps Script web apps and `doGet`/`doPost` here:
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/content

## Setup — GitHub Pages

1. Upload the contents of this folder to the root of a GitHub repository.
2. Open `config.js`.
3. Replace:

```js
GAS_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE"
```

with your `/exec` URL.
4. Enable **Settings → Pages** for the repository.
5. Open the generated GitHub Pages URL.

No build step is required.

## Search behavior

FirmwareVault intentionally does **not** claim to crawl literally every website on the internet. That is not reliable or appropriate for a static GitHub page.

The backend uses public searchable indexes and a community index. This can be extended with additional **public APIs** in `Code.gs`.

### Adding another public source

Create a function returning the same object shape:

```js
{
  source: "Example Source",
  sourceUrl: "https://example.com/item",
  name: "firmware.zip",
  brand: "Samsung",
  model: "SM-A235F",
  version: "A235FXXU...",
  url: "https://example.com/files/firmware.zip",
  size: "5.2 GB",
  sizeBytes: 5583457484,
  date: "2026-01-01",
  verified: false,
  fileType: "ZIP",
  searchableText: "Samsung SM-A235F firmware.zip"
}
```

Then append it in `searchFirmware_()`.

## Community moderation

Submissions are stored with `pending` status.

The current search function accepts both `pending` and `approved` links so a newly submitted link can appear immediately. If you want manual moderation, change:

```js
if (status !== 'approved' && status !== 'pending') continue;
```

to:

```js
if (status !== 'approved') continue;
```

Then change the `Status` cell in Google Sheets from `pending` to `approved`.

For a public production deployment, manual moderation is recommended.

## Important download behavior

The "Direct download" button points at the source URL. FirmwareVault does not relay the file through Google Apps Script.

That means:
- large files do not consume your Apps Script bandwidth;
- download speed is determined by the original host/CDN and the user's connection;
- if a source requires login, payment, CAPTCHA, or another access control, FirmwareVault does not bypass it.

## Security notes

- Never put a private API key in `config.js`.
- Do not store Google OAuth tokens in the frontend.
- Apps Script is configured as the server-side component.
- Keep community submissions public-link only.
- Consider adding rate limiting, reCAPTCHA/Turnstile, a moderation queue and an abuse-report field before large-scale public deployment.

## Optional enhancements

This base can be extended with:
- device-family aliases;
- region/carrier filters;
- checksum verification;
- firmware file metadata extraction;
- source health monitoring;
- duplicate/near-duplicate detection;
- scheduled source indexing;
- admin moderation dashboard;
- Telegram/Discord notifications;
- GitHub Actions for static linting and link checks.

## License

Choose a license that matches your intended distribution. The code does not grant permission to redistribute firmware files owned by third parties. Always respect the source's license and applicable copyright rules.

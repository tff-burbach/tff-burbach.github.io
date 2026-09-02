# Site Improvement Plan

Items are grouped by effort and worked top-to-bottom. Check off each item as it is done.

---

## Group 1 — HTML Bugs (silent breakage, fix first)

- [x] **1.1 Duplicate IDs in table.html** — `currentMatchDayGames`, `status`, `empty`, `refreshData`, `gamesRowHeader`, `tableRowTemplate`, `nextMatchDayGames` appear in both the Ligaphase and Abstiegsrunde blocks. `getElementById` silently returns the first match, causing the wrong block to update. Fix: add a `Playoff` suffix to every ID in the playoff block and update all JS references.

- [x] **1.2 Stray `-->` in #main opening tag** — `_layouts/default.html` has a leftover comment fragment in the `data-bs-smooth-scroll` attribute string. Remove the `-->`.

- [x] **1.3 Malformed navbar closing tag** — `<a class="navbar-brand" href="#">TFF Burbach<a></a>` has a stray opening `<a>` where the closing `</a>` should be.

- [x] **1.4 Source map loaded as script** — `_includes/js.html` loads `bootstrap.bundle.js.map` via a `<script>` tag. Remove that tag; source maps are fetched automatically by DevTools.

- [x] **1.5 Self-closing `<p>` in events.html** — `<p class="clearfix" />` is invalid HTML (non-void element). Change to `<p class="clearfix"></p>`.

---

## Group 2 — Data / Logic Bugs

- [x] **2.1 `getLeagueUrl()` ignores its parameters** — `stfvData.js` accepts `leaguename`, `matchdayno`, `year`, `category`, `groupNo` but always returns the same hardcoded URL. Fix: build the URL from the parameters so callers requesting a specific matchday or league get the correct page.

- [x] **2.2 Mobile/desktop filter desync**
- [x] **2.3 Auto-refresh fires in background tabs**
- [x] **2.4 Liquid JS string escaping**

---

## Group 3 — UX Quick Wins

- [x] **3.1 Tooltip for truncated team names**
- [x] **3.2 Navigation button labels**
- [x] **3.3 Friendly matches filter**

---

## Group 4 — Performance

- [x] **4.1 Consolidate Google Fonts requests**
- [x] **4.2 Add `preconnect` hints**
- [x] **4.3 Remove IE8 shims**
- [x] **4.4 Delete backup/draft JS files**

---

## Group 5 — Missing Features

- [ ] **5.1 Enable contact form** — `_includes/contact.html` exists and the scripts are present but commented out in `js.html`. Include the section in `default.html` and re-enable the scripts.

- [ ] **5.2 Enable news/blog** — `default.html` never outputs `{{ content }}`, so `index.html`'s posts loop is silently discarded. Add `{{ content }}` in the right place and verify post rendering.

- [ ] **5.3 Calendar export (iCal)** — Generate an `.ics` file from `tffData.termine` at build time (Jekyll generator plugin or a static pre-generated file) and add a download link in the events section.

- [ ] **5.4 Cookie consent banner** — Google Analytics loads unconditionally. Add a minimal consent banner and only inject the GA snippet after consent.

---

## Group 6 — Resilience

- [ ] **6.1 CORS proxy fallback robustness** — The proxy chain relies on `ralph-kiefer.workers.dev` → `allorigins.win` → `corsproxy.io`. Consider a self-hosted Cloudflare Worker as the sole primary to remove dependency on two public free-tier services.

- [ ] **6.2 Guard JS initialisation order** — If `tffTools` or `stfvData` fails to load before `jQuery(document).ready`, `tffTools.showTFFData()` throws with no user-visible message. Wrap in a try/catch and surface a meaningful error state.

---

## Deferred / Larger scope

- Team/squad roster page
- Photo gallery / media archive
- Season results archive (multi-year)
- Dark/light mode toggle (currently hardcoded `data-bs-theme="dark"`)
- Additional social channels (Instagram, YouTube)

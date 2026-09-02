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

- [ ] **2.1 `getLeagueUrl()` ignores its parameters** — `stfvData.js` accepts `leaguename`, `matchdayno`, `year`, `category`, `groupNo` but always returns the same hardcoded URL. Fix: build the URL from the parameters so callers requesting a specific matchday or league get the correct page.

- [ ] **2.2 Mobile/desktop filter desync** — The mobile `<select>` and desktop `<button>` filters each drive the view independently. Selecting via dropdown does not update the attribute that desktop buttons read (and vice versa). Fix: funnel both inputs through a single `setView(name)` helper.

- [ ] **2.3 Auto-refresh fires in background tabs** — The `setTimeout` in `tffTools.js` is never cleared when the page is hidden. Fix: pause the timer on `visibilitychange` (hidden) and restart it when the page becomes visible again.

- [ ] **2.4 Liquid JS string escaping** — Team names and addresses from `_data` / `tffData.js` are emitted into JS array literals without JS-escaping. An apostrophe or quote in a name breaks the array silently. Fix: run values through a `jsonify` filter or escape single quotes before output.

---

## Group 3 — UX Quick Wins

- [ ] **3.1 Tooltip for truncated team names** — Table cells use `text-truncate` but provide no way to see the full name. Add `data-bs-toggle="tooltip" title="{{ name }}"` and initialise Bootstrap tooltips.

- [ ] **3.2 Navigation button labels** — Prev/next matchday buttons contain only an unlabelled SVG. Add `aria-label="Vorheriger Spieltag"` / `aria-label="Nächster Spieltag"` and `aria-hidden="true"` on the SVG elements.

- [ ] **3.3 Friendly matches filter** — `friendlySchedules` is handled in `tffTools.js` but has no `<button>` or `<option>` in the filter UI. Add the missing filter entry to both `events.html` filter controls.

---

## Group 4 — Performance

- [ ] **4.1 Consolidate Google Fonts requests** — Replace five separate `?family=` requests with one combined URL and add `&display=swap`.

- [ ] **4.2 Add `preconnect` hints** — Add `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` in `<head>`.

- [ ] **4.3 Remove IE8 shims** — `html5shiv` and `respond.js` are loaded from external CDNs on every page load. Remove them; no supported browser needs them.

- [ ] **4.4 Delete backup/draft JS files** — Remove `js/stfvData copy.js`, `js/stfvData copy 2.js`, `js/tffTools_backup.js`, `js/tffDataNew.js` from the repo.

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

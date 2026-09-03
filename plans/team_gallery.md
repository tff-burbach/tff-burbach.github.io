# Plan: Team Gallery Section

## Overview

Add a new collapsible `#team` section between `table.html` and `club.html` in `_layouts/default.html`. The section fetches the STFV club-detail page for TFF Burbach (club id=272) via the existing CORS-proxy, parses player names and photo URLs, and renders a Bootstrap card grid. Fetch is **deferred until the accordion opens** (lazy), so it adds zero cost to the initial page load.

---

## STFV Source Page — What to Parse

URL: `https://stfv.de/verband/vereine?task=verein_details&id=272`

- 23 active members listed in rows matching `tr.sectiontableentry1` / `tr.sectiontableentry2`
- Player photos at `https://stfv.de/images/sportsmanager/spieler/I{playerID}T{timestamp}W90H120.jpg`
- Player name exposed inside an `<a>` anchor within the same table cell as the photo
- Membership numbers appear in a sibling column — not needed for the gallery

**Parse strategy (two-pass, degrades gracefully):**

1. Find `img[src*="/images/sportsmanager/spieler/"]` — gives photo + name from nearest `<a>`
2. Fall back to plain `<a>` text in `tr.sectiontableentry1/2` rows that had no photo

Photo base: `https://stfv.de` (prepend to relative src).

---

## Files to Create or Modify

| Action | File |
|--------|------|
| **Create** | `_includes/team.html` |
| **Modify** | `_layouts/default.html` — one line |
| **Modify** | `js/stfvData.js` — 3 new functions |
| **Modify** | `js/tffTools.js` — 1 new function |
| **Modify** | `_includes/js.html` — 1 event listener |
| Optional | `_includes/header.html` — navbar entry |

---

## `_includes/team.html` — HTML Structure

```html
<section id="team">
  <div class="fs-4">

    <div class="row">
      <div class="col-12 text-center">
        <button
          class="btn btn-link text-decoration-none w-100 d-flex align-items-center justify-content-center gap-2"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#teamGalleryContent"
          aria-expanded="false"
          aria-controls="teamGalleryContent"
          id="teamGalleryToggle"
        >
          <h2 class="section-heading mb-0">Mannschaft</h2>
          <svg id="teamGalleryChevron" class="team-chevron" aria-hidden="true"
               width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd"
              d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
        <h3 class="section-subheading text-muted d-none" id="teamGallerySubheading">
          Alle Mitglieder laut STFV.
        </h3>
      </div>
    </div>

    <div class="collapse" id="teamGalleryContent">

      <div id="teamGalleryLoading" class="events-loading">
        <div class="spinner-container">
          <div class="spinner"></div>
          <div class="loading-text">Mannschaft wird geladen...</div>
        </div>
      </div>

      <div id="teamGalleryError" class="text-center text-muted d-none">
        Daten konnten nicht geladen werden.
        <a href="https://stfv.de/verband/vereine?task=verein_details&id=272"
           target="_blank" class="btn btn-link">STFV</a>
      </div>

      <!-- Card grid — populated by JS -->
      <div id="teamGalleryGrid"
           class="row row-cols-3 row-cols-sm-4 row-cols-md-5 row-cols-lg-6 g-3 d-none">
        <!-- Hidden template, cloned per player -->
        <div id="teamMemberTemplate" class="col d-none">
          <div class="team-member text-center text-truncate">
            <img src="" alt="" class="team-member-photo img-fluid rounded mb-1"
                 style="width:90px;height:120px;object-fit:cover;">
            <div class="fw-bold fs-5 text-truncate team-member-name"></div>
          </div>
        </div>
      </div>

      <div class="row mt-2">
        <div class="col text-center fs-6">
          <a href="https://stfv.de/verband/vereine?task=verein_details&id=272"
             target="_blank" class="btn btn-link link-stfv">STFV Vereinsseite</a>
        </div>
      </div>

    </div>
  </div>
</section>

<style>
  .team-chevron { transition: transform .25s ease; }
  #teamGalleryToggle[aria-expanded="true"] .team-chevron { transform: rotate(180deg); }
</style>
```

---

## `_layouts/default.html` — Insert One Line

```html
{% include events.html %}
{% include table.html %}
{% include team.html %}   ← add here
{% include club.html %}
```

---

## `js/stfvData.js` — Three New Functions

Add after the existing `extractCupData` block:

```javascript
getClubUrl(clubId) {
    return `https://stfv.de/verband/vereine?task=verein_details&id=${clubId}`;
},

async fetchClubFromStfv(clubId) {
    const sourceUrl = stfvData.getClubUrl(clubId);
    let response;
    try {
        response = await stfvData.fetchFromStfv(sourceUrl);
    } catch (ex) {
        stfvData.showDataError('STFV Vereinsdaten konnten nicht geladen werden.');
        throw ex;
    }
    const div = document.createElement('div');
    div.innerHTML = response;
    return div;
},

extractTeamMembers(clubHtml) {
    const members = [];
    const seen = new Set();

    // Strategy A: rows with player photo
    $(clubHtml).find('img[src*="/images/sportsmanager/spieler/"]').each(function () {
        const rawSrc = $(this).attr('src') || '';
        const photoUrl = rawSrc.startsWith('http') ? rawSrc : 'https://stfv.de' + rawSrc;
        const $td = $(this).closest('td');
        let name = $td.find('a').first().text().replace(/\s+/g, ' ').trim();
        if (!name) {
            name = $td.clone().children('img, br').remove().end()
                        .text().replace(/\s+/g, ' ').trim();
        }
        if (name && !seen.has(name)) {
            seen.add(name);
            members.push({ name, photoUrl });
        }
    });

    // Strategy B: plain name rows without photos
    $(clubHtml).find('tr.sectiontableentry1, tr.sectiontableentry2').each(function () {
        const name = $(this).find('td a').first().text().replace(/\s+/g, ' ').trim();
        if (name && !seen.has(name)) {
            seen.add(name);
            members.push({ name, photoUrl: null });
        }
    });

    members.sort((a, b) => {
        const lastName = n => n.split(' ').pop().toLowerCase();
        return lastName(a.name).localeCompare(lastName(b.name), 'de');
    });

    return members;
},

async collectTeamMembers(clubId) {
    const html = await stfvData.fetchClubFromStfv(clubId);
    return stfvData.extractTeamMembers(html);
},
```

---

## `js/tffTools.js` — New Render Function

Add `showTeamGallery` to the `tffTools` object:

```javascript
showTeamGallery: async function () {
    const $grid     = $('#teamGalleryGrid');
    const $loading  = $('#teamGalleryLoading');
    const $error    = $('#teamGalleryError');
    const $sub      = $('#teamGallerySubheading');
    const $template = $('#teamMemberTemplate');

    if ($grid.children('.teamMemberGenerated').length > 0) return;

    $loading.removeClass('d-none');
    $error.addClass('d-none');

    let members;
    try {
        members = await stfvData.collectTeamMembers(272);
    } catch (e) {
        $loading.addClass('d-none');
        $error.removeClass('d-none');
        return;
    }

    $loading.addClass('d-none');

    if (!members || members.length === 0) {
        $error.removeClass('d-none');
        return;
    }

    members.forEach((member, i) => {
        const $card = $template.clone();
        $card.attr('id', 'teamMemberGenerated' + i)
             .addClass('teamMemberGenerated').removeClass('d-none').removeAttr('style');

        const $img = $card.find('.team-member-photo');
        const src = member.photoUrl || '/img/vereinswappen_small.png';
        $img.attr('src', src).attr('alt', member.name);
        $img.on('error', function () { $(this).attr('src', '/img/vereinswappen_small.png'); });

        $card.find('.team-member-name').text(member.name);
        $grid.append($card);
    });

    $grid.removeClass('d-none');
    $sub.removeClass('d-none');
},
```

---

## `_includes/js.html` — Collapse Event Listener

Append after the `tffTools.showTFFData()` call in the `$(document).ready` block:

```javascript
const teamCollapseEl = document.getElementById('teamGalleryContent');
if (teamCollapseEl) {
    teamCollapseEl.addEventListener('show.bs.collapse', function onFirstOpen() {
        tffTools.showTeamGallery();
        teamCollapseEl.removeEventListener('show.bs.collapse', onFirstOpen);
    });
}
```

The `show.bs.collapse` event fires before the animation starts — correct timing to show the spinner. The listener removes itself so the STFV fetch runs at most once per session.

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| CORS proxy unreachable | Spinner hidden, `#teamGalleryError` shown with direct STFV link |
| STFV HTML changes / no matches | Empty array → same error path |
| Individual photo 404 | `img.onerror` replaces with `/img/vereinswappen_small.png` |
| Section never expanded | Zero extra network requests |

---

## Optional: Navbar Entry

In `_includes/header.html`, add alongside the existing nav items:

```html
<li class="nav-item">
  <a class="nav-link" href="#team">Mannschaft</a>
</li>
```

---

## Implementation Order

1. Create `_includes/team.html`
2. Add `{% include team.html %}` to `_layouts/default.html`
3. Add functions to `js/stfvData.js`
4. Add `showTeamGallery` to `js/tffTools.js`
5. Add collapse listener to `_includes/js.html`
6. (Optional) Add navbar entry in `_includes/header.html`

Steps 3–5 are independent and can be done in parallel.

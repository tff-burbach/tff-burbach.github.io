# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jekyll-based GitHub Pages website for TFF Burbach, a German table football (foosball) sports club from Saarbrücken. The site displays team schedules, league standings, match results, and club information. It dynamically fetches live data from the STFV (Saarländischer Tischfussballverband) website.

## Build and Development Commands

**Build the site:**
```bash
bundle exec jekyll build
```

**Serve locally (with live reload):**
```bash
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`

**Install dependencies:**
```bash
bundle install
```

## Architecture

### Jekyll Structure

- **`_config.yml`**: Site configuration, metadata, and settings
- **`_data/stfv.yml`**: Configuration for STFV data access (team name, league)
- **`_includes/`**: Reusable HTML components (header, footer, events, table, etc.)
- **`_layouts/default.html`**: Main page layout that includes all sections
- **`_sass/`**: SCSS stylesheets for Bootstrap and custom styling
- **`_plugins/hex_to_rgb.rb`**: Custom Liquid filter for hex color conversion
- **`_site/`**: Generated static site (do not edit directly)

### JavaScript Architecture

The JavaScript follows a modular pattern with three main components:

**`js/tffData.js`**: Data structure and configuration
- Defines event types (Liga, Bonzini, Pokal, Playoff, etc.)
- Contains static team/league configuration
- Stores the `termine` (appointments/events) array
- Type-to-string mapping functions

**`js/stfvData.js`**: STFV data fetching and parsing
- Fetches live data from STFV website via CORS proxy (`api.codetabs.com`)
- Falls back to local backup HTML if fetch fails
- Parses STFV HTML tables to extract:
  - League standings (teams, scores, goals, sets)
  - Match schedules and results
  - Match day information
- Uses jQuery for DOM parsing of external HTML

**`js/tffTools.js`**: Main UI logic and rendering
- Orchestrates data initialization and display
- Implements caching (5-minute default)
- Renders schedules with filtering by type
- Renders league tables and match results
- Handles navigation between match days
- Fetches venue addresses dynamically from `stfv/vereinsinfos.html`
- Auto-refreshes data periodically

### Data Flow

1. Page loads → `tffTools.showTFFData()` called
2. `_initializeData()` checks cache validity
3. If expired, calls `stfvData.collectLeagueData()` and `collectPlayoffLeagueData()`
4. STFV data is fetched via proxy (or backup file)
5. HTML is parsed to extract matches and standings
6. Generated matches are merged into `tffData.termine` array
7. UI components render schedules and tables
8. Address lookup runs to populate venue information
9. Timer set to refresh after cache expires

### Key Features

**CORS Proxy**: Uses `api.codetabs.com/v1/proxy` to fetch STFV data cross-origin
**Backup Data**: Falls back to `/stfv/landesliga-classic.html` if live fetch fails
**Event Types**: Different match types (L=Liga, P=Pokal, O=Playoff, B=Bonzini, F=Friendly, I=Info)
**Dynamic Addresses**: Fetches venue info from opponent teams via `vereinsinfos.html`
**Responsive Design**: Bootstrap-based with mobile-friendly layout

## Important Files

- **`index.html`**: Main entry point (uses default layout)
- **`_includes/events.html`**: Schedule display component
- **`_includes/table.html`**: League table and match results component (contains both regular and playoff table sections)
- **`_includes/js.html`**: Script includes (jQuery, Bootstrap, custom JS)
- **`stfv/vereinsinfos.html`**: Cached STFV venue/address data
- **`stfv/landesliga-classic.html`**: Backup STFV league data

## Configuration

Team and league settings are in `js/tffData.js`:
```javascript
einstellungen: {
    teamName: 'TFF Burbach',
    jahr: '2026',
    ligaName: 'Landesliga',
    // ...
}
```

The `tffTools.getTeam()` function returns the current team config.

## Git Workflow

- Main branch: `main`
- Current working branch: `claude`
- Changes are typically committed to feature branches before merging to main

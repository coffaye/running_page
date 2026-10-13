# Ayu Running Page 3.0 upgrade

Upstream: yihong0618/running_page at 61563c049c75dc8813283d1a109941d751dcd0d4.
Previous Ayu master: f2a60a5497392cfe15e34ba5735de39c1e2c3170.
The previous complete site is retained on backup/running-page-before-3-20261013.

The default theme is the upstream Dashboard. The upstream Classic theme and
the existing Ayu report menu, manifest parser, compatibility tests, Worker
entry URL and historical reports are retained.

## Personalization

| Previous customization | New location |
| --- | --- |
| Pink brand, heart-rate and selected UI colors | config.yml accent_color: #f56bb2, shared by both themes |
| Dark-mode cyan selected route | config.yml selected_route_color: #00ffff |
| Readable light-mode accent | config.yml accent_text_color_light: #b62c72 |
| Ayu avatar and site title | config.yml avatar, index.html and site metadata |
| Mapbox configuration | Old configuration retained in backup; Dashboard uses its supported free map fallback until MAPBOX_TOKEN is configured in Actions |
| View/generate daily report, mutually exclusive menus | Existing src/features/ayuReports, reused in both activity tables |
| COROS download retries and optional reverse geocoding | Existing COROS sync and generator behavior retained during merge |

The old dark-mode source used #ff69b4 and rgb(255,105,180). The user's current
requested brand color is now consistently #f56bb2. Dashboard progress,
heatmap, activity controls and ordinary run routes use the shared color;
selected routes remain cyan and the Classic SVG's secondary highlight stays
yellow. Normal body text retains the upstream neutral colors for readability.

No Mapbox credential was uploaded or added to the new source. A future
explicitly authorized MAPBOX_TOKEN can be injected through the existing
GitHub Actions VITE_MAPBOX_TOKEN build environment.

config.yml can switch theme_preset between dashboard and classic. The
default goal values are upstream defaults and remain editable in that file.

## Verification

- Production build with the GitHub Pages /running_page base succeeds.
- TypeScript type check and full frontend ESLint pass.
- Existing report compatibility tests: 4 passed.
- Existing offline generator/TUI tests: 16 passed.
- YAML parsing and Python compileall pass.
- Desktop/mobile, light/dark, summary, tracks and report menu browser checks pass.
- All activity/FIT/database data, generated personal assets, avatars,
  historical report HTML and public manifest are unchanged by this upgrade.

On Windows, a raw Prettier check flags checkout CRLF line endings. Checking
the normalized Git source with the same configuration reports zero additional
formatting differences; no whole-repository formatter was run.

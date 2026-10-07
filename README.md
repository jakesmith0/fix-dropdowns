# Fix Dropdowns

A self-contained bookmarklet for searching one large native dropdown at a time.

**For users:** [install and try Fix Dropdowns](https://jakesmith0.github.io/fix-dropdowns/).

**For developers:** [open the compatibility fixtures and live checks](https://jakesmith0.github.io/fix-dropdowns/tests.html).

## Development

```sh
npm ci
npm run build
npx playwright install chromium
npm test
```

Open `index.html` for the landing page, or `tests.html` for the engineering fixtures. For clipboard testing, use localhost or the HTTPS Pages deployment.

## Repository layout

| File | Purpose |
| --- | --- |
| `fix-dropdowns.js` | Readable bookmarklet source: scan, match, select, drag and clean up |
| `build.mjs` | Minifies and embeds the complete script in both pages |
| `index.template.html`, `landing.js` | User landing page, installation help and guided sample order |
| `tests.template.html`, `demo-checks.js` | Compatibility fixtures, on-page checks and event log |
| `tests/bookmarklet.spec.mjs` | Browser tests against the built bookmarklet |
| `index.html`, `tests.html` | Generated pages served by GitHub Pages; commit after building |

## Current behavior

- Finds enabled, single-choice native `select` elements in the main document with at least 15 available, nonempty options.
- Searches only the chosen field, using normalized exact, substring, token and fuzzy matching. Shows at most 60 results; all options remain searchable.
- Sets the underlying option and dispatches bubbling `input` and `change` events. Observes dependent/dynamic changes and rejects stale results.
- Uses a draggable Shadow DOM panel, with keyboard selection and mouse/touch movement constrained to the viewport. Closing removes its listeners and observer.

Native option groups and native-backed wrappers that respond to change events are supported. Pure custom widgets, multiple selection, frames and virtualized or server-loaded choices are currently outside scope. Disabled options, disabled groups and disabled fieldsets stay unavailable.

## Extending compatibility

Keep widget detection and selection separate from search/UI. For a custom implementation, identify its trigger and option container, read its loaded options, and select through the real widget's event handler. Validate visible state, form state, disabled items and dependent updates in fixtures and browser tests. Do not assume ARIA markup alone guarantees compatibility with every widget.

Widgets that load options on demand need specific integration and an explicit way to report incomplete option coverage. Keep one dropdown per search.

## Privacy and distribution

The bookmarklet contains its entire runtime: no remote loading, network calls, telemetry or storage. The host website can still make its own requests when a selection changes. Build and test packages are development dependencies only.

GitHub Pages publishes the repository root from `main`. An installed bookmark contains a fixed copy and must be replaced to update. Bookmark icons belong to the browser; the site's favicon does not reliably set a JavaScript bookmark's icon.

## License

MIT

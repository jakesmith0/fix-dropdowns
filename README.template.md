# Fix Dropdowns

A tiny, self-contained bookmarklet that makes large native HTML dropdowns searchable. Choose one dropdown in the panel, search its options, and select a result. It changes the page's original dropdown and sends normal bubbling `input` and `change` events.

## Install and try it

**Desktop/laptop:** [Open the demo and drag the “🔎 Fix Dropdowns v1.1” button to your bookmarks bar](https://jakesmith0.github.io/fix-dropdowns/). On another page, click that bookmark to open the search overlay. If you installed v1 before, replace that bookmark with the new button to get this version.

The panel searches **one dropdown at a time**. Use its picker to switch fields. Drag its header with a mouse or touch to move it out of the way. It stays within the screen when moved or resized, and its size stays steady as results change.

The demo includes native lists, dependent products, option groups, disabled options, accents, a custom wrapper with a hidden native select, dynamically inserted 1,000-option lists, and an unsupported pure custom widget. **Run demo checks** exercises the supported examples and confirms excluded controls stay excluded.

The button is also included in this README's source as a bookmarklet link. GitHub removes `javascript:` links when it renders Markdown, so use the [live drag button](https://jakesmith0.github.io/fix-dropdowns/) rather than trying to drag it from the GitHub README:

<a href="{{BOOKMARKLET}}" draggable="true">🔎 Fix Dropdowns</a>

**iPad Safari:** bookmark the [demo page](https://jakesmith0.github.io/fix-dropdowns/), edit that bookmark, rename it “Fix Dropdowns”, and replace its address with the complete one-line `javascript:` code below. Apple documents how to [add and edit bookmarks on iPad](https://support.apple.com/guide/ipad/bookmark-a-website-ipadc602b75b/27/ipados/27). This setup is less convenient than dragging on a computer, and some sites or browser policies may block bookmarklets. The overlay itself has a touch-friendly layout.

<details><summary>Show bookmarklet address for manual setup</summary>

```text
{{BOOKMARKLET}}
```

</details>

## How it works

- Scans the current document for enabled, single-choice `<select>` elements with at least 15 nonempty options.
- Searches only the dropdown chosen in the picker. Exact, substring, word-prefix, and fuzzy matches are ranked in that order. Accents and punctuation are normalized, with one-edit typo tolerance and character-order matching for longer words. A single-letter query matches word starts to reduce noise.
- Uses the underlying real option, then dispatches bubbling `input` and `change` events. It rescans when the page changes, so dependent dropdowns can appear in the same session.
- Press **Enter** to choose the highlighted result, **↑/↓** to move, or **Escape** to close. Empty searches do not preselect a result for Enter. Your current selection is marked in the list.

The bookmarklet contains all its code. It loads no remote scripts, makes no network requests, stores nothing, and includes no telemetry. It can read and change the current page's dropdowns when clicked; the website may itself send form data after a selection. You can inspect the readable source in [`fix-dropdowns.js`](fix-dropdowns.js).

This version handles native dropdowns in the main document, including hidden native selects behind styled widgets when the widget responds to normal change events. Pure custom JavaScript widgets, virtualized/server-loaded choices, multiple selection and dropdowns inside frames are outside its scope. The demo makes these boundaries explicit; it does not claim compatibility with every third-party library.

## Build

`npm install && npm run build` regenerates `index.html` and this README from the readable source and templates. Terser is used only while building; the published bookmarklet has no dependencies.

Run `npx playwright install chromium` once, then `npm test` for browser tests covering selection/events, per-field isolation, dependent and dynamic updates, wrappers, unavailable options, keyboard controls, dragging, viewport bounds, mobile layout, and repeated activation.

## License

MIT

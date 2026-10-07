# Fix Dropdowns

A tiny, self-contained bookmarklet that makes large native HTML dropdowns searchable. Click it on a page with a large `<select>`, search across the options, and choose a result. It changes the page's original dropdown and sends normal bubbling `input` and `change` events.

## Install and try it

**Desktop/laptop:** [Open the demo and drag the “🔎 Fix Dropdowns” button to your bookmarks bar](https://jakesmith0.github.io/fix-dropdowns/). On another page, click that bookmark to open the search overlay. The demo includes large dropdowns, a small dropdown that should be ignored, and a product dropdown that changes when you choose a manufacturer.

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
- Searches option text locally. Exact, substring, word-prefix, and loose character-order matches are ranked in that order.
- Uses the underlying real option, then dispatches bubbling `input` and `change` events. It rescans when the page changes, so dependent dropdowns can appear in the same session.
- Press **Enter** to choose the highlighted result, **↑/↓** to move, or **Escape** to close.

The bookmarklet contains all its code. It loads no remote scripts, makes no network requests, stores nothing, and includes no telemetry. It can read and change the current page's dropdowns when clicked; the website may itself send form data after a selection. You can inspect the readable source in [`fix-dropdowns.js`](fix-dropdowns.js).

This v1 handles native dropdowns in the main document. Custom JavaScript widgets and dropdowns inside frames are outside its scope.

## Build

`npm install && npm run build` regenerates `index.html` and this README from the readable source and templates. Terser is used only while building; the published bookmarklet has no dependencies.

## License

MIT

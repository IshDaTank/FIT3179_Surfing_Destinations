# FIT3179 DV2 — Minimal dashboard

Only the files needed to build and display the charts are included:

- `index.html` — sections and chart positions
- `css/style.css` — all presentation styles
- `js/main.js` — loads each chart JSON, renders it, then displays its associated annotation, analysis and source
- `specs/` — one Vega-Lite 6 JSON file for each completed chart
- `data/` — only datasets used by the charts

## Add a chart

1. Add `specs/map-reserves.json` (or another name that matches the corresponding `data-chart` in `index.html`).
2. Put the Vega-Lite specification and the chart's text in that **same** file, using the `usermeta` field shown below.
3. Upload to GitHub. The chart appears automatically; no changes to `main.js` are needed.

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "usermeta": {
    "title": "Where are Australia's surfing reserves?",
    "annotation": "NSW has 11 of the 19 listed reserves.",
    "analysis": "Write an evidence-based paragraph that interprets the pattern and explains why it matters.",
    "source": {
      "label": "National Surfing Reserves",
      "url": "https://surfingreserves.org.au/national-surfing-reserves/"
    }
  },
  "data": {"url": "data/reserves.csv"},
  "mark": "point",
  "encoding": {
    "x": {"field": "lon", "type": "quantitative"},
    "y": {"field": "lat", "type": "quantitative"}
  }
}
```

The example above only demonstrates structure. It is **not** the final map: real maps must use geographic position and an appropriate projection. Vega-Lite `layer` marks can add labels, rules and arrows *inside* a plot, while `usermeta.annotation` creates the separate arrow-styled callout below it.

Unbuilt charts have no spec JSON and do not display empty cards. The chart JSON carries the title, annotations, story and source, so there is no separate manifest or text file to maintain.

The included `data/reserves.csv` is inherited from the previous base build; confirm its entries against the primary register before submitting. All dependencies are loaded via CDN, so GitHub Pages requires an internet connection to load Vega-Lite.

// Load each Vega-Lite chart and its accompanying text from one JSON file.
const root = new URL('../', import.meta.url);

for (const card of document.querySelectorAll('[data-chart]')) {
  const id = card.dataset.chart;
  try {
    const file = new URL(`specs/${id}.json`, root);
    const response = await fetch(file);
    if (response.status === 404) continue; // A chart we have not built yet.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const spec = await response.json();
    const info = spec.usermeta || {};
    if (!spec.$schema?.includes('vega-lite/v6')) throw new Error('Expected Vega-Lite 6');

    // Chart text is stored in the same JSON, not in index.html.
    card.querySelector('h3').textContent = info.title || id.replaceAll('-', ' ');
    const callout = card.querySelector('.chart-callout');
    callout.textContent = info.annotation || '';
    callout.hidden = !info.annotation;
    const story = card.querySelector('.chart-story');
    story.textContent = info.analysis || '';
    story.hidden = !info.analysis;
    const source = card.querySelector('.chart-source');
    if (info.source?.url && info.source?.label) {
      const link = document.createElement('a');
      link.href = info.source.url;
      link.textContent = info.source.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      source.append('Source: ', link);
    }
    source.hidden = !source.childNodes.length;

    // All data URLs inside specs are resolved relative to the repository root.
    await vegaEmbed(card.querySelector('.viz'), spec, {
      actions: false,
      renderer: 'svg',
      loader: vega.loader({ baseURL: root.href })
    });
    card.hidden = false;
  } catch (error) {
    console.error(`Could not render ${id}:`, error);
    card.querySelector('.viz').textContent = `Chart could not load: ${error.message}`;
    card.hidden = false;
  }
}

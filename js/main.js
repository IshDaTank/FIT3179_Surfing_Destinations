// Every chart and its interpretation comes from its own Vega-Lite JSON file.
const root = new URL('../', import.meta.url);

for (const card of document.querySelectorAll('[data-chart]')) {
  const id = card.dataset.chart;
  try {
    const response = await fetch(new URL(`specs/${id}.json`, root));
    if (response.status === 404) continue; // Chart not built yet.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const spec = await response.json();
    const info = spec.usermeta || {};
    if (!spec.$schema?.includes('vega-lite/v6')) throw new Error('Expected Vega-Lite 6');
    card.querySelector('h3').textContent = info.title || id.replaceAll('-', ' ');

    const viz = card.querySelector('.viz');
    const callout = card.querySelector('.chart-callout');
    const story = card.querySelector('.chart-story');
    const source = card.querySelector('.chart-source');
    if (info.source?.url && info.source?.label) {
      const link = document.createElement('a');
      link.href = info.source.url;
      link.textContent = info.source.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      source.replaceChildren('Source: ', link);
    }
    source.hidden = !source.childNodes.length;

    const options = {
      actions: false,
      renderer: 'svg',
      loader: vega.loader({baseURL: root.href})
    };

    if (id === 'map-reserves' && info.interpretations && info.stateOrder) {
      card.classList.add('map-card');
      const layout = document.createElement('div');
      layout.className = 'map-layout';
      const mapSide = document.createElement('div');
      mapSide.className = 'map-side';
      const analysisSide = document.createElement('aside');
      analysisSide.className = 'map-analysis';
      analysisSide.setAttribute('aria-live', 'polite');
      const filters = document.createElement('div');
      filters.className = 'state-filters';
      filters.setAttribute('role', 'group');
      filters.setAttribute('aria-label', 'Filter surfing reserves by state');
      const context = document.createElement('p');
      context.className = 'state-context';
      const detail = document.createElement('p');
      detail.className = 'state-detail';
      mapSide.append(filters, viz, context);
      analysisSide.append(callout, detail, story);
      layout.append(mapSide, analysisSide);
      card.insertBefore(layout, source);
      const palette = {NSW:'#117989', QLD:'#E3A049', VIC:'#7D6BA3', SA:'#B96A75', WA:'#568C69'};
      let latestRequest = 0;
      const buttons = [];
      async function selectState(state) {
        const request = ++latestRequest;
        for (const button of buttons) {
          const active = button.dataset.state === state;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', String(active));
        }
        const result = info.interpretations[state];
        if (!result) return;
        callout.textContent = result.callout;
        story.textContent = result.analysis;
        detail.textContent = result.detail || '';
        callout.hidden = story.hidden = detail.hidden = false;
        context.textContent = state === 'All' ? 'Showing all 19 listed reserves' : `Showing ${state} reserves · national outline retained for comparison`;
        const selected = structuredClone(spec);
        if (state !== 'All') {
          selected.layer[1].transform = [...(selected.layer[1].transform || []), {filter: {field:'state', equal:state}}];
        }
        try {
          // Changes affect only the location marks; the geographic extent stays comparable.
          if (request !== latestRequest) return;
          await vegaEmbed(viz, selected, options);
        } catch (error) {
          console.error('Could not render state map:', error);
          viz.textContent = `Map could not load: ${error.message}`;
        }
      }
      for (const state of info.stateOrder) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.state = state;
        button.className = 'state-filter';
        if (palette[state]) button.style.setProperty('--state-color', palette[state]);
        button.textContent = state === 'All' ? 'All states' : state;
        button.addEventListener('click', () => selectState(state));
        filters.append(button);
        buttons.push(button);
      }
      card.hidden = false;
      await selectState(info.defaultState || 'All');
    } else {
      callout.textContent = info.annotation || '';
      callout.hidden = !info.annotation;
      story.textContent = info.analysis || '';
      story.hidden = !info.analysis;
      await vegaEmbed(viz, spec, options);
      card.hidden = false;
    }
  } catch (error) {
    console.error(`Could not render ${id}:`, error);
    card.querySelector('.viz').textContent = `Chart could not load: ${error.message}`;
    card.hidden = false;
  }
}

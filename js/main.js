// ========================================
// FIT3179 - CHASING THE PERFECT WAVE
// MAIN CHART LOADER
// VEGA-LITE VERSION 6
// ========================================

const root = new URL('../', import.meta.url);

const chartCards = [
  ...document.querySelectorAll(
    '.chart-card[data-chart]'
  )
];

const options = {
  actions: false,
  renderer: 'svg',
  loader: vega.loader({
    baseURL: root.href
  })
};


// ========================================
// HELPER: REMOVE BOUND CONTROLS
// ========================================

function removeBoundControls(spec) {

  // Remove input bindings while preserving
  // the parameter values and other properties.

  function visit(node) {

    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {

      node.forEach(visit);
      return;
    }

    if (Array.isArray(node.params)) {

      node.params = node.params.map(param => {

        const updated = { ...param };

        delete updated.bind;

        return updated;

      });
    }

    for (const value of Object.values(node)) {
      visit(value);
    }
  }

  visit(spec);

  return spec;
}


// ========================================
// HELPER: CHART INFORMATION
// ========================================

function populateInformation(card, info) {

  const heading = card.querySelector('h3');
  const callout = card.querySelector('.chart-callout');
  const story = card.querySelector('.chart-story');
  const source = card.querySelector('.chart-source');

  if (heading && info.title) {
    heading.textContent = info.title;
  }

  if (callout) {

    callout.textContent = info.annotation || '';
    callout.hidden = !info.annotation;
  }

  if (story) {

    story.textContent =
      info.analysis ||
      story.textContent ||
      '';

    story.hidden = !story.textContent.trim();
  }

  if (source) {

    source.replaceChildren();

    if (info.source?.url && info.source?.label) {

      const link = document.createElement('a');

      link.href = info.source.url;
      link.textContent = info.source.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      source.append('Source: ', link);
    }

    source.hidden = !source.childNodes.length;
  }
}


// ========================================
// CHART 1: INTERACTIVE STATE MAP
// ========================================

async function renderStateMap(
  card,
  spec,
  info
) {

  card.classList.add('map-card');

  const viz = card.querySelector('.viz');
  const callout = card.querySelector('.chart-callout');
  const story = card.querySelector('.chart-story');
  const source = card.querySelector('.chart-source');

  const layout = document.createElement('div');
  layout.className = 'map-layout';

  const mapSide = document.createElement('div');
  mapSide.className = 'map-side';

  const analysisSide = document.createElement('aside');
  analysisSide.className = 'map-analysis';

  analysisSide.setAttribute(
    'aria-live',
    'polite'
  );

  const filters = document.createElement('div');
  filters.className = 'state-filters';

  filters.setAttribute('role', 'group');

  filters.setAttribute(
    'aria-label',
    'Filter surfing reserves by state'
  );

  const context = document.createElement('p');
  context.className = 'state-context';

  const detail = document.createElement('p');
  detail.className = 'state-detail';

  mapSide.append(filters, viz, context);

  if (callout) analysisSide.append(callout);

  analysisSide.append(detail);

  if (story) analysisSide.append(story);

  layout.append(mapSide, analysisSide);

  card.insertBefore(layout, source);

  const palette = {
    NSW: '#117989',
    QLD: '#E3A049',
    VIC: '#7D6BA3',
    SA: '#B96A75',
    WA: '#568C69'
  };

  const buttons = [];
  let latestRequest = 0;

  async function selectState(state) {

    const request = ++latestRequest;

    for (const button of buttons) {

      const active =
        button.dataset.state === state;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-pressed',
        String(active)
      );
    }

    const result =
      info.interpretations[state];

    if (!result) return;

    const target =
      info.annotationTargets?.[state];

    if (callout) {

      callout.replaceChildren();

      const title = document.createElement('strong');

      title.textContent =
        target?.name || 'Map finding';

      const description =
        document.createElement('span');

      description.textContent =
        result.callout || '';

      callout.append(title, description);
      callout.hidden = false;
    }

    if (story) {

      story.textContent =
        result.analysis || '';

      story.hidden = !result.analysis;
    }

    detail.textContent =
      result.detail || '';

    detail.hidden = !result.detail;

    context.textContent =
      state === 'All'
        ? 'All 19 nationally listed reserves · equal-sized location markers'
        : `${state} only · national map extent unchanged`;

    const selectedSpec =
      structuredClone(spec);

    if (
      state !== 'All' &&
      selectedSpec.layer?.[1]
    ) {

      selectedSpec.layer[1].transform = [
        ...(selectedSpec.layer[1].transform || []),
        {
          filter: {
            field: 'state',
            equal: state
          }
        }
      ];
    }

    if (request !== latestRequest) return;

    await vegaEmbed(
      viz,
      selectedSpec,
      options
    );
  }

  for (const state of info.stateOrder) {

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className = 'state-filter';
    button.dataset.state = state;

    if (palette[state]) {

      button.style.setProperty(
        '--state-color',
        palette[state]
      );
    }

    button.textContent =
      state === 'All'
        ? 'All states'
        : state;

    button.addEventListener(
      'click',
      () => selectState(state)
    );

    filters.append(button);
    buttons.push(button);
  }

  card.hidden = false;

  await selectState(
    info.defaultState || 'All'
  );
}


// ========================================
// MAIN CHART LOADING LOOP
// ========================================

async function loadChart(card) {

  const id = card.dataset.chart;

  const viz = card.querySelector('.viz');

  if (!viz) return;

  try {

    // Each chart uses its own JSON file.
    // Chart 11 no longer uses chart-11-info.

    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

    if (response.status === 404) {

      console.warn(
        `Chart specification not found: ${id}`
      );

      return;
    }

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }

    let spec = await response.json();

    if (!spec.$schema?.includes('vega-lite/v6')) {

      throw new Error(
        'Expected Vega-Lite version 6'
      );
    }

    const info = spec.usermeta || {};

    populateInformation(card, info);


    // ====================================
    // REMOVE CHART 11 FILTERS
    // ====================================

    if (
      card.dataset.removeFilter === 'true'
    ) {

      spec = removeBoundControls(
        structuredClone(spec)
      );

      // Remove any old HTML filter containers.

      card.querySelectorAll(
        '.chart-filters, ' +
        '.filter-controls, ' +
        '.filter-buttons, ' +
        '.chart11-filters, ' +
        '[data-chart11-filter]'
      ).forEach(element => element.remove());
    }


    // ====================================
    // CHART 1 SPECIAL RENDERING
    // ====================================

    if (
      id === 'map-reserves' &&
      info.interpretations &&
      info.stateOrder
    ) {

      await renderStateMap(
        card,
        spec,
        info
      );

      return;
    }


    // ====================================
    // STANDARD VEGA-LITE RENDERING
    // ====================================

    await vegaEmbed(
      viz,
      spec,
      options
    );

    card.hidden = false;

  } catch (error) {

    console.error(
      `Could not render ${id}:`,
      error
    );

    viz.textContent =
      `Chart could not load: ${error.message}`;

    card.hidden = false;
  }
}


// ========================================
// INITIALISE ALL CHARTS
// ========================================

async function initialiseCharts() {

  for (const card of chartCards) {

    await loadChart(card);
  }
}

initialiseCharts();

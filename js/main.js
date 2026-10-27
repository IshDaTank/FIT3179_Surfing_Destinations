/* ========================================
   FIT3179 - AUSTRALIAN SURFING DASHBOARD
   MAIN CHART LOADER
   VEGA-LITE VERSION 6
======================================== */

const root = new URL('../', import.meta.url);

const options = {
  actions: false,
  renderer: 'svg',
  loader: vega.loader({
    baseURL: root.href
  })
};


/* ========================================
   1. POPULATE CHART INFORMATION
======================================== */

function populateInformation(card, info) {

  const heading = card.querySelector('h3');
  const callout = card.querySelector('.chart-callout');
  const story = card.querySelector('.chart-story');
  const source = card.querySelector('.chart-source');

  // Chart title

  if (heading) {
    heading.textContent =
      info.title ||
      heading.textContent ||
      card.dataset.chart;
  }

  // Chart annotation

  if (callout) {
    callout.textContent = info.annotation || '';
    callout.hidden = !info.annotation;
  }

  // Chart interpretation

  if (story) {
    story.textContent = info.analysis || '';
    story.hidden = !story.textContent.trim();
  }

  // Data sources

  if (source) {

    source.replaceChildren();

    const sources = info.sources ||
      (info.source ? [info.source] : []);

    const valid = sources.filter(
      s => s?.url && s?.label
    );

    valid.forEach((s, i) => {

      if (i === 0) {
        source.append(
          valid.length === 1
            ? 'Source: '
            : 'Sources: '
        );
      } else {
        source.append(' · ');
      }

      const link = document.createElement('a');

      link.href = s.url;
      link.textContent = s.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      source.append(link);
    });

    source.hidden = valid.length === 0;
  }
}


/* ========================================
   2. CHART 1 — INTERACTIVE STATE MAP
======================================== */

async function renderStateMap(card, spec, info) {

  card.classList.add('map-card');

  const viz = card.querySelector('.viz');
  const callout = card.querySelector('.chart-callout');
  const story = card.querySelector('.chart-story');
  const source = card.querySelector('.chart-source');

  // Layout containers

  const layout = document.createElement('div');
  layout.className = 'map-layout';

  const mapSide = document.createElement('div');
  mapSide.className = 'map-side';

  const analysis = document.createElement('aside');
  analysis.className = 'map-analysis';

  analysis.setAttribute(
    'aria-live',
    'polite'
  );

  // State filter buttons

  const filters = document.createElement('div');
  filters.className = 'state-filters';

  filters.setAttribute('role', 'group');

  filters.setAttribute(
    'aria-label',
    'Filter surfing reserves by state'
  );

  // Additional information

  const context = document.createElement('p');
  context.className = 'state-context';

  const detail = document.createElement('p');
  detail.className = 'state-detail';

  // Assemble layout

  mapSide.append(filters, viz, context);

  if (callout) {
    analysis.append(callout);
  }

  analysis.append(detail);

  if (story) {
    analysis.append(story);
  }

  layout.append(mapSide, analysis);

  if (source) {
    card.insertBefore(layout, source);
  } else {
    card.append(layout);
  }

  // State colour palette

  const palette = {
    NSW: '#117989',
    QLD: '#E3A049',
    VIC: '#7D6BA3',
    SA: '#B96A75',
    WA: '#568C69'
  };

  const buttons = [];
  let currentRequest = 0;

  // Update selected state

  async function selectState(state) {

    const request = ++currentRequest;

    buttons.forEach(button => {

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
    });

    const result = info.interpretations[state];

    if (!result) return;

    // Annotation

    if (callout) {

      const strong = document.createElement('strong');

      strong.textContent =
        info.annotationTargets?.[state]?.name ||
        'Map finding';

      const span = document.createElement('span');

      span.textContent = result.callout || '';

      callout.replaceChildren(strong, span);
      callout.hidden = false;
    }

    // Interpretation

    if (story) {
      story.textContent = result.analysis || '';
      story.hidden = !result.analysis;
    }

    // State detail

    detail.textContent = result.detail || '';
    detail.hidden = !result.detail;

    // Map context

    context.textContent =
      state === 'All'
        ? 'All 19 nationally listed reserves · equal-sized location markers'
        : `${state} only · national map extent unchanged`;

    // Clone original specification

    const selected = structuredClone(spec);

    if (state !== 'All' && selected.layer?.[1]) {

      selected.layer[1].transform = [
        ...(selected.layer[1].transform || []),
        {
          filter: {
            field: 'state',
            equal: state
          }
        }
      ];
    }

    // Render map

    if (request === currentRequest) {
      await vegaEmbed(viz, selected, options);
    }
  }

  // Generate state-selection buttons

  for (const state of info.stateOrder) {

    const button = document.createElement('button');

    button.type = 'button';
    button.dataset.state = state;
    button.className = 'state-filter';

    button.textContent =
      state === 'All'
        ? 'All states'
        : state;

    if (palette[state]) {
      button.style.setProperty(
        '--state-color',
        palette[state]
      );
    }

    button.addEventListener(
      'click',
      () => selectState(state).catch(console.error)
    );

    filters.append(button);
    buttons.push(button);
  }

  card.hidden = false;

  await selectState(
    info.defaultState || 'All'
  );
}


/* ========================================
   3. CHART 6 — PARTICIPATION CARTOGRAM
======================================== */

/*
  The cartogram JSON defines the chart's
  Vega-Lite structure and metadata.

  Data comes from:
  data/ausplay_surf_map_2025.csv

  The dropdown allows users to switch
  between:
  - Estimated participants
  - Adult participation rate

  The approximate geographic arrangement
  of states remains fixed.
*/

async function renderParticipationCartogram(
  card,
  baseSpec,
  info
) {

  const viz = card.querySelector('.viz');

  // Load participation dataset

  const sourceURL = new URL(
    'data/ausplay_surf_map_2025.csv',
    root
  );

  const response = await fetch(sourceURL);

  if (!response.ok) {
    throw new Error(
      `Could not load AusPlay data: HTTP ${response.status}`
    );
  }

  const csv = await response.text();

  const data = vega.read(csv, {
    type: 'csv',
    parse: 'auto'
  });

  // Approximate geographic positions

  const positions = {
    WA: {
      x: 130,
      y: 265,
      name: 'Western Australia'
    },

    NT: {
      x: 350,
      y: 125,
      name: 'Northern Territory'
    },

    SA: {
      x: 350,
      y: 295,
      name: 'South Australia'
    },

    QLD: {
      x: 640,
      y: 150,
      name: 'Queensland'
    },

    NSW: {
      x: 650,
      y: 300,
      name: 'New South Wales'
    },

    VIC: {
      x: 510,
      y: 400,
      name: 'Victoria'
    },

    TAS: {
      x: 610,
      y: 448,
      name: 'Tasmania'
    },

    ACT: {
      x: 805,
      y: 390,
      name: 'Australian Capital Territory'
    }
  };

  // Convert dataset into cartogram records

  const observations = data
    .filter(d => positions[d.state])
    .map(d => ({

      state: d.state,

      name: positions[d.state].name,

      participants: Number(d.participants),

      rate: Number(d.participation_rate_pct),

      x: positions[d.state].x,

      y: positions[d.state].y

    }));

  if (observations.length !== 8) {
    throw new Error(
      'Expected eight state/territory records'
    );
  }

  // Create dropdown controls

  const controls = document.createElement('div');
  controls.className = 'cartogram-controls';

  const label = document.createElement('label');
  label.textContent = 'Size circles by:';

  const select = document.createElement('select');

  select.setAttribute(
    'aria-label',
    'Choose surfing participation measure'
  );

  const modes = info.metricOptions || [
    {
      value: 'count',
      label: 'Estimated participants',
      unit: 'people'
    },
    {
      value: 'rate',
      label: 'Adult participation rate',
      unit: '%'
    }
  ];

  for (const mode of modes) {

    const option = document.createElement('option');

    option.value = mode.value;

    option.textContent =
      `${mode.label} (${mode.unit})`;

    select.append(option);
  }

  label.append(select);
  controls.append(label);

  // Insert controls immediately before chart

  viz.before(controls);

  let request = 0;

  // Update cartogram based on metric

  async function update(metric) {

    const current = ++request;

    const countMode = metric === 'count';

    const max = countMode
      ? 117953
      : 1.762;

    const rows = observations.map(d => {

      const value = countMode
        ? d.participants
        : d.rate;

      // Scale symbol area to measure

      const area =
        1300 +
        (value / max) * 7100;

      const radius =
        Math.sqrt(area / Math.PI);

      return {

        ...d,

        area,

        label_y:
          d.y - radius - 20,

        value_label: countMode
          ? d.participants.toLocaleString('en-AU')
          : `${d.rate.toFixed(2)}%`

      };
    });

    // Clone existing Vega-Lite chart

    const spec = structuredClone(baseSpec);

    spec.data = {
      values: rows
    };

    spec.width = 'container';
    spec.height = 490;

    // Keep geographic layout fixed

    spec.encoding.x.scale.domain = [0, 900];

    spec.encoding.y.scale.domain = [490, 0];

    spec.autosize = {
      type: 'fit-x',
      contains: 'padding'
    };

    // Skip stale updates

    if (current !== request) {
      return;
    }

    // Re-render updated cartogram

    await vegaEmbed(
      viz,
      spec,
      options
    );

    // Update contextual text

    const callout =
      card.querySelector('.chart-callout');

    const story =
      card.querySelector('.chart-story');

    if (callout) {

      callout.textContent =
        info.highlights?.[metric] || '';

      callout.hidden =
        !callout.textContent;
    }

    if (story) {

      story.textContent =
        info.interpretations?.[metric] || '';

      story.hidden =
        !story.textContent;
    }
  }

  // Dropdown interaction

  select.addEventListener(
    'change',
    () => update(select.value).catch(error => {

      console.error(
        'Cartogram could not update:',
        error
      );

    })
  );

  // Show chart

  card.hidden = false;

  // Render selected default metric

  select.value =
    info.defaultMetric || 'count';

  await update(select.value);
}


/* ========================================
   4. MAIN CHART LOADER
======================================== */

async function loadChart(card) {

  const id = card.dataset.chart;

  const viz = card.querySelector('.viz');

  if (!viz) {
    return;
  }

  try {

    // Load JSON specification

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

    const spec = await response.json();

    // Require Vega-Lite version 6

    if (!spec.$schema?.includes('vega-lite/v6')) {
      throw new Error(
        'Expected Vega-Lite version 6'
      );
    }

    const info = spec.usermeta || {};

    // Populate title, annotation, story and source

    populateInformation(card, info);


    // Chart 1: Interactive surfing reserves map

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

    }

    // Chart 6: Interactive participation cartogram

    else if (id === 'ausplay-surf-ranking') {

      await renderParticipationCartogram(
        card,
        spec,
        info
      );

    }

    // All other charts, including Charts 11 and 12

    else {

      await vegaEmbed(
        viz,
        spec,
        options
      );

      card.hidden = false;
    }

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


/* ========================================
   5. INITIALISE DASHBOARD
======================================== */

/*
  Charts are loaded independently.

  A failure in one chart will not stop
  the remaining charts from being rendered.
*/

async function initialiseCharts() {

  const cards = document.querySelectorAll(
    '.chart-card[data-chart]'
  );

  for (const card of cards) {

    await loadChart(card);
  }
}


/* ========================================
   6. START DASHBOARD
======================================== */

initialiseCharts();

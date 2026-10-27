/* ==========================================
   FIT3179 — AUSTRALIAN SURFING DASHBOARD
   VEGA-LITE 6 CHART LOADER

   Chart 5: Bubble map
   Chart 6: Interactive Dorling cartogram
   Chart 7: Marimekko gender comparison

   All other existing charts are preserved.
========================================== */

const root = new URL('../', import.meta.url);

const options = {
  actions: false,
  renderer: 'svg',
  loader: vega.loader({
    baseURL: root.href
  })
};


/* ==========================================
   1. CHART INFORMATION
========================================== */

function populateInformation(card, info) {

  const heading =
    card.querySelector('h3');

  const callout =
    card.querySelector('.chart-callout');

  const story =
    card.querySelector('.chart-story');

  const source =
    card.querySelector('.chart-source');


  if (heading) {
    heading.textContent =
      info.title ||
      heading.textContent ||
      card.dataset.chart;
  }

  if (callout) {
    callout.textContent =
      info.annotation || '';

    callout.hidden =
      !info.annotation;
  }

  if (story) {
    story.textContent =
      info.analysis ||
      story.textContent ||
      '';

    story.hidden =
      !story.textContent.trim();
  }

  if (source) {

    source.replaceChildren();

    const sources = Array.isArray(info.sources)
      ? info.sources
      : info.source
        ? [info.source]
        : [];

    const validSources = sources.filter(
      item => item?.url && item?.label
    );

    validSources.forEach((item, index) => {

      if (index === 0) {
        source.append(
          validSources.length === 1
            ? 'Source: '
            : 'Sources: '
        );
      } else {
        source.append(' · ');
      }

      const link =
        document.createElement('a');

      link.href = item.url;
      link.textContent = item.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      source.append(link);
    });

    source.hidden =
      validSources.length === 0;
  }
}


/* ==========================================
   2. CHART 1 — INTERACTIVE STATE MAP
========================================== */

async function renderStateMap(card, spec, info) {

  card.classList.add('map-card');

  const viz = card.querySelector('.viz');

  const callout =
    card.querySelector('.chart-callout');

  const story =
    card.querySelector('.chart-story');

  const source =
    card.querySelector('.chart-source');


  const layout =
    document.createElement('div');

  layout.className = 'map-layout';

  const mapSide =
    document.createElement('div');

  mapSide.className = 'map-side';

  const analysis =
    document.createElement('aside');

  analysis.className = 'map-analysis';

  analysis.setAttribute(
    'aria-live',
    'polite'
  );

  const filters =
    document.createElement('div');

  filters.className = 'state-filters';

  filters.setAttribute('role', 'group');

  filters.setAttribute(
    'aria-label',
    'Filter surfing reserves by state'
  );

  const context =
    document.createElement('p');

  context.className = 'state-context';

  const detail =
    document.createElement('p');

  detail.className = 'state-detail';

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

      const title =
        document.createElement('strong');

      title.textContent =
        target?.name || 'Map finding';

      const description =
        document.createElement('span');

      description.textContent =
        result.callout || '';

      callout.replaceChildren(
        title,
        description
      );

      callout.hidden = false;
    }

    if (story) {
      story.textContent =
        result.analysis || '';

      story.hidden =
        !result.analysis;
    }

    detail.textContent =
      result.detail || '';

    detail.hidden =
      !result.detail;

    context.textContent =
      state === 'All'
        ? 'All 19 nationally listed reserves · equal-sized location markers'
        : `${state} only · national map extent unchanged`;


    const selected =
      structuredClone(spec);

    if (
      state !== 'All' &&
      selected.layer?.[1]
    ) {

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

    if (request !== latestRequest) {
      return;
    }

    await vegaEmbed(
      viz,
      selected,
      options
    );
  }


  for (const state of info.stateOrder) {

    const button =
      document.createElement('button');

    button.type = 'button';

    button.className = 'state-filter';
    button.dataset.state = state;

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
      () => {
        selectState(state).catch(console.error);
      }
    );

    filters.append(button);
    buttons.push(button);
  }

  card.hidden = false;

  await selectState(
    info.defaultState || 'All'
  );
}


/* ==========================================
   3. CHART 6 — INTERACTIVE DORLING CARTOGRAM
========================================== */

async function renderParticipationCartogram(
  card,
  baseSpec,
  info
) {

  const viz = card.querySelector('.viz');

  const callout =
    card.querySelector('.chart-callout');

  const story =
    card.querySelector('.chart-story');


  // LOAD THE ORIGINAL AUSPLAY DATA

  const csvURL = new URL(
    'data/ausplay_surf_map_2025.csv',
    root
  );

  const response = await fetch(csvURL);

  if (!response.ok) {
    throw new Error(
      `AusPlay CSV could not load: ${response.status}`
    );
  }

  const csv = await response.text();

  const records = vega.read(csv, {
    type: 'csv',
    parse: 'auto'
  });


  // FIXED APPROXIMATE GEOGRAPHIC POSITIONS
  // Coordinates use the 760 x 470 chart space.

  const positions = {

    WA: {
      x: 135,
      y: 210,
      name: 'Western Australia'
    },

    NT: {
      x: 345,
      y: 105,
      name: 'Northern Territory'
    },

    SA: {
      x: 345,
      y: 240,
      name: 'South Australia'
    },

    QLD: {
      x: 590,
      y: 135,
      name: 'Queensland'
    },

    NSW: {
      x: 595,
      y: 275,
      name: 'New South Wales'
    },

    VIC: {
      x: 485,
      y: 355,
      name: 'Victoria'
    },

    TAS: {
      x: 555,
      y: 420,
      name: 'Tasmania'
    },

    ACT: {
      x: 715,
      y: 345,
      name: 'Australian Capital Territory'
    }

  };


  // PREPARE ALL EIGHT OBSERVATIONS

  const observations = records
    .filter(row => positions[row.state])
    .map(row => {

      const position = positions[row.state];

      return {
        state: row.state,

        name: position.name,

        participants: Number(
          row.participants
        ),

        rate: Number(
          row.participation_rate_pct
        ),

        x: position.x,
        y: position.y
      };
    });


  if (
    observations.length !== 8 ||
    observations.some(row =>
      !Number.isFinite(row.participants) ||
      !Number.isFinite(row.rate)
    )
  ) {

    throw new Error(
      'Chart 6 requires eight valid state and territory observations.'
    );
  }


  // CREATE THE MEASURE SELECTOR

  const controls =
    document.createElement('div');

  controls.className =
    'cartogram-controls';

  const label =
    document.createElement('label');

  const labelText =
    document.createElement('span');

  labelText.textContent =
    'Size circles by:';

  const select =
    document.createElement('select');

  select.setAttribute(
    'aria-label',
    'Size circles by'
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

    const option =
      document.createElement('option');

    option.value = mode.value;

    option.textContent =
      `${mode.label} (${mode.unit})`;

    select.append(option);
  }

  label.append(labelText, select);
  controls.append(label);

  viz.before(controls);


  // TRACK CHANGING MEASURES

  let updateRequest = 0;


  async function updateCartogram(metric) {

    const request = ++updateRequest;

    const countMode =
      metric !== 'rate';

    const field =
      countMode ? 'participants' : 'rate';

    const maximum = Math.max(
      ...observations.map(row => row[field])
    );


    // CALCULATE CIRCLE AREA
    // Minimum size keeps small states readable.
    // Larger measures receive larger circles.

    const rows = observations.map(row => {

      const value = row[field];

      const area =
        1100 +
        (value / maximum) * 5900;

      const radius =
        Math.sqrt(area / Math.PI);

      return {

        ...row,

        area,

        label_y:
          row.y - radius - 18,

        value_label: countMode
          ? row.participants.toLocaleString('en-AU')
          : `${row.rate.toFixed(2)}%`

      };
    });


    // UPDATE THE EXISTING VEGA-LITE SPEC
    // The original marks, colours, labels,
    // axes and tooltips are preserved.

    const spec =
      structuredClone(baseSpec);

    spec.data = {
      values: rows
    };


    // KEEP THE ORIGINAL DIMENSIONS
    // No change to width, height or axes.

    if (request !== updateRequest) {
      return;
    }


    await vegaEmbed(
      viz,
      spec,
      options
    );


    // METRIC-SPECIFIC FINDINGS

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


  // WHEN THE DROPDOWN CHANGES

  select.addEventListener(
    'change',
    () => {

      updateCartogram(
        select.value
      ).catch(error => {

        console.error(
          'Chart 6 update failed:',
          error
        );

      });
    }
  );


  // INITIAL RENDER

  select.value =
    info.defaultMetric || 'count';

  card.hidden = false;

  await updateCartogram(
    select.value
  );
}


/* ==========================================
   4. MAIN CHART LOADER
========================================== */

async function loadChart(card) {

  const id = card.dataset.chart;

  const viz =
    card.querySelector('.viz');

  if (!viz) return;

  try {

    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

    if (response.status === 404) {

      console.warn(
        `Missing specification: ${id}`
      );

      return;
    }

    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const spec =
      await response.json();

    if (
      !spec.$schema?.includes(
        'vega-lite/v6'
      )
    ) {

      throw new Error(
        `Expected Vega-Lite 6: ${id}`
      );
    }

    const info =
      spec.usermeta || {};

    populateInformation(
      card,
      info
    );


    // CHART 1: INTERACTIVE RESERVES MAP

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


    // CHART 6: INTERACTIVE CARTOGRAM

    if (id === 'ausplay-surf-ranking') {

      await renderParticipationCartogram(
        card,
        spec,
        info
      );

      return;
    }


    // ALL OTHER CHARTS
    // INCLUDES CHARTS 5 AND 7

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


/* ==========================================
   5. INITIALISE ALL CHARTS
========================================== */

async function initialiseCharts() {

  const cards =
    document.querySelectorAll(
      '.chart-card[data-chart]'
    );

  for (const card of cards) {

    await loadChart(card);
  }
}


/* ==========================================
   6. START
========================================== */

initialiseCharts();

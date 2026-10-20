// FIT3179 — Australia: A Nation Built on Surf
// Vega-Lite 6 chart loader, filters and interpretation panels.

const root = new URL('../', import.meta.url);

const STATE_COLORS = {
  NSW: '#0072B2',
  QLD: '#E69F00',
  VIC: '#CC79A7',
  WA: '#D55E00',
  SA: '#009E73',
  TAS: '#7B61A8',
  ACT: '#8C6D31',
  NT: '#666666'
};

const SURF_PARTICIPATION = [
  {
    state: 'NSW',
    name: 'New South Wales',
    participants: 117953,
    rate: 1.671,
    x: 555,
    y: 278
  },
  {
    state: 'QLD',
    name: 'Queensland',
    participants: 63787,
    rate: 1.379,
    x: 535,
    y: 125
  },
  {
    state: 'VIC',
    name: 'Victoria',
    participants: 58683,
    rate: 1.010,
    x: 445,
    y: 382
  },
  {
    state: 'WA',
    name: 'Western Australia',
    participants: 43496,
    rate: 1.762,
    x: 135,
    y: 225
  },
  {
    state: 'SA',
    name: 'South Australia',
    participants: 20188,
    rate: 1.277,
    x: 326,
    y: 254
  },
  {
    state: 'TAS',
    name: 'Tasmania',
    participants: 6566,
    rate: 1.358,
    x: 565,
    y: 407
  },
  {
    state: 'ACT',
    name: 'Australian Capital Territory',
    participants: 2272,
    rate: 0.571,
    x: 710,
    y: 357
  },
  {
    state: 'NT',
    name: 'Northern Territory',
    participants: 451,
    rate: 0.217,
    x: 325,
    y: 89
  }
];

// ============================================================
// VISUAL STYLING
// ============================================================

const participationStyle = document.createElement('style');

participationStyle.textContent = `
  [data-chart="ausplay-surf-map"] .chart-callout,
  [data-chart="ausplay-surf-ranking"] .chart-callout,
  [data-chart="ausplay-surf-gender"] .chart-callout {
    margin: 16px 0 14px;
    max-width: 890px;
    background: #e1f4ef;
    border: 1px solid #bddfd7;
    border-radius: 9px;
    padding: 13px 18px;
    color: #123f48;
    font-weight: 750;
    line-height: 1.5;
  }

  [data-chart="ausplay-surf-map"] .chart-callout::before,
  [data-chart="ausplay-surf-ranking"] .chart-callout::before,
  [data-chart="ausplay-surf-gender"] .chart-callout::before {
    content: none !important;
    display: none !important;
  }

  .participation-size-key {
    max-width: 780px;
    margin: 10px 0 18px;
    padding: 12px 14px;
    background: #f8fbfa;
    border: 1px solid #dfebe8;
    border-radius: 9px;
  }

  .participation-size-key strong {
    display: block;
    margin-bottom: 10px;
    color: #244654;
    font-size: .93rem;
  }

  .participation-size-key .key-steps {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 7px;
    align-items: end;
    text-align: center;
  }

  .participation-size-key .key-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 7px;
    min-width: 0;
    color: #31535f;
    font-size: .82rem;
    font-weight: 600;
  }

  .participation-size-key .key-circle {
    display: block;
    flex: none;
    border-radius: 50%;
    background: #648c91;
    border: 1px solid #365963;
  }

  .participation-size-key .key-label {
    white-space: nowrap;
  }

  .participation-ranking-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin: 5px 0 10px;
    color: #244654;
    font-weight: 700;
  }

  .participation-ranking-controls select {
    padding: 9px 12px;
    max-width: 100%;
    font: inherit;
    color: #123442;
    border: 1px solid #bcd6d1;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
  }

  [data-chart="ausplay-surf-ranking"] .participation-size-key {
    max-width: 100%;
    margin: 4px 0 7px;
    padding: 8px 12px;
  }

  [data-chart="ausplay-surf-ranking"] .participation-size-key strong {
    margin-bottom: 5px;
    font-size: .83rem;
  }

  [data-chart="ausplay-surf-ranking"] .participation-size-key .key-step {
    gap: 3px;
    font-size: .78rem;
  }

  @media (max-width: 520px) {
    .participation-size-key {
      padding: 9px 5px;
    }

    .participation-size-key .key-step {
      font-size: .61rem;
    }

    .participation-ranking-controls {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

document.head.append(participationStyle);

// ============================================================
// CHART 1 — STATE MAP HELPERS
// ============================================================

const MAP_ZOOM_BOUNDS = {
  NSW: [148.5, -37, 155, -27.5],
  QLD: [150, -30, 155, -24],
  VIC: [140, -41, 150, -35],
  SA: [128, -38, 140, -30],
  WA: [111, -36.5, 118, -25]
};

function mercatorY(latitude) {
  const radians = latitude * Math.PI / 180;

  return Math.log(
    Math.tan(Math.PI / 4 + radians / 2)
  );
}

function getStateProjection(state, width, height) {
  const [west, south, east, north] =
    MAP_ZOOM_BOUNDS[state];

  const longitudeSpan =
    (east - west) * Math.PI / 180;

  const latitudeSpan =
    mercatorY(north) - mercatorY(south);

  const scale = Math.min(
    width * .88 / longitudeSpan,
    height * .84 / latitudeSpan
  );

  const centerY =
    (mercatorY(south) + mercatorY(north)) / 2;

  return {
    type: 'mercator',
    center: [
      (west + east) / 2,
      Math.atan(Math.sinh(centerY)) * 180 / Math.PI
    ],
    scale,
    translate: [width / 2, height / 2]
  };
}

// ============================================================
// SHARED UTILITIES
// ============================================================

function setText(element, content) {
  if (!element) return;

  element.textContent = content || '';
  element.hidden = !element.textContent;
}

function renderSources(source, info) {
  if (!source) return;

  source.replaceChildren();

  const sources =
    info.sources || (info.source ? [info.source] : []);

  let count = 0;

  for (const item of sources) {
    if (!item?.url || !item.label) continue;

    source.append(count++ ? ' · ' : 'Source: ');

    const link = document.createElement('a');

    link.href = item.url;
    link.textContent = item.label;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    source.append(link);
  }

  source.hidden = !count;
}

// ============================================================
// PROPORTIONAL-AREA SIZE LEGEND
// ============================================================

function createSizeKey(
  values,
  title,
  maxValue,
  maxDiameter = 40
) {
  const key = document.createElement('div');
  key.className = 'participation-size-key';

  key.setAttribute('aria-label', title);

  const heading = document.createElement('strong');
  heading.textContent = title;

  const steps = document.createElement('div');
  steps.className = 'key-steps';

  for (const value of values) {
    const step = document.createElement('div');
    step.className = 'key-step';

    const circle = document.createElement('span');
    circle.className = 'key-circle';

    // Circle area, rather than diameter, increases with value.
    const diameter =
      value === 0
        ? 5
        : maxDiameter * Math.sqrt(value / maxValue);

    circle.style.width = `${diameter}px`;
    circle.style.height = `${diameter}px`;

    const label = document.createElement('span');
    label.className = 'key-label';

    label.textContent =
      title.includes('(%)')
        ? value.toFixed(1) + '%'
        : value.toLocaleString('en-AU');

    step.append(circle, label);
    steps.append(step);
  }

  key.append(heading, steps);

  return key;
}

// ============================================================
// CHART 6 — BUILD DORLING CARTOGRAM
// ============================================================

function makeDorlingSpec(baseSpec, metric) {
  const byRate = metric === 'rate';

  const domainMax = byRate ? 2 : 125000;

  const spec = structuredClone(baseSpec);

  spec.data = {
    values: SURF_PARTICIPATION.map((d) => {
      const value =
        byRate ? d.rate : d.participants;

      const radius = Math.sqrt(
        (value / domainMax * 11500) / Math.PI
      );

      return {
        state: d.state,
        state_name: d.name,
        participants: d.participants,
        rate: d.rate,
        value,
        x: d.x,
        y: d.y,

        // Labels sit outside the circles for legibility.
        label_y: d.y - radius - 17,

        // Large circles can display their values inside.
        value_y:
          radius >= 27
            ? d.y + 7
            : d.y + radius + 15,

        value_label:
          byRate
            ? `${d.rate.toFixed(2)}%`
            : d.participants.toLocaleString('en-AU')
      };
    })
  };

  spec.layer[0].encoding.size.scale.domain = [
    0,
    domainMax
  ];

  // All jurisdictions are labelled directly.
  // The redundant state-colour legend remains hidden.

  return spec;
}

// ============================================================
// MAIN CHART LOADER
// ============================================================

for (
  const card of document.querySelectorAll('[data-chart]')
) {
  const id = card.dataset.chart;

  try {
    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

    if (response.status === 404) continue;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const spec = await response.json();

    if (!spec.$schema?.includes('vega-lite/v6')) {
      throw new Error('Expected Vega-Lite 6');
    }

    const info = spec.usermeta || {};

    const heading = card.querySelector('h3');
    const viz = card.querySelector('.viz');
    const callout = card.querySelector('.chart-callout');
    const story = card.querySelector('.chart-story');
    const source = card.querySelector('.chart-source');

    heading.textContent =
      info.title || id.replaceAll('-', ' ');

    renderSources(source, info);

    const options = {
      actions: false,
      renderer: 'svg',
      loader: vega.loader({
        baseURL: root.href
      })
    };

    // --------------------------------------------------------
    // CHART 6 — INTERACTIVE DORLING CARTOGRAM
    // --------------------------------------------------------

    if (id === 'ausplay-surf-ranking') {
      const controls = document.createElement('div');
      controls.className =
        'participation-ranking-controls';

      const label = document.createElement('label');
      label.htmlFor = 'ausplay-metric';
      label.textContent = 'Size circles by:';

      const selector = document.createElement('select');
      selector.id = 'ausplay-metric';

      for (const item of info.metricOptions || []) {
        const option = document.createElement('option');

        option.value = item.value;

        option.textContent =
          `${item.label} (${item.unit})`;

        selector.append(option);
      }

      controls.append(label, selector);

      card.insertBefore(controls, viz);

      const legendHost = document.createElement('div');

      card.insertBefore(legendHost, viz);

      let revision = 0;

      async function showMetric(metric) {
        const request = ++revision;

        const selected =
          metric === 'rate' ? 'rate' : 'count';

        const isRate = selected === 'rate';

        const values = isRate
          ? [0, 0.4, 0.8, 1.2, 1.6, 2.0]
          : [
              0,
              25000,
              50000,
              75000,
              100000,
              125000
            ];

        const key = createSizeKey(
          values,
          isRate
            ? 'Adult participation rate (%)'
            : 'Estimated adult participants (people)',
          isRate ? 2 : 125000,
          34
        );

        legendHost.replaceChildren(key);

        // The highlight and interpretation follow the filter.
        setText(
          story,
          info.interpretations?.[selected]
        );

        setText(
          callout,
          info.highlights?.[selected]
        );

        const selectedSpec =
          makeDorlingSpec(spec, selected);

        if (request !== revision) return;

        await vegaEmbed(
          viz,
          selectedSpec,
          options
        );
      }

      selector.value = info.defaultMetric || 'count';

      selector.addEventListener('change', () => {
        void showMetric(selector.value);
      });

      card.hidden = false;

      await showMetric(selector.value);

    // --------------------------------------------------------
    // CHART 5 — GEOGRAPHIC PROPORTIONAL SYMBOL MAP
    // --------------------------------------------------------

    } else if (id === 'ausplay-surf-map') {
      setText(callout, info.annotation);
      setText(story, info.analysis);

      const selected = structuredClone(spec);

      for (const layer of selected.layer || []) {
        if (layer.encoding?.size) {
          layer.encoding.size.legend = null;
        }
      }

      const existing = card.querySelector(
        '.participation-size-key'
      );

      if (existing) existing.remove();

      viz.insertAdjacentElement(
        'afterend',
        createSizeKey(
          [
            0,
            25000,
            50000,
            75000,
            100000,
            125000
          ],
          'Estimated surfers aged 15+',
          125000,
          43
        )
      );

      card.hidden = false;

      await vegaEmbed(
        viz,
        selected,
        options
      );

    // --------------------------------------------------------
    // EXISTING QUEENSLAND WAVE COMPARISON
    // --------------------------------------------------------

    } else if (id === 'qld-wave-dumbbell') {
      const label = document.createElement('label');

      label.textContent = 'Compare measure: ';
      label.htmlFor = 'qld-wave-metric';

      label.style.cssText =
        'display:block;font-weight:700;' +
        'margin:2px 0 12px;color:#244654';

      const picker = document.createElement('select');
      picker.id = 'qld-wave-metric';

      picker.style.cssText =
        'font:inherit;padding:9px 12px;' +
        'border:1px solid #bcd6d1;' +
        'border-radius:8px;background:#fff;' +
        'color:#123442;max-width:100%;margin-left:8px';

      for (const item of info.metricOptions || []) {
        const option = document.createElement('option');

        option.value = item.value;

        option.textContent =
          `${item.label} (${item.unit})`;

        picker.append(option);
      }

      const key = document.createElement('p');

      key.textContent =
        '● 2024 (blue)     ● 2025 (orange) · ' +
        'January–November in both years';

      key.style.cssText =
        'color:#4f6972;font-size:.84rem;margin:0 0 10px';

      label.append(picker);

      card.insertBefore(label, viz);
      card.insertBefore(key, viz);

      let revision = 0;

      async function renderMeasure(metric) {
        const version = ++revision;

        const option = (
          info.metricOptions || []
        ).find(item => item.value === metric);

        if (!option) return;

        setText(
          story,
          info.interpretations?.[metric]
        );

        setText(callout, '');

        const selected = structuredClone(spec);

        selected.transform = [
          {
            filter: {
              field: 'metric',
              equal: metric
            }
          }
        ];

        selected.layer[0].encoding.x.axis.title =
          `${option.label} (${option.unit})`;

        selected.layer[0].encoding.x.axis.format =
          option.unit === '%' ? '.0f' : '.1f';

        selected.layer[1].encoding.x.axis = null;
        selected.layer[2].encoding.x.axis = null;

        if (version !== revision) return;

        await vegaEmbed(
          viz,
          selected,
          options
        );
      }

      picker.value =
        info.defaultMetric ||
        info.metricOptions?.[0]?.value;

      picker.addEventListener('change', () => {
        void renderMeasure(picker.value);
      });

      card.hidden = false;

      await renderMeasure(picker.value);

    // --------------------------------------------------------
    // CHART 1 — INTERACTIVE NATIONAL SURFING RESERVES MAP
    // --------------------------------------------------------

    } else if (
      id === 'map-reserves' &&
      info.interpretations &&
      info.stateOrder
    ) {
      card.classList.add('map-card');

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

      filters.setAttribute(
        'role',
        'group'
      );

      filters.setAttribute(
        'aria-label',
        'Filter surfing reserves by state'
      );

      const detail = document.createElement('p');
      detail.className = 'state-detail';

      mapSide.append(filters, viz);
      analysisSide.append(callout, detail, story);

      layout.append(mapSide, analysisSide);

      card.insertBefore(layout, source);

      const buttons = [];
      let requestNumber = 0;

      async function selectState(state) {
        const request = ++requestNumber;

        const result =
          info.interpretations[state];

        if (!result) return;

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

        const highlightHeading =
          document.createElement('strong');

        highlightHeading.textContent =
          info.annotationTargets?.[state]?.name ||
          'Map finding';

        const finding =
          document.createElement('span');

        finding.textContent =
          result.callout || '';

        callout.replaceChildren(
          highlightHeading,
          finding
        );

        callout.hidden = false;

        setText(detail, result.detail);
        setText(story, result.analysis);

        const selected = structuredClone(spec);

        if (state !== 'All') {
          selected.layer[1].transform = [
            ...(selected.layer[1].transform || []),
            {
              filter: {
                field: 'state',
                equal: state
              }
            }
          ];

          const width = Math.max(
            280,
            Math.floor(
              viz.getBoundingClientRect().width
            )
          );

          selected.width = width;
          selected.height = 350;

          selected.projection = getStateProjection(
            state,
            width,
            350
          );
        }

        if (request !== requestNumber) return;

        await vegaEmbed(
          viz,
          selected,
          options
        );
      }

      for (const state of info.stateOrder) {
        const button = document.createElement('button');

        button.type = 'button';
        button.dataset.state = state;
        button.className = 'state-filter';

        button.textContent =
          state === 'All'
            ? 'All states'
            : state;

        if (STATE_COLORS[state]) {
          button.style.setProperty(
            '--state-color',
            STATE_COLORS[state]
          );
        }

        button.addEventListener('click', () => {
          void selectState(state);
        });

        filters.append(button);
        buttons.push(button);
      }

      card.hidden = false;

      await selectState(
        info.defaultState || 'All'
      );

    // --------------------------------------------------------
    // ALL REMAINING CHARTS, INCLUDING CHART 7
    // --------------------------------------------------------

    } else {
      setText(callout, info.annotation);
      setText(story, info.analysis);

      card.hidden = false;

      await vegaEmbed(
        viz,
        spec,
        options
      );
    }

  } catch (error) {
    console.error(
      `Could not render ${id}:`,
      error
    );

    const viz = card.querySelector('.viz');

    if (viz) {
      viz.textContent =
        `Chart could not load: ${error.message}`;
    }

    card.hidden = false;
  }
}

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
  [data-chart="ausplay-surf-gender"] .chart-callout::before,
  [data-chart="ausplay-surf-map"] .chart-callout::after,
  [data-chart="ausplay-surf-ranking"] .chart-callout::after,
  [data-chart="ausplay-surf-gender"] .chart-callout::after,
  [data-chart="ausplay-surf-map"] .chart-story::before,
  [data-chart="ausplay-surf-ranking"] .chart-story::before,
  [data-chart="ausplay-surf-gender"] .chart-story::before {
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
// CHART 1 — PROJECTION
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
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

function getStateProjection(state, width, height) {
  const [west, south, east, north] = MAP_ZOOM_BOUNDS[state];

  const longitudeSpan = (east - west) * Math.PI / 180;
  const latitudeSpan = mercatorY(north) - mercatorY(south);

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
// SHARED HELPERS
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
// CHART 5 — SIZE KEY
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

    const diameter = value === 0
      ? 5
      : maxDiameter * Math.sqrt(value / maxValue);

    circle.style.width = `${diameter}px`;
    circle.style.height = `${diameter}px`;

    const label = document.createElement('span');
    label.className = 'key-label';

    label.textContent = title.includes('(%)')
      ? value.toFixed(1) + '%'
      : value.toLocaleString('en-AU');

    step.append(circle, label);
    steps.append(step);
  }

  key.append(heading, steps);

  return key;
}

// ============================================================
// CHART 6 — DORLING CARTOGRAM DATA
// ============================================================

const DORLING_STATES = [
  {
    state: 'WA',
    name: 'Western Australia',
    participants: 43496,
    rate: 1.762,
    ax: .17,
    ay: .47
  },
  {
    state: 'NT',
    name: 'Northern Territory',
    participants: 451,
    rate: .217,
    ax: .43,
    ay: .18
  },
  {
    state: 'QLD',
    name: 'Queensland',
    participants: 63787,
    rate: 1.379,
    ax: .76,
    ay: .25
  },
  {
    state: 'SA',
    name: 'South Australia',
    participants: 20188,
    rate: 1.277,
    ax: .43,
    ay: .54
  },
  {
    state: 'NSW',
    name: 'New South Wales',
    participants: 117953,
    rate: 1.671,
    ax: .77,
    ay: .56
  },
  {
    state: 'VIC',
    name: 'Victoria',
    participants: 58683,
    rate: 1.010,
    ax: .61,
    ay: .78
  },
  {
    state: 'ACT',
    name: 'Australian Capital Territory',
    participants: 2272,
    rate: .571,
    ax: .94,
    ay: .75
  },
  {
    state: 'TAS',
    name: 'Tasmania',
    participants: 6566,
    rate: 1.358,
    ax: .71,
    ay: .94
  }
];

// ============================================================
// CHART 6 — NON-OVERLAPPING CIRCLE LAYOUT
// ============================================================

function createDorlingData(
  metric,
  plotWidth = 760,
  plotHeight = 460
) {
  const isRate = metric === 'rate';
  const maxValue = isRate ? 2 : 125000;

  // Provide enough space for every numeric label.
  const minRadius = 31;
  const maxRadius = Math.min(68, plotWidth * .088);

  const nodes = DORLING_STATES.map((state) => {
    const value = isRate
      ? state.rate
      : state.participants;

    // Minimum radius ensures the smallest values fit.
    // Circle area then increases linearly with the measure.
    const radius = Math.sqrt(
      minRadius ** 2 +
      (value / maxValue) *
      (maxRadius ** 2 - minRadius ** 2)
    );

    return {
      ...state,
      value,
      radius,
      area: Math.PI * radius * radius,
      x: state.ax * plotWidth,
      y: state.ay * plotHeight,
      targetX: state.ax * plotWidth,
      targetY: state.ay * plotHeight
    };
  });

  // Move colliding circles apart while keeping approximate geography.
  for (let iteration = 0; iteration < 350; iteration++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        if (distance < .001) {
          dx = 1;
          dy = 0;
          distance = 1;
        }

        const overlap =
          a.radius + b.radius + 18 - distance;

        if (overlap > 0) {
          const movement = overlap / 2;

          a.x -= dx / distance * movement;
          a.y -= dy / distance * movement;
          b.x += dx / distance * movement;
          b.y += dy / distance * movement;
        }
      }
    }

    for (const node of nodes) {
      node.x += (node.targetX - node.x) * .026;
      node.y += (node.targetY - node.y) * .026;

      const margin = node.radius + 24;

      node.x = Math.max(
        margin,
        Math.min(plotWidth - margin, node.x)
      );

      node.y = Math.max(
        margin + 18,
        Math.min(plotHeight - margin, node.y)
      );
    }
  }

  // Final collision-only pass.
  for (let iteration = 0; iteration < 90; iteration++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        if (distance < .001) {
          dx = 1;
          dy = 0;
          distance = 1;
        }

        const overlap =
          a.radius + b.radius + 16 - distance;

        if (overlap > 0) {
          const movement = overlap / 2;

          a.x -= dx / distance * movement;
          a.y -= dy / distance * movement;
          b.x += dx / distance * movement;
          b.y += dy / distance * movement;
        }
      }
    }
  }

  return nodes.map((node) => ({
    state: node.state,
    name: node.name,
    participants: node.participants,
    rate: node.rate,
    area: node.area,
    x: node.x,
    y: node.y,

    // State name always above the circle.
    label_y: node.y - node.radius - 16,

    // Numeric value always inside the circle.
    value_label: isRate
      ? `${node.rate.toFixed(2)}%`
      : node.participants.toLocaleString('en-AU')
  }));
}

// ============================================================
// LOAD ALL CHARTS
// ============================================================

for (const card of document.querySelectorAll('[data-chart]')) {
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
    // CHART 6 — DORLING CARTOGRAM
    // --------------------------------------------------------

    if (id === 'ausplay-surf-ranking') {
      const controls = document.createElement('div');
      controls.className = 'participation-ranking-controls';

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

      let revision = 0;

      async function showMetric(metric) {
        const request = ++revision;
        const measure = metric === 'rate' ? 'rate' : 'count';

        const plotWidth = Math.max(
          440,
          Math.floor(
            viz.getBoundingClientRect().width || 760
          ) - 16
        );

        const plotHeight = 470;

        const selected = structuredClone(spec);

        selected.width = plotWidth;
        selected.height = plotHeight;

        selected.data = {
          values: createDorlingData(
            measure,
            plotWidth,
            plotHeight
          )
        };

        selected.encoding.x.scale.domain = [0, plotWidth];
        selected.encoding.y.scale.domain = [plotHeight, 0];

        // Remove any existing Chart 6 size legend.
        card.querySelectorAll('.participation-size-key')
          .forEach(element => element.remove());

        viz.style.overflowX =
          plotWidth > viz.clientWidth ? 'auto' : 'visible';

        setText(callout, info.highlights?.[measure]);
        setText(story, info.interpretations?.[measure]);

        if (request !== revision) return;

        await vegaEmbed(viz, selected, options);
      }

      selector.value = info.defaultMetric || 'count';

      selector.addEventListener('change', () => {
        void showMetric(selector.value);
      });

      card.hidden = false;
      await showMetric(selector.value);

    // --------------------------------------------------------
    // CHART 5 — AUSTRALIAN PARTICIPATION MAP
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
          [0, 25000, 50000, 75000, 100000, 125000],
          'Estimated surfers aged 15+',
          125000,
          43
        )
      );

      card.hidden = false;
      await vegaEmbed(viz, selected, options);

    // --------------------------------------------------------
    // EXISTING QUEENSLAND WAVE COMPARISON
    // --------------------------------------------------------

    } else if (id === 'qld-wave-dumbbell') {
      const label = document.createElement('label');
      label.textContent = 'Compare measure: ';
      label.htmlFor = 'qld-wave-metric';

      label.style.cssText =
        'display:block;font-weight:700;margin:2px 0 12px;' +
        'color:#244654';

      const picker = document.createElement('select');
      picker.id = 'qld-wave-metric';

      picker.style.cssText =
        'font:inherit;padding:9px 12px;' +
        'border:1px solid #bcd6d1;border-radius:8px;' +
        'background:#fff;color:#123442;' +
        'max-width:100%;margin-left:8px';

      for (const item of info.metricOptions || []) {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = `${item.label} (${item.unit})`;
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

        const option = (info.metricOptions || [])
          .find(item => item.value === metric);

        if (!option) return;

        setText(story, info.interpretations?.[metric]);
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

        await vegaEmbed(viz, selected, options);
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
    // CHART 1 — INTERACTIVE SURFING RESERVES MAP
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
      analysisSide.setAttribute('aria-live', 'polite');

      const filters = document.createElement('div');
      filters.className = 'state-filters';

      filters.setAttribute('role', 'group');
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
        const result = info.interpretations[state];

        if (!result) return;

        for (const button of buttons) {
          const active = button.dataset.state === state;

          button.classList.toggle('is-active', active);
          button.setAttribute('aria-pressed', String(active));
        }

        const highlightHeading =
          document.createElement('strong');

        highlightHeading.textContent =
          info.annotationTargets?.[state]?.name ||
          'Map finding';

        const finding = document.createElement('span');
        finding.textContent = result.callout || '';

        callout.replaceChildren(highlightHeading, finding);
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
            Math.floor(viz.getBoundingClientRect().width)
          );

          selected.width = width;
          selected.height = 350;

          selected.projection =
            getStateProjection(state, width, 350);
        }

        if (request !== requestNumber) return;

        await vegaEmbed(viz, selected, options);
      }

      for (const state of info.stateOrder) {
        const button = document.createElement('button');

        button.type = 'button';
        button.dataset.state = state;
        button.className = 'state-filter';

        button.textContent =
          state === 'All' ? 'All states' : state;

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
      await selectState(info.defaultState || 'All');

    // --------------------------------------------------------
    // ALL OTHER CHARTS, INCLUDING THE CHART 7 MOSAIC
    // --------------------------------------------------------

    } else {
      setText(callout, info.annotation);
      setText(story, info.analysis);

      card.hidden = false;
      await vegaEmbed(viz, spec, options);
    }

  } catch (error) {
    console.error(`Could not render ${id}:`, error);

    const viz = card.querySelector('.viz');

    if (viz) {
      viz.textContent =
        `Chart could not load: ${error.message}`;
    }

    card.hidden = false;
  }
}

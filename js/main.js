// FIT3179: Load independent Vega-Lite 6 specifications and their interpretations.
const root = new URL('../', import.meta.url);

// Keep participation highlights consistent with the dashboard, without arrows.
const participationStyle = document.createElement('style');
participationStyle.textContent = `
  [data-chart="ausplay-surf-map"] .chart-callout,
  [data-chart="ausplay-surf-ranking"] .chart-callout {
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
  [data-chart="ausplay-surf-ranking"] .chart-callout::before {
    content: none !important;
    display: none !important;
  }
`;
document.head.append(participationStyle);

const STATE_COLORS = {
  NSW: '#0072B2', QLD: '#E69F00', VIC: '#CC79A7',
  SA: '#009E73', WA: '#D55E00'
};

const zoomBounds = {
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
  const [west, south, east, north] = zoomBounds[state];
  const longitudeSpan = (east - west) * Math.PI / 180;
  const latitudeSpan = mercatorY(north) - mercatorY(south);
  const scale = Math.min(width * .88 / longitudeSpan, height * .84 / latitudeSpan);
  const centerY = (mercatorY(south) + mercatorY(north)) / 2;

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

for (const card of document.querySelectorAll('[data-chart]')) {
  const id = card.dataset.chart;

  try {
    const response = await fetch(new URL(`specs/${id}.json`, root));

    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

    heading.textContent = info.title || id.replaceAll('-', ' ');

    const sources = info.sources || (info.source ? [info.source] : []);
    source.replaceChildren();

    sources.forEach((item, index) => {
      if (!item.url || !item.label) return;

      source.append(index === 0 ? 'Source: ' : ' · ');

      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      source.append(link);
    });

    source.hidden = !source.childNodes.length;

    const options = {
      actions: false,
      renderer: 'svg',
      loader: vega.loader({baseURL: root.href})
    };

    if (id === 'ausplay-surf-ranking') {
      // Chart 6: compare total participation and population-adjusted rates.
      const label = document.createElement('label');
      label.htmlFor = 'ausplay-metric';
      label.textContent = 'Rank states by: ';
      label.style.cssText =
        'display:block;margin:4px 0 12px;font-weight:700;color:#244654';

      const selector = document.createElement('select');
      selector.id = 'ausplay-metric';
      selector.style.cssText =
        'font:inherit;margin-left:8px;padding:9px 12px;' +
        'border:1px solid #bcd6d1;border-radius:8px;' +
        'background:#fff;color:#123442;max-width:100%';

      for (const metric of info.metricOptions || []) {
        const option = document.createElement('option');
        option.value = metric.value;
        option.textContent = `${metric.label} (${metric.unit})`;
        selector.append(option);
      }

      label.append(selector);
      card.insertBefore(label, viz);

      let revision = 0;

      async function showMetric(metric) {
        const request = ++revision;
        const copy = structuredClone(spec);

        copy.transform = [
          {filter: {field: 'metric', equal: metric}}
        ];

        copy.encoding.x.axis.title = metric === 'rate'
          ? 'Estimated adult surfing participation rate (%)'
          : 'Estimated adult surfing participants (people)';

        story.textContent = info.interpretations?.[metric] || '';
        story.hidden = !story.textContent;

        // Highlight changes with the selected measure.
        callout.textContent = info.highlights?.[metric] || '';
        callout.hidden = !callout.textContent;

        if (request === revision) {
          await vegaEmbed(viz, copy, options);
        }
      }

      selector.value = info.defaultMetric || 'count';

      selector.addEventListener('change', () => {
        void showMetric(selector.value);
      });

      card.hidden = false;
      await showMetric(selector.value);

    } else if (id === 'qld-wave-dumbbell') {
      // Earlier Queensland comparison: retain existing interactive behaviour.
      const label = document.createElement('label');
      label.textContent = 'Compare measure: ';
      label.htmlFor = 'qld-wave-metric';
      label.style.cssText =
        'display:block;font-weight:700;margin:2px 0 12px;color:#244654';

      const picker = document.createElement('select');
      picker.id = 'qld-wave-metric';
      picker.style.cssText =
        'font:inherit;padding:9px 12px;border:1px solid #bcd6d1;' +
        'border-radius:8px;background:#fff;color:#123442;' +
        'max-width:100%;margin-left:8px';

      for (const item of info.metricOptions || []) {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = `${item.label} (${item.unit})`;
        picker.append(option);
      }

      const key = document.createElement('p');
      key.textContent =
        '● 2024 (blue)     ● 2025 (orange)  ·  January–November in both years';
      key.style.cssText =
        'color:#4f6972;font-size:.84rem;margin:0 0 10px';

      label.append(picker);
      card.insertBefore(label, viz);
      card.insertBefore(key, viz);

      let revision = 0;

      async function renderMeasure(metric) {
        const version = ++revision;
        const option = (info.metricOptions || []).find(
          item => item.value === metric
        );

        if (!option) return;

        story.textContent = info.interpretations?.[metric] || '';
        story.hidden = !story.textContent;

        const selected = structuredClone(spec);
        selected.transform = [
          {filter: {field: 'metric', equal: metric}}
        ];

        selected.layer[0].encoding.x.axis.title =
          `${option.label} (${option.unit})`;

        selected.layer[0].encoding.x.axis.format =
          option.unit === '%' ? '.0f' : '.1f';

        selected.layer[1].encoding.x.axis = null;
        selected.layer[2].encoding.x.axis = null;

        if (version !== revision) return;

        try {
          await vegaEmbed(viz, selected, options);
        } catch (error) {
          viz.textContent =
            `Comparison could not load: ${error.message}`;
        }
      }

      picker.value = info.defaultMetric || 'Median Hs';

      picker.addEventListener('change', () => {
        void renderMeasure(picker.value);
      });

      callout.hidden = true;
      card.hidden = false;
      await renderMeasure(picker.value);

    } else if (
      id === 'map-reserves' &&
      info.interpretations &&
      info.stateOrder
    ) {
      // Chart 1: preserve state filters and the right-side analysis panel.
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

        const heading = document.createElement('strong');
        heading.textContent =
          info.annotationTargets?.[state]?.name || 'Map finding';

        const finding = document.createElement('span');
        finding.textContent = result.callout || '';

        callout.replaceChildren(heading, finding);
        callout.hidden = false;

        detail.textContent = result.detail || '';
        detail.hidden = !result.detail;

        story.textContent = result.analysis || '';
        story.hidden = !result.analysis;

        const selected = structuredClone(spec);

        if (state !== 'All') {
          selected.layer[1].transform = [
            ...(selected.layer[1].transform || []),
            {filter: {field: 'state', equal: state}}
          ];

          const width = Math.max(
            280,
            Math.floor(viz.getBoundingClientRect().width)
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

    } else {
      // All remaining charts, including Chart 5.
      callout.textContent = info.annotation || '';
      callout.hidden = !info.annotation;

      story.textContent = info.analysis || '';
      story.hidden = !info.analysis;

      card.hidden = false;
      await vegaEmbed(viz, spec, options);
    }

  } catch (error) {
    console.error(`Could not render ${id}:`, error);
    card.querySelector('.viz').textContent =
      `Chart could not load: ${error.message}`;
    card.hidden = false;
  }
}

// FIT3179 chart loader
// Vega-Lite v6
// Loads charts from /specs/<data-chart>.json

const root = new URL('../', import.meta.url);

const cards = [
  ...document.querySelectorAll(
    'article.chart-card[data-chart]'
  )
];

for (const [index, card] of cards.entries()) {

  const id = card.dataset.chart;
  const chartNumber = index + 1;

  const viz = card.querySelector('.viz');
  const callout = card.querySelector('.chart-callout');
  const story = card.querySelector('.chart-story');
  const source = card.querySelector('.chart-source');

  if (!viz) continue;

  try {

    // LOAD THE VEGA-LITE SPECIFICATION

    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

    if (response.status === 404) continue;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const spec = await response.json();

    if (!spec.$schema?.includes('vega-lite/v6')) {
      throw new Error('Expected Vega-Lite v6');
    }

    const info = spec.usermeta || {};

    // CHART TITLE

    const heading = card.querySelector('h3');

    if (heading) {
      heading.textContent =
        info.title ||
        heading.textContent ||
        id.replaceAll('-', ' ');
    }

    // DATA SOURCE

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

    // CHART ANNOTATION

    if (callout) {
      callout.textContent = info.annotation || '';
      callout.hidden = !info.annotation;
    }

    // CHART INTERPRETATION

    if (story) {
      story.textContent =
        info.analysis ||
        story.textContent ||
        '';

      story.hidden = !story.textContent.trim();
    }

    // ----------------------------------
    // CHART 11: REMOVE FILTER CONTROLS
    // ----------------------------------

    if (
      chartNumber === 11 ||
      card.dataset.removeFilter === 'true'
    ) {

      // Remove external filter containers

      card.querySelectorAll(
        [
          '.chart-filters',
          '.chart-filter',
          '.filter-controls',
          '.filter-buttons',
          '.chart11-filters',
          '[data-chart-filter]',
          '[data-chart11-filter]'
        ].join(', ')
      ).forEach(element => element.remove());

      // Remove Vega-Lite bound input controls.
      // Retain parameter definitions.

      if (Array.isArray(spec.params)) {

        spec.params = spec.params.map(
          ({ bind, ...parameter }) => parameter
        );

      }
    }

    // VEGA-EMBED OPTIONS

    const options = {
      actions: false,
      renderer: 'svg',
      loader: vega.loader({
        baseURL: root.href
      })
    };

    // ----------------------------------
    // CHART 1: STATE SELECTION
    // ----------------------------------
    // Preserve original map interactivity.
    // Unrelated to Chart 11.

    if (
      id === 'map-reserves' &&
      info.interpretations &&
      info.stateOrder
    ) {

      const filters = document.createElement('div');

      filters.className = 'state-filters';
      filters.setAttribute('role', 'group');

      filters.setAttribute(
        'aria-label',
        'Filter surfing reserves by state'
      );

      viz.before(filters);

      const palette = {
        NSW: '#117989',
        QLD: '#E3A049',
        VIC: '#7D6BA3',
        SA: '#B96A75',
        WA: '#568C69'
      };

      let latest = 0;
      const buttons = [];

      const selectState = async state => {

        const request = ++latest;

        for (const button of buttons) {

          const selected =
            button.dataset.state === state;

          button.classList.toggle(
            'is-active',
            selected
          );

          button.setAttribute(
            'aria-pressed',
            String(selected)
          );
        }

        const detail =
          info.interpretations[state];

        if (detail && callout) {

          callout.textContent =
            detail.callout || '';

          callout.hidden =
            !detail.callout;
        }

        if (detail && story) {

          story.textContent =
            detail.analysis || '';

          story.hidden =
            !detail.analysis;
        }

        const selectedSpec =
          structuredClone(spec);

        if (
          state !== 'All' &&
          selectedSpec.layer?.[1]
        ) {

          selectedSpec.layer[1].transform = [
            ...(
              selectedSpec.layer[1].transform || []
            ),
            {
              filter: {
                field: 'state',
                equal: state
              }
            }
          ];
        }

        if (request === latest) {

          await vegaEmbed(
            viz,
            selectedSpec,
            options
          );
        }
      };

      // CREATE STATE BUTTONS

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

    } else {

      // ALL OTHER CHARTS, INCLUDING
      // CHARTS 11 AND 12

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

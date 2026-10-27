/* =========================================================
   CHART 11 — RADAR MEASURE DEFINITIONS

   This module only creates explanatory buttons.

   It does not:
   - load or replace the radar chart
   - modify rating values
   - change the Vega-Lite specification
   - interfere with main.js
   ========================================================= */

const MEASURE_DEFINITIONS = [
  {
    label: 'Wave quality',
    definition:
      'The quality of the waves when conditions are favourable, including how enjoyable and rewarding the break is to surf.',
    note:
      'A high score describes the quality of a good surfing session, not how often those conditions occur.'
  },
  {
    label: 'Consistency',
    definition:
      'How regularly the surf break produces favourable or usable surfing conditions.',
    note:
      'A location can have excellent waves on its best days without being consistently good.'
  },
  {
    label: 'Water quality',
    definition:
      'Visitors’ perceptions of the cleanliness and overall condition of the water at the surf break.',
    note:
      'This is a visitor rating, not a laboratory measurement of water quality.'
  },
  {
    label: 'Crowds',
    definition:
      'How visitors rate the crowding experience at the surf break.',
    note:
      'Higher scores indicate a more favourable crowding experience — generally fewer or more manageable crowds.'
  },
  {
    label: 'Access',
    definition:
      'How easy visitors consider it to reach and use the surf break.',
    note:
      'Access can involve factors such as reaching the beach, entering the water and nearby facilities.'
  },
  {
    label: 'Scenery',
    definition:
      'The perceived attractiveness of the surrounding coastline and landscape.',
    note:
      'This represents the destination experience rather than the physical quality of the waves.'
  },
  {
    label: 'Local attitude',
    definition:
      'How welcoming and friendly visitors perceive the local surfing environment.',
    note:
      'This is a subjective assessment based on visitor experiences.'
  },
  {
    label: 'Accommodation',
    definition:
      'How favourably visitors rate nearby places to stay when travelling to the surf destination.',
    note:
      'A higher rating indicates a more positive assessment of accommodation options.'
  },
  {
    label: 'Equipment & repairs',
    definition:
      'Visitors’ assessments of access to surfing equipment, shops and repair services around the destination.',
    note:
      'This measures supporting facilities rather than wave performance.'
  }
];

function initialiseChart11Definitions() {
  const buttonsContainer =
    document.getElementById('chart11-measure-buttons');

  const definitionContainer =
    document.getElementById('chart11-measure-definition');

  if (!buttonsContainer || !definitionContainer) {
    return;
  }

  const buttons = [];

  function selectMeasure(index) {
    const selected = MEASURE_DEFINITIONS[index];

    if (!selected) {
      return;
    }

    // Use DOM text nodes rather than injecting HTML strings.
    definitionContainer.replaceChildren();

    const heading = document.createElement('h5');
    heading.textContent = selected.label;

    const description = document.createElement('p');
    description.textContent = selected.definition;

    definitionContainer.append(heading, description);

    if (selected.note) {
      const note = document.createElement('span');
      note.className = 'measure-note';
      note.textContent = selected.note;
      definitionContainer.append(note);
    }

    buttons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;

      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  MEASURE_DEFINITIONS.forEach((measure, index) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'chart11-measure-btn';
    button.textContent = measure.label;

    button.setAttribute('aria-pressed', 'false');
    button.setAttribute(
      'aria-controls',
      'chart11-measure-definition'
    );

    button.addEventListener('click', () => {
      selectMeasure(index);
    });

    buttons.push(button);
    buttonsContainer.append(button);
  });

  // Display the first definition when the page opens.
  selectMeasure(0);
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initialiseChart11Definitions
  );
} else {
  initialiseChart11Definitions();
}

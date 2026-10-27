/* =========================================================
   CHART 11 — INTERACTIVE RADAR MEASURE DEFINITIONS

   This file handles only the explanatory side panel.

   The radar chart itself is still created using:
   specs/surf-break-head-to-head.json

   No surfing ratings are changed by this script.
   ========================================================= */

const CHART11_DEFINITIONS = [
  {
    label: "Wave quality",
    description:
      "How highly visitors rate the waves at this surf break when conditions are favourable.",
    note:
      "Wave quality does not measure how often good conditions occur."
  },
  {
    label: "Consistency",
    description:
      "How regularly visitors expect the break to produce suitable surfing conditions.",
    note:
      "A high consistency rating suggests more reliable opportunities to surf."
  },
  {
    label: "Water quality",
    description:
      "Visitors' assessment of the cleanliness and general quality of the water.",
    note:
      "This is a subjective review rating, not laboratory water-quality testing."
  },
  {
    label: "Crowds",
    description:
      "How favourable visitors consider the crowding conditions at the surf break.",
    note:
      "Higher ratings mean a more favourable experience, generally indicating fewer or more manageable crowds."
  },
  {
    label: "Access",
    description:
      "How conveniently surfers can reach and use the location.",
    note:
      "Access may reflect entry points, transport and surrounding facilities."
  },
  {
    label: "Scenery",
    description:
      "How attractive visitors consider the coastal environment and surrounding landscape.",
    note:
      "This describes the destination experience rather than the waves themselves."
  },
  {
    label: "Local attitude",
    description:
      "Visitors' perception of how welcoming and friendly the local surfing environment is.",
    note:
      "Individual experiences may vary considerably."
  },
  {
    label: "Accommodation",
    description:
      "Visitors' assessment of accommodation availability and suitability around the surfing destination.",
    note:
      "This measures supporting facilities rather than surfing performance."
  },
  {
    label: "Equipment & repairs",
    description:
      "Visitors' assessment of the availability of surfing equipment and repair services.",
    note:
      "This includes supporting services rather than wave conditions."
  }
];

function initialiseChart11Definitions() {
  const buttonsContainer = document.getElementById(
    "chart11-measure-buttons"
  );

  const definitionContainer = document.getElementById(
    "chart11-measure-definition"
  );

  if (!buttonsContainer || !definitionContainer) {
    console.warn(
      "Chart 11: definition containers were not found. " +
      "Check the IDs in index.html."
    );

    return;
  }

  // Remove any previously generated controls.
  buttonsContainer.replaceChildren();

  const buttons = [];

  function showDefinition(index) {
    const measure = CHART11_DEFINITIONS[index];

    if (!measure) {
      return;
    }

    // Update the explanation box.
    definitionContainer.replaceChildren();

    const heading = document.createElement("h5");
    heading.textContent = measure.label;

    const description = document.createElement("p");
    description.textContent = measure.description;

    const note = document.createElement("span");
    note.className = "measure-note";
    note.textContent = measure.note;

    definitionContainer.append(
      heading,
      description,
      note
    );

    // Update button appearance and accessibility state.
    buttons.forEach((button, buttonIndex) => {
      const isSelected = buttonIndex === index;

      button.classList.toggle(
        "is-active",
        isSelected
      );

      button.setAttribute(
        "aria-pressed",
        String(isSelected)
      );
    });
  }

  // Generate one button per rating measure.
  CHART11_DEFINITIONS.forEach((measure, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "chart11-measure-btn";
    button.textContent = measure.label;

    button.setAttribute("aria-pressed", "false");

    button.setAttribute(
      "aria-controls",
      "chart11-measure-definition"
    );

    button.addEventListener("click", () => {
      showDefinition(index);
    });

    buttons.push(button);
    buttonsContainer.appendChild(button);
  });

  // Populate the panel immediately.
  showDefinition(0);
}

// Works whether the module loads before or after DOMContentLoaded.
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseChart11Definitions,
    { once: true }
  );
} else {
  initialiseChart11Definitions();
}

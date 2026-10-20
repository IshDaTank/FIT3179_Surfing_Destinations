const root = new URL("../", import.meta.url);

// Shared state colours for the dashboard.
const STATE_COLORS = {
  NSW: "#0072B2",
  QLD: "#E69F00",
  VIC: "#CC79A7",
  SA: "#009E73",
  WA: "#D55E00"
};

// Map zoom regions: [west, south, east, north].
const zoomBounds = {
  NSW: [148.5, -37, 155, -27.5],
  QLD: [150, -30, 155, -24],
  VIC: [140, -41, 150, -35],
  SA: [128, -38, 140, -30],
  WA: [111, -36.5, 118, -25]
};

// Convert latitude into Mercator coordinates.
function mercatorY(latitude) {
  const radians = latitude * Math.PI / 180;

  return Math.log(
    Math.tan(Math.PI / 4 + radians / 2)
  );
}

// Calculate the projection for a selected region.
function getStateProjection(state, width, height) {
  const [west, south, east, north] = zoomBounds[state];

  const longitudeSpan =
    (east - west) * Math.PI / 180;

  const latitudeSpan =
    mercatorY(north) - mercatorY(south);

  const scale = Math.min(
    width * 0.88 / longitudeSpan,
    height * 0.84 / latitudeSpan
  );

  const centerLongitude = (west + east) / 2;

  const centerY =
    (mercatorY(south) + mercatorY(north)) / 2;

  const centerLatitude =
    Math.atan(Math.sinh(centerY)) * 180 / Math.PI;

  return {
    type: "mercator",
    center: [centerLongitude, centerLatitude],
    scale: scale,
    translate: [width / 2, height / 2]
  };
}

// Load every available chart.
for (const card of document.querySelectorAll("[data-chart]")) {
  const id = card.dataset.chart;

  try {
    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

    // Unbuilt charts remain hidden.
    if (response.status === 404) continue;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const spec = await response.json();
    const info = spec.usermeta || {};

    if (!spec.$schema?.includes("vega-lite/v6")) {
      throw new Error("Expected Vega-Lite 6");
    }

    const title = card.querySelector("h3");
    const viz = card.querySelector(".viz");
    const callout = card.querySelector(".chart-callout");
    const story = card.querySelector(".chart-story");
    const source = card.querySelector(".chart-source");

    title.textContent =
      info.title || id.replaceAll("-", " ");

    // Chart-specific source links.
    const sources = info.sources ||
      (info.source ? [info.source] : []);

    source.replaceChildren();

    sources.forEach((item, index) => {
      if (!item.url || !item.label) return;

      source.append(index === 0 ? "Source: " : " · ");

      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      source.append(link);
    });

    source.hidden = !source.childNodes.length;

    const options = {
      actions: false,
      renderer: "svg",
      loader: vega.loader({
        baseURL: root.href
      })
    };

    // Chart 1: interactive map.
    if (
      id === "map-reserves" &&
      info.interpretations &&
      info.stateOrder
    ) {
      card.classList.add("map-card");

      // Build the two-column layout.
      const layout = document.createElement("div");
      layout.className = "map-layout";

      const mapSide = document.createElement("div");
      mapSide.className = "map-side";

      const analysisSide = document.createElement("aside");
      analysisSide.className = "map-analysis";
      analysisSide.setAttribute("aria-live", "polite");

      const filters = document.createElement("div");
      filters.className = "state-filters";
      filters.setAttribute("role", "group");
      filters.setAttribute(
        "aria-label",
        "Filter surfing reserves by state"
      );

      const detail = document.createElement("p");
      detail.className = "state-detail";

      mapSide.append(filters, viz);
      analysisSide.append(callout, detail, story);

      layout.append(mapSide, analysisSide);
      card.insertBefore(layout, source);

      const buttons = [];
      let currentState = info.defaultState || "All";
      let rendering = false;

      // Update the map and interpretation.
      async function selectState(state) {
        const result = info.interpretations[state];

        if (!result || rendering) return;

        rendering = true;
        currentState = state;

        // Show which state is selected.
        for (const button of buttons) {
          const active = button.dataset.state === state;

          button.classList.toggle("is-active", active);
          button.setAttribute(
            "aria-pressed",
            String(active)
          );
        }

        // Short state-specific annotation.
        const heading = document.createElement("strong");
        heading.textContent =
          info.annotationTargets?.[state]?.name ||
          "Map finding";

        const finding = document.createElement("span");
        finding.textContent = result.callout || "";

        callout.replaceChildren(heading, finding);
        callout.hidden = false;

        // Full analytical interpretation.
        detail.textContent = result.detail || "";
        detail.hidden = !result.detail;

        story.textContent = result.analysis || "";
        story.hidden = !result.analysis;

        // Create a fresh map specification.
        const selectedSpec = structuredClone(spec);

        if (state !== "All") {
          // Filter only the reserve markers.
          selectedSpec.layer[1].transform = [
            ...(selectedSpec.layer[1].transform || []),
            {
              filter: {
                field: "state",
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

          const height = 350;

          selectedSpec.width = width;
          selectedSpec.height = height;

          // Zoom to the selected state.
          selectedSpec.projection = getStateProjection(
            state,
            width,
            height
          );
        } else {
          // Restore the full Australian map.
          selectedSpec.projection =
            structuredClone(spec.projection);
        }

        try {
          await vegaEmbed(viz, selectedSpec, options);
        } catch (error) {
          console.error("Could not render map:", error);

          viz.textContent =
            `Map could not load: ${error.message}`;
        } finally {
          rendering = false;
        }
      }

      // Create the six filter buttons.
      for (const state of info.stateOrder) {
        const button = document.createElement("button");

        button.type = "button";
        button.dataset.state = state;
        button.className = "state-filter";

        button.textContent =
          state === "All" ? "All states" : state;

        // Match the chart's state colours.
        if (STATE_COLORS[state]) {
          button.style.setProperty(
            "--state-color",
            STATE_COLORS[state]
          );
        }

        button.addEventListener("click", () => {
          selectState(state);
        });

        filters.append(button);
        buttons.push(button);
      }

      card.hidden = false;

      await selectState(currentState);

    } else {
      // Chart 2 and all later charts.
      // Annotations are stored and drawn within the JSON.
      callout.hidden = !info.annotation;
      callout.textContent = info.annotation || "";

      story.textContent = info.analysis || "";
      story.hidden = !info.analysis;

      card.hidden = false;

      await vegaEmbed(viz, spec, options);
    }

  } catch (error) {
    console.error(`Could not render ${id}:`, error);

    card.querySelector(".viz").textContent =
      `Chart could not load: ${error.message}`;

    card.hidden = false;
  }
}

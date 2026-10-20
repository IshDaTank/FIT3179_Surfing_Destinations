/* Load each chart and its analysis from its Vega-Lite JSON file */
const root = new URL("../", import.meta.url);

for (const card of document.querySelectorAll("[data-chart]")) {
  const id = card.dataset.chart;

  try {
    // Load the chart JSON
    const response = await fetch(new URL(`specs/${id}.json`, root));

    // Hide charts that have not been created yet
    if (response.status === 404) continue;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const spec = await response.json();
    const info = spec.usermeta || {};

    // Ensure the chart uses Vega-Lite 6
    if (!spec.$schema?.includes("vega-lite/v6")) {
      throw new Error("Expected Vega-Lite 6");
    }

    // Chart heading
    card.querySelector("h3").textContent =
      info.title || id.replaceAll("-", " ");

    const viz = card.querySelector(".viz");
    const callout = card.querySelector(".chart-callout");
    const story = card.querySelector(".chart-story");
    const source = card.querySelector(".chart-source");

    // Source attribution
    if (info.source?.url && info.source?.label) {
      const link = document.createElement("a");

      link.href = info.source.url;
      link.textContent = info.source.label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      source.replaceChildren("Source: ", link);
    }

    source.hidden = !source.childNodes.length;

    // Vega-Lite rendering settings
    const options = {
      actions: false,
      renderer: "svg",
      loader: vega.loader({
        baseURL: root.href
      })
    };

    /* CHART 1: INTERACTIVE SURFING RESERVES MAP */

    if (
      id === "map-reserves" &&
      info.interpretations &&
      info.stateOrder
    ) {
      card.classList.add("map-card");

      // Create the two-column layout
      const layout = document.createElement("div");
      layout.className = "map-layout";

      const mapSide = document.createElement("div");
      mapSide.className = "map-side";

      const analysisSide = document.createElement("aside");
      analysisSide.className = "map-analysis";
      analysisSide.setAttribute("aria-live", "polite");

      // State filter buttons
      const filters = document.createElement("div");
      filters.className = "state-filters";

      filters.setAttribute("role", "group");
      filters.setAttribute(
        "aria-label",
        "Filter surfing reserves by state"
      );

      // Supporting map information
      const context = document.createElement("p");
      context.className = "state-context";

      // State-specific figures
      const detail = document.createElement("p");
      detail.className = "state-detail";

      // Left side: filters and map
      mapSide.append(filters, viz, context);

      // Right side: annotation and analysis
      analysisSide.append(callout, detail, story);

      layout.append(mapSide, analysisSide);
      card.insertBefore(layout, source);

      // Consistent state colours
      const palette = {
        NSW: "#117989",
        QLD: "#E3A049",
        VIC: "#7D6BA3",
        SA: "#B96A75",
        WA: "#568C69"
      };

      const buttons = [];
      let latestRequest = 0;

      // Update the map and analysis when a state is selected
      async function selectState(state) {
        const request = ++latestRequest;

        // Update active filter button
        for (const button of buttons) {
          const active = button.dataset.state === state;

          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        }

        // Get the selected state's interpretation
        const result = info.interpretations[state];

        if (!result) return;

        const target = info.annotationTargets?.[state];

        // Display the short annotation on the right
        callout.replaceChildren();

        const annotationTitle = document.createElement("strong");
        annotationTitle.textContent =
          target?.name || "Map finding";

        const annotationText = document.createElement("span");
        annotationText.textContent = result.callout;

        callout.append(annotationTitle, annotationText);

        // Display the separate analytical paragraph
        story.textContent = result.analysis;
        detail.textContent = result.detail || "";

        callout.hidden = false;
        story.hidden = false;
        detail.hidden = false;

        // Update the map context
        context.textContent =
          state === "All"
            ? "All 19 nationally listed reserves · equal-sized location markers"
            : `${state} only · national map extent unchanged`;

        // Copy the original chart specification
        const selected = structuredClone(spec);

        // Filter the reserve markers by state
        if (state !== "All") {
          selected.layer[1].transform = [
            ...(selected.layer[1].transform || []),
            {
              filter: {
                field: "state",
                equal: state
              }
            }
          ];
        }

        // No dashed lines or outlined circles are added.
        // Only the Australia map and reserve markers remain.

        try {
          if (request !== latestRequest) return;

          await vegaEmbed(viz, selected, options);
        } catch (error) {
          console.error("Could not render state map:", error);

          viz.textContent =
            `Map could not load: ${error.message}`;
        }
      }

      // Create state filter buttons
      for (const state of info.stateOrder) {
        const button = document.createElement("button");

        button.type = "button";
        button.dataset.state = state;
        button.className = "state-filter";

        if (palette[state]) {
          button.style.setProperty(
            "--state-color",
            palette[state]
          );
        }

        button.textContent =
          state === "All" ? "All states" : state;

        button.addEventListener("click", () => {
          selectState(state);
        });

        filters.append(button);
        buttons.push(button);
      }

      // Display Chart 1
      card.hidden = false;

      // Show all states by default
      await selectState(info.defaultState || "All");

    } else {

      /* ALL OTHER CHARTS */

      // Chart-specific annotation from JSON
      callout.textContent = info.annotation || "";
      callout.hidden = !info.annotation;

      // Chart-specific analysis from JSON
      story.textContent = info.analysis || "";
      story.hidden = !info.analysis;

      // Render the chart
      await vegaEmbed(viz, spec, options);

      card.hidden = false;
    }

  } catch (error) {
    console.error(`Could not render ${id}:`, error);

    card.querySelector(".viz").textContent =
      `Chart could not load: ${error.message}`;

    card.hidden = false;
  }
}

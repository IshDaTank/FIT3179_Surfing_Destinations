
const root = new URL("../", import.meta.url);

// Load every chart from its individual Vega-Lite JSON file.
for (const card of document.querySelectorAll("[data-chart]")) {
  const id = card.dataset.chart;

  try {
    const response = await fetch(new URL(`specs/${id}.json`, root));

    // Charts not yet built remain hidden.
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const spec = await response.json();
    const info = spec.usermeta || {};

    if (!spec.$schema?.includes("vega-lite/v6")) {
      throw new Error("Expected Vega-Lite 6");
    }

    card.querySelector("h3").textContent =
      info.title || id.replaceAll("-", " ");

    const viz = card.querySelector(".viz");
    const callout = card.querySelector(".chart-callout");
    const story = card.querySelector(".chart-story");
    const source = card.querySelector(".chart-source");

    // Display the official source.
    if (info.source?.url && info.source?.label) {
      const link = document.createElement("a");

      link.href = info.source.url;
      link.textContent = info.source.label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      source.replaceChildren("Source: ", link);
    }

    source.hidden = !source.childNodes.length;

    const options = {
      actions: false,
      renderer: "svg",
      loader: vega.loader({
        baseURL: root.href
      })
    };

    // Chart 1: Interactive map of surfing reserves.
    if (
      id === "map-reserves" &&
      info.interpretations &&
      info.stateOrder
    ) {
      card.classList.add("map-card");

      // Create the two-column layout.
      const layout = document.createElement("div");
      layout.className = "map-layout";

      const mapSide = document.createElement("div");
      mapSide.className = "map-side";

      const analysisSide = document.createElement("aside");
      analysisSide.className = "map-analysis";
      analysisSide.setAttribute("aria-live", "polite");

      // State selection buttons.
      const filters = document.createElement("div");
      filters.className = "state-filters";
      filters.setAttribute("role", "group");
      filters.setAttribute(
        "aria-label",
        "Filter surfing reserves by state"
      );

      // Supporting map context.
      const context = document.createElement("p");
      context.className = "state-context";

      // State-specific figures and dates.
      const detail = document.createElement("p");
      detail.className = "state-detail";

      mapSide.append(filters, viz, context);
      analysisSide.append(callout, detail, story);

      layout.append(mapSide, analysisSide);
      card.insertBefore(layout, source);

      const palette = {
        NSW: "#117989",
        QLD: "#E3A049",
        VIC: "#7D6BA3",
        SA: "#B96A75",
        WA: "#568C69"
      };

      const buttons = [];
      let latestRequest = 0;

      // Update the chart and analysis when a state is selected.
      async function selectState(state) {
        const request = ++latestRequest;

        // Highlight the selected button.
        for (const button of buttons) {
          const active = button.dataset.state === state;

          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        }

        const result = info.interpretations[state];
        if (!result) return;

        const target = info.annotationTargets?.[state];

        // Short, location-specific annotation.
        callout.replaceChildren();

        const annotationTitle = document.createElement("strong");
        annotationTitle.textContent =
          target?.name || "Map finding";

        const annotationText = document.createElement("span");
        annotationText.textContent = result.callout;

        callout.append(annotationTitle, annotationText);

        // Separate analytical interpretation.
        story.textContent = result.analysis;
        detail.textContent = result.detail || "";

        callout.hidden = false;
        story.hidden = false;
        detail.hidden = false;

        context.textContent =
          state === "All"
            ? "All 19 nationally listed reserves · equal-sized location markers"
            : `${state} only · national map extent unchanged`;

        // Copy the original Vega-Lite specification.
        const selected = structuredClone(spec);

        // Filter the location markers to the chosen state.
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

        // Add a dashed leader line to the selected location.
        if (target) {
          selected.layer.push({
            data: {
              values: [target]
            },
            mark: {
              type: "rule",
              stroke: "#075d6c",
              strokeWidth: 2.1,
              strokeDash: [5, 3]
            },
            encoding: {
              longitude: {
                field: "startLon",
                type: "quantitative"
              },
              latitude: {
                field: "startLat",
                type: "quantitative"
              },
              longitude2: {
                field: "lon"
              },
              latitude2: {
                field: "lat"
              }
            }
          });

          // Outline the annotated map location.
          selected.layer.push({
            data: {
              values: [target]
            },
            mark: {
              type: "circle",
              filled: false,
              size: 410,
              stroke: "#075d6c",
              strokeWidth: 2.5
            },
            encoding: {
              longitude: {
                field: "lon",
                type: "quantitative"
              },
              latitude: {
                field: "lat",
                type: "quantitative"
              }
            }
          });
        }

        try {
          // Prevent older requests from starting after newer ones.
          if (request !== latestRequest) return;

          await vegaEmbed(viz, selected, options);
        } catch (error) {
          console.error("Could not render state map:", error);
          viz.textContent =
            `Map could not load: ${error.message}`;
        }
      }

      // Create the interactive state buttons.
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

      card.hidden = false;

      // Display the combined national view initially.
      await selectState(info.defaultState || "All");
    } else {
      // Standard loading for the remaining charts.
      callout.textContent = info.annotation || "";
      callout.hidden = !info.annotation;

      story.textContent = info.analysis || "";
      story.hidden = !info.analysis;

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

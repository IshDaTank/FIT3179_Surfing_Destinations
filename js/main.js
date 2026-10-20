const root = new URL("../", import.meta.url);

for (const card of document.querySelectorAll("[data-chart]")) {
  const id = card.dataset.chart;

  try {
    // Load each chart specification.
    const response = await fetch(new URL(`specs/${id}.json`, root));

    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

    title.textContent = info.title || id.replaceAll("-", " ");

    // Create the source link.
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
      loader: vega.loader({ baseURL: root.href })
    };

    // Both maps share the compact two-column layout.
    if (id === "map-reserves" || id === "map-bins") {
      card.classList.add("map-card");

      const layout = document.createElement("div");
      layout.className = "map-layout";

      const mapSide = document.createElement("div");
      mapSide.className = "map-side";

      const analysisSide = document.createElement("aside");
      analysisSide.className = "map-analysis";

      mapSide.append(viz);
      analysisSide.append(callout, story);
      layout.append(mapSide, analysisSide);

      card.insertBefore(layout, source);

      // Chart 1: interactive state filtering.
      if (
        id === "map-reserves" &&
        info.interpretations &&
        info.stateOrder
      ) {
        const filters = document.createElement("div");
        filters.className = "state-filters";
        filters.setAttribute("role", "group");
        filters.setAttribute(
          "aria-label",
          "Filter surfing reserves by state"
        );

        mapSide.prepend(filters);

        const context = document.createElement("p");
        context.className = "state-context";
        mapSide.append(context);

        const detail = document.createElement("p");
        detail.className = "state-detail";
        analysisSide.insertBefore(detail, story);

        const palette = {
          NSW: "#117989",
          QLD: "#E3A049",
          VIC: "#7D6BA3",
          SA: "#B96A75",
          WA: "#568C69"
        };

        const buttons = [];
        let activeRequest = 0;

        async function selectState(state) {
          const result = info.interpretations[state];
          if (!result) return;

          const request = ++activeRequest;

          for (const button of buttons) {
            const active = button.dataset.state === state;

            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
          }

          // State-specific annotation.
          const annotationTitle = document.createElement("strong");
          annotationTitle.textContent =
            info.annotationTargets?.[state]?.name || "Map finding";

          const annotationText = document.createElement("span");
          annotationText.textContent = result.callout;

          callout.replaceChildren(
            annotationTitle,
            annotationText
          );
          callout.hidden = false;

          // Separate analytical interpretation.
          detail.textContent = result.detail || "";
          story.textContent = result.analysis || "";
          story.hidden = !result.analysis;

          context.textContent = state === "All"
            ? "All 19 nationally listed reserves · equal-sized location markers"
            : `${state} only · national map extent unchanged`;

          // Keep the background map; filter only markers.
          const selectedSpec = structuredClone(spec);

          if (state !== "All") {
            selectedSpec.layer[1].transform = [
              ...(selectedSpec.layer[1].transform || []),
              {
                filter: {
                  field: "state",
                  equal: state
                }
              }
            ];
          }

          try {
            if (request !== activeRequest) return;

            await vegaEmbed(viz, selectedSpec, options);
          } catch (error) {
            console.error(error);
            viz.textContent =
              `Map could not load: ${error.message}`;
          }
        }

        // State filter buttons.
        for (const state of info.stateOrder) {
          const button = document.createElement("button");

          button.type = "button";
          button.dataset.state = state;
          button.className = "state-filter";

          button.textContent =
            state === "All" ? "All states" : state;

          if (palette[state]) {
            button.style.setProperty(
              "--state-color",
              palette[state]
            );
          }

          button.addEventListener("click", () => {
            selectState(state);
          });

          filters.append(button);
          buttons.push(button);
        }

        card.hidden = false;
        await selectState(info.defaultState || "All");

      } else {
        // Chart 2: geographic bin map.
        callout.textContent = info.annotation || "";
        callout.hidden = !info.annotation;

        story.textContent = info.analysis || "";
        story.hidden = !info.analysis;

        card.hidden = false;
        await vegaEmbed(viz, spec, options);
      }

    } else {
      // Standard layout for future charts.
      callout.textContent = info.annotation || "";
      callout.hidden = !info.annotation;

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

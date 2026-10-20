const root = new URL("../", import.meta.url);

for (const card of document.querySelectorAll("[data-chart]")) {
  const id = card.dataset.chart;

  try {
    // Load the chart JSON.
    const response = await fetch(
      new URL(`specs/${id}.json`, root)
    );

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

    // Sources from the chart's JSON.
    const sources = info.sources || (
      info.source ? [info.source] : []
    );

    source.replaceChildren();

    sources.forEach((item, index) => {
      if (!item.url || !item.label) return;

      if (index > 0) {
        source.append(" · ");
      } else {
        source.append("Source: ");
      }

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

    // Charts 1 and 2 have a shared two-column layout.
    if (id === "map-reserves" || id === "map-bar-chart") {
      card.classList.add("map-card");

      const layout = document.createElement("div");
      layout.className = "map-layout";

      const chartSide = document.createElement("div");
      chartSide.className = "map-side";

      const analysisSide = document.createElement("aside");
      analysisSide.className = "map-analysis";

      chartSide.append(viz);
      analysisSide.append(story);

      layout.append(chartSide, analysisSide);
      card.insertBefore(layout, source);

      // Chart 1: state filters and changing interpretations.
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

        chartSide.prepend(filters);
        analysisSide.prepend(callout);

        const detail = document.createElement("p");
        detail.className = "state-detail";
        analysisSide.insertBefore(detail, story);

        const context = document.createElement("p");
        context.className = "state-context";
        chartSide.append(context);

        const palette = {
          NSW: "#117989",
          QLD: "#E3A049",
          VIC: "#7D6BA3",
          SA: "#B96A75",
          WA: "#568C69"
        };

        const buttons = [];

        async function selectState(state) {
          const result = info.interpretations[state];
          if (!result) return;

          // Update active buttons.
          for (const button of buttons) {
            const active = button.dataset.state === state;

            button.classList.toggle("is-active", active);
            button.setAttribute(
              "aria-pressed",
              String(active)
            );
          }

          const heading = document.createElement("strong");
          heading.textContent =
            info.annotationTargets?.[state]?.name ||
            "Map finding";

          const finding = document.createElement("span");
          finding.textContent = result.callout || "";

          callout.replaceChildren(heading, finding);
          callout.hidden = false;

          detail.textContent = result.detail || "";
          story.textContent = result.analysis || "";
          story.hidden = !result.analysis;

          context.textContent = state === "All"
            ? "All 19 nationally listed reserves · equal-sized location markers"
            : `${state} only · national map extent unchanged`;

          // Keep Australian outline and filter the markers.
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
            await vegaEmbed(viz, selectedSpec, options);
          } catch (error) {
            console.error(error);
            viz.textContent =
              `Map could not load: ${error.message}`;
          }
        }

        // Create filter buttons.
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
        // Chart 2: bar chart with annotations inside the JSON.
        callout.remove();

        story.textContent = info.analysis || "";
        story.hidden = !info.analysis;

        card.hidden = false;
        await vegaEmbed(viz, spec, options);
      }

    } else {
      // Standard loading for future charts.
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

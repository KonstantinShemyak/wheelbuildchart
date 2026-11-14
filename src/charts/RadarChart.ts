/**
 * Radar chart (d3): a grid of axes and levels, one closed polygon per
 * series, a numbered dot at each point, and a tooltip with its value.
 */

import * as d3 from "d3";
import type { SpokeDataPoint } from "../types/interfaces";

/** Width and height of the drawing; CSS scales it to the page */
const SIZE = 800;

/** Number of concentric level polygons in the grid */
const LEVELS = 3;

/** Colour of each series, in order */
const COLORS = d3.schemeCategory10;

// Radii, in screen pixels, of a dot and of the transparent circle that takes
// taps for it.
const DOT_RADIUS = 10.5;
const HIT_RADIUS = 17.5;

// Proportions of bold sans-serif digits, in ems: all digits share one advance
// width, and their height is the cap height.
const DIGIT_WIDTH = 0.556;
const DIGIT_HEIGHT = 0.716;

/**
 * Font size at which `digits` bold digits fill a circle of radius `r`: the
 * largest text box with the digits' proportions that fits inside the circle,
 * less a little padding so the digits do not touch the rim.
 */
function fitFontSize(r: number, digits: number): number {
  const aspect = (digits * DIGIT_WIDTH) / DIGIT_HEIGHT;
  const height = (2 * r) / Math.sqrt(1 + aspect * aspect);
  return (0.85 * height) / DIGIT_HEIGHT;
}

/**
 * Draw the chart into `container`, replacing any drawn before.
 * @param total Number of axes
 * @param data Series of points with values ≥ 0, each in increasing position
 *   order; a series need not have a point on every axis, its polygon joins
 *   the points it has
 */
export function drawRadarChart(
  container: HTMLElement,
  total: number,
  data: SpokeDataPoint[][],
): void {
  const centre = SIZE / 2;
  const maxValue = Math.max(
    1,
    d3.max(data, (series) => d3.max(series, (d) => d.value)) ?? 0,
  );

  d3.select(container).select("svg").remove();
  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${SIZE} ${SIZE}`);
  const g = svg.append("g");

  // CSS sizes the SVG, so one drawing unit is not one screen pixel. Scale the
  // sizes meant in screen pixels (text, dots, strokes) to keep them legible.
  const renderedWidth = svg.node()!.getBoundingClientRect().width;
  const scale = renderedWidth > 0 ? SIZE / renderedWidth : 1;

  // Spoke numbers are printed inside the dots, all at the size that fits the
  // longest one, so they read as one set.
  const dotRadius = DOT_RADIUS * scale;
  const maxDigits =
    d3.max(data, (series) => d3.max(series, (d) => String(d.axis).length)) ?? 1;
  const fontSize = fitFontSize(dotRadius, maxDigits);

  // Leave room at the rim for a dot at full tension, plus the polygon's stroke.
  const rimMargin = (DOT_RADIUS + 2) * scale;
  const radius = Math.max(centre - rimMargin, 0.3 * centre);

  /** Where axis `position` (0 at the top, clockwise) is `r` from the centre */
  const at = (position: number, r: number): [number, number] => {
    const angle = (position * 2 * Math.PI) / total;
    return [centre - r * Math.sin(angle), centre - r * Math.cos(angle)];
  };

  const gridLine = (
    [x1, y1]: [number, number],
    [x2, y2]: [number, number],
    width: number,
  ) =>
    g
      .append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .style("stroke", "grey")
      .style("stroke-width", `${width}px`);

  for (let level = 1; level <= LEVELS; level++) {
    const r = (radius * level) / LEVELS;
    for (let i = 0; i < total; i++) {
      gridLine(at(i, r), at(i + 1, r), 0.5 * scale);
    }
  }
  for (let i = 0; i < total; i++) {
    gridLine([centre, centre], at(i, radius), scale);
  }

  // Where each point is drawn, by series
  const places = data.map((series) =>
    series.map((d) => at(d.position, (d.value / maxValue) * radius)),
  );

  places.forEach((points, s) => {
    g.append("polygon")
      .attr("points", points.map((p) => p.join(",")).join(" "))
      .style("stroke", COLORS[s])
      .style("stroke-width", `${4 * scale}px`)
      .style("fill", "none");
  });

  // Faded by CSS rather than a d3 transition: selection.transition() exists
  // only as a side effect of d3-transition, which the production build
  // tree-shakes away, since nothing imports it by name.
  const tooltip = g
    .append("text")
    .style("opacity", 0)
    .style("transition", "opacity 200ms")
    .style("font-family", "sans-serif")
    .style("font-size", `${13 * scale}px`);
  const hideTooltip = () => {
    tooltip.style("opacity", 0);
  };

  places.forEach((points, s) => {
    for (const [cx, cy] of points) {
      g.append("circle")
        .attr("r", dotRadius)
        .attr("cx", cx)
        .attr("cy", cy)
        .style("fill", COLORS[s])
        .style("fill-opacity", 0.9)
        .style("pointer-events", "none");
    }

    data[s].forEach((d, k) => {
      const [cx, cy] = points[k];
      // Centre the digits' cap height on the dot, not the em box.
      g.append("text")
        .attr("x", cx)
        .attr("y", cy + (DIGIT_HEIGHT / 2) * fontSize)
        .text(String(d.axis))
        .style("font-family", "sans-serif")
        .style("font-weight", "bold")
        .style("font-size", `${fontSize}px`)
        .style("text-anchor", "middle")
        .style("fill", "white")
        .style("pointer-events", "none");
      // The dots are too small to tap, so a larger transparent circle over
      // each one takes the pointer instead.
      g.append("circle")
        .attr("class", "radar-chart-hit")
        .attr("r", HIT_RADIUS * scale)
        .attr("cx", cx)
        .attr("cy", cy)
        .style("fill", "transparent")
        .style("pointer-events", "all")
        .on("pointerenter", () => {
          tooltip
            .attr("x", cx - 10 * scale)
            .attr("y", cy - 5 * scale)
            .text(String(d.value))
            .style("opacity", 1);
        })
        // A finger leaves the moment it lifts, so a touch tooltip stays until
        // another point or the empty chart is tapped.
        .on("pointerleave", (event: PointerEvent) => {
          if (event.pointerType !== "touch") hideTooltip();
        })
        .append("title")
        .text(String(d.value));
    });
  });

  svg.on("pointerdown", (event: PointerEvent) => {
    if (!(event.target as Element).classList.contains("radar-chart-hit")) {
      hideTooltip();
    }
  });
}

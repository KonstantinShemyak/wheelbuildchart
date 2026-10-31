/**
 * Radar Chart using D3.js v7
 * Displays spoke tensions as a radar/spider chart.
 */

import * as d3 from "d3";

interface DataPoint {
  axis: number;
  value: number;
}

interface ChartConfig {
  radius: number;
  w: number;
  h: number;
  factor: number;
  factorLegend: number;
  levels: number;
  maxValue: number;
  radians: number;
  opacityArea: number;
  color: d3.ScaleOrdinal<number, string>;
  fontSize: number;
}

export const RadarChart = {
  draw: function (
    id: string,
    data: DataPoint[][],
    options: Partial<ChartConfig> = {},
  ): void {
    const cfg: ChartConfig = {
      radius: 7,
      w: 800,
      h: 800,
      factor: 0.95,
      factorLegend: 1,
      levels: 3,
      maxValue: 1,
      radians: 2 * Math.PI,
      opacityArea: 0,
      color: d3.scaleOrdinal<number, string>(d3.schemeCategory10),
      fontSize: 16,
      ...options,
    };

    // Calculate max value from data
    cfg.maxValue = Math.max(
      cfg.maxValue,
      d3.max(data, (series) => d3.max(series, (d) => d.value)) ?? 0,
    );

    const allAxis = data[0].map((d) => d.axis);
    const total = allAxis.length;

    // Remove existing SVG and create new one
    d3.select(id).select("svg").remove();
    const svg = d3
      .select(id)
      .append("svg")
      .attr("viewBox", `0 0 ${cfg.w} ${cfg.h}`);
    const g = svg.append("g");

    // CSS sizes the SVG, so one drawing unit is not one screen pixel. Scale the
    // sizes meant in screen pixels (text, dots, strokes) to keep them legible.
    const renderedWidth = svg.node()!.getBoundingClientRect().width;
    const scale = renderedWidth > 0 ? cfg.w / renderedWidth : 1;
    const fontSize = cfg.fontSize * scale;

    // Keep the margin between the plot and the axis labels constant on screen too,
    // or the scaled labels and dots overlap once the chart is shrunk.
    const factor = Math.max(1 - (1 - cfg.factor) * scale, 0.3);
    const radius = factor * Math.min(cfg.w / 2, cfg.h / 2);

    // Helper functions for positioning
    function getPosition(
      i: number,
      range: number,
      factor: number,
      func: (x: number) => number,
    ): number {
      return range * (1 - factor * func((i * cfg.radians) / total));
    }

    function getHorizontalPosition(
      i: number,
      range: number,
      factor: number = 1,
    ): number {
      return getPosition(i, range, factor, Math.sin);
    }

    function getVerticalPosition(
      i: number,
      range: number,
      factor: number = 1,
    ): number {
      return getPosition(i, range, factor, Math.cos);
    }

    // Draw concentric level lines
    for (let j = 0; j < cfg.levels; j++) {
      const levelFactor = radius * ((j + 1) / cfg.levels);
      g.selectAll(".levels")
        .data(allAxis)
        .enter()
        .append("line")
        .attr("x1", (_, i) => getHorizontalPosition(i, levelFactor))
        .attr("y1", (_, i) => getVerticalPosition(i, levelFactor))
        .attr("x2", (_, i) => getHorizontalPosition(i + 1, levelFactor))
        .attr("y2", (_, i) => getVerticalPosition(i + 1, levelFactor))
        .attr("class", "line")
        .style("stroke", "grey")
        .style("stroke-width", `${0.5 * scale}px`)
        .attr(
          "transform",
          `translate(${cfg.w / 2 - levelFactor}, ${cfg.h / 2 - levelFactor})`,
        );
    }

    // Draw axes
    const axis = g
      .selectAll(".axis")
      .data(allAxis)
      .enter()
      .append("g")
      .attr("class", "axis");

    axis
      .append("line")
      .attr("x1", cfg.w / 2)
      .attr("y1", cfg.h / 2)
      .attr("x2", (_, i) => getHorizontalPosition(i, cfg.w / 2, factor))
      .attr("y2", (_, i) => getVerticalPosition(i, cfg.h / 2, factor))
      .attr("class", "line")
      .style("stroke", "grey")
      .style("stroke-width", `${scale}px`);

    // Draw axis labels
    axis
      .append("text")
      .attr("class", "legend")
      .text((d) => String(d))
      .style("font-family", "sans-serif")
      .style("font-size", `${fontSize}px`)
      .style("text-anchor", (_, i) => {
        const p = getHorizontalPosition(i, 0.5);
        return p < 0.4 ? "start" : p > 0.6 ? "end" : "middle";
      })
      .attr("transform", (_, i) => {
        const p = getVerticalPosition(i, cfg.h / 2);
        return p < fontSize ? `translate(0, ${fontSize - p})` : "";
      })
      .attr("x", (_, i) =>
        getHorizontalPosition(i, cfg.w / 2, cfg.factorLegend),
      )
      .attr("y", (_, i) => getVerticalPosition(i, cfg.h / 2, cfg.factorLegend));

    // Draw data polygons and points
    let series = 0;

    data.forEach((seriesData) => {
      // Calculate polygon points
      const dataValues: [number, number][] = seriesData.map((point, i) => [
        getHorizontalPosition(
          i,
          cfg.w / 2,
          (Math.max(point.value, 0) / cfg.maxValue) * factor,
        ),
        getVerticalPosition(
          i,
          cfg.h / 2,
          (Math.max(point.value, 0) / cfg.maxValue) * factor,
        ),
      ]);
      // Close the polygon
      dataValues.push(dataValues[0]);

      // Draw polygon
      g.selectAll(".area")
        .data([dataValues])
        .enter()
        .append("polygon")
        .attr("class", `radar-chart-serie${series}`)
        .style("stroke-width", `${4 * scale}px`)
        .style("stroke", cfg.color(series))
        .attr("points", (pts) => pts.map((p) => p.join(",")).join(" "))
        .style("fill", cfg.color(series))
        .style("fill-opacity", cfg.opacityArea);

      series++;
    });

    series = 0;

    // Tooltip element
    const tooltip = g
      .append("text")
      .style("opacity", 0)
      .style("font-family", "sans-serif")
      .style("font-size", `${13 * scale}px`);

    const hideTooltip = () => {
      tooltip.transition().duration(200).style("opacity", 0);
      g.selectAll("polygon")
        .transition()
        .duration(200)
        .style("fill-opacity", cfg.opacityArea);
    };

    // Draw data points
    data.forEach((seriesData, seriesIndex) => {
      g.selectAll(".nodes")
        .data(seriesData)
        .enter()
        .append("circle")
        .attr("class", `radar-chart-serie${series}`)
        .attr("r", (d) => (d.axis % 2 === seriesIndex ? 0 : cfg.radius * scale))
        .attr("alt", (d) => Math.max(d.value, 0))
        .attr("cx", (d, i) =>
          getHorizontalPosition(
            i,
            cfg.w / 2,
            (Math.max(d.value, 0) / cfg.maxValue) * factor,
          ),
        )
        .attr("cy", (d, i) =>
          getVerticalPosition(
            i,
            cfg.h / 2,
            (Math.max(d.value, 0) / cfg.maxValue) * factor,
          ),
        )
        .attr("data-id", (d) => d.axis)
        .style("fill", cfg.color(series))
        .style("fill-opacity", 0.9)
        .style("pointer-events", "none");

      // The dots are too small to tap, so a larger transparent circle over each one
      // takes the pointer instead. Dots of the other side's series are not drawn.
      seriesData.forEach((d, i) => {
        if (d.axis % 2 === seriesIndex) return;
        const ratio = (Math.max(d.value, 0) / cfg.maxValue) * factor;
        const cx = getHorizontalPosition(i, cfg.w / 2, ratio);
        const cy = getVerticalPosition(i, cfg.h / 2, ratio);
        const hit = g
          .append("circle")
          .attr("class", "radar-chart-hit")
          .attr("r", 2.5 * cfg.radius * scale)
          .attr("cx", cx)
          .attr("cy", cy)
          .style("fill", "transparent")
          .style("pointer-events", "all")
          .on("pointerenter", () => {
            tooltip
              .attr("x", cx - 10 * scale)
              .attr("y", cy - 5 * scale)
              .text(String(d.value))
              .transition()
              .duration(200)
              .style("opacity", 1);
          })
          // A finger leaves the moment it lifts, so a touch tooltip stays until
          // another point or the empty chart is tapped.
          .on("pointerleave", (event: PointerEvent) => {
            if (event.pointerType !== "touch") hideTooltip();
          });
        hit.append("title").text(Math.max(d.value, 0));
      });

      series++;
    });

    svg.on("pointerdown", (event: PointerEvent) => {
      if (!(event.target as Element).classList.contains("radar-chart-hit")) {
        hideTooltip();
      }
    });
  },
};

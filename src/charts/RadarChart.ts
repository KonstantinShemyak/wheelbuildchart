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
    const radius = cfg.factor * Math.min(cfg.w / 2, cfg.h / 2);

    // Remove existing SVG and create new one
    d3.select(id).select("svg").remove();
    const svg = d3
      .select(id)
      .append("svg")
      .attr("width", cfg.w)
      .attr("height", cfg.h);
    const g = svg.append("g");

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
        .style("stroke-width", "0.5px")
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
      .attr("x2", (_, i) => getHorizontalPosition(i, cfg.w / 2, cfg.factor))
      .attr("y2", (_, i) => getVerticalPosition(i, cfg.h / 2, cfg.factor))
      .attr("class", "line")
      .style("stroke", "grey")
      .style("stroke-width", "1px");

    // Draw axis labels
    axis
      .append("text")
      .attr("class", "legend")
      .text((d) => String(d))
      .style("font-family", "sans-serif")
      .style("font-size", `${cfg.fontSize}px`)
      .style("text-anchor", (_, i) => {
        const p = getHorizontalPosition(i, 0.5);
        return p < 0.4 ? "start" : p > 0.6 ? "end" : "middle";
      })
      .attr("transform", (_, i) => {
        const p = getVerticalPosition(i, cfg.h / 2);
        return p < cfg.fontSize ? `translate(0, ${cfg.fontSize - p})` : "";
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
          (Math.max(point.value, 0) / cfg.maxValue) * cfg.factor,
        ),
        getVerticalPosition(
          i,
          cfg.h / 2,
          (Math.max(point.value, 0) / cfg.maxValue) * cfg.factor,
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
        .style("stroke-width", "4px")
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
      .style("font-size", "13px");

    // Draw data points
    data.forEach((seriesData, seriesIndex) => {
      g.selectAll(".nodes")
        .data(seriesData)
        .enter()
        .append("circle")
        .attr("class", `radar-chart-serie${series}`)
        .attr("r", (d) => (d.axis % 2 === seriesIndex ? 0 : cfg.radius))
        .attr("alt", (d) => Math.max(d.value, 0))
        .attr("cx", (d, i) =>
          getHorizontalPosition(
            i,
            cfg.w / 2,
            (Math.max(d.value, 0) / cfg.maxValue) * cfg.factor,
          ),
        )
        .attr("cy", (d, i) =>
          getVerticalPosition(
            i,
            cfg.h / 2,
            (Math.max(d.value, 0) / cfg.maxValue) * cfg.factor,
          ),
        )
        .attr("data-id", (d) => d.axis)
        .style("fill", cfg.color(series))
        .style("fill-opacity", 0.9)
        .on("mouseover", function (event: MouseEvent, d: DataPoint) {
          const element = d3.select(this);
          const newX = parseFloat(element.attr("cx")) - 10;
          const newY = parseFloat(element.attr("cy")) - 5;
          tooltip
            .attr("x", newX)
            .attr("y", newY)
            .text(String(d.value))
            .transition()
            .duration(200)
            .style("opacity", 1);
        })
        .on("mouseout", function () {
          tooltip.transition().duration(200).style("opacity", 0);
          g.selectAll("polygon")
            .transition()
            .duration(200)
            .style("fill-opacity", cfg.opacityArea);
        })
        .append("title")
        .text((d) => Math.max(d.value, 0));

      series++;
    });
  },
};

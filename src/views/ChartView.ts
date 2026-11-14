import { IChartView, Side, SpokeDataPoint } from "../types/interfaces";
import { drawRadarChart } from "../charts/RadarChart";
import { SIDES } from "../model/spokeLayout";
import { requireElement } from "./dom";

/**
 * Radar chart of the spoke tensions: one polygon per side.
 */
export class ChartView implements IChartView {
  private container = requireElement("radarChart", HTMLElement);
  private nSpokes = 0;
  /** Each side's points, in increasing position order */
  private series: SpokeDataPoint[][] = [];

  constructor() {
    // The chart's rendered size is set by CSS, so redraw when it changes
    // (window resize, rotation) to keep the text a constant on-screen size.
    new ResizeObserver(() => {
      if (this.nSpokes > 0) this.draw();
    }).observe(this.container);
  }

  /**
   * Draw the chart with new tension values.
   * @param sides Side of each spoke, spoke 1 first
   * @param tensions Tension of each spoke, spoke 1 first
   */
  update(sides: Side[], tensions: number[]): void {
    this.nSpokes = sides.length;
    // Spokes are numbered counterclockwise: the last spoke is at the top,
    // spoke 1 just left of it.
    const points: SpokeDataPoint[] = tensions.map((tension, i) => ({
      axis: i + 1,
      position: this.nSpokes - 1 - i,
      value: Math.max(tension, 0),
    }));
    this.series = SIDES.map((side) =>
      points.filter((_, i) => sides[i] === side).reverse(),
    );
    this.draw();
  }

  private draw(): void {
    drawRadarChart(this.container, this.nSpokes, this.series);
  }
}

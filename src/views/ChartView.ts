import { IChartView, SpokeDataPoint } from "../types/interfaces";
import { RadarChart } from "../charts/RadarChart";

/**
 * Radar chart visualization.
 * Wraps RadarChart with state management.
 */
export class ChartView implements IChartView {
  private containerSelector: string;
  private nSpokes: number = 0;
  private driveSideSpokes: SpokeDataPoint[] = [];
  private nonDriveSideSpokes: SpokeDataPoint[] = [];

  constructor(containerSelector: string = "#radarChart") {
    this.containerSelector = containerSelector;

    // The chart's rendered size is set by CSS, so redraw when it changes
    // (window resize, rotation) to keep the text a constant on-screen size.
    const container = document.querySelector(containerSelector);
    if (container) {
      new ResizeObserver(() => {
        if (this.nSpokes > 0) this.draw();
      }).observe(container);
    }
  }

  /**
   * Initialize the chart with the given parameters.
   * @param nSpokes Number of spokes
   * @param tensionDS Initial drive side tension
   * @param tensionNDS Initial non-drive side tension
   */
  init(nSpokes: number, tensionDS: number, tensionNDS: number): void {
    this.nSpokes = nSpokes;
    this.driveSideSpokes = [];
    this.nonDriveSideSpokes = [];

    // Spokes are numbered counterclockwise: the last spoke is at the top,
    // spoke 1 just left of it.
    for (let position = 0; position < nSpokes; position++) {
      const spokeIndex = nSpokes - 1 - position;
      const isDriveSide = spokeIndex % 2 === 0;
      const point: SpokeDataPoint = {
        axis: spokeIndex + 1,
        position,
        value: Math.max(isDriveSide ? tensionDS : tensionNDS, 0),
      };
      (isDriveSide ? this.driveSideSpokes : this.nonDriveSideSpokes).push(
        point,
      );
    }

    this.draw();
  }

  /**
   * Update the chart with new tension values.
   * @param tensions Array of tension values for all spokes (0-indexed)
   */
  update(tensions: number[]): void {
    if (this.nSpokes === 0) {
      throw new Error("ChartView: update() called before init()");
    }

    for (const point of [...this.driveSideSpokes, ...this.nonDriveSideSpokes]) {
      point.value = Math.max(tensions[point.axis - 1], 0);
    }

    this.draw();
  }

  /**
   * Draw/redraw the radar chart.
   */
  private draw(): void {
    RadarChart.draw(
      this.containerSelector,
      this.nSpokes,
      [this.driveSideSpokes, this.nonDriveSideSpokes],
      {}, // options (use defaults)
    );
  }
}

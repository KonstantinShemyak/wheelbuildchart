import { IChartView, SpokeDataPoint } from "../types/interfaces";
import { RadarChart } from "../legacy/radarChart";

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

    // Initialize spoke data points
    // Axis is numbered in reverse order for display purposes
    for (let i = 0; i < nSpokes; i++) {
      this.driveSideSpokes.push({
        axis: nSpokes - i,
        value: Math.max(tensionDS, 0),
      });
      this.nonDriveSideSpokes.push({
        axis: nSpokes - i,
        value: Math.max(tensionNDS, 0),
      });
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

    for (let i = 0; i < this.nSpokes; i++) {
      let tensionDS: number;
      let tensionNDS: number;

      // Calculate bisector for the "virtual" point on the opposite side
      const neighborLeft = i === 0 ? this.nSpokes - 1 : i - 1;
      const neighborRight = (i + 1) % this.nSpokes;
      const bisectorValue = this.bisector(
        tensions[neighborLeft],
        tensions[neighborRight],
      );

      // Even indices (0, 2, 4...) are drive side spokes (1, 3, 5... in 1-indexed)
      if (i % 2 === 0) {
        tensionDS = tensions[i];
        tensionNDS = bisectorValue;
      } else {
        tensionDS = bisectorValue;
        tensionNDS = tensions[i];
      }

      // Update the data points (axis is in reverse order)
      const dataIndex = this.nSpokes - (i + 1);
      this.driveSideSpokes[dataIndex].value = Math.max(tensionDS, 0);
      this.nonDriveSideSpokes[dataIndex].value = Math.max(tensionNDS, 0);
    }

    this.draw();
  }

  private bisector(a: number, b: number): number {
    if (a <= 0 || b <= 0) return 0;
    const halfAngle = (2 * Math.PI) / this.nSpokes;
    return (2 * a * b * Math.cos(halfAngle)) / (a + b);
  }

  /**
   * Draw/redraw the radar chart.
   */
  private draw(): void {
    RadarChart.draw(
      this.containerSelector,
      [this.driveSideSpokes, this.nonDriveSideSpokes],
      {}, // options (use defaults)
    );
  }
}

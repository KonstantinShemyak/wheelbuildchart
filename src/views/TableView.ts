import { ITableView, SideAverages } from "../types/interfaces";
import { statsService } from "../services/StatsService";

/**
 * Handle the input table DOM (spoke readings and tensions)
 */
export class TableView implements ITableView {
  private tableContainer: HTMLElement;
  private averageRow: HTMLElement;

  /** Callback when user changes a reading */
  onReadingChange: ((spokeIndex: number, value: number) => void) | null = null;

  constructor(tableSelector: string = "#valuesTable") {
    const container = document.querySelector(tableSelector);
    if (!container) {
      throw new Error(`TableView: container "${tableSelector}" not found`);
    }
    this.tableContainer = container as HTMLElement;

    const avgRow = document.querySelector("#average");
    if (!avgRow) {
      throw new Error('TableView: average row "#average" not found');
    }
    this.averageRow = avgRow as HTMLElement;
  }

  /**
   * Render the table with the specified number of spokes.
   * @param nSpokes Number of spokes
   * @param readings Initial readings for each spoke
   */
  render(nSpokes: number, readings: number[]): void {
    // Remove existing value rows
    const existingRows =
      this.tableContainer.querySelectorAll('[role="valueRow"]');
    existingRows.forEach((row) => row.remove());

    // Create offset row at the top (for staggered layout)
    const offsetRowTop = document.createElement("tr");
    offsetRowTop.setAttribute("role", "valueRow");

    const dsOffsetCell = document.createElement("td");
    dsOffsetCell.className = "driveSideColor";
    dsOffsetCell.colSpan = 3;
    offsetRowTop.appendChild(dsOffsetCell);

    const ndsOffsetCell = document.createElement("td");
    ndsOffsetCell.className = "nonDriveSideColor";
    ndsOffsetCell.colSpan = 3;
    ndsOffsetCell.rowSpan = 2;
    offsetRowTop.appendChild(ndsOffsetCell);

    this.averageRow.parentNode?.insertBefore(offsetRowTop, this.averageRow);

    // Create rows for each spoke
    for (let i = 0; i < nSpokes; i++) {
      const spokeNum = i + 1; // 1-indexed for display
      const isDriveSide = i % 2 === 0;
      const sideClass = isDriveSide ? "driveSideColor" : "nonDriveSideColor";

      const row = document.createElement("tr");
      row.setAttribute("role", "valueRow");
      row.className = sideClass;

      // Spoke number cell
      const numCell = document.createElement("td");
      numCell.setAttribute("rowspan", "2");
      numCell.textContent = `#${spokeNum}:`;
      row.appendChild(numCell);

      // Input cell
      const inputCell = document.createElement("td");
      inputCell.setAttribute("rowspan", "2");
      const input = document.createElement("input");
      input.type = "text";
      input.id = `reading${spokeNum}`;
      input.className = "readInput";
      input.value = String(readings[i] ?? 0);
      // Tab order: drive side first (1, 3, 5...), then non-drive side (2, 4, 6...)
      input.tabIndex = isDriveSide
        ? Math.floor(i / 2) + 1
        : Math.floor(nSpokes / 2) + Math.floor(i / 2) + 1;
      input.addEventListener("change", () => this.handleInputChange(i, input));
      inputCell.appendChild(input);
      row.appendChild(inputCell);

      // Tension cell
      const tensionCell = document.createElement("td");
      tensionCell.setAttribute("rowspan", "2");
      tensionCell.id = `tension${spokeNum}`;
      row.appendChild(tensionCell);

      this.averageRow.parentNode?.insertBefore(row, this.averageRow);
    }

    // Create offset row at the bottom
    const offsetRowBottom = document.createElement("tr");
    offsetRowBottom.setAttribute("role", "valueRow");

    const dsBottomCell = document.createElement("td");
    dsBottomCell.className = "driveSideColor";
    dsBottomCell.colSpan = 3;
    offsetRowBottom.appendChild(dsBottomCell);

    this.averageRow.parentNode?.insertBefore(offsetRowBottom, this.averageRow);

    // Focus first input
    this.focusSpoke(0);
  }

  /**
   * Handle input change event.
   */
  private handleInputChange(index: number, input: HTMLInputElement): void {
    const value = parseFloat(input.value);
    if (isNaN(value)) {
      alert(
        `${input.value}: invalid input (a number like '23' or '23.2' expected)`,
      );
      input.focus();
      input.select();
      return;
    }

    if (this.onReadingChange) {
      this.onReadingChange(index, value);
    }
  }

  /**
   * Update the tension display for all spokes.
   * @param tensions Tension values for each spoke
   * @param avgTensions Average tensions for tolerance checking
   * @param tolerance Tolerance percentage
   */
  updateTensions(
    tensions: number[],
    avgTensions: SideAverages,
    tolerance: number,
  ): void {
    for (let i = 0; i < tensions.length; i++) {
      const spokeNum = i + 1;
      const tensionCell = document.getElementById(`tension${spokeNum}`);
      if (!tensionCell) continue;

      const tension = tensions[i];
      const roundedTension = statsService.round2(tension);
      const isDriveSide = i % 2 === 0;
      const avgTension = isDriveSide ? avgTensions.ds : avgTensions.nds;
      const isWithin = statsService.isWithinTolerance(
        tension,
        avgTension,
        tolerance,
      );

      // Show warning symbol if out of tolerance
      tensionCell.innerHTML = isWithin
        ? String(roundedTension)
        : `${roundedTension} &#9888;`;
    }
  }

  /**
   * Update the average displays.
   */
  updateAverages(avgReadings: SideAverages, avgTensions: SideAverages): void {
    const avgDriveReading = document.getElementById("avgDriveReading");
    const avgDriveTension = document.getElementById("avgDriveTension");
    const avgNondriveReading = document.getElementById("avgNondriveReading");
    const avgNondriveTension = document.getElementById("avgNondriveTension");

    if (avgDriveReading) {
      avgDriveReading.textContent = String(statsService.round2(avgReadings.ds));
    }
    if (avgDriveTension) {
      avgDriveTension.textContent = String(statsService.round2(avgTensions.ds));
    }
    if (avgNondriveReading) {
      avgNondriveReading.textContent = String(
        statsService.round2(avgReadings.nds),
      );
    }
    if (avgNondriveTension) {
      avgNondriveTension.textContent = String(
        statsService.round2(avgTensions.nds),
      );
    }
  }

  /**
   * Focus on a specific spoke input.
   * @param spokeIndex 0-based spoke index
   */
  focusSpoke(spokeIndex: number): void {
    const spokeNum = spokeIndex + 1;
    const input = document.getElementById(
      `reading${spokeNum}`,
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }

  /**
   * Get the current reading value from an input.
   */
  getReading(spokeIndex: number): number {
    const spokeNum = spokeIndex + 1;
    const input = document.getElementById(
      `reading${spokeNum}`,
    ) as HTMLInputElement;
    return input ? parseFloat(input.value) || 0 : 0;
  }

  /**
   * Set a reading value in an input.
   */
  setReading(spokeIndex: number, value: number): void {
    const spokeNum = spokeIndex + 1;
    const input = document.getElementById(
      `reading${spokeNum}`,
    ) as HTMLInputElement;
    if (input) {
      input.value = String(value);
    }
  }
}

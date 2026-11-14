import { ITableView, Side, SideAverages } from "../types/interfaces";
import { isWithinTolerance, round2 } from "../services/stats";
import { config } from "../model/config";

const SIDE_CLASSES: Record<Side, string> = {
  ds: "driveSideColor",
  nds: "nonDriveSideColor",
};

/**
 * Handle the input table DOM (spoke readings and tensions)
 */
export class TableView implements ITableView {
  private tableContainer: HTMLElement;
  private averageRow: HTMLElement;

  /**
   * Set while Enter is being handled, to ignore the `change` event that the
   * browser fires when the resulting focus move blurs the input.
   */
  private handlingEnter = false;

  /** Callback when user changes a reading */
  onReadingChange:
    | ((spokeIndex: number, value: number, advanceFocus: boolean) => void)
    | null = null;

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
   * Render the table with the specified spokes.
   * @param sides Side of each spoke, spoke 1 first
   * @param readings Initial readings for each spoke
   */
  render(sides: Side[], readings: number[]): void {
    // Remove existing value rows
    const existingRows =
      this.tableContainer.querySelectorAll('[role="valueRow"]');
    existingRows.forEach((row) => row.remove());

    const nDriveSide = sides.filter((side) => side === "ds").length;

    // Each spoke spans two rows of a grid. Drive side spokes follow each other
    // without gaps; a non-drive side spoke straddles the boundary between the
    // drive side spokes it lies between on the rim. Spoke 1 is on the drive
    // side, so the grid starts with one free row on that side, and ends with
    // one after the last drive side spoke.
    const nRows = 2 * nDriveSide + 2;
    const startRows: number[] = [];
    let nextDriveSideRow = 1;
    for (const side of sides) {
      if (side === "ds") {
        startRows.push(nextDriveSideRow);
        nextDriveSideRow += 2;
      } else {
        startRows.push(nextDriveSideRow - 1);
      }
    }

    // Cells starting in each row, drive side column first; the gaps in each
    // column are filled with empty cells of the side's colour.
    const cellsByRow: HTMLTableCellElement[][] = Array.from(
      { length: nRows },
      () => [],
    );
    for (const column of ["ds", "nds"] as const) {
      let freeRow = 0;
      let ordinal = 0;
      sides.forEach((side, i) => {
        if (side !== column) return;
        if (startRows[i] > freeRow) {
          cellsByRow[freeRow].push(
            this.createFillerCell(side, startRows[i] - freeRow),
          );
        }
        // Tab order: all drive side spokes first, then the non-drive side
        const tabIndex = (side === "ds" ? 0 : nDriveSide) + ordinal + 1;
        cellsByRow[startRows[i]].push(
          ...this.createSpokeCells(i, side, readings[i] ?? 0, tabIndex),
        );
        freeRow = startRows[i] + 2;
        ordinal++;
      });
      if (freeRow < nRows) {
        cellsByRow[freeRow].push(
          this.createFillerCell(column, nRows - freeRow),
        );
      }
    }

    for (const cells of cellsByRow) {
      const row = document.createElement("tr");
      row.setAttribute("role", "valueRow");
      row.append(...cells);
      this.averageRow.parentNode?.insertBefore(row, this.averageRow);
    }

    // Focus first input, except on a touch screen, where it would open the
    // on-screen keyboard and scroll past the controls
    if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      this.focusSpoke(0);
    }
  }

  /**
   * Create an empty cell spanning one side's columns.
   */
  private createFillerCell(side: Side, rowSpan: number): HTMLTableCellElement {
    const cell = document.createElement("td");
    cell.className = SIDE_CLASSES[side];
    cell.colSpan = 3;
    cell.rowSpan = rowSpan;
    return cell;
  }

  /**
   * Create the number, reading input and tension cells of a spoke.
   * @param index 0-based spoke index
   */
  private createSpokeCells(
    index: number,
    side: Side,
    reading: number,
    tabIndex: number,
  ): HTMLTableCellElement[] {
    const spokeNum = index + 1; // 1-indexed for display

    // Spoke number cell
    const numCell = document.createElement("td");
    numCell.textContent = `#${spokeNum}:`;

    // Input cell
    const inputCell = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    // Numeric keypad on phones; type="number" would add spinners and clash with our own validation
    input.inputMode = "decimal";
    input.id = `reading${spokeNum}`;
    input.className = "readInput";
    input.value = String(reading);
    input.tabIndex = tabIndex;
    // Enter means "I am done here, move on", whether or not the value changed.
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      this.handlingEnter = true;
      try {
        this.handleInputChange(index, input, true);
      } finally {
        this.handlingEnter = false;
      }
    });
    // Leaving the field commits the value but must not steal focus.
    input.addEventListener("change", () => {
      if (this.handlingEnter) return;
      this.handleInputChange(index, input, false);
    });
    inputCell.appendChild(input);

    // Tension cell
    const tensionCell = document.createElement("td");
    tensionCell.id = `tension${spokeNum}`;

    const cells = [numCell, inputCell, tensionCell];
    for (const cell of cells) {
      cell.className = SIDE_CLASSES[side];
      cell.rowSpan = 2;
    }
    return cells;
  }

  /**
   * Handle input change event.
   */
  private handleInputChange(
    index: number,
    input: HTMLInputElement,
    advanceFocus: boolean,
  ): void {
    const value = parseFloat(input.value);
    if (isNaN(value)) {
      alert(`${input.value}${config.ERROR_STRING_INVALID_INPUT}`);
      input.focus();
      input.select();
      return;
    }

    if (this.onReadingChange) {
      this.onReadingChange(index, value, advanceFocus);
    }
  }

  /**
   * Update the tension display for all spokes.
   * @param tensions Tension values for each spoke
   * @param sides Side of each spoke
   * @param avgTensions Average tensions for tolerance checking
   * @param tolerance Tolerance percentage
   */
  updateTensions(
    tensions: number[],
    sides: Side[],
    avgTensions: SideAverages,
    tolerance: number,
  ): void {
    for (let i = 0; i < tensions.length; i++) {
      const spokeNum = i + 1;
      const tensionCell = document.getElementById(`tension${spokeNum}`);
      if (!tensionCell) continue;

      const tension = tensions[i];
      const roundedTension = round2(tension);
      const avgTension = avgTensions[sides[i]];
      const isWithin = isWithinTolerance(tension, avgTension, tolerance);

      // Show warning symbol if out of tolerance
      const warning = isWithin ? "" : " &#9888;";
      tensionCell.innerHTML = `<span class="tension-value">${roundedTension}</span>${warning}`;
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
      avgDriveReading.textContent = String(round2(avgReadings.ds));
    }
    if (avgDriveTension) {
      avgDriveTension.textContent = String(round2(avgTensions.ds));
    }
    if (avgNondriveReading) {
      avgNondriveReading.textContent = String(round2(avgReadings.nds));
    }
    if (avgNondriveTension) {
      avgNondriveTension.textContent = String(round2(avgTensions.nds));
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
}

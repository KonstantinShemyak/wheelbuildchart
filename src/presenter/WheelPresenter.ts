import { IWheelPresenter } from "../types/interfaces";
import { WheelModel } from "../model/WheelModel";
import { TensionService } from "../services/TensionService";
import { TableView } from "../views/TableView";
import { ChartView } from "../views/ChartView";
import { config } from "../model/config";

/**
 * WheelPresenter - coordinates the model and views.
 * Acts as the central hub for user interactions and data flow.
 */
export class WheelPresenter implements IWheelPresenter {
  private model: WheelModel;
  private tensionService: TensionService;
  private tableView: TableView;
  private chartView: ChartView;

  // DOM elements for controls
  private tensometerSelect: HTMLSelectElement | null = null;
  private spokesSelect: HTMLSelectElement | null = null;
  private thicknessDSSelect: HTMLSelectElement | null = null;
  private thicknessNDSSelect: HTMLSelectElement | null = null;
  private toleranceSelect: HTMLSelectElement | null = null;

  constructor(
    model: WheelModel,
    tensionService: TensionService,
    tableView: TableView,
    chartView: ChartView,
  ) {
    this.model = model;
    this.tensionService = tensionService;
    this.tableView = tableView;
    this.chartView = chartView;
  }

  /**
   * Initialize the presenter and render initial state.
   */
  init(): void {
    // Get control elements
    this.tensometerSelect = document.getElementById(
      "usedTensometer",
    ) as HTMLSelectElement;
    this.spokesSelect = document.getElementById("nSpokes") as HTMLSelectElement;
    this.thicknessDSSelect = document.getElementById(
      "spokeThickness",
    ) as HTMLSelectElement;
    this.thicknessNDSSelect = document.getElementById(
      "spokeThicknessNDS",
    ) as HTMLSelectElement;
    this.toleranceSelect = document.getElementById(
      "toleranceInput",
    ) as HTMLSelectElement;

    // Populate dropdowns
    this.populateTensometerSelect();
    this.populateSpokesSelect();
    this.populateThicknessSelects();
    this.populateToleranceSelect();

    // Bind control events
    this.bindControlEvents();

    // Bind table view callback
    this.tableView.onReadingChange = (index, value) => {
      this.handleReadingChange(index, value);
    };

    // Initial render
    this.renderTable();
    this.recalculate();
  }

  /**
   * Populate the tensometer dropdown.
   */
  private populateTensometerSelect(): void {
    if (!this.tensometerSelect) return;
    const tensometers = this.tensionService.getTensometers();
    this.fillSelect(this.tensometerSelect, tensometers, this.model.tensometer);
  }

  /**
   * Populate the spokes dropdown.
   */
  private populateSpokesSelect(): void {
    if (!this.spokesSelect) return;
    this.fillSelect(
      this.spokesSelect,
      [...config.SUPPORTED_SPOKE_COUNTS],
      this.model.nSpokes,
    );
  }

  /**
   * Populate the thickness dropdowns.
   */
  private populateThicknessSelects(): void {
    const thicknesses = this.tensionService.getSupportedThicknesses();
    if (this.thicknessDSSelect) {
      this.fillSelect(
        this.thicknessDSSelect,
        thicknesses,
        this.model.spokeThicknessDS,
      );
    }
    if (this.thicknessNDSSelect) {
      this.fillSelect(
        this.thicknessNDSSelect,
        thicknesses,
        this.model.spokeThicknessNDS,
      );
    }
  }

  /**
   * Populate the tolerance dropdown.
   */
  private populateToleranceSelect(): void {
    if (!this.toleranceSelect) return;
    this.fillSelect(
      this.toleranceSelect,
      [...config.SUPPORTED_TOLERANCES],
      this.model.tolerance,
    );
  }

  /**
   * Fill a select element with options.
   */
  private fillSelect(
    select: HTMLSelectElement,
    values: (string | number)[],
    defaultValue: string | number,
  ): void {
    select.innerHTML = "";
    for (const value of values) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    }
    select.value = String(defaultValue);
  }

  /**
   * Bind event handlers for control elements.
   */
  private bindControlEvents(): void {
    this.tensometerSelect?.addEventListener("change", () => {
      this.handleTensometerChange(this.tensometerSelect!.value);
    });

    this.spokesSelect?.addEventListener("change", () => {
      this.handleSpokeCountChange(Number(this.spokesSelect!.value));
    });

    this.thicknessDSSelect?.addEventListener("change", () => {
      this.handleThicknessChange("ds", this.thicknessDSSelect!.value);
    });

    this.thicknessNDSSelect?.addEventListener("change", () => {
      this.handleThicknessChange("nds", this.thicknessNDSSelect!.value);
    });

    this.toleranceSelect?.addEventListener("change", () => {
      this.handleToleranceChange(Number(this.toleranceSelect!.value));
    });
  }

  /**
   * Render the table with current model state.
   */
  private renderTable(): void {
    this.tableView.render(this.model.nSpokes, this.model.readings);
  }

  /**
   * Recalculate tensions and update views.
   */
  private recalculate(): void {
    // Calculate tensions for each spoke
    for (let i = 0; i < this.model.nSpokes; i++) {
      const thickness = this.model.getSpokeThickness(i);
      const reading = this.model.readings[i];
      const tension = this.tensionService.tension(thickness, reading);
      this.model.setTension(i, tension);
    }

    // Get averages
    const averages = this.model.getAverages();

    // Update table view
    this.tableView.updateTensions(
      this.model.tensions.slice(0, this.model.nSpokes),
      averages.tensions,
      this.model.tolerance,
    );
    this.tableView.updateAverages(averages.readings, averages.tensions);

    // Update chart view
    this.chartView.update(this.model.tensions.slice(0, this.model.nSpokes));
  }

  /**
   * Handle a spoke reading change from the user.
   */
  handleReadingChange(spokeIndex: number, value: number): void {
    this.model.readings[spokeIndex] = value;
    this.recalculate();

    // Move focus to next same-side spoke
    const nextSpoke = (spokeIndex + 2) % this.model.nSpokes;
    this.tableView.focusSpoke(nextSpoke);
  }

  /**
   * Handle tensometer selection change.
   */
  handleTensometerChange(name: string): void {
    this.tensionService.setTensometer(name);
    this.model.tensometer = name;

    // Update thickness dropdowns with new tensometer's supported thicknesses
    this.populateThicknessSelects();

    // Update model with new default thickness
    const thicknesses = this.tensionService.getSupportedThicknesses();
    if (thicknesses.length > 0) {
      this.model.spokeThicknessDS = thicknesses[0];
      this.model.spokeThicknessNDS = thicknesses[0];
    }

    this.recalculate();
  }

  /**
   * Handle spoke count change.
   */
  handleSpokeCountChange(count: number): void {
    this.model.nSpokes = count;
    this.renderTable();

    // Initialize chart with new spoke count
    const initialTensionDS = this.tensionService.tension(
      this.model.spokeThicknessDS,
      config.INITIAL_READING_DRIVE_SIDE,
    );
    const initialTensionNDS = this.tensionService.tension(
      this.model.spokeThicknessNDS,
      config.INITIAL_READING_NON_DRIVE_SIDE,
    );
    this.chartView.init(count, initialTensionDS, initialTensionNDS);

    this.recalculate();
  }

  /**
   * Handle spoke thickness change.
   */
  handleThicknessChange(side: "ds" | "nds", thickness: string): void {
    if (side === "ds") {
      this.model.spokeThicknessDS = thickness;
    } else {
      this.model.spokeThicknessNDS = thickness;
    }
    this.recalculate();
  }

  /**
   * Handle tolerance change.
   */
  handleToleranceChange(tolerance: number): void {
    this.model.tolerance = tolerance;
    this.recalculate();
  }
}

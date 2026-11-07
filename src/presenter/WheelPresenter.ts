import { IWheelPresenter, Side, SpokeLayout } from "../types/interfaces";
import { WheelModel } from "../model/WheelModel";
import { TensionService } from "../services/TensionService";
import { TableView } from "../views/TableView";
import { ChartView } from "../views/ChartView";
import { config } from "../model/config";
import { layoutLabel } from "../model/spokeLayout";

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
    this.tableView.onReadingChange = (index, value, advanceFocus) => {
      this.handleReadingChange(index, value, advanceFocus);
    };

    // Initial render
    this.model.resetReadings(this.defaultReadings());
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
      config.SUPPORTED_SPOKE_LAYOUTS.map(layoutLabel),
      layoutLabel(this.model.layout),
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
      const layout = config.SUPPORTED_SPOKE_LAYOUTS.find(
        (layout) => layoutLabel(layout) === this.spokesSelect!.value,
      );
      if (layout) this.handleSpokeCountChange(layout);
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
   * What the current tensometer reads at the default tension of each side.
   */
  private defaultReadings(): Record<Side, number> {
    return {
      ds: this.tensionService.reading(
        this.model.spokeThicknessDS,
        config.DEFAULT_TENSION_DRIVE_SIDE,
      ),
      nds: this.tensionService.reading(
        this.model.spokeThicknessNDS,
        config.DEFAULT_TENSION_NON_DRIVE_SIDE,
      ),
    };
  }

  /**
   * Render the table with current model state.
   */
  private renderTable(): void {
    this.tableView.render(this.model.sides(), this.model.readings);
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
      this.model.sides(),
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
  handleReadingChange(
    spokeIndex: number,
    value: number,
    advanceFocus: boolean,
  ): void {
    this.model.readings[spokeIndex] = value;
    this.recalculate();

    if (advanceFocus) {
      this.tableView.focusSpoke(this.model.nextSameSide(spokeIndex));
    }
  }

  /**
   * Handle tensometer selection change.
   */
  handleTensometerChange(name: string): void {
    // Checked before anything changes: the defaults are the old tensometer's
    const readingsAreDefault = this.model.readingsAreDefault();
    this.tensionService.setTensometer(name);
    this.model.tensometer = name;

    // Thickness names are each tensometer's own, so a thickness chosen for
    // the previous tensometer may not exist for this one. The model must
    // hold a valid one before the dropdowns are filled, or they show nothing.
    const thicknesses = this.tensionService.getSupportedThicknesses();
    const keepOrFirst = (thickness: string) =>
      thicknesses.includes(thickness) ? thickness : thicknesses[0];
    if (thicknesses.length > 0) {
      this.model.spokeThicknessDS = keepOrFirst(this.model.spokeThicknessDS);
      this.model.spokeThicknessNDS = keepOrFirst(this.model.spokeThicknessNDS);
    }

    this.populateThicknessSelects();

    // The old defaults are on the old tensometer's scale and would mean an
    // arbitrary tension on this one. Readings the user entered are kept.
    if (readingsAreDefault) {
      this.model.resetReadings(this.defaultReadings());
      this.renderTable();
    }

    this.recalculate();
  }

  /**
   * Handle spoke count change.
   */
  handleSpokeCountChange(layout: SpokeLayout): void {
    this.model.setLayout(layout);
    this.renderTable();

    // Initialize chart with new spoke count
    this.chartView.init(
      this.model.sides(),
      config.DEFAULT_TENSION_DRIVE_SIDE,
      config.DEFAULT_TENSION_NON_DRIVE_SIDE,
    );

    this.recalculate();
  }

  /**
   * Handle spoke thickness change.
   */
  handleThicknessChange(side: Side, thickness: string): void {
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

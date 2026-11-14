import {
  IReadingsDialogView,
  IWheelPresenter,
  Side,
  SpokeLayout,
} from "../types/interfaces";
import { WheelModel } from "../model/WheelModel";
import { TensionService } from "../services/TensionService";
import { TableView } from "../views/TableView";
import { ChartView } from "../views/ChartView";
import { config } from "../model/config";
import { bySide, layoutLabel } from "../model/spokeLayout";
import { requireElement } from "../views/dom";

/**
 * WheelPresenter - coordinates the model and views.
 * Acts as the central hub for user interactions and data flow.
 */
export class WheelPresenter implements IWheelPresenter {
  private model: WheelModel;
  private tensionService: TensionService;
  private tableView: TableView;
  private chartView: ChartView;
  private readingsDialog: IReadingsDialogView;

  // DOM elements for controls
  private tensometerSelect = requireElement(
    "usedTensometer",
    HTMLSelectElement,
  );
  private spokesSelect = requireElement("nSpokes", HTMLSelectElement);
  private thicknessDSSelect = requireElement(
    "spokeThickness",
    HTMLSelectElement,
  );
  private thicknessNDSSelect = requireElement(
    "spokeThicknessNDS",
    HTMLSelectElement,
  );
  private toleranceSelect = requireElement("toleranceInput", HTMLSelectElement);

  constructor(
    model: WheelModel,
    tensionService: TensionService,
    tableView: TableView,
    chartView: ChartView,
    readingsDialog: IReadingsDialogView,
  ) {
    this.model = model;
    this.tensionService = tensionService;
    this.tableView = tableView;
    this.chartView = chartView;
    this.readingsDialog = readingsDialog;
  }

  /**
   * Initialize the presenter and render initial state.
   */
  init(): void {
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
    const tensometers = this.tensionService.getTensometers();
    this.fillSelect(this.tensometerSelect, tensometers, this.model.tensometer);
  }

  /**
   * Populate the spokes dropdown.
   */
  private populateSpokesSelect(): void {
    this.fillSelect(
      this.spokesSelect,
      config.SUPPORTED_SPOKE_LAYOUTS.map(layoutLabel),
      layoutLabel(this.model.layout),
    );
  }

  /**
   * Populate the thickness dropdowns: the tensometer's own spokes, then,
   * below a separator, the spokes it can only estimate.
   */
  private populateThicknessSelects(): void {
    const thicknesses = this.tensionService.getSupportedThicknesses();
    const estimated = this.tensionService.getEstimatedThicknesses();
    this.fillSelect(
      this.thicknessDSSelect,
      thicknesses,
      this.model.spokeThickness.ds,
      estimated,
    );
    this.fillSelect(
      this.thicknessNDSSelect,
      thicknesses,
      this.model.spokeThickness.nds,
      estimated,
    );
  }

  /**
   * Populate the tolerance dropdown.
   */
  private populateToleranceSelect(): void {
    this.fillSelect(
      this.toleranceSelect,
      [...config.SUPPORTED_TOLERANCES],
      this.model.tolerance,
    );
  }

  /**
   * Fill a select element with options.
   * @param estimated Further values, listed after a separator which cannot
   *   be selected; no separator when there are none
   */
  private fillSelect(
    select: HTMLSelectElement,
    values: (string | number)[],
    defaultValue: string | number,
    estimated: string[] = [],
  ): void {
    select.innerHTML = "";
    const addOption = (value: string | number) => {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
      return option;
    };
    values.forEach(addOption);
    if (estimated.length > 0) {
      const separator = addOption(config.ESTIMATED_SPOKES_SEPARATOR);
      separator.value = "";
      separator.disabled = true;
      estimated.forEach(addOption);
    }
    select.value = String(defaultValue);
  }

  /**
   * Bind event handlers for control elements.
   */
  private bindControlEvents(): void {
    this.tensometerSelect.addEventListener("change", () => {
      void this.handleTensometerChange(this.tensometerSelect.value);
    });

    this.spokesSelect.addEventListener("change", () => {
      const layout = config.SUPPORTED_SPOKE_LAYOUTS.find(
        (layout) => layoutLabel(layout) === this.spokesSelect.value,
      );
      if (layout) this.handleSpokeCountChange(layout);
    });

    this.thicknessDSSelect.addEventListener("change", () => {
      this.handleThicknessChange("ds", this.thicknessDSSelect.value);
    });

    this.thicknessNDSSelect.addEventListener("change", () => {
      this.handleThicknessChange("nds", this.thicknessNDSSelect.value);
    });

    this.toleranceSelect.addEventListener("change", () => {
      this.handleToleranceChange(Number(this.toleranceSelect.value));
    });
  }

  /**
   * What the current tensometer reads at the default tension of each side.
   */
  private defaultReadings(): Record<Side, number> {
    return bySide((side) =>
      this.tensionService.reading(
        this.model.spokeThickness[side],
        config.DEFAULT_TENSION[side],
      ),
    );
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
  async handleTensometerChange(name: string): Promise<void> {
    // The old defaults are on the old tensometer's scale and would mean an
    // arbitrary tension on this one, so they are always replaced. Readings
    // the user entered may have been taken with this tensometer: ask.
    // Checked before anything changes: the defaults are the old tensometer's.
    const replaceReadings =
      this.model.readingsAreDefault() ||
      (await this.readingsDialog.askToReplace(name));
    this.tensionService.setTensometer(name);
    this.model.tensometer = name;

    // Thickness names are each tensometer's own, so the spoke chosen for the
    // previous tensometer may have another name here, or not be listed at
    // all. The model must hold a valid one before the dropdowns are filled,
    // or they show nothing.
    const thicknesses = this.tensionService.getSupportedThicknesses();
    if (thicknesses.length > 0) {
      this.model.spokeThickness = bySide(
        (side) =>
          this.tensionService.findThickness(this.model.spokeThickness[side]) ??
          thicknesses[0],
      );
    }

    this.populateThicknessSelects();

    if (replaceReadings) {
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
      config.DEFAULT_TENSION.ds,
      config.DEFAULT_TENSION.nds,
    );

    this.recalculate();
  }

  /**
   * Handle spoke thickness change.
   */
  handleThicknessChange(side: Side, thickness: string): void {
    this.model.spokeThickness[side] = thickness;
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

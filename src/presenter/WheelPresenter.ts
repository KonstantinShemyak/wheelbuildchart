import {
  IControlsView,
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
import { bySide } from "../model/spokeLayout";

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
  private controls: IControlsView;

  constructor(
    model: WheelModel,
    tensionService: TensionService,
    tableView: TableView,
    chartView: ChartView,
    readingsDialog: IReadingsDialogView,
    controls: IControlsView,
  ) {
    this.model = model;
    this.tensionService = tensionService;
    this.tableView = tableView;
    this.chartView = chartView;
    this.readingsDialog = readingsDialog;
    this.controls = controls;
  }

  /**
   * Initialize the presenter and render initial state.
   */
  init(): void {
    this.controls.showTensometers(
      this.tensionService.getTensometers(),
      this.model.tensometer,
    );
    this.controls.showLayouts(
      config.SUPPORTED_SPOKE_LAYOUTS,
      this.model.layout,
    );
    this.showThicknesses();
    this.controls.showTolerances(
      config.SUPPORTED_TOLERANCES,
      this.model.tolerance,
    );

    this.controls.onTensometerChange = (name) => {
      void this.handleTensometerChange(name);
    };
    this.controls.onSpokeCountChange = (layout) => {
      this.handleSpokeCountChange(layout);
    };
    this.controls.onThicknessChange = (side, thickness) => {
      this.handleThicknessChange(side, thickness);
    };
    this.controls.onToleranceChange = (tolerance) => {
      this.handleToleranceChange(tolerance);
    };
    this.tableView.onReadingChange = (index, value, advanceFocus) => {
      this.handleReadingChange(index, value, advanceFocus);
    };

    // Initial render
    this.model.resetReadings(this.defaultReadings());
    this.renderTable();
    this.recalculate();
  }

  /**
   * Show the thicknesses of the current tensometer: its own spokes, then,
   * below a separator, the spokes it can only estimate.
   */
  private showThicknesses(): void {
    this.controls.showThicknesses(
      this.tensionService.getSupportedThicknesses(this.model.tensometer),
      this.tensionService.getEstimatedThicknesses(this.model.tensometer),
      this.model.spokeThickness,
    );
  }

  /**
   * What the current tensometer reads at the default tension of each side.
   */
  private defaultReadings(): Record<Side, number> {
    return bySide((side) =>
      this.tensionService.reading(
        this.model.tensometer,
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
      const tension = this.tensionService.tension(
        this.model.tensometer,
        thickness,
        reading,
      );
      this.model.setTension(i, tension);
    }

    const averages = this.model.getAverages();
    const sides = this.model.sides();
    const tensions = this.model.tensions.slice(0, this.model.nSpokes);

    this.tableView.updateTensions(
      tensions,
      sides,
      averages.tensions,
      this.model.tolerance,
    );
    this.tableView.updateAverages(averages.readings, averages.tensions);
    this.chartView.update(sides, tensions);
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
    this.model.tensometer = name;

    // Thickness names are each tensometer's own, so the spoke chosen for the
    // previous tensometer may have another name here, or not be listed at
    // all. The model must hold a valid one before the dropdowns are filled,
    // or they show nothing.
    const thicknesses = this.tensionService.getSupportedThicknesses(name);
    if (thicknesses.length > 0) {
      this.model.spokeThickness = bySide(
        (side) =>
          this.tensionService.findThickness(
            name,
            this.model.spokeThickness[side],
          ) ?? thicknesses[0],
      );
    }

    this.showThicknesses();

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

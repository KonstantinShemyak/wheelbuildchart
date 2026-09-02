/**
 * Wheelbuilding Chart Application
 * Main entry point using the new MVP architecture.
 */

import { WheelModel } from "./model/WheelModel";
import { TensionService } from "./services/TensionService";
import { StorageService } from "./services/StorageService";
import { TableView } from "./views/TableView";
import { ChartView } from "./views/ChartView";
import { SaveLoadView } from "./views/SaveLoadView";
import { WheelPresenter } from "./presenter/WheelPresenter";
import { config } from "./model/config";

/**
 * Initialize the application when the DOM is ready.
 */
function initApp(): void {
  // Create model
  const model = new WheelModel(config.DEFAULT_SPOKES);

  // Create services
  const tensionService = new TensionService();
  const storageService = new StorageService();

  // Create views
  const tableView = new TableView("#valuesTable");
  const chartView = new ChartView("#radarChart");
  const saveLoadView = new SaveLoadView();

  // Initialize chart with default values
  const initialTensionDS = tensionService.tension(
    model.spokeThicknessDS,
    config.INITIAL_READING_DRIVE_SIDE,
  );
  const initialTensionNDS = tensionService.tension(
    model.spokeThicknessNDS,
    config.INITIAL_READING_NON_DRIVE_SIDE,
  );
  chartView.init(model.nSpokes, initialTensionDS, initialTensionNDS);

  // Create presenter and initialize
  const presenter = new WheelPresenter(
    model,
    tensionService,
    storageService,
    tableView,
    chartView,
    saveLoadView,
  );
  presenter.init();
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM is already ready
  initApp();
}

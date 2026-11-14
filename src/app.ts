/**
 * Wheel Tension Chart Application
 * Main entry point using the new MVP architecture.
 */

import { WheelModel } from "./model/WheelModel";
import { TensionService } from "./services/TensionService";
import { TableView } from "./views/TableView";
import { ChartView } from "./views/ChartView";
import { ReadingsDialogView } from "./views/ReadingsDialogView";
import { keepChartInView } from "./views/pinChart";
import { WheelPresenter } from "./presenter/WheelPresenter";
import { config } from "./model/config";

/**
 * Initialize the application when the DOM is ready.
 */
function initApp(): void {
  // Create model
  const model = new WheelModel(config.DEFAULT_SPOKE_LAYOUT);

  // Create services
  const tensionService = new TensionService();

  // Create views
  const tableView = new TableView("#valuesTable");
  const chartView = new ChartView("#radarChart");
  const readingsDialog = new ReadingsDialogView("#readingsDialog");

  // Initialize chart with default values
  chartView.init(
    model.sides(),
    config.DEFAULT_TENSION.ds,
    config.DEFAULT_TENSION.nds,
  );

  // Create presenter and initialize
  const presenter = new WheelPresenter(
    model,
    tensionService,
    tableView,
    chartView,
    readingsDialog,
  );
  presenter.init();

  const chartPane = document.getElementById("chartPane");
  if (chartPane) keepChartInView(chartPane);
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  // DOM is already ready
  initApp();
}

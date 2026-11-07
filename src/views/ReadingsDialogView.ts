import { IReadingsDialogView } from "../types/interfaces";

/**
 * Modal dialog asking whether to replace the entered readings when the
 * tensometer changes. Its buttons close it with "keep" or "replace" as the
 * return value; Escape closes it with none, which keeps the readings.
 */
export class ReadingsDialogView implements IReadingsDialogView {
  private dialog: HTMLDialogElement;
  private tensometerName: HTMLElement;

  constructor(dialogSelector: string = "#readingsDialog") {
    this.dialog = document.querySelector(dialogSelector) as HTMLDialogElement;
    this.tensometerName = this.dialog.querySelector(
      ".tensometerName",
    ) as HTMLElement;
  }

  /**
   * Ask whether to replace the entered readings with the defaults of the
   * newly chosen tensometer.
   * @param tensometer Name of the newly chosen tensometer
   * @returns Whether to replace them; dismissing the dialog keeps them
   */
  askToReplace(tensometer: string): Promise<boolean> {
    this.tensometerName.textContent = tensometer;
    // A previous answer would otherwise count when Escape closes it
    this.dialog.returnValue = "";
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.dialog.addEventListener(
        "close",
        () => resolve(this.dialog.returnValue === "replace"),
        { once: true },
      );
    });
  }
}

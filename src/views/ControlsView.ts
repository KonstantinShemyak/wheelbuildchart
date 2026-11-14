import { IControlsView, Side, SpokeLayout } from "../types/interfaces";
import { config } from "../model/config";
import { layoutLabel, SIDES } from "../model/spokeLayout";
import { requireElement } from "./dom";

/**
 * Fill a select element with options and select one.
 * @param estimated Further values, listed after a separator which cannot be
 *   selected; no separator when there are none
 */
function fillSelect(
  select: HTMLSelectElement,
  values: readonly (string | number)[],
  selected: string | number,
  estimated: readonly string[] = [],
): void {
  select.replaceChildren();
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
  select.value = String(selected);
}

/**
 * The dropdowns above the table: tensometer, spoke layout, spoke thickness
 * of each side, tolerance.
 */
export class ControlsView implements IControlsView {
  private tensometerSelect = requireElement(
    "usedTensometer",
    HTMLSelectElement,
  );
  private layoutSelect = requireElement("nSpokes", HTMLSelectElement);
  private thicknessSelects: Record<Side, HTMLSelectElement> = {
    ds: requireElement("spokeThickness", HTMLSelectElement),
    nds: requireElement("spokeThicknessNDS", HTMLSelectElement),
  };
  private toleranceSelect = requireElement("toleranceInput", HTMLSelectElement);

  /** The layouts last shown, to tell which one an option stands for */
  private layouts: readonly SpokeLayout[] = [];

  onTensometerChange: ((name: string) => void) | null = null;
  onSpokeCountChange: ((layout: SpokeLayout) => void) | null = null;
  onThicknessChange: ((side: Side, thickness: string) => void) | null = null;
  onToleranceChange: ((tolerance: number) => void) | null = null;

  constructor() {
    this.tensometerSelect.addEventListener("change", () => {
      this.onTensometerChange?.(this.tensometerSelect.value);
    });
    this.layoutSelect.addEventListener("change", () => {
      const layout = this.layouts.find(
        (layout) => layoutLabel(layout) === this.layoutSelect.value,
      );
      if (layout) this.onSpokeCountChange?.(layout);
    });
    for (const side of SIDES) {
      const select = this.thicknessSelects[side];
      select.addEventListener("change", () => {
        this.onThicknessChange?.(side, select.value);
      });
    }
    this.toleranceSelect.addEventListener("change", () => {
      this.onToleranceChange?.(Number(this.toleranceSelect.value));
    });
  }

  /** List the tensometers and select one. */
  showTensometers(names: string[], selected: string): void {
    fillSelect(this.tensometerSelect, names, selected);
  }

  /** List the spoke layouts and select one. */
  showLayouts(layouts: readonly SpokeLayout[], selected: SpokeLayout): void {
    this.layouts = layouts;
    fillSelect(
      this.layoutSelect,
      layouts.map(layoutLabel),
      layoutLabel(selected),
    );
  }

  /**
   * List the spoke thicknesses in both sides' dropdowns and select each
   * side's own.
   * @param listed The tensometer's own spokes
   * @param estimated Spokes it can only estimate, listed below a separator
   *   which cannot be selected; no separator when there are none
   */
  showThicknesses(
    listed: string[],
    estimated: string[],
    selected: Record<Side, string>,
  ): void {
    for (const side of SIDES) {
      fillSelect(
        this.thicknessSelects[side],
        listed,
        selected[side],
        estimated,
      );
    }
  }

  /** List the tolerances (percent) and select one. */
  showTolerances(tolerances: readonly number[], selected: number): void {
    fillSelect(this.toleranceSelect, tolerances, selected);
  }
}

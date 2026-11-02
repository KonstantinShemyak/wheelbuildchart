/**
 * Keep the pinned chart on screen while a reading is typed in.
 *
 * `position: sticky` pins the chart to the top of the layout viewport. The
 * on-screen keyboard only shrinks the visual viewport (the part actually on
 * screen), and the browser then pans it down to show the focused input. The
 * layout viewport's top, and the chart with it, ends up above the screen.
 *
 * So move the chart's sticky offset down by however far the visual viewport is
 * panned, and scroll the focused input into the gap between the chart and the
 * keyboard, rather than behind either of them.
 *
 * Other browsers (Android web views among them) shorten the whole page for the
 * keyboard instead. The stylesheet then no longer finds the screen tall enough
 * to pin the chart, and sizes it smaller. For as long as the keyboard is open,
 * keep the chart as it was just before: pinned if it was, and the same size.
 */

/** How long after a focus or keyboard change the browser may still be scrolling the input into view */
const SETTLE_MS = 1000;

/** A pause in scroll events this long means the browser's own (smooth) scroll has finished */
const SCROLL_IDLE_MS = 100;

/** A focused input with the page this much shorter means the keyboard shortened it; browser toolbars sliding in and out change it by ~60px */
const KEYBOARD_MIN_PX = 150;

export function keepChartInView(pane: HTMLElement): void {
  const viewport = window.visualViewport;
  if (!viewport) return;

  // Only while the stylesheet pins the chart (narrow and tall enough screens)
  const isPinned = () => getComputedStyle(pane).position === "sticky";

  const followViewport = () => {
    pane.style.top =
      isPinned() && viewport.offsetTop > 0 ? `${viewport.offsetTop}px` : "";
  };

  const focusedReading = (): HTMLInputElement | null => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement && el.classList.contains("readInput")
      ? el
      : null;
  };

  // Scroll the least distance that puts the input between the chart and the bottom of the screen
  const revealInput = (input: HTMLInputElement) => {
    if (!isPinned()) return;
    const rect = input.getBoundingClientRect();
    const top = viewport.offsetTop + pane.offsetHeight;
    const bottom = viewport.offsetTop + viewport.height;
    let delta = 0;
    if (rect.top < top) delta = rect.top - top;
    else if (rect.bottom > bottom) delta = rect.bottom - bottom;
    if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
  };

  // The browser scrolls the input into view itself, after focus and again as the keyboard
  // opens, without regard to the chart. Correct where it lands once it stops: stepping in
  // earlier would cut its smooth scroll short. Only do so during that time, not later, so
  // the user can still scroll the table freely while a cell is focused.
  let settleUntil = 0;
  let revealTimer: number | undefined;
  const scheduleReveal = () => {
    clearTimeout(revealTimer);
    revealTimer = window.setTimeout(() => {
      const input = focusedReading();
      if (input) revealInput(input);
    }, SCROLL_IDLE_MS);
  };
  const settle = () => {
    settleUntil = performance.now() + SETTLE_MS;
    scheduleReveal();
  };
  const onScroll = () => {
    followViewport();
    if (performance.now() < settleUntil) scheduleReveal();
  };

  // The page size without the keyboard, and how the chart looked at that size
  let width = window.innerWidth;
  let height = window.innerHeight;
  let wasPinned = isPinned();
  let chartWidth = 0;
  const svg = () => pane.querySelector("svg");
  const recordChart = () => {
    wasPinned = isPinned();
    chartWidth = svg()?.getBoundingClientRect().width ?? 0;
  };
  const keyboardOpen = () => pane.classList.contains("keyboard-open");

  window.addEventListener("resize", () => {
    const shortened =
      window.innerWidth === width &&
      window.innerHeight < height - KEYBOARD_MIN_PX &&
      focusedReading() !== null;
    if (shortened) {
      if (wasPinned && chartWidth > 0 && !keyboardOpen()) {
        pane.style.setProperty(
          "--chart-width-without-keyboard",
          `${chartWidth}px`,
        );
        pane.classList.add("keyboard-open");
      }
      return;
    }
    pane.classList.remove("keyboard-open");
    width = window.innerWidth;
    height = window.innerHeight;
  });

  document.addEventListener("focusin", () => {
    if (!focusedReading()) return;
    // Focus comes before the keyboard, except when moving between cells with it already open
    if (!keyboardOpen()) recordChart();
    settle();
  });
  viewport.addEventListener("resize", () => {
    followViewport();
    settle();
  });
  viewport.addEventListener("scroll", onScroll);
  window.addEventListener("scroll", onScroll);
}

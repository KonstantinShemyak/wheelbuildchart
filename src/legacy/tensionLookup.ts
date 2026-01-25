import { tensometers } from "./tensometers";

const DEFAULT_TENSOMETER = "ParkTool TM-1";
var tensometer = DEFAULT_TENSOMETER;

function interpolate(values, index) {
  if (index in values) return values[index];
  if (values.length == 1) return values[0];

  var sortedKeys = Object.keys(values).sort((a, b) => a - b);
  var nKeys = sortedKeys.length;

  var min = sortedKeys[0];
  var max = sortedKeys[nKeys - 1];
  var secondMin = sortedKeys[1];
  var secondMax = sortedKeys[nKeys - 2];

  /* Extrapolate: */
  if (index < min)
    return (
      values[min] -
      ((values[secondMin] - values[min]) * (min - index)) / (secondMin - min)
    );
  if (index > max)
    return (
      values[max] +
      ((values[max] - values[secondMax]) * (index - max)) / (max - secondMax)
    );

  /* Interpolate: */
  /* x1 and x2 are the lower and higher neighbors of x in 'values' */
  var x1 = min;
  var x2 = max;
  if (x1 === x2) return x1;

  for (var v in values) {
    if (v < index && v > x1) x1 = v;
    else if (v > index && v < x2) x2 = v;
  }
  var y1 = parseFloat(values[x1]);
  var y2 = parseFloat(values[x2]);
  return y1 + ((index - x1) * (y2 - y1)) / (x2 - x1);
}

/* Interface: */
export const tensionLookup = {
  tension: function (spokeThickness, reading) {
    var lookupTable = tensometers[tensometer][spokeThickness];
    return interpolate(lookupTable, reading);
  },

  getKnownSpokeThickness: function () {
    return Object.keys(tensometers[tensometer]).sort();
  },

  getTensometers: function () {
    return Object.keys(tensometers).sort();
  },

  setTensometer: function (t) {
    tensometer = t;
  },

  defaultTensometer: DEFAULT_TENSOMETER,
};

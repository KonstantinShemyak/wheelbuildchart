import { tensionChart } from "./tensionChart";
import { tensionLookup } from "./tensionLookup";
import "./inputController.css";

$(document).ready(function () {
  "use strict";

  var config = {
    INITIAL_READING_DRIVE_SIDE: 20,
    INITIAL_READING_NON_DRIVE_SIDE: 18,
    SUPPORTED_SPOKE_COUNTS: [16, 18, 20, 24, 28, 32, 36, 40],
    DEFAULT_SPOKES: 32,
    DEFAULT_SPOKE_THICKNESS: 2,
    SUPPORTED_TOLERANCES: [5, 7.5, 10, 15, 20],
    DEFAULT_TOLERANCE: 20,
    ERROR_STRING_INVALID_INPUT:
      ": invalid input (a number like '23' or '23.2' expected)",
  };
  Object.freeze(config);

  // Fill dropdown lists with values
  var $toleranceInput = $("#toleranceInput").change(updateAverages);
  fillSelectFromArray(
    $toleranceInput,
    config.SUPPORTED_TOLERANCES,
    config.DEFAULT_TOLERANCE,
  );

  var $spokesList = $("#nSpokes").change(initValuesTable);
  fillSelectFromArray(
    $spokesList,
    config.SUPPORTED_SPOKE_COUNTS,
    config.DEFAULT_SPOKES,
  );

  var $spokeThicknessList = $("#spokeThickness").change(updateAverages);
  var $spokeThicknessNDSList = $("#spokeThicknessNDS").change(updateAverages);
  var knownSpokeThickness = tensionLookup.getKnownSpokeThickness(); // default tensometer used
  fillSelectFromArray(
    $spokeThicknessList,
    knownSpokeThickness,
    knownSpokeThickness[0],
  );
  fillSelectFromArray(
    $spokeThicknessNDSList,
    knownSpokeThickness,
    knownSpokeThickness[0],
  );

  var $usedTensometer = $("#usedTensometer").change(function () {
    tensionLookup.setTensometer($usedTensometer.val());
    var knownSpokeThickness = tensionLookup.getKnownSpokeThickness();
    fillSelectFromArray(
      $spokeThicknessList,
      knownSpokeThickness,
      knownSpokeThickness[0],
    );
    fillSelectFromArray(
      $spokeThicknessNDSList,
      knownSpokeThickness,
      knownSpokeThickness[0],
    );
    updateAverages(); // tensions must be set at this point
  });
  fillSelectFromArray(
    $usedTensometer,
    tensionLookup.getTensometers(),
    tensionLookup.defaultTensometer,
  );

  // Fill readings array up to the max possible number of spokes
  var readings = [];
  for (
    var i = 1;
    i <=
    config.SUPPORTED_SPOKE_COUNTS[config.SUPPORTED_SPOKE_COUNTS.length - 1];
    ++i
  ) {
    var reading = config.INITIAL_READING_DRIVE_SIDE;
    if (i % 2 == 0) reading = config.INITIAL_READING_NON_DRIVE_SIDE;
    readings.push(reading);
  }

  initValuesTable();

  // Functions

  // Tension value from the table, for the selected spoke thickness
  function tensionFunction(nSpoke, t) {
    if (nSpoke % 2 == 1)
      return tensionLookup.tension($spokeThicknessList.val(), t);
    else return tensionLookup.tension($spokeThicknessNDSList.val(), t);
  }

  function initValuesTable() {
    var nSpokes = Number($spokesList.val());
    $('[role="valueRow"]').remove();

    // Vertical offset between left and right columns:
    // * Each data cell is spanned on 1 column and 2 lines
    // * This first set of cells creates the offset:
    // ** Left cell is spanned on 1 line
    // ** Right cell is spanned on 2 lines
    // * There are no empty cells except at the top and at the bottom
    $(
      '<tr role="valueRow"><td class="driveSideColor" colspan="3"/><td class="nonDriveSideColor" colspan="3" rowspan="2"/></tr>',
    ).insertBefore($("#average"));

    for (var i = 1; i <= nSpokes; i++) {
      var $row = $('<tr role="valueRow"/>');

      var $input = $('<input type="text" id="reading' + i + '"/>')
        .addClass("readInput")
        .val(readings[i - 1])
        .on("change", handleUserInput(i));

      $('<td rowspan="2"/>')
        .text("#" + i + ":")
        .appendTo($row);
      $('<td rowspan="2"/>').append($input).appendTo($row);
      $('<td rowspan="2"/>')
        .attr("id", "tension" + i)
        .appendTo($row);
      if (i % 2 != 0) {
        $input.attr("tabindex", (i - 1) / 2 + 1);
        $("tension" + i).text(
          tensionFunction(i, config.INITIAL_READING_DRIVE_SIDE),
        );
        $row.addClass("driveSideColor");
      } else {
        $input.attr("tabindex", nSpokes / 2 + (i - 1) / 2 + 1);
        $("tension" + i).text(
          tensionFunction(i, config.INITIAL_READING_NON_DRIVE_SIDE),
        );
        $row.addClass("nonDriveSideColor");
      }
      $row.insertBefore($("#average"));
    }
    // End the vertical offset with a left-side one-line cell
    $(
      '<tr role="valueRow"><td class="driveSideColor" colspan="3"/></tr>',
    ).insertBefore($("#average"));

    $("#reading1").focus().select();

    tensionChart.init(
      "#radarChart",
      nSpokes,
      tensionFunction(1, config.INITIAL_READING_DRIVE_SIDE),
      tensionFunction(0, config.INITIAL_READING_NON_DRIVE_SIDE),
    );

    updateAverages();
  }

  function handleUserInput(targetSpoke) {
    return function () {
      var nSpokes = Number($spokesList.val());
      var inputValue = $("#reading" + targetSpoke).val();
      /* Restrict user input just for safety: */
      if (isNaN(inputValue)) {
        alert(
          $("#reading" + targetSpoke).val() + config.ERROR_STRING_INVALID_INPUT,
        );
        $("#reading" + targetSpoke)
          .focus()
          .select();
        return;
      }

      readings[targetSpoke - 1] = parseFloat(inputValue);
      updateAverages();

      /* Move the focus: e.g. for 32-spoke wheel, 31 -> 1, 32 -> 2 */
      var nextSameSideSpoke = (targetSpoke + 2) % nSpokes;
      $("#reading" + nextSameSideSpoke)
        .focus()
        .select();
    };
  }

  function updateAverages() {
    var nSpokes = Number($spokesList.val());
    var tolerance = Number($toleranceInput.val());

    var tensions = [];
    var sumReadings = [0, 0]; // [nds, ds]
    var sumTensions = [0, 0]; // [nds, ds]

    for (var i = 1; i <= nSpokes; ++i) {
      tensions[i - 1] = tensionFunction(i, readings[i - 1]);
      sumReadings[i % 2] += readings[i - 1];
      sumTensions[i % 2] += tensions[i - 1];
    }

    var avgReadings = [
      sumReadings[0] / (nSpokes / 2),
      sumReadings[1] / (nSpokes / 2),
    ]; // [nds, ds]
    var avgTensions = [
      sumTensions[0] / (nSpokes / 2),
      sumTensions[1] / (nSpokes / 2),
    ]; // [nds, ds]

    $("#avgDriveReading").text(round2(avgReadings[1]));
    $("#avgDriveTension").text(round2(avgTensions[1]));
    $("#avgNondriveReading").text(round2(avgReadings[0]));
    $("#avgNondriveTension").text(round2(avgTensions[0]));

    var minTolerated = [
      avgTensions[0] * ((100 - tolerance) / 100),
      avgTensions[1] * ((100 - tolerance) / 100),
    ]; // [nds, ds]
    var maxTolerated = [
      avgTensions[0] * ((100 + tolerance) / 100),
      avgTensions[1] * ((100 + tolerance) / 100),
    ]; // [nds, ds]

    // Updating averages may affect whether a particular tension is within tolerance,
    // hence update the rows for each spoke
    for (var i = 1; i <= nSpokes; ++i) {
      var tension = round2(tensions[i - 1]);
      if (
        tensions[i - 1] < minTolerated[i % 2] ||
        tensions[i - 1] > maxTolerated[i % 2]
      )
        tension += " &#9888;";
      $("#tension" + i).html(tension);
    }

    tensionChart.update(tensions);
  }

  // Utilities

  function round2(number) {
    /* round up to 2 decimals */
    return Math.round(number * 100) / 100;
  }

  function fillSelectFromArray(select, array, initialValue) {
    select.empty();
    for (var i = 0; i < array.length; i++)
      $('<option value="' + array[i] + '">' + array[i] + "</option>").appendTo(
        select,
      );
    select.val(initialValue);
  }
});

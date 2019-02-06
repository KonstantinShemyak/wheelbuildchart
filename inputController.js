$(document).ready(function() {
	'use strict';
	
	var config = {
			INITIAL_READING_DRIVE_SIDE: 20,
			INITIAL_READING_NON_DRIVE_SIDE: 18,
			SUPPORTED_SPOKE_COUNTS: [16, 18, 20, 24, 28, 32, 36, 40],
			DEFAULT_SPOKES: 32,
			DEFAULT_SPOKE_THICKNESS: 2,
			SUPPORTED_TOLERANCES: [5, 7.5, 10, 15, 20],
			DEFAULT_TOLERANCE: 20,
			ERROR_STRING_INVALID_INPUT: ": invalid input (a number like '23' or '23.2' expected)"
	};
	Object.freeze(config);

	// Fill dropdown lists with values
	var $spokesList = $('#nSpokes');
	fillSelectFromArray($spokesList, config.SUPPORTED_SPOKE_COUNTS, config.DEFAULT_SPOKES);
	$spokesList.on('change', initValuesTable);

	var knownSpokeThickness = TensionTable.getKnownSpokeThickness();

	var $spokeThicknessList = $('#spokeThickness');
	fillSelectFromArray($spokeThicknessList, knownSpokeThickness, config.DEFAULT_SPOKE_THICKNESS);
	$spokeThicknessList.on('change', updateCalculations);

	var $spokeThicknessNDSList = $('#spokeThicknessNDS');
	fillSelectFromArray($spokeThicknessNDSList, knownSpokeThickness, config.DEFAULT_SPOKE_THICKNESS);
	$spokeThicknessNDSList.on('change', updateCalculations);
	
	var $toleranceInput = $('#toleranceInput');
	fillSelectFromArray($toleranceInput, config.SUPPORTED_TOLERANCES, config.DEFAULT_TOLERANCE);

	// Tension value from the table, for the selected spoke thickness
	function tensionFunction(r) {
		return TensionTable.parkToolTension($spokeThicknessList.val(), r);
	};
	function tensionFunctionNDS(r) {
		return TensionTable.parkToolTension($spokeThicknessNDSList.val(), r);
	};

	// Fill readings array up to the max possible number of spokes
	var readings = [];
	for (var i = 1; i <= config.SUPPORTED_SPOKE_COUNTS[config.SUPPORTED_SPOKE_COUNTS.length - 1]; ++i) {
		if (i % 2 == 1)
			readings.push(config.INITIAL_READING_DRIVE_SIDE);
		else
			readings.push(config.INITIAL_READING_NON_DRIVE_SIDE);
	}

	initValuesTable();

	// Functions

	function initValuesTable() {
		var nSpokes = Number($spokesList.val());
		$('[role="valueRow"]').remove();

		// Vertical offset between left and right columns:
		// * Each data cell is spanned on 1 column and 2 lines
		// * This first set of cells creates the offset:
		// ** Left cell is spanned on 1 line
		// ** Right cell is spanned on 2 lines
		// * There are no empty cells except at the top and at the bottom
		$('<tr role="valueRow"><td class="driveSideColor" colspan="3"/><td class="nonDriveSideColor" colspan="3" rowspan="2"/></tr>').insertBefore($('#average'));

		for (var i = 1; i <= nSpokes; i++) {
			var $row = $('<tr role="valueRow"/>');

			var $input = $('<input type="text" id="reading' + i + '"/>')
			.addClass("readInput")
			.on('change', handleUserInput(i));

			if (i % 2 != 0) {
				$input.attr("tabindex", (i - 1) / 2 + 1);
				$('<td class="driveSideColor" rowspan="2"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="driveSideColor" rowspan="2"/>')
				.append($input.val(readings[i - 1]))
				.appendTo($row);
				$('<td class="driveSideColor" rowspan="2"/>')
				.attr("id", "tension" + i).attr("side", "drive")
				.text(tensionFunction(config.INITIAL_READING_DRIVE_SIDE))
				.appendTo($row);
			} else {
				$input.attr("tabindex", nSpokes / 2 + (i - 1) / 2 + 1);
				$('<td class="nonDriveSideColor" rowspan="2"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="nonDriveSideColor" rowspan="2"/>')
				.append($input.val(readings[i - 1]))
				.appendTo($row);
				$('<td class="nonDriveSideColor" rowspan="2"/>')
				.attr("id", "tension" + i)
				.text(tensionFunctionNDS(config.INITIAL_READING_NON_DRIVE_SIDE))
				.appendTo($row);
			}
			$row.insertBefore($('#average'));
		}
		// End the vertical offset with a left-side one-line cell
		$('<tr role="valueRow"><td class="driveSideColor" colspan="3"/></tr>').insertBefore($('#average'));

		$('#reading1').focus().select();

		tensionChart.init('#radarChart', nSpokes,
				tensionFunction(config.INITIAL_READING_DRIVE_SIDE),
				tensionFunction(config.INITIAL_READING_NON_DRIVE_SIDE));

		updateCalculations();
	}

	function handleUserInput(targetSpoke) {
		return function() {
			var nSpokes = Number($spokesList.val());
			var inputValue = parseFloat($('#reading' + targetSpoke).val());
			/* Restrict user input just for safety: */			
			if (isNaN(inputValue)) {
				alert($('#reading' + targetSpoke).val() + config.ERROR_STRING_INVALID_INPUT);
				$('#reading' + targetSpoke).focus().select();
				return;
			}

			readings[targetSpoke - 1] = parseFloat(inputValue);
			updateCalculations();

			/* Move the focus: e.g. for 32-spoke wheel, 31 -> 1, 32 -> 2 */
			var nextSameSideSpoke = targetSpoke + 2;
			if (nextSameSideSpoke == nSpokes + 1)
				nextSameSideSpoke = 1;
			else if (nextSameSideSpoke == nSpokes + 2)
				nextSameSideSpoke = 2;
			$('#reading' + nextSameSideSpoke).focus().select();
		};
	}

	function updateCalculations() {
		var nSpokes = Number($spokesList.val());
		var tolerance = Number($toleranceInput.val());

		var tensions = [];
		var sumReadings = [0, 0]; // [nds, ds]
		var sumTensions = [0, 0]; // [nds, ds]

		for (var i = 1; i <= nSpokes; ++i) {
			if (i % 2 == 1)
				tensions[i - 1] = tensionFunction(readings[i - 1]);
			else
				tensions[i - 1] = tensionFunctionNDS(readings[i - 1]);
			sumReadings[i % 2] += readings[i - 1];
			sumTensions[i % 2] += tensions[i - 1];
		}

		var avgReadings = [sumReadings[0] / (nSpokes / 2), sumReadings[1] / (nSpokes / 2)]; // [nds, ds]
		var avgTensions = [sumTensions[0] / (nSpokes / 2), sumTensions[1] / (nSpokes / 2)]; // [nds, ds]

		$('#avgDriveReading').text(round2(avgReadings[1]));
		$('#avgDriveTension').text(round2(avgTensions[1]));
		$('#avgNondriveReading').text(round2(avgReadings[0]));
		$('#avgNondriveTension').text(round2(avgTensions[0]));

		var minTensions = [avgTensions[0] * ((100 - tolerance) / 100), avgTensions[1] * ((100 - tolerance) / 100)]; // [nds, ds]
		var maxTensions = [avgTensions[0] * ((100 + tolerance) / 100), avgTensions[1] * ((100 + tolerance) / 100)]; // [nds, ds]

		// update each spoke
		for (var i = 1; i <= nSpokes; ++i) {
			if (tensions[i - 1] > minTensions[i % 2] && tensions[i - 1] < maxTensions[i % 2])
				$('#tension' + i).text(round2(tensions[i - 1]));
			else
				$('#tension' + i).html(round2(tensions[i - 1]) + " &#9888;");
		}

		tensionChart.updateAll(tensions);
	}
	
	// Utilities

	function round2(number) {
		/* round up to 2 decimals */
		return Math.round(number * 100) / 100;
	}

	function fillSelectFromArray(select, array, initialValue) {
		for (var i = 0; i < array.length; i++)
			$('<option value="' + array[i] + '">'
					+ array[i] + '</option>')
			.appendTo(select);
		select.val(initialValue);
	}
});

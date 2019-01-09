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
			/* Do some locales use comma as decimal separator? */
			ALLOWED_INPUT_REGEXP: /^\d{1,2}(\.\d{1,2})?$/,
			ERROR_STRING_INVALID_INPUT: ": invalid input (a number like '23' or '23.2' expected)"
	};
	Object.freeze(config);

	// Fill dropdown lists with values
	var $spokesList = $('#nSpokes');
	fillSelectFromArray($spokesList, config.SUPPORTED_SPOKE_COUNTS, config.DEFAULT_SPOKES);

	var knownSpokeThickness = TensionTable.getKnownSpokeThickness();

	var $spokeThicknessList = $('#spokeThickness');
	fillSelectFromArray($spokeThicknessList, knownSpokeThickness, config.DEFAULT_SPOKE_THICKNESS);

	var $spokeThicknessNDSList = $('#spokeThicknessNDS');
	fillSelectFromArray($spokeThicknessNDSList, knownSpokeThickness, config.DEFAULT_SPOKE_THICKNESS);
	
	var $toleranceInput = $('#toleranceInput');
	fillSelectFromArray($toleranceInput, config.SUPPORTED_TOLERANCES, config.DEFAULT_TOLERANCE);

	// Tension value from the table, for the selected spoke thickness
	function tensionFunction(r) {
		return TensionTable.parkToolTension($spokeThicknessList.val(), r);
	};
	function tensionFunctionNDS(r) {
		return TensionTable.parkToolTension($spokeThicknessNDSList.val(), r);
	};

	// Emulate click, which will draw everything
	$('#startButton').on('click', function() {
		initValuesTable($spokesList.val());
	}).click();

	// Functions

	function initValuesTable(nSpokes) {
		$('[role="valueRow"]').remove();

		for (var i = 1; i <= nSpokes; i++) {
			var $row = $('<tr role="valueRow"/>');

			var $input = $('<input type="text" id="reading' + i + '"/>')
			.addClass("readInput")
			.on('change', handleUserInput(i, nSpokes));

			if (i % 2 != 0) {
				$('<td class="driveSideColor"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="driveSideColor"/>')
				.append($input.val(config.INITIAL_READING_DRIVE_SIDE))
				.appendTo($row);
				$('<td class="driveSideColor"/>')
				.attr("id", "tension" + i).attr("side", "drive")
				.text(tensionFunction(config.INITIAL_READING_DRIVE_SIDE))
				.appendTo($row);
				$('<td colspan="3"/>').appendTo($row);
			} else {
				$('<td colspan="3"/>').appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.append($input.val(config.INITIAL_READING_NON_DRIVE_SIDE))
				.appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.attr("id", "tension" + i)
				.text(tensionFunctionNDS(config.INITIAL_READING_NON_DRIVE_SIDE))
				.appendTo($row);
			}
			$row.insertBefore($('#average'));
		}
		$('#avgDriveReading').text(config.INITIAL_READING_DRIVE_SIDE);
		$('#avgDriveTension').text(tensionFunction(config.INITIAL_READING_DRIVE_SIDE));
		$('#avgNondriveReading').text(config.INITIAL_READING_NON_DRIVE_SIDE);
		$('#avgNondriveTension').text(tensionFunctionNDS(config.INITIAL_READING_NON_DRIVE_SIDE));
		
		$('#reading1').focus().select();
		tensionChart.init('#radarChart', nSpokes,
				tensionFunction(config.INITIAL_READING_DRIVE_SIDE),
				tensionFunction(config.INITIAL_READING_NON_DRIVE_SIDE));
	}

	function handleUserInput(targetSpoke, nSpokes) {
		return function() {
			var userInput = $('#reading' + targetSpoke).val();
			/* Restrict user input just for safety: */			
			if (!config.ALLOWED_INPUT_REGEXP.test(userInput)) {
				alert(userInput + config.ERROR_STRING_INVALID_INPUT);
				$('#reading' + targetSpoke).focus().select();
				return;
			}
				
			/* Calculate the new value: */
			var newTension;
			if (targetSpoke % 2 == 1)
				newTension = tensionFunction(userInput);
			else
				newTension = tensionFunctionNDS(userInput);
			
			/* Update the averages: */
			var selector = targetSpoke % 2 == 1 ? "avgDrive" : "avgNondrive";
			var sumReading = 0, sumTension = 0;
			
			var startingSpoke = targetSpoke % 2 == 1 ? 1 : 2;
			for (var i = startingSpoke; i <= nSpokes; i += 2) {
				sumReading += parseFloat($('#reading' + i).val());
				if (i != targetSpoke)
					sumTension += parseFloat($('#tension' + i).text());
				else
					sumTension += newTension;
			}

			var avgReading =  sumReading / (nSpokes / 2);
			var avgTension =  sumTension / (nSpokes / 2);

			$('#' + selector + 'Reading').text(round2(avgReading));
			$('#' + selector + 'Tension').text(round2(avgTension));

			var minTension = avgTension * ((100 - $toleranceInput.val()) / 100);
			var maxTension = avgTension * ((100 + $toleranceInput.val()) / 100);

			if (newTension > minTension && newTension < maxTension)
				$('#tension' + targetSpoke).text(round2(newTension));
			else
				$('#tension' + targetSpoke).html(round2(newTension) + " &#9888;");

			/* Move the focus: e.g. for 32-spoke wheel, 31 -> 1, 32 -> 2 */
			var nextSameSideSpoke = targetSpoke + 2;
			if (nextSameSideSpoke == Number(nSpokes) + 1)
				nextSameSideSpoke = 1;
			else if (nextSameSideSpoke == Number(nSpokes) + 2)
				nextSameSideSpoke = 2;
			$('#reading' + nextSameSideSpoke).focus().select();
			
			tensionChart.update(targetSpoke, newTension);
		};
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

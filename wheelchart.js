$(document).ready(function() {
	'use strict';
	
	var config = {
			INITIAL_VALUE_DRIVE_SIDE: 20,
			INITIAL_VALUE_NON_DRIVE_SIDE: 18,
			SUPPORTED_SPOKE_COUNTS: [16, 18, 20, 24, 28, 32, 36, 40],
			DEFAULT_SPOKES: 32,
			DEFAULT_SPOKE_THICKNESS: 2,
			/* Do some locales use comma as decimal separator? */
			ALLOWED_INPUT_REGEXP: /^\d{1,2}(\.\d{1,2})?$/,
			ERROR_STRING_INVALID_INPUT: ": invalid input (a number like '23' or '23.2' expected)"
	};
	Object.freeze(config);

	// Global arrays:
	var driveSideSpokes, nonDriveSideSpokes;

	// Fill dropdown lists with values
	var $spokesList = $('#nSpokes');
	fillSelectFromArray($spokesList, config.SUPPORTED_SPOKE_COUNTS, config.DEFAULT_SPOKES);

	var $spokeThickness = $('#spokeThickness');
	var knownSpokeThickness = TensionTable.getKnownSpokeThickness();
	fillSelectFromArray($spokeThickness, knownSpokeThickness, config.DEFAULT_SPOKE_THICKNESS);
	
	// Emulate click, which will draw everything
	$('#startButton').on('click', function() {
		var nSpokes = $spokesList.val();
		initValuesTable(nSpokes);
		initWheelChart(nSpokes);
	}).click();

	// Functions

	// Tension value from the table, for the selected spoke thickness
	function tensionFunction(r) {
		return TensionTable.parkToolTension($spokeThickness.val(), r);
	};

	function initValuesTable(nSpokes) {
		$('[role="valueRow"]').remove();
		driveSideSpokes = [];
		nonDriveSideSpokes = [];
		for (var i = 0; i < nSpokes; i++) {
			driveSideSpokes.push({
				axis: nSpokes - i,
				value: tensionFunction(config.INITIAL_VALUE_DRIVE_SIDE)
			});
			nonDriveSideSpokes.push({
				axis: nSpokes - i,
				value: tensionFunction(config.INITIAL_VALUE_NON_DRIVE_SIDE)
			});
		}

		for (var i = 1; i <= nSpokes; i++) {
			var $row = $('<tr role="valueRow"/>');

			var $input = $('<input type="text" id="spoke' + i + '"/>')
			.addClass("readInput")
			.on('change', handleUserInput(i, nSpokes));

			if (i % 2 != 0) {
				$('<td class="driveSideColor"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="driveSideColor"/>')
				.append($input.val(config.INITIAL_VALUE_DRIVE_SIDE))
				.appendTo($row);
				$('<td class="driveSideColor"/>')
				.attr("id", "tension" + i).attr("side", "drive")
				.text(tensionFunction(config.INITIAL_VALUE_DRIVE_SIDE))
				.appendTo($row);
				$('<td colspan="3"/>').appendTo($row);
			} else {
				$('<td colspan="3"/>').appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.append($input.val(config.INITIAL_VALUE_NON_DRIVE_SIDE))
				.appendTo($row);
				$('<td class="nonDriveSideColor"/>')
				.attr("id", "tension" + i)
				.text(tensionFunction(config.INITIAL_VALUE_NON_DRIVE_SIDE))
				.appendTo($row);
			}
			$row.insertBefore($('#average'));
		}
	}

	function initWheelChart(nSpokes) {
		/* Emulate user input, to do the first-time drawing */
		handleUserInput(1, nSpokes)();
		handleUserInput(2, nSpokes)();
		$('#spoke1').focus().select();
	}

	function handleUserInput(targetSpoke, nSpokes) {
		return function() {
			var userInput = $('#spoke' + targetSpoke).val();
			/* Restrict user input just for safety: */			
			if (!config.ALLOWED_INPUT_REGEXP.test(userInput)) {
				alert(userInput + config.ERROR_STRING_INVALID_INPUT);
				$('#spoke' + targetSpoke).focus().select();
				return;
			}
				
			/* Calculate the new value: */
			var newTension = tensionFunction(userInput);
			
			$('#tension' + targetSpoke).text(round2(newTension));
			
			/* Update the averages: */
			var selector = targetSpoke % 2 == 1 ? "avgDrive" : "avgNondrive";
			var sumReading = 0, sumValue = 0;
			
			var startingSpoke = targetSpoke % 2 == 1 ? 1 : 2;
			for (var i = startingSpoke; i <= nSpokes; i += 2) {
				sumReading += parseFloat($('#spoke' + i).val());
				sumValue += parseFloat($('#tension' + i).text());
			}

			$('#' + selector + 'Reading').text(round2(sumReading / nSpokes * 2));
			$('#' + selector + 'Tension').text(round2(sumValue / nSpokes * 2));

			/* Move the focus: e.g. for 32-spoke wheel, 31 -> 1, 32 -> 2 */
			var nextSameSideSpoke = targetSpoke + 2;
			if (nextSameSideSpoke == Number(nSpokes) + 1)
				nextSameSideSpoke = 1;
			else if (nextSameSideSpoke == Number(nSpokes) + 2)
				nextSameSideSpoke = 2;
			$('#spoke' + nextSameSideSpoke).focus().select();
			
			/* Update the radar chart: */
			var axisNumber = nSpokes - targetSpoke;
			var nextPseudoSpokeNumber = (axisNumber + 1) % nSpokes;
			var prevPseudoSpokeNumber = 
				axisNumber > 0 ? (axisNumber - 1) % nSpokes : nSpokes - 1;
			var spokeSide = targetSpoke % 2 == 1 ? driveSideSpokes : nonDriveSideSpokes;
			var increment = newTension - spokeSide[axisNumber].value;
			spokeSide[axisNumber].value = newTension;
			spokeSide[nextPseudoSpokeNumber].value += increment / 2;
			spokeSide[prevPseudoSpokeNumber].value += increment / 2;
			RadarChart.draw("#radarChart", [driveSideSpokes, nonDriveSideSpokes]);
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

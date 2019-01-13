$(document).ready(function() {
	'use strict';
	
	var config = {
			INITIAL_READING_DRIVE_SIDE: 20,
			INITIAL_READING_NON_DRIVE_SIDE: 18,
			SUPPORTED_SPOKE_COUNTS: [16, 18, 20, 24, 28, 32, 36, 40],
			DEFAULT_SPOKES: 32,
			DEFAULT_SPOKE_THICKNESS: 2,
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
			.on('change', handleUserInput(i, nSpokes));

			if (i % 2 != 0) {
				$('<td class="driveSideColor" rowspan="2"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="driveSideColor" rowspan="2"/>')
				.append($input.val(config.INITIAL_READING_DRIVE_SIDE))
				.appendTo($row);
				$('<td class="driveSideColor" rowspan="2"/>')
				.attr("id", "tension" + i).attr("side", "drive")
				.text(tensionFunction(config.INITIAL_READING_DRIVE_SIDE))
				.appendTo($row);
			} else {
				$('<td class="nonDriveSideColor" rowspan="2"/>')
				.text('#' + i + ':').appendTo($row);
				$('<td class="nonDriveSideColor" rowspan="2"/>')
				.append($input.val(config.INITIAL_READING_NON_DRIVE_SIDE))
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
			var inputValue = parseFloat($('#reading' + targetSpoke).val());
			/* Restrict user input just for safety: */			
			if (isNaN(inputValue)) {
				alert($('#reading' + targetSpoke).val() + config.ERROR_STRING_INVALID_INPUT);
				$('#reading' + targetSpoke).focus().select();
				return;
			}
				
			/* Calculate the new value: */
			var newTension;
			if (targetSpoke % 2 == 1)
				newTension = tensionFunction(inputValue);
			else
				newTension = tensionFunctionNDS(inputValue);
			$('#tension' + targetSpoke).text(round2(newTension));
			
			/* Update the averages: */
			var selector = targetSpoke % 2 == 1 ? "avgDrive" : "avgNondrive";
			var sumReading = 0, sumValue = 0;
			
			var startingSpoke = targetSpoke % 2 == 1 ? 1 : 2;
			for (var i = startingSpoke; i <= nSpokes; i += 2) {
				sumReading += parseFloat($('#reading' + i).val());
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

// A radar chart with state.
// First call init(), defining the location, size, and initial values.
// After that call update() as needed, passing the changed spoke and new tension.
var tensionChart = (function() {
	'use strict';
	var driveSideSpokes = undefined, nonDriveSideSpokes = undefined;
	var location = undefined;
	var nSpokes = undefined;
	
	return {
		init: function(id, n, driveSideTension, nonDriveSideTension) {
			location = id;
			nSpokes = n;
			driveSideSpokes = [];
			nonDriveSideSpokes = [];
			for (var i = 0; i < nSpokes; i++) {
				driveSideSpokes.push({
					axis: nSpokes - i,
					value: driveSideTension
				});
				nonDriveSideSpokes.push({
					axis: nSpokes - i,
					value: nonDriveSideTension
				});
			}
			RadarChart.draw(location, [driveSideSpokes, nonDriveSideSpokes]);
		},
		
		update: function(targetSpoke, value) {
			if (typeof driveSideSpokes === undefined)
				throw Error("tension-chart.js: update() called before init()");
			
			// We draw the tension chart as a radar chart with two data sets.
			// They can have only one set of axis. Say that axis 1 belongs to
			// drive-side spoke. But then we must also draw some value for the
			// non-drive side on that axis. Use arithmetic mean of neighbors.
			var axisNumber = nSpokes - targetSpoke;
			var nextPseudoSpokeNumber = (axisNumber + 1) % nSpokes;
			var prevPseudoSpokeNumber = 
				axisNumber > 0 ? (axisNumber - 1) % nSpokes : nSpokes - 1;
			var spokeSide = targetSpoke % 2 == 1 ? driveSideSpokes : nonDriveSideSpokes;
			var increment = value - spokeSide[axisNumber].value;
			spokeSide[axisNumber].value = value;
			spokeSide[nextPseudoSpokeNumber].value += increment / 2;
			spokeSide[prevPseudoSpokeNumber].value += increment / 2;

			// Actual update
			RadarChart.draw(location, [driveSideSpokes, nonDriveSideSpokes]);
		}
	};
})();
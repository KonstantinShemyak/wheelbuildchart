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
		
		updateAll: function(tensions) {
			if (typeof driveSideSpokes === undefined)
				throw Error("tension-chart.js: updateAll() called before init()");

			for (var i = 0; i < nSpokes; i++) {
				var tensionDS = undefined;
				var tensionNDS = undefined;
				if (i % 2 == 0) {
					tensionDS = tensions[i];
					tensionNDS = (tensions[(i == 0) ? (tensions.length - 1) : (i - 1)] + tensions[(i + 1) % nSpokes]) / 2;
				}
				else {
					tensionDS = (tensions[(i == 0) ? (tensions.length - 1) : (i - 1)] + tensions[(i + 1) % nSpokes]) / 2;
					tensionNDS = tensions[i];
				}

				driveSideSpokes[nSpokes - (i + 1)].value = tensionDS;
				nonDriveSideSpokes[nSpokes - (i + 1)].value = tensionNDS;
			}

			// Actual update
			RadarChart.draw(location, [driveSideSpokes, nonDriveSideSpokes]);
		}
	};
})();

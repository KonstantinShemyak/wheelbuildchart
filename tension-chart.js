// A radar chart with state.
// First call init(), defining the location, size, and initial values.
// After that call update() as needed, passing the changed spoke and new tension.
var tensionChart = (function() {
	'use strict';
	var driveSideSpokes = undefined, nonDriveSideSpokes = undefined;
	var location = undefined;
	var nSpokes = undefined;

	// Length of a bisector in a triangle with sides "a" and "b"
	function bisector(a, b, nSpokes) {
		if (a <= 0 || b <= 0)
			return 0;
		var halfAngle = 2 * Math.PI / nSpokes;
		return 2 * a * b * Math.cos(halfAngle) / (a + b);
	}

	return {
		init: function(id, n, driveSideTension, nonDriveSideTension) {
			location = id;
			nSpokes = n;
			driveSideSpokes = [];
			nonDriveSideSpokes = [];
			for (var i = 0; i < nSpokes; i++) {
				driveSideSpokes.push({
					axis: nSpokes - i,
					value: Math.max(driveSideTension, 0)
				});
				nonDriveSideSpokes.push({
					axis: nSpokes - i,
					value: Math.max(nonDriveSideTension, 0)
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
				var neighbor_l = (i == 0) ? (nSpokes - 1) : (i - 1);
				var neighbor_r = (i + 1) % nSpokes;
				var bisector_neighbors = bisector(tensions[neighbor_l], tensions[neighbor_r], nSpokes);
				if (i % 2 == 0) {
					tensionDS = tensions[i];
					tensionNDS = bisector_neighbors;
				}
				else {
					tensionDS = bisector_neighbors;
					tensionNDS = tensions[i];
				}

				driveSideSpokes[nSpokes - (i + 1)].value = Math.max(tensionDS, 0);
				nonDriveSideSpokes[nSpokes - (i + 1)].value = Math.max(tensionNDS, 0);
			}

			// Actual update
			RadarChart.draw(location, [driveSideSpokes, nonDriveSideSpokes]);
		}
	};
})();

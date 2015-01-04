// A radar chart with state.
// In addition to radar chart's own method 'draw', offers also 'update'.
var tensionChart = (function() {
	'use strict';
	var driveSideSpokes = [], nonDriveSideSpokes = [];
	var location = undefined;
	var nSpokes = undefined;
	
	return {
		init: function(selector, n, driveSideTension, nonDriveSideTension) {
			location = selector;
			nSpokes = n;
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
			if (typeof location === undefined)
				throw Error("tension-chart.js: update() called before init()");
			
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
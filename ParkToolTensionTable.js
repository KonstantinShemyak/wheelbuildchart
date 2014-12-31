var TensionTable = (function() {
	
	// Source: http://www.parktool.com/documents/85161752fcd5df39d15205f80776303d05e6c84c.pdf
	// (linked from http://www.parktool.com/blog/repair-help/wheel-tension-measurement)
	
	var ParkToolTensionTable = {
		"2.3" : {
			22: 54,
			23: 59,
			24: 66,
			25: 73,
			26: 82,
			27: 92,
			28: 104,
			29: 117,
			30: 133,
			31: 151,
			32: 172
		},
		
		"2": {
			17: 53,
			18: 58,
			19: 63,
			20: 70,
			21: 77,
			22: 86,
			23: 96,
			24: 107,
			25: 120,
			26: 135,
			27: 153,
			28: 172
		},
		
		"1.8": {
			14: 53,
			15: 58,
			16: 64,
			17: 70,
			18: 77,
			19: 85,
			20: 94,
			21: 105,
			22: 117,
			23: 131,
			24: 148,
			25: 167
		},
		
		"1.6": {
			11: 54,
			12: 58,
			13: 64,
			14: 70,
			15: 76,
			16: 84,
			17: 93,
			18: 103,
			19: 114,
			20: 128,
			21: 143,
			22: 160
		},
		
		"1.5": {
			9: 52,
			10: 56,
			11: 61,
			12: 66,
			13: 73,
			14: 80,
			15: 88,
			16: 97,
			17: 107,
			18: 119,
			19: 133,
			20: 148,
			21: 166
		}
	};
	
	function interpolate(values, index) {
		if (index in values)
			return values[index];
		if (values.length == 1)
			return values[0];
		
		var sortedKeys = Object.keys(values).sort();
		var nKeys = sortedKeys.length;
		
		var min = sortedKeys[0];
		var max = sortedKeys[nKeys - 1];
		var secondMin = sortedKeys[1];
		var secondMax = sortedKeys[nKeys - 2];
	
		/* Extrapolate: */
		if (index < min)
			return values[min] - (values[secondMin] - values[min]) * (min - index) / (secondMin - min);
		if (index > max)
			return values[max] + (values[max] - values[secondMax]) * (index - max) / (max - secondMax);
		
		/* Interpolate: */
		/* x1 and x2 are the lower and higher neighbors of x in 'values' */
		var x1 = min;
		var x2 = max;
		for (v in values) {
			if (v < index && v > x1)
				x1 = v;
			else if (v > index && v < x2)
				x2 = v;
		}
		var y1 = parseFloat(values[x1]);
		var y2 = parseFloat(values[x2]);
		return y1 + (index - x1) * (y2 - y1) / (x2 - x1);
	}

	/* Interface: */
	return {
		parkToolTension: function(spokeThickness, reading) {
			var lookupTable = ParkToolTensionTable[spokeThickness];
			return interpolate(lookupTable, reading);
		},
		
		getKnownSpokeThickness: function() {
			return Object.keys(ParkToolTensionTable).sort();
		}
	};
})();

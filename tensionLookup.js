var tensionLookup = (function() {

	DEFAULT_TENSOMETER = "ParkTool TM-1";
	tensometer = DEFAULT_TENSOMETER;

	// Source: http://www.parktool.com/documents/85161752fcd5df39d15205f80776303d05e6c84c.pdf
	// (linked from http://www.parktool.com/blog/repair-help/wheel-tension-measurement)

	var tensionTable = {

		"ParkTool TM-1" : {
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
		},

		"Unior": {

			"1.80-1.40-1.80": {
				33: 50,
				34: 55,
				35: 60,
				36: 65,
				37: 70,
				38: 75,
				39: 80,
				40: 90,
				41: 95,
				42: 100,
				43: 110,
				44: 115,
				45: 120,
				46: 130,
				47: 140,
				48: 150,
				49: 165,
				50: 185,
				51: 200
			},

			"2.00-1.50-2.00": {
				36: 50,
				37: 55,
				38: 60,
				39: 65,
				40: 70,
				41: 75,
				42: 80,
				43: 90,
				44: 95,
				45: 100,
				46: 110,
				47: 120,
				48: 130,
				49: 140,
				50: 150,
				51: 165,
				52: 185,
				53: 200
			},

			"2.00-1.65-2.00": {
				40: 50,
				41: 55,
				42: 60,
				43: 65,
				44: 70,
				45: 75,
				46: 80,
				47: 90,
				48: 95,
				49: 100,
				50: 110,
				51: 120,
				52: 130,
				53: 140,
				54: 155,
				55: 175,
				56: 195
			},

			"2.00-1.70-2.00": {
				42: 50,
				43: 55,
				44: 60,
				45: 65,
				46: 70,
				47: 80,
				48: 90,
				49: 95,
				50: 100,
				51: 110,
				52: 120,
				53: 130,
				54: 140,
				55: 155,
				56: 175,
				57: 195
			},

			"2.20-1.80-2.00": {
				44: 50,
				45: 55,
				46: 60,
				47: 65,
				48: 70,
				49: 75,
				50: 85,
				51: 100,
				52: 110,
				53: 120,
				54: 130,
				55: 145,
				56: 160,
				57: 170,
				58: 190
			},

			"2.00-1.80-2.00": {
				43: 50,
				44: 55,
				45: 60,
				46: 65,
				47: 70,
				48: 75,
				49: 80,
				50: 85,
				51: 90,
				52: 100,
				53: 110,
				54: 120,
				55: 135,
				56: 155,
				57: 170,
				58: 180,
				59: 195
			},

			"2.00-2.00-2.00": {
				50: 50,
				51: 55,
				52: 60,
				53: 70,
				54: 80,
				55: 90,
				56: 100,
				57: 110,
				58: 120,
				59: 130,
				60: 145,
				61: 165,
				62: 190
			},

			"2.30-2.00-2.00": {
				51: 50,
				52: 55,
				53: 60,
				54: 70,
				55: 80,
				56: 90,
				57: 100,
				58: 110,
				59: 120,
				60: 130,
				61: 145,
				62: 165,
				63: 185,
				64: 200
			},

			"2.30-2.30-2.30": {
				57: 50,
				58: 60,
				59: 70,
				60: 80,
				61: 90,
				62: 100,
				63: 110,
				64: 120,
				65: 130,
				66: 145,
				67: 170,
				68: 195
			}
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
		if (x1 === x2)
			return x1;

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
		tension: function(spokeThickness, reading) {
			var lookupTable = tensionTable[tensometer][spokeThickness];
			return interpolate(lookupTable, reading);
		},

		getKnownSpokeThickness: function() {
			return Object.keys(tensionTable[tensometer]).sort();
		},

		getTensometers: function() {
			return Object.keys(tensionTable).sort();
		},

		setTensometer: function(t) {
			tensometer = t;
		},

		defaultTensometer: DEFAULT_TENSOMETER
	};
})();

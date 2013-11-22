var normalize = require('path').normalize;

function walk(obj, fn) {
	var value, key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			value = obj[key];
			fn(value, key, obj);
			if (value && typeof value === 'object') {
				walk(value, fn);
			}
		}
	}
}

function normalizeFiles(value, key, obj) {
	switch (key) {
		case 'fullPath':
		case 'relativePath':
		case 'baseDirectory':
		case 'buildDirectory':
			obj[key] = normalize(value);
			break;
		case 'files':
			Object.keys(value).forEach(function (key) {
				var newKey = normalize(key),
					oldVal = value[key];

				delete value[key];

				value[newKey] = oldVal;
			});
			break;
	}
}

module.exports = function (root) {
	walk(root, normalizeFiles);
};

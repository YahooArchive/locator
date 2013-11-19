var normalize = require('path').normalize;

function walk(obj, fn) {
	Object.keys(obj).forEach(function (key) {
		var value = obj[key];
		fn(key, obj);
		if (value && typeof value === 'object') {
			walk(value, fn);
		}
	});
}

function normalizeFiles(value, key, obj) {
	switch (key) {
		case 'fullPath':
		case 'relativePath':
		case 'baseDirectory':
			obj[key] = normalize(value);
			break;
		case 'files':
			Object.keys(value, function (key) {
				var newKey = normalize(key),
					oldVal = value[key];

				delete value[key];

				value[key] = oldVal;
			});
			break;
	}
}

module.exports = function (root) {
	walk(root, normalizeFiles);
};

'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var glob = require('glob');
var _ = require('lodash');
var PluginError = gutil.PluginError;

var PLUGIN_NAME = 'gulp-cdr-inject';

var searchPattern = /<!---?\s*inject:\s+(.*)\s*-?--\s*>\n/gi;
var templates = {
	js: '<script src="{file}"></script>',
	css: '<link href="{file}" rel="stylesheet" type="text/css" />'
};
var includedFiles = null;

function processPatterns(patterns, process) {
	var result = [];
	_.flatten(patterns).forEach(function (pattern) {
		var exclusion = pattern.indexOf('!') === 0;
		if (exclusion) {
			pattern = pattern.slice(1);
		}
		var matches = process(pattern);
		if (exclusion) {
			result = _.difference(result, matches);
		} else {
			result = _.union(result, matches);
		}
	});
	return result;
}

function replacePattern(input, baseDir) {
	var option = JSON.parse('{' + input + '}');
	var tmpl = templates[option.type];
	var files = processPatterns(option.files, function (pattern) {
		return glob.sync(pattern, {
			cwd: baseDir
		});
	});

	if (option.order) {
		var sorted = [];
		files.map(function (f, i) {
			return {
				index: i,
				value: f
			};
		}).sort(function (a, b) {
			var aName = a.value.split('/').pop();
			var bName = b.value.split('/').pop();
			var aIdx = option.order.indexOf(aName);
			var bIdx = option.order.indexOf(bName);
			return aIdx > bIdx ? 1 : -1;
		}).map(function (obj, i) {
			sorted[i] = obj.value;
		});
		files = sorted;
	}
	var out = '';
	files.forEach(function (f) {
		if (includedFiles.indexOf(f) === -1) {
			includedFiles.push(f);
			out += tmpl.replace('{file}', f) + '\n';
		}
	});
	return out;
}

var cdrInject = function (baseDir) {
	baseDir = baseDir || './';

	return through.obj(function (file, enc, cb) {
		if (file.isNull()) {
			this.push(file);
			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
			return cb();
		}

		if (file.isBuffer()) {
			includedFiles = [];
			try {
				file.contents = new Buffer(file.contents.toString().replace(searchPattern, function (match, p0) {
					return replacePattern(p0, baseDir);
				}));
			} catch (err) {
				this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
			}

			this.push(file);
			return cb();
		}

		this.push(file);
		cb();
	});
};

module.exports = cdrInject;
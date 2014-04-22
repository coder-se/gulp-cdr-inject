'use strict';

var cdrInject = require('../index');

var fs = require('fs');
var gutil = require('gulp-util');
var should = require('should');

it('should inject files on a buffer', function (cb) {
	var file = new gutil.File({
		path: 'test/fixtures/test.html',
		cwd: 'test/',
		base: 'test/fixtures',
		contents: fs.readFileSync('test/fixtures/test.html')
	});

	var stream = cdrInject('test/fixtures/');
	stream.on('data', function (newFile) {
		should.exist(newFile);
		should.exist(newFile.contents);
		String(newFile.contents).should.equal(fs.readFileSync('test/expected/default_options.html', 'utf8'));
		cb();
	});

	stream.write(file);
	stream.end();
});
/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it,before */

var join = require('path').join,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = join(__dirname, '../fixtures');


describe('default bundle build dir', function () {
    var fixtureDir = join(fixturesPath, 'touchdown-simple'),
        locator = new BundleLocator({
            applicationDirectory: fixtureDir,
            buildDirectory: 'build'
        }),
        expected = join(fixtureDir + '/build/roster-0.0.1'),
        actual;

    before(function (next) {
        locator.parseBundle(fixtureDir /* NO OPTIONS */).then(function (bundle) {
            actual = bundle;
            next();
        }, next);
    });

    it('parseBundle()', function () {
        expect(actual.bundles.roster.buildDirectory).to.equal(expected);
        expect(locator.ready._resolver._status).to.equal('fulfilled');
    });
});

describe('custom bundle build dir via `parseBundle` option', function () {
    var fixtureDir = join(fixturesPath, 'touchdown-simple'),
        locator = new BundleLocator({
            applicationDirectory: fixtureDir,
            buildDirectory: 'build'
        }),
        options = {
            bundleBuildDirectoryParser: function(bundle) {
                // for build dir name "roster__0-0-1" instead of "roster-0.0.1"
                return bundle.name + '__' + bundle.version.replace(/\./g, '-');
            }
        },
        actual,
        expected = join(fixtureDir + '/build/roster__0-0-1');


    before(function (next) {
        locator.parseBundle(fixtureDir, options).then(function (bundle) {
            actual = bundle;
            next();
        }, next);
    });

    it('parseBundle()', function () {
        expect(actual.bundles.roster.buildDirectory).to.equal(expected);
    });
});

describe('custom bundle build dir via `new Locator` option', function () {
    var fixtureDir = join(fixturesPath, 'touchdown-simple'),
        locator = new BundleLocator({
            applicationDirectory: fixtureDir,
            buildDirectory: 'build',
            bundleBuildDirectoryParser: function(bundle) {
                // for build dir name "roster__0-0-1" instead of "roster-0.0.1"
                return bundle.name + '__' + bundle.version.replace(/\./g, '-');
            }
        }),
        actual,
        expected = join(fixtureDir + '/build/roster__0-0-1');


    before(function (next) {
        locator.parseBundle(fixtureDir /* NO OPTIONS */).then(function (bundle) {
            actual = bundle;
            next();
        }, next);
    });

    it('parseBundle()', function () {
        expect(actual.bundles.roster.buildDirectory).to.equal(expected);
    });
});

describe('_isBuildFile()', function () {
    var fixtureDir = join(fixturesPath, 'touchdown-simple'),
        locator = new BundleLocator({
            applicationDirectory: fixtureDir,
            buildDirectory: 'build'
        });

    it('matches build dir', function () {
        expect(locator._isBuildFile(join(fixtureDir, 'build'))).to.equal(true);
    });

    it('matches file in build dir', function () {
        expect(locator._isBuildFile(join(fixtureDir, 'build/x.js'))).to.equal(true);
    });

    it('skips file with same basename as build dir', function () {
        expect(locator._isBuildFile(join(fixtureDir, 'build.json'))).to.equal(false);
    });
});



var join = require('path').join,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = join(__dirname, '../fixtures');


describe('touchdown-simple', function () {
    var fixtureDir = join(fixturesPath, 'touchdown-simple'),
        locator = new BundleLocator({
            applicationDirectory: fixtureDir,
            buildDirectory: 'build'
        }),
        options = {
            // for build dir name "roster__0-0-1" instead of "roster-0.0.1"
            bundleBuildDirectoryParser: function(bundle) {
                return bundle.name + '__' + bundle.version.replace(/\./g, '-');
            }
        },
        rootHave,
        //rootWant = require(join(fixtureDir, 'expected-locator.js')),
        expected = join(fixtureDir + '/build/roster__0-0-1');


    before(function (next) {
        locator.parseBundle(fixtureDir, options).then(function (bundle) {
            rootHave = bundle;
            next();
        }, next);
    });

    it('parseBundle()', function () {
        expect(rootHave.bundles.roster.buildDirectory).to.equal(expected);
    });
});

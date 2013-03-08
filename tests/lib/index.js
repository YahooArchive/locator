var libpath = require('path'),
    expect = require('chai').expect,
    BundleLocator = require(process.env.COVER_LOCATOR? '../../lib-cov/bundleLocator.js' : '../../lib/bundleLocator.js'),
    Bundle = require(process.env.COVER_LOCATOR? '../../lib-cov/bundle.js' : '../../lib/bundle.js'),
    fixturesPath = libpath.join(__dirname, '../fixtures');


function compareObjects(have, want) {
    expect(typeof have).to.equal(typeof want);
    if ('object' === typeof want) {
        // order of keys doesn't matter
        if (Object.keys(want).length) {
            expect(have).to.have.keys(Object.keys(want));
        }
        if (Object.keys(have).length) {
            expect(want).to.have.keys(Object.keys(have));
        }

        Object.keys(want).forEach(function(key) {
            compareObjects(have[key], want[key]);
        });
    } else {
        expect(have).to.deep.equal(want);
    }
}


describe('BundleLocator', function() {

    describe('parseBundle', function() {

        it('mojito-newsboxes', function(next) {
            var locator = new BundleLocator();
            var options = {};
            locator.parseBundle(libpath.join(fixturesPath, 'mojito-newsboxes'), options, function(err, bundle) {
                if (err) {
                    throw err;
                }
                var want = require(fixturesPath + '/mojito-newsboxes/expected-locator.js');
                compareObjects(bundle, want);
                next();
            });
        });

        it('touchdown-simple', function(next) {
            var locator = new BundleLocator();
            var options = {};
            locator.parseBundle(libpath.join(fixturesPath, 'touchdown-simple'), options, function(err, bundle) {
                if (err) {
                    throw err;
                }
                var want = require(fixturesPath + '/touchdown-simple/expected-locator.js');
                compareObjects(bundle, want);
                next();
            });
        });

    });

});



// TODO COPYRIGHT
/*jslint nomen:true, white:true, node:true */
/*globals describe,it */
"use strict";


var libpath = require('path'),
    expect = require('chai').expect,
    BundleLocator = require(process.env.COVER_LOCATOR? '../../artifacts/lib-cov/bundleLocator.js' : '../../lib/bundleLocator.js'),
    Bundle = require(process.env.COVER_LOCATOR? '../../artifacts/lib-cov/bundle.js' : '../../lib/bundle.js'),
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

    describe('locateBundles', function() {

        it('mojito-newsboxes', function(next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator(),
                options = {};
            locator.locateBundles(fixture, options, function(err) {
                if (err) {
                    throw err;
                }
                var have = locator.getRootBundle();
                var want = require(fixture + '/expected-locator.js');
                compareObjects(have, want);
                next();
            });
        });

        it('touchdown-simple', function(next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator(),
                options = {};
            locator.locateBundles(fixture, options, function(err) {
                if (err) {
                    throw err;
                }
                var have = locator.getRootBundle();
                var want = require(fixture + '/expected-locator.js');
                compareObjects(have, want);
                next();
            });
        });

    });

});



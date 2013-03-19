/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
/*globals describe,it */
"use strict";


var libpath = require('path'),
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    Bundle = require('../../lib/bundle.js'),
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
            locator.parseBundle(fixture, options).then(function(have) {
                var want = require(fixture + '/expected-locator.js'),
                    weather;
                try {
                    weather = locator.getBundle('Weather');
                    compareObjects(have, want);
                    compareObjects(weather, want.bundles.Weather);
                    compareObjects(weather.getResources(), want.bundles.Weather.resources['{}']);
                    compareObjects(weather.getResources({}, 'common'), want.bundles.Weather.resources.common);
                    next();
                } catch (err) {
                    next(err);
                }
            }, function(err) {
                next(err);
            });
        });

        it('touchdown-simple', function(next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator(),
                options = {};
            locator.parseBundle(fixture, options).then(function(have) {
                var want = require(fixture + '/expected-locator.js');
                try {
                    compareObjects(have, want);
                    next();
                } catch (err) {
                    next(err);
                }
            }, function(err) {
                next(err);
            });
        });

    });

});



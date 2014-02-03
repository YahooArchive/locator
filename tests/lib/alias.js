/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it */
'use strict';


var resolve = require('path').resolve,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = resolve(__dirname, '../fixtures');


describe('BundleLocator.parseBundle()', function () {

    it('parseBundle()', function (next) {
        var mojapp = resolve(fixturesPath, 'alias-support'),
            locator = new BundleLocator();

        function onParsed(bundle) {
            //process.stdout.write('\n' + JSON.stringify(bundle, null, 4) + '\n');
            try {
                expect(bundle).to.be.an('object');
                expect(bundle.name).to.equal('alias-support-renamed');
                next();
            } catch (er) {
                next(er);
            }
        }

        locator.parseBundle(mojapp, {}).then(onParsed, next);
    });

});

/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it */
'use strict';


var resolve = require('path').resolve,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = resolve(__dirname, '../fixtures');


describe('tests/lib/alias.js', function () {

    describe('BundleLocator.parseBundle()', function () {

        it('parseBundle()', function () {
            var mojapp = resolve(fixturesPath, 'alias-support'),
                locator = new BundleLocator(),
                bundle = locator.parseBundle(mojapp, {});
            //process.stdout.write('\n' + JSON.stringify(bundle, null, 4) + '\n');
            expect(bundle).to.be.an('object');
            expect(bundle.name).to.equal('alias-support-renamed');
        });

    });

});

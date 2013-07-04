/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it */
'use strict';


var resolve = require('path').resolve,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = resolve(__dirname, '../fixtures');


describe('BundleLocator.parseBundle()', function () {

    it('parseBundle()', function (next) {
        var mojnews = resolve(fixturesPath, 'mojito-newsboxes'),
            locator = new BundleLocator();

        function onParsed(bundle) {
            //process.stdout.write('\n' + JSON.stringify(bundle, null, 4) + '\n');
            var json = JSON.stringify(bundle, null, 4);//,
                //bnames = ['Shelf', 'Weather', 'modown', 'modown-lib-read'];

            try {
                expect(bundle).to.be.an('object');
                //expect(Object.keys(bundle.bundles).sort()).to.equal(bnames);
                expect(json.match(/node_modules/g).length).to.equal(31);
                expect(json.indexOf('foo') > -1).to.equal(false);
                next();
            } catch (er) {
                next(er);
            }
        }

        locator.parseBundle(mojnews, {}).then(onParsed, next);
    });

});

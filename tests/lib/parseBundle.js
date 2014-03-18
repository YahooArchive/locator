/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it */
'use strict';


var resolve = require('path').resolve,
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = resolve(__dirname, '../fixtures');


describe('BundleLocator.parseBundle()', function () {

    it('parseBundle()', function () {
        var mojnews = resolve(fixturesPath, 'mojito-newsboxes'),
            locator = new BundleLocator({
                exclude: ['build']
            }),
            bnames = ['Shelf', 'Weather', 'modown', 'modown-lib-read'],
            bundle, json;

        bundle = locator.parseBundle(mojnews, {});

        //process.stdout.write('\n' + JSON.stringify(bundle, null, 4) + '\n');
        json = JSON.stringify(bundle, null, 4);//,

        expect(bundle).to.be.an('object');
        expect(Object.keys(bundle.bundles).sort().join(',')).to.equal(bnames.sort().join(','));
        expect(json.match(/node_modules/g).length).to.equal(31);
        expect(json.indexOf('foo') > -1).to.equal(false);
    });


    describe('options.exclude[]', function () {
        var fixtureDir = resolve(fixturesPath, 'touchdown-simple'),
            locator = new BundleLocator({
                applicationDirectory: fixtureDir,
                exclude: ['build']
            }),
            bundle = locator.parseBundle(fixtureDir);

        Object.keys(bundle.files).forEach(function (file){
            expect(file.indexOf('/build/'), -1);
        });
    });

});

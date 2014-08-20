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
            var app = resolve(fixturesPath, 'jsnext'),
                locator = new BundleLocator({
                    rulesetFn: function (bundle) {
                        if (bundle.name === 'jsnext-support') {
                            return {
                                jsnext: {
                                    regex: /^src\/([a-z_\-]+)\.js$/i
                                }
                            };
                        }
                    }
                }),
                bundle = locator.parseBundle(app, {}),
                ress = locator.getBundleResources(bundle.name, {types: "jsnext"});
            // process.stdout.write('\n' + JSON.stringify(ress, null, 4) + '\n');
            expect(bundle).to.be.an('object');
            expect(bundle.name).to.equal('jsnext-support');
            expect(ress.length).to.equal(1);
            expect(ress[0].relativePath).to.equal('src/mod.js');
        });

    });

});

/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it,before */
"use strict";


var libpath       = require('path'),
    expect        = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath  = libpath.join(__dirname, '../fixtures'),
    normalize     = libpath.normalize;


function compareObjects(have, want, path) {
    path = path || 'obj';
    expect(typeof have).to.equal(typeof want);
    if ('object' === typeof want) {
        // order of keys doesn't matter
        expect(Object.keys(have).sort()).to.deep.equal(Object.keys(want).sort());

        Object.keys(want).forEach(function (key) {
            compareObjects(have[key], want[key], path + '.' + key);
        });
    } else {
        expect(have).to.deep.equal(want);
    }
}


describe('tests/lib/index.js: BundleLocator', function () {

    describe('mojito-newsboxes', function () {

        var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
            locator = new BundleLocator({
                exclude: ['build']
            }),
            options = {},
            rootHave,
            rootWant = require(fixture + '/expected-locator.js');

        before(function () {
            rootHave = locator.parseBundle(fixture, options);
        });

        it('parseBundle()', function () {
            var read = locator.getBundle('Read');
            compareObjects(rootHave, rootWant);
            compareObjects(read, rootWant.bundles['modown-lib-read'].bundles.Read);
            compareObjects(read.getResources(), rootWant.bundles['modown-lib-read'].bundles.Read.resources['{}']);
            compareObjects(read.getResources({}, 'common'), rootWant.bundles['modown-lib-read'].bundles.Read.resources.common);
            expect(locator.getRootBundle().name).to.equal('modown-newsboxes');
        });

        it('getAllResources()', function () {
            var ress = locator.getAllResources({extensions: 'js'});
            expect(ress.length).to.equal(10);
            ress.forEach(function (res) {
                if ('Read' === res.bundleName && normalize('controller.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources.common.controllers.controller);
                    return;
                }
                if ('Read' === res.bundleName && normalize('models/rss.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources.common.models.rss);
                    return;
                }
                if ('Read' === res.bundleName && normalize('views/index.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources['{}'].views.index);
                    return;
                }
                if ('Shelf' === res.bundleName && normalize('controller.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Shelf.resources.common.controllers.controller);
                    return;
                }
                if ('Shelf' === res.bundleName && normalize('views/index.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Shelf.resources['{}'].views.index);
                    return;
                }
                if ('Weather' === res.bundleName && normalize('controller.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Weather.resources.common.controllers.controller);
                    return;
                }
                if ('Weather' === res.bundleName && normalize('models/YqlWeatherModel.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Weather.resources.common.models.YqlWeatherModel);
                    return;
                }
                if ('modown' === res.bundleName && normalize('middleware/modown-contextualizer.js') === res.relativePath) {
                    compareObjects(res, rootWant.bundles.modown.resources['{}'].middleware['modown-contextualizer']);
                    return;
                }
                if ('modown-newsboxes' === res.bundleName && normalize('middleware/debug.js') === res.relativePath) {
                    compareObjects(res, rootWant.resources['{}'].middleware.debug);
                    return;
                }
                if ('modown-newsboxes' === res.bundleName && normalize('models/flickr.common.js') === res.relativePath) {
                    compareObjects(res, rootWant.resources.common.models.flickr);
                    return;
                }
            });
        });

        it('getBundleNames()', function () {
            var have = locator.getBundleNames(),
                want = ['Read', 'Shelf', 'Weather', 'modown', 'modown-lib-read', 'modown-newsboxes'];
            have.sort();
            expect(have).to.deep.equal(want);
        });

        it('getBundleNames() : filter by bundleName', function () {
            var have,
                want = ['modown-lib-read', 'modown-newsboxes'];

            have = locator.getBundleNames(function (bundle) {
                if (bundle.name && /^modown-/.test(bundle.name)) {
                    return true;
                }
                return false;
            });

            have.sort();
            expect(have).to.deep.equal(want);
        });

        // for use case where application need to filter on a specific
        // property of package.json
        it('getBundleNames() : filter by pkgJSON property', function () {
            var have,
                want = ['modown-lib-read'];

            have = locator.getBundleNames(function (bundle) {
                var match = false,
                    pkgJSON;

                try {
                    pkgJSON = require(libpath.resolve(
                        bundle.baseDirectory,
                        'package.json'
                    ));
                } catch (e) {
                    pkgJSON = undefined;
                }
                if (pkgJSON && /^Not A One/.test(pkgJSON.author) &&
                        "modown-lib-read" === pkgJSON.name) {
                    match = true;
                }
                return match;
            });

            have.sort();
            expect(have).to.deep.equal(want);
        });

        it('getBundleFiles() : filter in bundle', function (next) {
            var files;
            try {
                files = locator.getBundleFiles('Shelf', {extensions: 'js'});
                // order doesn't matter, since it depends on how the filesystem is walked
                files.sort();
                expect(files.length).to.equal(2);
                expect(files).to.contain(libpath.join(fixture, 'mojits/Shelf/controller.common.js'));
                expect(files).to.contain(libpath.join(fixture, 'mojits/Shelf/views/index.js'));

                files = locator.getBundleFiles('Read', {extensions: 'css'});
                // order doesn't matter, since it depends on how the filesystem is walked
                files.sort();
                expect(files.length).to.equal(2);
                expect(files).to.contain(libpath.join(fixture, 'node_modules/@scope/modown-lib-read/mojits/Read/assets/read.css'));
                expect(files).to.contain(libpath.join(fixture, 'node_modules/@scope/modown-lib-read/mojits/Read/assets/read.opera-mini.css'));

                next();
            } catch (err) {
                next(err);
            }
        });

        it('getBundleResources() : filter in bundle', function (next) {
            var ress;
            try {
                ress = locator.getBundleResources('Shelf', {types: 'templates'});
                // order doesn't matter, since it depends on how the filesystem is walked
                ress.sort(function (a, b) {
                    return a.fullPath.localeCompare(b.fullPath);
                });
                expect(ress.length).to.equal(2);
                expect(ress[0]).to.be.an('object');
                expect(ress[0].bundleName).to.equal('Shelf');
                expect(ress[0].type).to.equal('templates');
                expect(ress[0].fullPath).to.equal(libpath.join(fixture, 'mojits/Shelf/templates/index.hb.html'));
                expect(ress[1]).to.be.an('object');
                expect(ress[1].bundleName).to.equal('Shelf');
                expect(ress[1].type).to.equal('templates');
                expect(ress[1].fullPath).to.equal(libpath.join(fixture, 'mojits/Shelf/templates/index.opera-mini.hb.html'));

                ress = locator.getBundleResources('Read', {extensions: 'css'});
                // order doesn't matter, since it depends on how the filesystem is walked
                ress.sort(function (a, b) {
                    return a.fullPath.localeCompare(b.fullPath);
                });
                expect(ress.length).to.equal(2);
                expect(ress[0]).to.be.an('object');
                expect(ress[0].bundleName).to.equal('Read');
                expect(ress[0].ext).to.equal('css');
                expect(ress[0].fullPath).to.equal(libpath.join(fixture, 'node_modules/@scope/modown-lib-read/mojits/Read/assets/read.css'));
                expect(ress[1]).to.be.an('object');
                expect(ress[1].bundleName).to.equal('Read');
                expect(ress[1].ext).to.equal('css');
                expect(ress[1].fullPath).to.equal(
                    libpath.join(fixture, 'node_modules/@scope/modown-lib-read/mojits/Read/assets/read.opera-mini.css')
                );
                next();
            } catch (err) {
                next(err);
            }
        });

        it('_getBundleNameByPath()', function () {
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather'))).to.equal('Weather');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather/controller.common.js'))).to.equal('Weather');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits'))).to.equal('modown-newsboxes');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/'))).to.equal('modown-newsboxes');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'models/flickr.common.js'))).to.equal('modown-newsboxes');
            expect(locator._getBundleNameByPath(fixture)).to.equal('modown-newsboxes');
        });
    });


    describe('touchdown-simple', function () {
        var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
            locator = new BundleLocator({
                applicationDirectory: fixture,
                exclude: ['build']
            }),
            options = {},
            rootHave,
            rootWant = require(fixture + '/expected-locator.js');

        before(function () {
            rootHave = locator.parseBundle(fixture, options);
        });

        it('parseBundle()', function () {
            compareObjects(rootHave, rootWant);
        });

    });

    describe('package handling', function () {

        it('_makeBundleSeed()', function () {
            var locator = new BundleLocator(),
                seed;

            seed = locator._makeBundleSeed('foo', 'bar', 'baz');
            expect(seed).to.be.an('object');
            expect(seed.baseDirectory).to.equal('foo');
            expect(seed.name).to.equal('bar');
            expect(seed.version).to.equal('baz');
            expect(seed.options).to.be.an('undefined');

            seed = locator._makeBundleSeed('foo', 'bar', 'baz', {name: 'orange', version: 'red'});
            expect(seed).to.be.an('object');
            expect(seed.baseDirectory).to.equal('foo');
            expect(seed.name).to.equal('orange');
            expect(seed.version).to.equal('red');
            expect(seed.options).to.be.an('undefined');

            seed = locator._makeBundleSeed('foo', 'bar', 'baz', {
                name: 'orange',
                version: 'red',
                locator: {
                    ruleset: 'x'
                }
            });
            expect(seed).to.be.an('object');
            expect(seed.baseDirectory).to.equal('foo');
            expect(seed.name).to.equal('orange');
            expect(seed.version).to.equal('red');
            expect(seed.options).to.be.an('object');
            expect(seed.options.ruleset).to.equal('x');

            seed = locator._makeBundleSeed('foo', 'bar', 'baz', {
                name: 'orange',
                version: 'red',
                locator: {
                    ruleset: 'x'
                }
            }, {
                ruleset: 'y'
            });
            expect(seed).to.be.an('object');
            expect(seed.baseDirectory).to.equal('foo');
            expect(seed.name).to.equal('orange');
            expect(seed.version).to.equal('red');
            expect(seed.options).to.be.an('object');
            expect(seed.options.ruleset).to.equal('x');

            seed = locator._makeBundleSeed('foo', 'bar', 'baz', undefined, {
                ruleset: 'y'
            });
            expect(seed).to.be.an('object');
            expect(seed.baseDirectory).to.equal('foo');
            expect(seed.name).to.equal('bar');
            expect(seed.version).to.equal('baz');
            expect(seed.options).to.be.an('object');
            expect(seed.options.ruleset).to.equal('y');
        });

        it('_walkNPMTree()', function (next) {
            var fixture = libpath.join(fixturesPath, 'walk-packages'),
                locator = new BundleLocator({
                    maxPackageDepth: 2
                }),
                have = locator._walkNPMTree(fixture);
            try {
                expect(have).to.be.an('array');
                expect(have.length).to.equal(6);
                have.forEach(function (seed) {
                    expect(seed.options).to.be.an('object');
                    switch (seed.baseDirectory) {
                    case fixture:
                        expect(seed.npmDepth).to.equal(0);
                        expect(seed.name).to.equal('app');
                        expect(seed.options.ruleset).to.be.an('undefined');
                        break;

                    case libpath.join(fixture, 'node_modules', 'depth-different'):
                        expect(seed.npmDepth).to.equal(1);
                        expect(seed.name).to.equal('depth-different');
                        expect(seed.version).to.equal('0.1.0');
                        expect(seed.options.ruleset).to.equal('foo');
                        break;

                    case libpath.join(fixture, 'node_modules', 'middle'):
                        expect(seed.npmDepth).to.equal(1);
                        expect(seed.name).to.equal('middle');
                        expect(seed.version).to.equal('0.0.1');
                        expect(seed.options.ruleset).to.equal('foo');
                        break;

                    case libpath.join(fixture, 'node_modules', 'skip-a'):
                        throw new Error('FAILURE -- should skip "skip-a"');

                    case libpath.join(fixture, 'node_modules', 'skip-b'):
                        throw new Error('FAILURE -- should skip "skip-b"');

                    case libpath.join(fixture, 'node_modules', 'middle', 'node_modules', 'depth-different'):
                        expect(seed.npmDepth).to.equal(2);
                        expect(seed.name).to.equal('depth-different');
                        expect(seed.version).to.equal('0.2.0');
                        expect(seed.options.ruleset).to.equal('foo');
                        break;

                    case libpath.join(fixture, 'node_modules', 'skip-a', 'node_modules', 'depth-same'):
                        expect(seed.npmDepth).to.equal(2);
                        expect(seed.name).to.equal('depth-same');
                        expect(seed.version).to.equal('0.1.0');
                        expect(seed.options.ruleset).to.equal('foo');
                        break;

                    case libpath.join(fixture, 'node_modules', 'skip-b', 'node_modules', 'depth-same'):
                        expect(seed.npmDepth).to.equal(2);
                        expect(seed.name).to.equal('depth-same');
                        expect(seed.version).to.equal('0.2.0');
                        expect(seed.options.ruleset).to.equal('foo');
                        break;

                    case libpath.join(fixture, 'node_modules', 'skip-b', 'node_modules', 'depth-same', 'node_modules', 'depth-max'):
                        throw new Error('FAILURE -- did not honor maxPackageDepth');

                    default:
                        throw new Error('FAILURE -- extra package ' + seed.baseDirectory);
                    }
                });
                next();
            } catch (err) {
                next(err);
            }
        });

        it('_filterBundleSeeds()', function () {
            var fixture = libpath.join(fixturesPath, 'walk-packages'),
                locator = new BundleLocator({
                    maxPackageDepth: 2
                }),
                have = locator._walkNPMTree(fixture);
            have = locator._filterBundleSeeds(have);
            expect(have).to.be.an('array');
            expect(have.length).to.equal(4);
            have.forEach(function (seed) {
                expect(seed.options).to.be.an('object');
                switch (seed.baseDirectory) {
                case fixture:
                    expect(seed.npmDepth).to.equal(0);
                    expect(seed.name).to.equal('app');
                    break;

                case libpath.join(fixture, 'node_modules', 'depth-different'):
                    expect(seed.npmDepth).to.equal(1);
                    expect(seed.name).to.equal('depth-different');
                    expect(seed.version).to.equal('0.1.0');
                    break;

                case libpath.join(fixture, 'node_modules', 'middle'):
                    expect(seed.npmDepth).to.equal(1);
                    expect(seed.name).to.equal('middle');
                    expect(seed.version).to.equal('0.0.1');
                    break;

                case libpath.join(fixture, 'node_modules', 'skip-a'):
                    throw new Error('FAILURE -- should skip "skip-a"');

                case libpath.join(fixture, 'node_modules', 'skip-b'):
                    throw new Error('FAILURE -- should skip "skip-b"');

                case libpath.join(fixture, 'node_modules', 'skip-b', 'node_modules', 'depth-same'):
                    expect(seed.npmDepth).to.equal(2);
                    expect(seed.name).to.equal('depth-same');
                    expect(seed.version).to.equal('0.2.0');
                    break;

                case libpath.join(fixture, 'node_modules', 'skip-b', 'node_modules', 'depth-same', 'node_modules', 'depth-max'):
                    throw new Error('FAILURE -- did not honor maxPackageDepth');

                default:
                    throw new Error('FAILURE -- extra package ' + seed.baseDirectory);
                }
            });
        });


        it('_dedupeSeeds()', function () {
            var locator = new BundleLocator(),
                r;
            r = locator._dedupeSeeds({
                '1': [{
                    baseDirectory: 'tests/fixtures/walk-packages/node_modules/middle',
                    name: 'middle',
                    version: '0.0.1',
                    npmDepth: 1
                }]
            });
            expect(r.version).to.equal('0.0.1');

            r = locator._dedupeSeeds({
                '2': [{
                    baseDirectory: 'tests/fixtures/walk-packages/node_modules/skip-a/node_modules/depth-same',
                    name: 'depth-same',
                    version: '0.1.0',
                    npmDepth: 2
                }, {
                    baseDirectory: 'tests/fixtures/walk-packages/node_modules/skip-b/node_modules/depth-same',
                    name: 'depth-same',
                    version: '0.2.0',
                    npmDepth: 2
                }]
            });
            expect(r.version).to.equal('0.2.0');

            r = locator._dedupeSeeds({
                '1': [{
                    baseDirectory: 'tests/fixtures/walk-packages/node_modules/depth-different',
                    name: 'depth-different',
                    version: '0.1.0',
                    npmDepth: 1
                }],
                '2': [{
                    baseDirectory: 'tests/fixtures/walk-packages/node_modules/middle/node_modules/depth-different',
                    name: 'depth-different',
                    version: '0.2.0',
                    npmDepth: 2
                }]
            });
            expect(r.version).to.equal('0.1.0');

            r = locator._dedupeSeeds({
                '0': [{
                    baseDirectory: 'tests/fixtures/walk-packages',
                    name: 'app',
                    version: '0.0.1',
                    options: {},
                    npmDepth: 0
                }]
            });
            expect(r.version).to.equal('0.0.1');
        });

        it('_loadRuleset()', function () {
            var fixture = libpath.join(fixturesPath, 'rulesets'),
                locator = new BundleLocator(),
                ruleset;

            locator._rootDirectory = fixture;

            ruleset = locator._loadRuleset({});
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('main');

            ruleset = locator._loadRuleset({options: {ruleset: 'main'}});
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('main');

            ruleset = locator._loadRuleset({
                options: {
                    rulesets: libpath.join(__dirname, '..', '..', 'lib', 'rulesets')
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('main');

            ruleset = locator._loadRuleset({options: {ruleset: 'foo'}});
            expect(ruleset).to.be.an('undefined');

            ruleset = locator._loadRuleset({
                baseDirectory: libpath.join(fixture, 'node_modules', 'pkg-local'),
                options: {
                    ruleset: 'rules-local-foo',
                    rulesets: 'rules-local'
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('rules-local-foo');

            ruleset = locator._loadRuleset({
                baseDirectory: libpath.join(fixture, 'node_modules', 'pkg-app'),
                options: {
                    ruleset: 'rules-app-foo',
                    rulesets: 'rules-app'
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('rules-app-foo');

            ruleset = locator._loadRuleset({
                baseDirectory: libpath.join(fixture, 'node_modules', 'pkg-dep'),
                options: {
                    ruleset: 'rules-dep-foo',
                    rulesets: 'dep/rules-dep'
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('rules-dep-foo');

            ruleset = locator._loadRuleset({
                baseDirectory: libpath.join(fixture, 'node_modules', 'pkg-fw-a'),
                options: {
                    ruleset: 'rules-fw-foo',
                    rulesets: 'fw/rules-fw'
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('rules-fw-foo');

            ruleset = locator._loadRuleset({
                baseDirectory: libpath.join(fixture, 'node_modules', 'skip', 'node_modules', 'pkg-fw-b'),
                options: {
                    ruleset: 'rules-fw-foo',
                    rulesets: 'fw/rules-fw'
                }
            });
            expect(ruleset).to.be.an('object');
            expect(ruleset._name).to.equal('rules-fw-foo');
        });

    });


    describe('filters', function () {

        it('_filterResource() with empty filter', function () {
            var locator = new BundleLocator(),
                res = {ext: 'js', type: 'foo'};

            expect(locator._filterResource(res)).to.equal(true);
            expect(locator._filterResource(res), null).to.equal(true);
            expect(locator._filterResource(res), false).to.equal(true);
            expect(locator._filterResource(res), []).to.equal(true);
            expect(locator._filterResource(res), true).to.equal(true);
            expect(locator._filterResource(res), {}).to.equal(true);
            expect(locator._filterResource(res), undefined).to.equal(true);
        });

        it('_filterResource() with filter', function () {
            var locator = new BundleLocator(),
                res = {ext: 'js', type: 'foo'};

            expect(locator._filterResource(res, {extensions: 'js'})).to.equal(true);
            expect(locator._filterResource(res, {extensions: 'css'})).to.equal(false);
            expect(locator._filterResource(res, {extensions: ''})).to.equal(false);
            expect(locator._filterResource(res, {extensions: false})).to.equal(false);
            expect(locator._filterResource(res, {extensions: null})).to.equal(false);
            expect(locator._filterResource(res, {extensions: undefined})).to.equal(false);

            expect(locator._filterResource(res, {types: 'foo'})).to.equal(true);
            expect(locator._filterResource(res, {types: 'foobar'})).to.equal(false);
            expect(locator._filterResource(res, {types: ''})).to.equal(false);
            expect(locator._filterResource(res, {types: false})).to.equal(false);
            expect(locator._filterResource(res, {types: null})).to.equal(false);
            expect(locator._filterResource(res, {types: undefined})).to.equal(false);

            expect(locator._filterResource(res, {extensions: 'js',  types: 'foo'})).to.equal(true);
            expect(locator._filterResource(res, {extensions: 'js',  types: 'bar', more: 1})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'js',  types: 'bar'})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'css', types: 'foo'})).to.equal(false);

            expect(locator._filterResource(res, {foo: 'bar'})).to.equal(false);
        });

    });

});

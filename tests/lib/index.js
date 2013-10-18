/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true, rexexp:true */
/*global describe,it,before */
"use strict";


var libpath     = require('path'),
    libfs       = require('fs'),
    libasync    = require('async'),
    mockery = require('mockery'),
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
    fixturesPath = libpath.join(__dirname, '../fixtures');


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


describe('BundleLocator', function () {


    describe('mojito-newsboxes', function () {
        var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
            locator = new BundleLocator(),
            options = {},
            rootHave,
            rootWant = require(fixture + '/expected-locator.js');

        before(function (next) {
            locator.parseBundle(fixture, options).then(function (have) {
                rootHave = have;
                next();
            }, next);
        });

        it('parseBundle()', function () {
            var read = locator.getBundle('Read');
            compareObjects(rootHave, rootWant);
            compareObjects(read, rootWant.bundles['modown-lib-read'].bundles.Read);
            compareObjects(read.getResources(), rootWant.bundles['modown-lib-read'].bundles.Read.resources['{}']);
            compareObjects(read.getResources({}, 'common'), rootWant.bundles['modown-lib-read'].bundles.Read.resources.common);
            expect(locator.getRootBundle().name).to.equal('modown-newsboxes');
        });

        it('listAllResources()', function () {
            var ress = locator.listAllResources({extensions: 'js'});
            expect(ress.length).to.equal(10);
            ress.forEach(function (res) {
                if ('Read' === res.bundleName && 'controller.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources.common.controllers.controller);
                    return;
                }
                if ('Read' === res.bundleName && 'models/rss.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources.common.models.rss);
                    return;
                }
                if ('Read' === res.bundleName && 'views/index.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles['modown-lib-read'].bundles.Read.resources['{}'].views.index);
                    return;
                }
                if ('Shelf' === res.bundleName && 'controller.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Shelf.resources.common.controllers.controller);
                    return;
                }
                if ('Shelf' === res.bundleName && 'views/index.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Shelf.resources['{}'].views.index);
                    return;
                }
                if ('Weather' === res.bundleName && 'controller.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Weather.resources.common.controllers.controller);
                    return;
                }
                if ('Weather' === res.bundleName && 'models/YqlWeatherModel.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles.Weather.resources.common.models.YqlWeatherModel);
                    return;
                }
                if ('modown' === res.bundleName && 'middleware/modown-contextualizer.js' === res.relativePath) {
                    compareObjects(res, rootWant.bundles.modown.resources['{}'].middleware['modown-contextualizer']);
                    return;
                }
                if ('modown-newsboxes' === res.bundleName && 'middleware/debug.js' === res.relativePath) {
                    compareObjects(res, rootWant.resources['{}'].middleware.debug);
                    return;
                }
                if ('modown-newsboxes' === res.bundleName && 'models/flickr.common.js' === res.relativePath) {
                    compareObjects(res, rootWant.resources.common.models.flickr);
                    return;
                }
            });
        });

        it('listBundleNames()', function () {
            var have = locator.listBundleNames(),
                want = ['Read', 'Shelf', 'Weather', 'modown', 'modown-lib-read', 'modown-newsboxes'];
            have.sort();
            expect(have).to.deep.equal(want);
        });

        it('listBundleNames() : filter by bundleName', function () {
            var have,
                want = ['modown-lib-read', 'modown-newsboxes'];

            have = locator.listBundleNames(function (bundle) {
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
        it('listBundleNames() : filter by pkgJSON property', function () {
            var have,
                want = ['modown-lib-read'];

            have = locator.listBundleNames(function (bundle) {
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

        it('_getBundleNameByPath()', function () {
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather'))).to.equal('Weather');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather/x'))).to.equal('Weather');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather2'))).to.equal('modown-newsboxes');
            expect(locator._getBundleNameByPath(libpath.join(fixture, 'mojits/Weather2/x'))).to.equal('modown-newsboxes');
        });
    });


    describe('touchdown-simple', function () {
        var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: 'build'
            }),
            options = {},
            rootHave,
            rootWant = require(fixture + '/expected-locator.js');

        before(function (next) {
            locator.parseBundle(fixture, options).then(function (bundle) {
                rootHave = bundle;
                next();
            }, next);
        });

        it('parseBundle()', function () {
            compareObjects(rootHave, rootWant);
        });

    });


    describe('plugins', function () {

        it('_filterResource()', function () {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator({
                    applicationDirectory: fixture,
                    buildDirectory: 'build'
                }),
                res;

            res = {
                type: 'controller',
                ext: 'js'
            };
            expect(locator._filterResource(res)).to.equal(false);
            expect(locator._filterResource(res, {})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'js'})).to.equal(true);
            expect(locator._filterResource(res, {extensions: ['js', 'orange']})).to.equal(true);
            expect(locator._filterResource(res, {extensions: 'orange'})).to.equal(false);
            expect(locator._filterResource(res, {types: 'controller'})).to.equal(true);
            expect(locator._filterResource(res, {types: ['controller', 'red']})).to.equal(true);
            expect(locator._filterResource(res, {types: 'red'})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'js', types: 'controller'})).to.equal(true);
            expect(locator._filterResource(res, {extensions: 'orange', types: 'controller'})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'js', types: 'red'})).to.equal(false);
            expect(locator._filterResource(res, {extensions: 'orange', types: 'red'})).to.equal(false);
            expect(locator._filterResource({ext: ''}, {extensions: 'orange'})).to.equal(false);
        });


        it('_objectExclude()', function () {
            var locator = new BundleLocator(),
                src = {a: 'aaa', b: 'bbb', c: 'ccc'};
            compareObjects(locator._objectExclude(src, []), src);
            compareObjects(locator._objectExclude(src, ['a']), {b: 'bbb', c: 'ccc'});
            compareObjects(locator._objectExclude(src, ['b']), {a: 'aaa', c: 'ccc'});
            compareObjects(locator._objectExclude(src, ['a', 'b']), {c: 'ccc'});
            compareObjects(locator._objectExclude(src, ['a', 'c']), {b: 'bbb'});
            compareObjects(locator._objectExclude(src, ['b', 'c']), {a: 'aaa'});
            compareObjects(locator._objectExclude(src, ['a', 'c', 'b']), {});
        });


        it('api.getBundle()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();
            locator.parseBundle(fixture).then(function () {
                var bundle;
                try {
                    bundle = locator._pluginAPI.getBundle('Shelf');
                    expect(bundle).to.be.an('object');
                    expect(bundle.name).to.equal('Shelf');
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });


        it('api.getBundleFiles()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();
            locator.parseBundle(fixture).then(function () {
                var files;
                try {
                    files = locator._pluginAPI.getBundleFiles('Shelf', {extensions: 'js'});
                    // order doesn't matter, since it depends on how the filesystem is walked
                    files.sort();
                    expect(files.length).to.equal(2);
                    expect(files).to.contain(libpath.join(fixture, 'mojits/Shelf/controller.common.js'));
                    expect(files).to.contain(libpath.join(fixture, 'mojits/Shelf/views/index.js'));

                    files = locator._pluginAPI.getBundleFiles('Read', {extensions: 'css'});
                    // order doesn't matter, since it depends on how the filesystem is walked
                    files.sort();
                    expect(files.length).to.equal(2);
                    expect(files).to.contain(libpath.join(fixture, 'node_modules/modown-lib-read/mojits/Read/assets/read.css'));
                    expect(files).to.contain(libpath.join(fixture, 'node_modules/modown-lib-read/mojits/Read/assets/read.opera-mini.css'));

                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });

        it('api.getRootBundleName()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();

            locator.parseBundle(fixture).then(function () {
                var rootBundleName;
                try {
                    rootBundleName = locator._pluginAPI.getRootBundleName();
                    expect(rootBundleName).to.equal('modown-newsboxes');
                    next();

                } catch (err) {
                    next(err);
                }
            }, next);
        });


        it('api.getBundleResources()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();
            locator.parseBundle(fixture).then(function () {
                var ress;
                try {
                    ress = locator._pluginAPI.getBundleResources('Shelf', {types: 'templates'});
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

                    ress = locator._pluginAPI.getBundleResources('Read', {extensions: 'css'});
                    // order doesn't matter, since it depends on how the filesystem is walked
                    ress.sort(function (a, b) {
                        return a.fullPath.localeCompare(b.fullPath);
                    });
                    expect(ress.length).to.equal(2);
                    expect(ress[0]).to.be.an('object');
                    expect(ress[0].bundleName).to.equal('Read');
                    expect(ress[0].ext).to.equal('css');
                    expect(ress[0].fullPath).to.equal(libpath.join(fixture, 'node_modules/modown-lib-read/mojits/Read/assets/read.css'));
                    expect(ress[1]).to.be.an('object');
                    expect(ress[1].bundleName).to.equal('Read');
                    expect(ress[1].ext).to.equal('css');
                    expect(ress[1].fullPath).to.equal(libpath.join(fixture, 'node_modules/modown-lib-read/mojits/Read/assets/read.opera-mini.css'));
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });


        it('basics', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator({
                    applicationDirectory: fixture,
                    buildDirectory: 'build'
                }),
                options = {},
                fileCalls = {},     // relative path: array of calls
                resourceCalls = {}, // relative path: array of calls
                bundleCalls = {},
                pluginJSON,
                pluginDefault,
                pluginAll,
                bundlesWithfileUpdated = {};

            pluginJSON = {
                fileCalls: 0,
                resourceCalls: 0,
                describe: {
                    extensions: 'js'
                },
                fileUpdated: function (evt) {
                    bundlesWithfileUpdated[evt.bundle.name] = true;
                    pluginJSON.fileCalls += 1;
                    if (!fileCalls[evt.file.relativePath]) {
                        fileCalls[evt.file.relativePath] = [];
                    }
                    fileCalls[evt.file.relativePath].push('js');
                },
                resourceUpdated: function (evt) {
                    pluginJSON.resourceCalls += 1;
                    if (!resourceCalls[evt.resource.relativePath]) {
                        resourceCalls[evt.resource.relativePath] = [];
                    }
                    resourceCalls[evt.resource.relativePath].push('js');
                }
            };
            locator.plug(pluginJSON);

            pluginDefault = {
                calls: 0,
                describe: {
                    extensions: 'css,dust'
                },
                resourceUpdated: function (evt, api) {
                    pluginDefault.calls += 1;
                    if (!resourceCalls[evt.resource.relativePath]) {
                        resourceCalls[evt.resource.relativePath] = [];
                    }
                    resourceCalls[evt.resource.relativePath].push('default');
                    return api.promise(function (fulfill) {
                        fulfill();
                    });
                },
                bundleUpdated: function (evt) {
                    if (!bundleCalls[evt.bundle.name]) {
                        bundleCalls[evt.bundle.name] = 0;
                    }
                    bundleCalls[evt.bundle.name] += 1;
                }
            };
            locator.plug(pluginDefault);

            pluginAll = {
                calls: 0,
                resourceUpdated: function (evt, api) {
                    pluginAll.calls += 1;
                    if (!resourceCalls[evt.resource.relativePath]) {
                        resourceCalls[evt.resource.relativePath] = [];
                    }
                    resourceCalls[evt.resource.relativePath].push('all');
                    return api.promise(function (fulfill) {
                        fulfill();
                    });
                }
            };
            locator.plug(pluginAll);

            locator.parseBundle(fixture, options).then(function (have) {
                var want = require(fixture + '/expected-locator.js');
                try {
                    compareObjects(bundlesWithfileUpdated, {
                        "roster": true,
                        "simple": true
                    });
                    compareObjects(have, want);
                    expect(pluginJSON.fileCalls).to.equal(11);
                    expect(pluginJSON.resourceCalls).to.equal(8);
                    expect(pluginDefault.calls).to.equal(2);
                    expect(pluginAll.calls).to.equal(0);
                    // sample a couple to make sure that plugins were called in registration order
                    expect(resourceCalls['controllers/teamManager.js']).to.deep.equal(['js']);
                    expect(resourceCalls['templates/roster.dust']).to.deep.equal(['default']);
                    expect(Object.keys(bundleCalls).length).to.equal(2);
                    expect(bundleCalls.simple).to.equal(1);
                    expect(bundleCalls.roster).to.equal(1);
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });


        it('create file during resourceUpdated', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {},
                jslint,
                mockfs,
                mkdirs = [],
                writes = [],
                updates = [],
                bundleCalls = {};

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            mockfs = {
                readdir: libfs.readdir,
                stat: function (path, callback) {
                    if (path.indexOf('plugin.sel') > 0) {
                        callback(null, {fake: 'stat'});
                        return;
                    }
                    return libfs.stat(path, callback);
                },
                mkdir: function (path, mode, callback) {
                    mkdirs.push(path);
                    callback();
                },
                readFile: function (path, options, callback) {
                    callback(undefined, 'fs.readFile(' + path + ')');
                },
                writeFile: function (path, data, options, callback) {
                    writes.push(path);
                    callback();
                }
            };
            jslint = 'readFileS' + 'ync';
            mockfs[jslint] = libfs[jslint];
            mockery.registerMock('fs', mockfs);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: 'build'
            });

            locator.plug({
                describe: {
                    extensions: 'dust'
                },
                resourceUpdated: function (evt, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(evt.resource.bundleName, path, '// just testing', {encoding: 'utf8'});
                },
                bundleUpdated: function (evt) {
                    if (!bundleCalls[evt.bundle.name]) {
                        bundleCalls[evt.bundle.name] = 0;
                    }
                    bundleCalls[evt.bundle.name] += 1;
                }
            });

            locator.plug({
                describe: {
                    extensions: 'less'
                },
                resourceUpdated: function (evt) {
                    updates.push([evt.resource.bundleName, evt.resource.relativePath].join(' '));
                }
            });

            locator.parseBundle(fixture, options).then(function () {
                try {
                    expect(mkdirs.length).to.equal(2);
                    expect(mkdirs[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css'));
                    expect(mkdirs[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css'));
                    expect(writes.length).to.equal(2);
                    expect(writes[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel0.less'));
                    expect(writes[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel1.less'));
                    expect(updates.length).to.equal(2);
                    expect(updates[0]).to.equal('roster styles/css/plugin.sel0.less');
                    expect(updates[1]).to.equal('roster styles/css/plugin.sel1.less');
                    expect(Object.keys(bundleCalls).length).to.equal(2);
                    expect(bundleCalls.simple).to.equal(1);
                    expect(bundleCalls.roster).to.equal(1);
                    mockery.deregisterAll();
                    mockery.disable();
                    next();
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });


        it('NOOP: create file during resourceUpdated', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {},
                jslint,
                mockfs,
                mkdirs = [],
                reads = [],
                writes = [],
                updates = [],
                bundleCalls = {};

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            mockfs = {
                readdir: libfs.readdir,
                stat: function (path, callback) {
                    if (path.indexOf('plugin.sel') > 0) {
                        callback(null, {fake: 'stat'});
                        return;
                    }
                    return libfs.stat(path, callback);
                },
                mkdir: function (path, mode, callback) {
                    mkdirs.push(path);
                    callback();
                },
                readFile: function (path, options, callback) {
                    reads.push(path);
                    callback(undefined, 'AAA-BBB-AAA');
                },
                writeFile: function (path, data, options, callback) {
                    writes.push(path);
                    callback();
                }
            };
            jslint = 'readFileS' + 'ync';
            mockfs[jslint] = libfs[jslint];
            mockery.registerMock('fs', mockfs);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: 'build'
            });

            locator.plug({
                describe: {
                    extensions: 'dust'
                },
                resourceUpdated: function (evt, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(evt.resource.bundleName, path, 'AAA-BBB-AAA', {encoding: 'utf8'});
                },
                bundleUpdated: function (evt) {
                    if (!bundleCalls[evt.bundle.name]) {
                        bundleCalls[evt.bundle.name] = 0;
                    }
                    bundleCalls[evt.bundle.name] += 1;
                }
            });

            locator.plug({
                describe: {
                    extensions: 'less'
                },
                resourceUpdated: function (evt) {
                    updates.push([evt.resource.bundleName, evt.resource.relativePath].join(' '));
                }
            });

            locator.parseBundle(fixture, options).then(function () {
                try {
                    expect(reads.length).to.equal(2);
                    expect(reads[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel0.less'));
                    expect(reads[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel0.less'));
                    expect(mkdirs.length).to.equal(0);
                    expect(writes.length).to.equal(0);
                    expect(updates.length).to.equal(2);
                    expect(updates[0]).to.equal('roster styles/css/plugin.sel0.less');
                    expect(updates[1]).to.equal('roster styles/css/plugin.sel0.less');
                    expect(Object.keys(bundleCalls).length).to.equal(2);
                    expect(bundleCalls.simple).to.equal(1);
                    expect(bundleCalls.roster).to.equal(1);
                    mockery.deregisterAll();
                    mockery.disable();
                    next();
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });


        it('create file during resourceUpdated into build directory', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                jslint,
                mockfs,
                mkdirs = [],
                writes = [],
                updates = [];

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            mockfs = {
                readdir: libfs.readdir,
                stat: function (path, callback) {
                    if (path.indexOf('plugin.sel') > 0) {
                        callback(null, {fake: 'stat'});
                        return;
                    }
                    return libfs.stat(path, callback);
                },
                mkdir: function (path, mode, callback) {
                    mkdirs.push(path);
                    callback();
                },
                readFile: function (path, options, callback) {
                    callback(undefined, 'fs.readFile(' + path + ')');
                },
                writeFile: function (path, data, options, callback) {
                    writes.push(path);
                    callback();
                }
            };
            jslint = 'readFileS' + 'ync';
            mockfs[jslint] = libfs[jslint];
            mockery.registerMock('fs', mockfs);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: 'build'
            });

            locator.plug({
                describe: {
                    extensions: 'dust'
                },
                resourceUpdated: function (evt, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(evt.resource.bundleName, path, '// just testing', {encoding: 'utf8'});
                }
            });

            locator.plug({
                describe: {
                    extensions: 'less'
                },
                resourceUpdated: function (evt) {
                    updates.push(evt.resource.fullPath);
                }
            });

            locator.parseBundle(fixture).then(function (have) {
                // Attempt to walk build directory, which should be skipped.
                locator.parseBundle(libpath.resolve(fixture, 'build')).then(function () {
                    return have;
                });
            }).then(function () {
                try {
                    expect(mkdirs.length).to.equal(2);
                    expect(mkdirs[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css'));
                    expect(mkdirs[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css'));
                    expect(writes.length).to.equal(2);
                    expect(writes[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel0.less'));
                    expect(writes[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel1.less'));
                    expect(updates.length).to.equal(2);
                    expect(updates[0]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel0.less'));
                    expect(updates[1]).to.equal(libpath.join(fixture, 'build/roster-0.0.1/styles/css/plugin.sel1.less'));
                    mockery.deregisterAll();
                    mockery.disable();
                    next();
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });


        it('create files during bundleUpdated()', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {},
                jslint,
                mockfs,
                bundleCalls = 0;

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            mockfs = {
                readdir: libfs.readdir,
                stat: function (path, callback) {
                    return libfs.stat(path, callback);
                },
                mkdir: function (path, mode, callback) {
                    callback();
                },
                readFile: function (path, options, callback) {
                    callback(undefined, 'fs.readFile(' + path + ')');
                },
                writeFile: function (path, data, options, callback) {
                    callback();
                }
            };
            jslint = 'readFileS' + 'ync';
            mockfs[jslint] = libfs[jslint];
            mockery.registerMock('fs', mockfs);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: 'build'
            });

            locator.plug({
                describe: {
                    types: 'configs'
                },
                bundleUpdated: function (evt, api) {
                    if ('roster' === evt.bundle.name) {
                        bundleCalls += 1;
                        if (1 === bundleCalls) {
                            return api.writeFileInBundle(evt.bundle.name, 'configs/foo.json', '// just testing', {encoding: 'utf8'})
                                .then(function (pathToNewFile) {
                                    try {
                                        expect(pathToNewFile).to.equal(libpath.join(evt.bundle.buildDirectory, 'configs/foo.json'));
                                    } catch (err) {
                                        mockery.deregisterAll();
                                        mockery.disable();
                                        next(err);
                                    }
                                    return api.writeFileInBundle(evt.bundle.name, 'configs/bar.json', '// just testing', {encoding: 'utf8'});
                                });
                        }
                        if (2 === bundleCalls) {
                            try {
                                expect(Object.keys(evt.files).length).to.equal(2);
                                expect(evt.files).to.have.property('configs/foo.json');
                                expect(evt.files).to.have.property('configs/bar.json');
                                expect(Object.keys(evt.resources).length).to.equal(2);
                                expect(evt.resources).to.have.property('configs/foo.json');
                                expect(evt.resources).to.have.property('configs/bar.json');
                            } catch (err) {
                                mockery.deregisterAll();
                                mockery.disable();
                                next(err);
                            }
                        }
                    }
                }
            });

            locator.parseBundle(fixture, options).then(function () {
                try {
                    expect(bundleCalls).to.equal(2);
                    mockery.deregisterAll();
                    mockery.disable();
                    next();
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });


        it('reports errors in sync plugins', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {};

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture
            });

            locator.plug({
                describe: {
                    types: 'configs'
                },
                resourceUpdated: function () {
                    throw new Error('NOPE');
                }
            });

            locator.parseBundle(fixture, options).then(function () {
                next(new Error('shouldnt get here'));
            }, function (err) {
                try {
                    expect(err).to.be.an('object');
                    expect(err.message).to.equal('NOPE');
                    expect(locator.ready._status).to.equal('rejected');
                    expect(locator.ready._result.Error).to.equal('NOPE');
                    next();
                } catch (err2) {
                    next(err2);
                }
            });
        });


        it('reports errors in async plugins', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {};

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture
            });

            locator.plug({
                describe: {
                    types: 'configs'
                },
                resourceUpdated: function (evt, api) {
                    return api.promise(function (fulfill, reject) {
                        reject(new Error('NOPE'));
                    });
                }
            });

            locator.parseBundle(fixture, options).then(function () {
                next(new Error('shouldnt get here'));
            }, function (err) {
                try {
                    expect(err).to.be.an('object');
                    expect(err.message).to.equal('NOPE');
                    next();
                } catch (err2) {
                    next(err2);
                }
            });
        });
    });


    describe('file watching', function () {

        it('detects changes', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                mockwatch;

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });

            mockwatch = {
                _handlers: {},
                createMonitor: function (dir, options, callback) {
                    callback({
                        on: function (evt, handler) {
                            mockwatch._handlers[evt] = handler;
                        }
                    });
                    // fire one event per tick
                    setTimeout(function () {
                        mockwatch._handlers.created(libpath.resolve(fixture, 'controllers/x.sel.js'));
                        setTimeout(function () {
                            mockwatch._handlers.changed(libpath.resolve(fixture, 'controllers/x.sel.js'));
                            setTimeout(function () {
                                mockwatch._handlers.removed(libpath.resolve(fixture, 'controllers/x.sel.js'));
                            }, 0);
                        }, 0);
                    }, 0);
                }
            };
            mockery.registerMock('watch', mockwatch);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture
            });

            locator.parseBundle(fixture).then(function () {
                var bundle = locator.getBundle('simple'),
                    fileUpdatedCalls = 0,
                    fileDeletedCalls = 0,
                    resUpdatedCalls = 0;
                locator.plug({
                    describe: {
                        extensions: 'js'
                    },
                    fileUpdated: function () {
                        fileUpdatedCalls += 1;
                    },
                    fileDeleted: function () {
                        fileDeletedCalls += 1;
                    },
                    resourceUpdated: function (evt) {
                        resUpdatedCalls += 1;
                        try {
                            expect(bundle.resources.sel.controllers.x.relativePath).to.equal(evt.resource.relativePath);
                        } catch (err) {
                            mockery.deregisterAll();
                            mockery.disable();
                            next(err);
                        }
                    },
                    resourceDeleted: function () {
                        try {
                            expect(fileUpdatedCalls).to.equal(2);
                            expect(resUpdatedCalls).to.equal(2);
                            expect(fileDeletedCalls).to.equal(1);
                            expect(bundle.resources).to.not.have.property('sel');
                            mockery.deregisterAll();
                            mockery.disable();
                            next();
                        } catch (err) {
                            mockery.deregisterAll();
                            mockery.disable();
                            next(err);
                        }
                    }
                });
                return locator.watch(fixture);
            }).then(null, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });

        it('ignores files in build directory', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                mockwatch,
                fileUpdatedCalls = 0,
                fileDeletedCalls = 0,
                resUpdatedCalls = 0,
                resDeletedCalls = 0;

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });

            mockwatch = {
                _handlers: {},
                createMonitor: function (dir, options, callback) {
                    callback({
                        on: function (evt, handler) {
                            mockwatch._handlers[evt] = handler;
                        }
                    });
                    // fire one event per tick
                    setTimeout(function () {
                        mockwatch._handlers.created(libpath.resolve(fixture, 'build/controllers/x.sel.js'));
                        setTimeout(function () {
                            mockwatch._handlers.changed(libpath.resolve(fixture, 'build/controllers/x.sel.js'));
                            setTimeout(function () {
                                mockwatch._handlers.removed(libpath.resolve(fixture, 'build/controllers/x.sel.js'));
                                try {
                                    expect(fileUpdatedCalls).to.equal(0);
                                    expect(fileDeletedCalls).to.equal(0);
                                    expect(resUpdatedCalls).to.equal(0);
                                    expect(resDeletedCalls).to.equal(0);
                                    mockery.deregisterAll();
                                    mockery.disable();
                                    next();
                                } catch (err) {
                                    mockery.deregisterAll();
                                    mockery.disable();
                                    next(err);
                                }
                            }, 0);
                        }, 0);
                    }, 0);
                }
            };
            mockery.registerMock('watch', mockwatch);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: libpath.join(fixture, 'build')
            });

            locator.parseBundle(fixture).then(function () {
                locator.plug({
                    describe: {
                        extensions: 'js'
                    },
                    fileUpdated: function () {
                        fileUpdatedCalls += 1;
                    },
                    fileDeleted: function () {
                        fileDeletedCalls += 1;
                    },
                    resourceUpdated: function () {
                        resUpdatedCalls += 1;
                    },
                    resourceDeleted: function () {
                        resDeletedCalls += 1;
                    }
                });
                return locator.watch(fixture);
            }).then(null, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });

        it('warn on NPM packages added or deleted during watch()', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                logs = [],
                locator,
                mockwatch,
                fileUpdatedCalls = 0,
                fileDeletedCalls = 0,
                resUpdatedCalls = 0,
                resDeletedCalls = 0;

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });

            mockwatch = {
                _handlers: {},
                createMonitor: function (dir, options, callback) {
                    callback({
                        on: function (evt, handler) {
                            mockwatch._handlers[evt] = handler;
                        }
                    });

                    // fire one event per tick
                    libasync.series([
                        function (callback) {
                            setTimeout(function () {
                                mockwatch._handlers.created(libpath.resolve(fixture, 'node_modules/x'));
                                callback();
                            }, 0);
                        },
                        function (callback) {
                            setTimeout(function () {
                                mockwatch._handlers.created(libpath.resolve(fixture, 'node_modules/x/package.json'));
                                callback();
                            }, 0);
                        },
                        function (callback) {
                            setTimeout(function () {
                                mockwatch._handlers.changed(libpath.resolve(fixture, 'node_modules/x/package.json'));
                                callback();
                            }, 0);
                        },
                        function (callback) {
                            setTimeout(function () {
                                mockwatch._handlers.removed(libpath.resolve(fixture, 'node_modules/x/package.json'));
                                callback();
                            }, 0);
                        },
                        function (callback) {
                            setTimeout(function () {
                                mockwatch._handlers.removed(libpath.resolve(fixture, 'node_modules/x'));
                                callback();
                            }, 0);
                        }
                    ], function (asyncErr) {
                        if (asyncErr) {
                            next(asyncErr);
                            return;
                        }
                        try {
                            expect(fileUpdatedCalls).to.equal(0);
                            expect(fileDeletedCalls).to.equal(0);
                            expect(resUpdatedCalls).to.equal(0);
                            expect(resDeletedCalls).to.equal(0);
                            expect(logs.length).to.equal(2);
                            expect(logs[0]).to.equal('NPM package "x" added during watch().');
                            expect(logs[1]).to.equal('NPM package "x" deleted during watch().');
                            mockery.deregisterAll();
                            mockery.disable();
                            next();
                        } catch (err) {
                            mockery.deregisterAll();
                            mockery.disable();
                            next(err);
                        }
                    });
                }
            };
            mockery.registerMock('watch', mockwatch);

            BundleLocator = require('../../lib/bundleLocator.js');
            BundleLocator.test.imports.log = function (msg) {
                logs.push(msg);
            };
            locator = new BundleLocator({
                applicationDirectory: fixture,
                buildDirectory: libpath.join(fixture, 'build')
            });

            locator.parseBundle(fixture).then(function () {
                locator.plug({
                    describe: {
                        extensions: 'js'
                    },
                    fileUpdated: function () {
                        fileUpdatedCalls += 1;
                    },
                    fileDeleted: function () {
                        fileDeletedCalls += 1;
                    },
                    resourceUpdated: function () {
                        resUpdatedCalls += 1;
                    },
                    resourceDeleted: function () {
                        resDeletedCalls += 1;
                    }
                });
                return locator.watch(fixture);
            }).then(null, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });

        it('reports errors from plugins', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                mockwatch,
                logCalls = 0;

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });

            mockwatch = {
                _handlers: {},
                createMonitor: function (dir, options, callback) {
                    callback({
                        on: function (evt, handler) {
                            mockwatch._handlers[evt] = handler;
                        }
                    });
                    // fire one event per tick
                    setTimeout(function () {
                        mockwatch._handlers.created(libpath.resolve(fixture, 'controllers/x.js'));
                        setTimeout(function () {
                            mockwatch._handlers.changed(libpath.resolve(fixture, 'controllers/x.js'));
                            setTimeout(function () {
                                mockwatch._handlers.removed(libpath.resolve(fixture, 'controllers/x.js'));
                            }, 0);
                        }, 0);
                    }, 0);
                }
            };
            mockery.registerMock('watch', mockwatch);

            mockery.registerMock('watch', mockwatch);
            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator({
                applicationDirectory: fixture
            });

            locator.parseBundle(fixture, {}).then(function () {
                try {
                    locator.plug({
                        describe: {
                            extensions: 'js'
                        },
                        fileUpdated: function () {
                            throw new Error('NOPE');
                        },
                        fileDeleted: function () {
                            throw new Error('NOPE');
                        }
                    });
                    BundleLocator.test.imports.log = function (msg) {
                        logCalls += 1;
                        try {
                            switch (logCalls) {
                            case 1:
                                expect(msg).to.equal('Error processing file ' + libpath.join(fixture + '/controllers/x.js'));
                                break;
                            case 2:
                                expect(msg.indexOf('Error: NOPE')).to.equal(0);
                                break;
                            case 3:
                                expect(msg).to.equal('Error processing file ' + libpath.join(fixture + '/controllers/x.js'));
                                break;
                            case 4:
                                expect(msg.indexOf('Error: NOPE')).to.equal(0);
                                break;
                            case 5:
                                expect(msg).to.equal('Error processing file ' + libpath.join(fixture + '/controllers/x.js'));
                                break;
                            case 6:
                                expect(msg.indexOf('Error: NOPE')).to.equal(0);
                                mockery.deregisterAll();
                                mockery.disable();
                                next();
                                break;
                            }
                        } catch (err) {
                            mockery.deregisterAll();
                            mockery.disable();
                            next(err);
                        }
                    };
                    locator.watch(fixture).then(null, function (err) {
                        mockery.deregisterAll();
                        mockery.disable();
                        next(err);
                    });
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
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
                });
            locator._walkNPMTree(fixture).then(function (have) {
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
            }, next);
        });

        it('_filterBundleSeeds()', function (next) {
            var fixture = libpath.join(fixturesPath, 'walk-packages'),
                locator = new BundleLocator({
                    maxPackageDepth: 2
                });
            locator._walkNPMTree(fixture).then(function (have) {
                var logCalls = 0;
                BundleLocator.test.imports.log = function (msg) {
                    var matches = msg.match(/multiple "([a-zA-Z0-9\-]+)" packages found, using (\S+)/);
                    if (matches) {
                        logCalls += 1;
                    }
                    try {
                        switch (matches[1]) {
                        case 'depth-different':
                            expect(matches[2]).to.equal(libpath.join(fixture, 'node_modules', 'depth-different'));
                            break;
                        case 'depth-same':
                            expect(matches[2]).to.equal(libpath.join(fixture, 'node_modules', 'skip-b', 'node_modules', 'depth-same'));
                            break;
                        default:
                            throw new Error('FAILURE -- unexpected log for ' + matches[1]);
                        }
                    } catch (err) {
                        next(err);
                    }
                };
                have = locator._filterBundleSeeds(have);
                try {
                    expect(logCalls).to.equal(2);
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
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
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


});



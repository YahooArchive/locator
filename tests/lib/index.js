/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true */
/*globals describe,it */
"use strict";


var libpath = require('path'),
    libfs = require('fs'),
    mockery = require('mockery'),
    expect = require('chai').expect,
    BundleLocator = require('../../lib/bundleLocator.js'),
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

        Object.keys(want).forEach(function (key) {
            compareObjects(have[key], want[key]);
        });
    } else {
        expect(have).to.deep.equal(want);
    }
}


describe('BundleLocator', function () {

    describe('locateBundles', function () {

        it('mojito-newsboxes', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator(),
                options = {};
            locator.parseBundle(fixture, options).then(function (have) {
                var want = require(fixture + '/expected-locator.js'),
                    read;
                try {
                    read = locator.getBundle('Read');
                    compareObjects(have, want);
                    compareObjects(read, want.bundles['modown-lib-read'].bundles.Read);
                    compareObjects(read.getResources(), want.bundles['modown-lib-read'].bundles.Read.resources['{}']);
                    compareObjects(read.getResources({}, 'common'), want.bundles['modown-lib-read'].bundles.Read.resources.common);
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });

        it('touchdown-simple', function (next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator({
                    applicationDirectory: fixture,
                    buildDirectory: 'build'
                }),
                options = {};
            locator.parseBundle(fixture, options).then(function (have) {
                var want = require(fixture + '/expected-locator.js');
                try {
                    compareObjects(have, want);
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
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
        });


        it('api.getBundle()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();
            locator.parseBundle(fixture).then(function (have) {
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


        it('api.getBundleResources()', function (next) {
            var fixture = libpath.join(fixturesPath, 'mojito-newsboxes'),
                locator = new BundleLocator();
            locator.parseBundle(fixture).then(function (have) {
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
                pluginAll;

            pluginJSON = {
                fileCalls: 0,
                resourceCalls: 0,
                fileUpdated: function (res, api) {
                    pluginJSON.fileCalls += 1;
                    if (!fileCalls[res.relativePath]) {
                        fileCalls[res.relativePath] = [];
                    }
                    fileCalls[res.relativePath].push('js');
                },
                resourceUpdated: function (res, api) {
                    pluginJSON.resourceCalls += 1;
                    if (!resourceCalls[res.relativePath]) {
                        resourceCalls[res.relativePath] = [];
                    }
                    resourceCalls[res.relativePath].push('js');
                }
            };
            locator.plug({extensions: 'js'}, pluginJSON);

            pluginDefault = {
                calls: 0,
                describe: {
                    extensions: 'css,dust'
                },
                resourceUpdated: function (res, api) {
                    pluginDefault.calls += 1;
                    if (!resourceCalls[res.relativePath]) {
                        resourceCalls[res.relativePath] = [];
                    }
                    resourceCalls[res.relativePath].push('default');
                    return api.promise(function (fulfill, reject) {
                        fulfill();
                    });
                },
                bundleUpdated: function (bundle, api) {
                    if (!bundleCalls[bundle.name]) {
                        bundleCalls[bundle.name] = 0;
                    }
                    bundleCalls[bundle.name] += 1;
                }
            };
            locator.plug(pluginDefault.describe, pluginDefault);

            pluginAll = {
                calls: 0,
                resourceUpdated: function (res, api) {
                    pluginAll.calls += 1;
                    if (!resourceCalls[res.relativePath]) {
                        resourceCalls[res.relativePath] = [];
                    }
                    resourceCalls[res.relativePath].push('all');
                    return api.promise(function (fulfill, reject) {
                        fulfill();
                    });
                }
            };
            locator.plug({}, pluginAll);

            locator.parseBundle(fixture, options).then(function (have) {
                var want = require(fixture + '/expected-locator.js');
                try {
                    compareObjects(have, want);
                    expect(pluginJSON.fileCalls).to.equal(10);
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

            locator.plug({extensions: 'dust'}, {
                resourceUpdated: function (res, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(res.bundleName, path, '// just testing', {encoding: 'utf8'});
                },
                bundleUpdated: function (bundle, api) {
                    if (!bundleCalls[bundle.name]) {
                        bundleCalls[bundle.name] = 0;
                    }
                    bundleCalls[bundle.name] += 1;
                }
            });

            locator.plug({extensions: 'less'}, {
                resourceUpdated: function (res, api) {
                    updates.push([res.bundleName, res.relativePath].join(' '));
                }
            });

            locator.parseBundle(fixture, options).then(function (have) {
                try {
                    expect(mkdirs.length).to.equal(2);
                    expect(mkdirs[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css'));
                    expect(mkdirs[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css'));
                    expect(writes.length).to.equal(2);
                    expect(writes[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel0.less'));
                    expect(writes[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel1.less'));
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

            locator.plug({extensions: 'dust'}, {
                resourceUpdated: function (res, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(res.bundleName, path, 'AAA-BBB-AAA', {encoding: 'utf8'});
                },
                bundleUpdated: function (bundle, api) {
                    if (!bundleCalls[bundle.name]) {
                        bundleCalls[bundle.name] = 0;
                    }
                    bundleCalls[bundle.name] += 1;
                }
            });

            locator.plug({extensions: 'less'}, {
                resourceUpdated: function (res, api) {
                    updates.push([res.bundleName, res.relativePath].join(' '));
                }
            });

            locator.parseBundle(fixture, options).then(function (have) {
                try {
                    expect(reads.length).to.equal(2);
                    expect(reads[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel0.less'));
                    expect(reads[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel0.less'));
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

            locator.plug({extensions: 'dust'}, {
                resourceUpdated: function (res, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(res.bundleName, path, '// just testing', {encoding: 'utf8'});
                }
            });

            locator.plug({extensions: 'less'}, {
                resourceUpdated: function (res, api) {
                    updates.push(res.fullPath);
                }
            });

            locator.parseBundle(fixture).then(function (have) {
                // Attempt to walk build directory, which should be skipped.
                locator.parseBundle(libpath.resolve(fixture, 'build')).then(function () {
                    return have;
                });
            }).then(function (have) {
                try {
                    expect(mkdirs.length).to.equal(2);
                    expect(mkdirs[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css'));
                    expect(mkdirs[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css'));
                    expect(writes.length).to.equal(2);
                    expect(writes[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel0.less'));
                    expect(writes[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel1.less'));
                    expect(updates.length).to.equal(2);
                    expect(updates[0]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel0.less'));
                    expect(updates[1]).to.equal(libpath.join(fixture, 'build/roster/styles/css/plugin.sel1.less'));
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

            locator.plug({types: 'configs'}, {
                bundleUpdated: function (bundle, api) {
                    if ('roster' === bundle.name) {
                        bundleCalls += 1;
                        if (1 === bundleCalls) {
                            return api.writeFileInBundle(bundle.name, 'configs/foo.json', '// just testing', {encoding: 'utf8'}).then(function (pathToNewFile) {
                                expect(pathToNewFile).to.equal(libpath.join(bundle.buildDirectory, 'configs/foo.json'));
                                return api.writeFileInBundle(bundle.name, 'configs/bar.json', '// just testing', {encoding: 'utf8'});
                            });
                        }
                    }
                }
            });

            locator.parseBundle(fixture, options).then(function (have) {
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
                var ress = locator.getBundle('simple').resources,
                    fileUpdatedCalls = 0,
                    fileDeletedCalls = 0,
                    resUpdatedCalls = 0;
                locator.plug({extensions: 'js'}, {
                    fileUpdated: function (meta, api) {
                        fileUpdatedCalls += 1;
                    },
                    fileDeleted: function (meta, api) {
                        fileDeletedCalls += 1;
                    },
                    resourceUpdated: function (res, api) {
                        resUpdatedCalls += 1;
                        expect(ress.sel.controllers.x).to.equal(res.relativePath);
                    },
                    resourceDeleted: function (res, api) {
                        expect(fileUpdatedCalls).to.equal(2);
                        expect(resUpdatedCalls).to.equal(2);
                        expect(fileDeletedCalls).to.equal(1);
                        expect(ress).to.not.have.property('sel');
                        mockery.deregisterAll();
                        mockery.disable();
                        next();
                    }
                });
                return locator.watch(fixture);
            }).then(null, function (err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });

    });


});



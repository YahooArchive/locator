/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
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
            }, next);
        });

    });


    describe('plugins', function() {

        it('_filterResource()', function() {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator(),
                res;

            res = {
                type: 'controller',
                ext: '.js'
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

        it('basics', function(next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                locator = new BundleLocator(),
                options = {},
                pathCalls = {}, // relative path: array of calls
                pluginJS,
                pluginDefault,
                pluginAll;

            pluginJS = {
                calls: 0,
                resourceAdded: function(res, api) {
                    pluginJS.calls += 1;
                    if (!pathCalls[res.relativePath]) {
                        pathCalls[res.relativePath] = [];
                    }
                    pathCalls[res.relativePath].push('js');
                }
            };
            locator.plug({extensions: 'js'}, pluginJS);

            pluginDefault = {
                calls: 0,
                describe: {
                    extensions: 'css,dust'
                },
                resourceAdded: function(res, api) {
                    pluginDefault.calls += 1;
                    if (!pathCalls[res.relativePath]) {
                        pathCalls[res.relativePath] = [];
                    }
                    pathCalls[res.relativePath].push('default');
                    return api.promise(function(fulfill, reject) {
                        fulfill();
                    });
                }
            };
            locator.plug(pluginDefault.describe, pluginDefault);

            pluginAll = {
                calls: 0,
                resourceAdded: function(res, api) {
                    pluginAll.calls += 1;
                    if (!pathCalls[res.relativePath]) {
                        pathCalls[res.relativePath] = [];
                    }
                    pathCalls[res.relativePath].push('all');
                    return api.promise(function(fulfill, reject) {
                        fulfill();
                    });
                }
            };
            locator.plug({}, pluginAll);

            locator.parseBundle(fixture, options).then(function(have) {
                var want = require(fixture + '/expected-locator.js');
                try {
                    compareObjects(have, want);
                    expect(pluginJS.calls).to.equal(8);
                    expect(pluginDefault.calls).to.equal(2);
                    expect(pluginAll.calls).to.equal(0);
                    // sample a couple to make sure that plugins were called in registration order
                    expect(pathCalls['controllers/teamManager.js']).to.deep.equal(['js']);
                    expect(pathCalls['templates/roster.dust']).to.deep.equal(['default']);
                    next();
                } catch (err) {
                    next(err);
                }
            }, next);
        });


        it('create file during resourceAdded', function(next) {
            var fixture = libpath.join(fixturesPath, 'touchdown-simple'),
                BundleLocator,
                locator,
                options = {},
                jslint,
                mockfs,
                writes = [],
                reads = [];

            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            mockfs = {
                readdir: libfs.readdir,
                stat: function(path, callback) {
                    if (path.indexOf('plugin.sel') > 0) {
                        callback(null, {fake: 'stat'});
                        return;
                    }
                    return libfs.stat(path, callback);
                },
                writeFile: function(path, data, options, callback) {
                    writes.push(path);
                    callback();
                }
            };
            jslint = 'readFileS' + 'ync';
            mockfs[jslint] = libfs[jslint];
            mockery.registerMock('fs', mockfs);

            BundleLocator = require('../../lib/bundleLocator.js');
            locator = new BundleLocator();

            locator.plug({extensions: 'dust'}, {
                resourceAdded: function(res, api) {
                    var path = 'styles/css/plugin.sel' + writes.length + '.less';
                    return api.writeFileInBundle(res.bundleName, path, '// just testing', {encoding: 'utf8'});
                }
            });

            locator.plug({extensions: 'less'}, {
                resourceAdded: function(res, api) {
                    reads.push([res.bundleName, res.relativePath].join(' '));
                }
            });

            locator.parseBundle(fixture, options).then(function(have) {
                try {
                    expect(writes.length).to.equal(2);
                    expect(writes[0]).to.equal(libpath.join(fixture, 'node_modules/roster/styles/css/plugin.sel0.less'));
                    expect(writes[1]).to.equal(libpath.join(fixture, 'node_modules/roster/styles/css/plugin.sel1.less'));
                    expect(reads.length).to.equal(2);
                    expect(reads[0]).to.equal('roster styles/css/plugin.sel0.less');
                    expect(reads[1]).to.equal('roster styles/css/plugin.sel1.less');
                    mockery.deregisterAll();
                    mockery.disable();
                    next();
                } catch (err) {
                    mockery.deregisterAll();
                    mockery.disable();
                    next(err);
                }
            }, function(err) {
                mockery.deregisterAll();
                mockery.disable();
                next(err);
            });
        });

    });


});



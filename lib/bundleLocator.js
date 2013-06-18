/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true */
"use strict";


var libfs       = require('fs'),
    libmkdirp   = require('mkdirp'),
    liboop      = require('yui/oop'),
    libpath     = require('path'),
    libpromise  = require('yui/promise'),
    ScanFS      = require('scanfs'),
    libsemver   = require('semver'),
    libwatch    = require('watch'),
    Bundle      = require('./bundle'),
    imports = {
        log: console.log
    },
    DEFAULT_RULESET = 'main',
    DEFAULT_RULESETS = require('./rulesets'),
    DEFAULT_SELECTOR = '{}',
    DEFAULT_MAX_PACKAGES_DEPTH = 9999,
    DEFAULT_VERSION = '0.0.1',  // for bundles w/out a version or parent
    EVENT_UPDATED = 'Updated',
    EVENT_DELETED = 'Deleted',
    EVENT_BUNDLE_UPDATED = 'bundleUpdated';


/**
 * The Locator walks the filesystem and gives semantic meaning to
 * files in the application.
 * @module Locator
 */


/**
 * @class Locator
 * @constructor
 * @param {object} options Options for how the configuration files are located.
 * @param {string} options.applicationDirectory Where the application will be found.
 * If not given it defaults to the current working directory.
 * @param {string} options.buildDirectory Where to put generated files.
 * If not given, generated files are put directly inside the application directory
 * (and likely alongside files managed by SCM).
 * If a relative path is given, it is relative to `options.applicationDirectory`.
 * @param {integer} options.maxPackageDepth Maximum depth in `node_modules/` to walk.
 * Defaults to 9999.
 */
function BundleLocator(options) {
    var self = this;

    this._options = options || {};
    if (this._options.applicationDirectory) {
        this._options.applicationDirectory = libpath.resolve(process.cwd(), this._options.applicationDirectory);
    } else {
        this._options.applicationDirectory = process.cwd();
    }
    if (this._options.buildDirectory) {
        this._options.buildDirectory = libpath.resolve(this._options.applicationDirectory, this._options.buildDirectory);
    }
    this._options.maxPackageDepth = this._options.maxPackageDepth || DEFAULT_MAX_PACKAGES_DEPTH;

    this._cacheRulesetsPath = {};   // package directory: path to rulesets file

    this._bundles = {};
    this._bundlePaths = {}; // path: name
    this._fileQueue = [];
    this._bundleUpdates = {};   // name: object describing why the update happened
    this._plugins = [];
    this._pluginAPI = {

        getBundle: function (bundleName) {
            return self.getBundle(bundleName);
        },

        getBundleFiles: function (bundleName, filter) {
            var bundle,
                files = [];
            bundle = self._bundles[bundleName];
            if (!bundle) {
                throw new Error('Unknown bundle "' + bundleName + '"');
            }
            Object.keys(bundle.files).forEach(function (fullpath) {
                var res = {
                        ext: libpath.extname(fullpath).substr(1)
                    };
                if (self._filterResource(res, filter)) {
                    files.push(fullpath);
                }
            });
            return files;
        },

        getBundleResources: function (bundleName, filter) {
            var bundle,
                ress = [];
            bundle = self._bundles[bundleName];
            if (!bundle) {
                throw new Error('Unknown bundle "' + bundleName + '"');
            }
            self._walkBundleResources(bundle, filter, function (res) {
                ress.push(res);
            });
            return ress;
        },

        promise: function (fn) {
            return new libpromise.Promise(fn);
        },

        writeFileInBundle: function (bundleName, relativePath, contents, options) {
            return new libpromise.Promise(function (fulfill, reject) {
                var bundle,
                    path;
                bundle = self._bundles[bundleName];
                if (!bundle) {
                    reject(new Error('Unknown bundle "' + bundleName + '"'));
                    return;
                }
                path = libpath.resolve(bundle.buildDirectory ||
                                       bundle.baseDirectory, relativePath);
                libfs.readFile(path, options, function (err, originalContents) {
                    originalContents = (originalContents && originalContents.toString()) || originalContents;
                    if (!err && originalContents === contents) {
                        // noop if the content is not getting updated.
                        self._fileQueue.push([EVENT_UPDATED, path]);
                        fulfill(path);
                        return;
                    }
                    libmkdirp(libpath.dirname(path), null, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            libfs.writeFile(path, contents, options, function (err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    self._fileQueue.push([EVENT_UPDATED, path]);
                                    fulfill(path);
                                }
                            });
                        }
                    });
                });
            });
        }

    };
}


BundleLocator.prototype = {


    /**
     * Plugs code into the locator to be called during filesystem events.
     * The filter must specify something, since it is an error for a plugin
     * to be called for all resources.
     * @method plug
     * @param {LocatorPlugin} plugin The plugin to be used.
     * @chainable
     */
    plug: function (plugin) {
        this._plugins.push({
            filter: plugin.describe || {},
            plugin: plugin
        });
        return this;
    },


    /**
     * Parses the directory to turn it into a bundle.
     * @method parseBundle
     * @async
     * @param {string} dir The directory for the bundle.
     * @param {object} [options] Options for processing the bundle.
     * @return {Promise/A+} A promise that will be fulfilled with the bundle.
     */
    parseBundle: function (dir, options) {
        var self = this;
        this._rootDirectory = dir;
        return this._walkNPMTree(dir).then(function (bundleSeeds) {
            bundleSeeds = self._filterBundleSeeds(bundleSeeds);
            var promises = [];
            bundleSeeds.forEach(function (bundleSeed) {
                var opts = (bundleSeed.baseDirectory === dir) ? options : {};
                promises.push(self._walkBundle(bundleSeed, opts));
            });
            return libpromise.batch.apply(libpromise, promises).then(function () {
                return new libpromise.Promise(function (fulfill, reject) {
                    self._rootBundleName = self._bundlePaths[dir];
                    if (self._fileQueue.length) {
                        self._processFileQueue().then(function () {
                            fulfill(self._bundles[self._getBundleNameByPath(dir)]);
                        }, reject);
                    }
                });
            });
        });
    },


    /**
     * Returns the named bundle, no matter how deeply found.
     * @method getBundle
     * @param {string} name The name of the bundle to retrieve.
     * @return {Bundle|undefined} The named bundle, or undefined if not found.
     */
    getBundle: function (name) {
        return this._bundles[name];
    },


    /**
     * Returns the root of the bundles.  This is the root bundle that was parsed
     * by the call to `parseBundle()`.
     * @method getRootBundle
     * @return {Bundle} The root bundle.
     */
    getRootBundle: function () {
        return this._bundles[this._rootBundleName];
    },


    /**
     * Lists resources in all the bundles.
     * @method listAllResources
     * @param {object} filter Filter for deciding which resources to list.
     * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) to return.
     * @param {string|[string]} [filter.types] The resources types to return.
     * @return {[LocatorResource]} An array of resources.
     */
    listAllResources: function (filter) {
        var self = this,
            ress = [];
        Object.keys(this._bundles).forEach(function (bundleName) {
            var bundle = self._bundles[bundleName];
            self._walkBundleResources(bundle, filter, function (res) {
                ress.push(res);
            });
        });
        return ress;
    },


    /**
     * Returns a list of all located bundle names.
     * The names are not ordered.
     * @method listBundleNames
     * @param {Function} [filter] function to execute on each bundle.
     *   If no `filter` is supplied, all bundle names will be returned. The
     *   function will receive the following argument:
     * @param {Object} filter.bundle the current bundle being iterated on
     * @param {boolean} filter.return Return true to indicate that the
     *   bundle name should be returned in the list. Otherise the bundle
     *   name will be skipped.
     * @return {Array} list of bundles
     */
    listBundleNames: function (filter) {
        var bundleName,
            bundles = this._bundles,
            bundleNames = [];
        if ('function' !== typeof filter) {
            return Object.keys(this._bundles);
        }
        for (bundleName in bundles) {
            if (bundles.hasOwnProperty(bundleName)) {
                if (filter(bundles[bundleName])) {
                    bundleNames.push(bundleName);
                }
            }
        }
        return bundleNames;
    },


    /**
     * Watches a filesystem directory for changes.
     * Changes are communicated to the plugins via the `fileUpdated`,
     * `fileDeleted`, `resourceUpdated`, and `resourceDeleted` methods.
     * @method watch
     * @param {string} dir The directory to watch.
     * @return {Promise/A+} A promise that will be fulfilled once watching is setup.
     */
    watch: function (dir) {
        var self = this;
        return new libpromise.Promise(function (fulfill) {
            libwatch.createMonitor(dir, {ignoreDotFiles: true}, function (monitor) {
                // Ignore files written to buildDirectory that don't
                // happen via api.writeFileInBundle()
                monitor.on('created', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_UPDATED, path, {watch: 'added'}]);
                        self._processFileQueue().then(null, function (err) {
                            imports.log('Error processing file ' + path);
                            imports.log(err.stack);
                        });
                    }
                });
                monitor.on('changed', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_UPDATED, path, {watch: 'updated'}]);
                        self._processFileQueue().then(null, function (err) {
                            imports.log('Error processing file ' + path);
                            imports.log(err.stack);
                        });
                    }
                });
                monitor.on('removed', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_DELETED, path, {watch: 'deleted'}]);
                        self._processFileQueue().then(null, function (err) {
                            imports.log('Error processing file ' + path);
                            imports.log(err.stack);
                        });
                    }
                });
                fulfill();
            });
        });
    },


    /**
     * Returns the name of the bundle to which the path belongs.
     * @private
     * @method _getBundleNameByPath
     * @param {string} findPath The path to consider.
     * @return {string} The name the bundle to which the findPath most closely matches.
     */
    _getBundleNameByPath: function (findPath) {
        // FUTURE OPTIMIZATION:  use a more complicated datastructure for faster lookups
        var found = {}, // length: path
            longest;
        Object.keys(this._bundlePaths).forEach(function (bundlePath) {
            if (0 === findPath.indexOf(bundlePath) &&
                    (findPath.length === bundlePath.length ||
                    '/' === findPath.charAt(bundlePath.length))) {
                found[bundlePath.length] = bundlePath;
            }
        });
        longest = Math.max.apply(Math, Object.keys(found));
        return this._bundlePaths[found[longest]];
    },


    /**
     * Creates the seed of a potential bundle.
     *
     * The seed includes:
     *  <dl>
     *      <dt> baseDirectory {string} </dt>
     *      <dd> The directory of the bundle. </dd>
     *      <dt> name {string} </dt>
     *      <dd> The name of the bundle. </dd>
     *      <dt> version {string} </dt>
     *      <dd> The version of the bundle. </dd>
     *      <dt> npmDepth {integer} </dt>
     *      <dd> The depth in the NPM package dependency tree. </dd>
     *      <dt> options {object} </dt>
     *      <dd> Options for the bundle, taken in part from the `"locator"` section of `package.json` </dd>
     *  </dl>
     * @private
     * @method _makeBundleSeed
     * @param {string} baseDirectory Full path to the bundle.
     * @param {string} name The name of the bundle.
     * Might be overrriden by the name in package.json (if it exists).
     * @param {string} version The version to use if not specified in the package.json.
     * Might be overriden by the version in package.json (if it exists).
     * @param {object} [pkg] Contents of the bundles package.json.
     * @param {object} [options] Additional options to apply. Lower priority
     * than those found in package.json.
     * @return {object} The bundle seed, as described above.
     */
    _makeBundleSeed: function (baseDirectory, name, version, pkg, options) {
        var seed;
        seed = {
            baseDirectory: baseDirectory,
            name: name,
            version: version
        };
        if (pkg) {
            seed.name = pkg.name;
            seed.version = pkg.version;
            seed.options = pkg.locator;
        }
        if (options) {
            if (seed.options) {
                // merge options under seed.options
                liboop.mix(seed.options, options, false, null, 0, false);
            } else {
                seed.options = options;
            }
        }
        return seed;
    },


    /**
     * Makes a bundle out of a directory.
     * @private
     * @method _makeBundle
     * @async
     * @param {string} path The path of the bundle.
     * @param {string} name The name of the bundle.
     * @param {string|undefined} version The version of the bundle, if known.
     * @param {object} options Options for processing the bundle. This very often
     * comes from "locator" in package.json.
     * @param {Bundle} [parent] Parent bundle. Only the root bundle doesn't have a parent.
     * @return {Promise/A+} A promise that will be fulfilled with the new bundle,
     * or undefined if the path isn't a locator bundle.
     */
    _makeBundle: function (seed, parent) {
        var self = this;
        return new libpromise.Promise(function (fulfill, reject) {
            var bundle,
                ruleset = self._loadRuleset(seed),
                msg;

            if (seed.options.location) {
                // This is fairly legacy, and we might be able to remove it.
                seed.baseDirectory = libpath.resolve(seed.baseDirectory, seed.options.location);
            }

            if (!ruleset) {
                msg = 'Bundle "' + seed.name + '" has unknown ruleset ' + JSON.stringify(seed.options.ruleset);
                if (seed.options.rulesets) {
                    msg += ' in rulesets ' + JSON.stringify(seed.options.rulesets);
                }
                reject(new Error(msg));
                return;
            }

            bundle = new Bundle(seed.baseDirectory, seed.options);
            bundle.name = seed.name;
            bundle.version = seed.version;
            bundle.type = ruleset._name;
            self._bundles[bundle.name] = bundle;
            self._bundlePaths[bundle.baseDirectory] = bundle.name;
            if (self._options.buildDirectory) {
                bundle.buildDirectory = libpath.resolve(self._options.buildDirectory,
                        bundle.name + '-' + bundle.version);
                self._bundlePaths[bundle.buildDirectory] = bundle.name;
            }
            // wire into parent
            if (parent) {
                if (!parent.bundles) {
                    parent.bundles = {};
                }
                parent.bundles[bundle.name] = bundle;
            }
            fulfill(bundle);
        });
    },


    /**
     * Turns the path into a resource in the associated bundle, if applicable.
     * @private
     * @method _processFileQueue
     * @async
     * @return {Promise/A+} A promise that will be fulfilled once
     * the path is processed.
     */
    _processFileQueue: function () {
        var self = this,
            event,
            eventType,
            fullPath,
            eventAttrs;

        event = this._fileQueue.shift();
        eventType = event[0];
        fullPath = event[1];
        eventAttrs = event[2] || {};
        return new libpromise.Promise(function (fulfill, reject) {
            var bundleName,
                bundle,
                ruleset,
                relativePath,
                pathParts,
                subBundleSeed,
                res;

            bundleName = self._getBundleNameByPath(fullPath);
            bundle = self._bundles[bundleName];
            if (bundle.baseDirectory === fullPath.substr(0, bundle.baseDirectory.length)) {
                relativePath = fullPath.substr(bundle.baseDirectory.length + 1);
            } else if (bundle.buildDirectory === fullPath.substr(0, bundle.buildDirectory.length)) {
                relativePath = fullPath.substr(bundle.buildDirectory.length + 1);
            }

            // This mainly happens during watch(), since we skip node_modules
            // in _walkBundle().
            if (relativePath.indexOf('node_modules') === 0) {
                pathParts = relativePath.split(libpath.sep);
                while (pathParts[0] === 'node_modules' && pathParts.length >= 2) {
                    pathParts.shift();
                    bundleName = pathParts.shift();
                }
                relativePath = pathParts.join(libpath.sep);
                bundle = self._bundles[bundleName];

                // The package's directory is not a resource (... and is mostly uninteresting).
                if (!relativePath) {
                    imports.log(
                        'NPM package "' + bundleName + '" ' + eventAttrs.watch + ' during watch().',
                        'Please restart app for changes to take effect.'
                    );
                    fulfill();
                    return;
                }

                // unknown bundle
                if (!bundle) {
                    fulfill();
                    return;
                }
            }

            ruleset = self._loadRuleset(bundle);
            if (ruleset._skip && self._ruleSkip(fullPath, relativePath, ruleset._skip)) {
                fulfill();
                return;
            }
            if (ruleset._bundles) {
                subBundleSeed = self._ruleBundles(fullPath, relativePath, ruleset._bundles, bundle);
                if (subBundleSeed) {
                    // sub-bundle inherits options.rulesets from parent
                    if (!subBundleSeed.options) {
                        subBundleSeed.options = {};
                    }
                    if (!subBundleSeed.options.rulesets) {
                        subBundleSeed.options.rulesets = bundle.options.rulesets;
                    }
                    return self._makeBundle(subBundleSeed, bundle).then(fulfill, reject);
                }
            }

            // This is the base "meta" for a file.  If a rule matches we'll
            // augment this.
            res = {
                bundleName: bundleName,
                fullPath: fullPath,
                relativePath: relativePath,
                ext: libpath.extname(fullPath).substr(1)
            };

            return self._onFile(res, ruleset, eventType).then(fulfill, reject);
        }).then(function () {
            // This handles the list of initially walked paths/resources.
            // The list can change as new files are added.
            if (self._fileQueue.length) {
                return self._processFileQueue();
            }
            return self._processBundleUpdates();
        });
    },


    /**
     * For all bundles that have been update, inform the plugins (that care).
     * @private
     * @method _processBundleUpdates
     * @async
     * @return {Promise/A+} A promise that will be fulfilled once bundle updates have been processed.
     */
    _processBundleUpdates: function () {
        var self = this,
            bundlePromises = [];

        Object.keys(this._bundleUpdates).forEach(function (bundleName) {
            var evt = self._bundleUpdates[bundleName],
                pluginPromises = [];
            evt.bundle = self._bundles[bundleName];
            // clear this now so that we can detect changes during handling of the bundle
            self._bundleUpdates = self._objectExclude(self._bundleUpdates, [bundleName]);
            self._plugins.forEach(function (plugin) {
                if (plugin.plugin[EVENT_BUNDLE_UPDATED]) {
                    pluginPromises.push(new libpromise.Promise(function (fulfill, reject) {
                        var ret;
                        try {
                            ret = plugin.plugin[EVENT_BUNDLE_UPDATED](evt, self._pluginAPI);
                        } catch (err) {
                            reject(err);
                        }
                        if (libpromise.Promise.isPromise(ret)) {
                            ret.then(fulfill, reject);
                        } else {
                            fulfill();
                        }
                    }));
                }
            });
            bundlePromises.push(libpromise.batch.apply(libpromise, pluginPromises));
        });

        return libpromise.batch.apply(libpromise, bundlePromises).then(function () {
            // It doesn't make sense to look for -just- bundle updates, since
            // bundle updates are triggered by file changes.
            if (self._fileQueue.length) {
                return self._processFileQueue();
            }
        });
    },


    /**
     * Processes the "_skip" rule to decide if the path should be skipped.
     * @private
     * @method _ruleSkip
     * @param {string} fullPath The full path to the file.
     * @param {string} relativePath The path relative to the bundle.
     * @param {object} rule The skip rule to process.
     * @return {boolean} True if the path should be skipped, false otherwise.
     */
    _ruleSkip: function (fullPath, relativePath, rule) {
        var r, regex;
        for (r = 0; r < rule.length; r += 1) {
            regex = rule[r];
            if (regex.test(relativePath)) {
                return true;
            }
        }
        return false;
    },


    /**
     * Processes the "_bundles" rule looking for child bundles.
     * Returns a "bundle seed" as described by _makeBundleSeed().
     *
     * @private
     * @method _ruleBundles
     * @param {string} fullPath The full path to the file.
     * @param {string} relativePath The path relative to the parent bundle.
     * @param {object} rule The bundles rule.
     * @param {Bundle} parent The parent bundle.
     * @return {object|undefined} The processing options if the path is a child bundle.
     */
    _ruleBundles: function (fullPath, relativePath, rule, parent) {
        var r,
            matches,
            defaultVersion = DEFAULT_VERSION,
            pkg;
        if (parent) {
            defaultVersion = parent.version;
        }
        for (r = 0; r < rule.length; r += 1) {
            matches = relativePath.match(rule[r].regex);
            if (matches) {
                try {
                    pkg = require(libpath.resolve(fullPath, 'package.json'));
                } catch (packageErr) {
                    // It's OK for a sub-bundle to not have a package.json.
                }
                return this._makeBundleSeed(fullPath, matches[1], defaultVersion, pkg, rule[r].options);
            }
        }
    },


    /**
     * Handles the file.
     * @private
     * @method _onFile
     * @async
     * @param {object} res Metadata about the file.
     * @param {object} ruleset Rules to attempt on the file.
     * @param {string} eventType What is happening to the file.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the file is handled.
     */
    _onFile: function (res, ruleset, eventType) {
        var self = this,
            fileEvent = 'file' + eventType,
            evt = {file: res},
            bundle = this._bundles[res.bundleName],
            promises = [];

        if (EVENT_DELETED === eventType) {
            bundle.files = this._objectExclude(bundle.files, [res.fullPath]);
        } else {
            bundle.files[res.fullPath] = true;
        }

        if (!this._bundleUpdates[res.bundleName]) {
            this._bundleUpdates[res.bundleName] = {files: {}, resources: {}};
        }
        this._bundleUpdates[res.bundleName].files[res.relativePath] = res;

        this._plugins.forEach(function (plugin) {
            if (self._filterResource(res, plugin.filter) && plugin.plugin[fileEvent]) {
                promises.push(new libpromise.Promise(function (fulfill, reject) {
                    var ret;
                    try {
                        ret = plugin.plugin[fileEvent](evt, self._pluginAPI);
                    } catch (err) {
                        reject(err);
                    }
                    if (libpromise.Promise.isPromise(ret)) {
                        ret.then(fulfill, reject);
                    } else {
                        fulfill();
                    }
                }));
            }
        });

        return libpromise.batch.apply(libpromise, promises).then(function () {
            var ruleName,
                rule,
                match;

            for (ruleName in ruleset) {
                if (ruleset.hasOwnProperty(ruleName)) {
                    // Rules that start with "_" are special directives,
                    // and have already been handle by the time we get here.
                    if ('_' !== ruleName.charAt(0)) {
                        rule = ruleset[ruleName];
                        match = res.relativePath.match(rule.regex);
                        if (match) {
                            res.name = match[rule.nameKey || 1];
                            res.type = ruleName;
                            if (rule.subtypeKey) {
                                res.subtype = match[rule.subtypeKey] || '';
                            }
                            if (rule.selectorKey && match[rule.selectorKey]) {
                                res.selector = match[rule.selectorKey];
                            } else {
                                res.selector = DEFAULT_SELECTOR;
                            }
                            return self._onResource(res, eventType);
                        }
                    }
                }
            }
        });
    },


    /**
     * Handles the resource.
     * @private
     * @method _onResource
     * @async
     * @param {object} res The resource.
     * @param {string} eventType What is happening to the resource.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the resource is handled.
     */
    _onResource: function (res, eventType) {
        var self = this,
            resourceEvent = 'resource' + eventType,
            evt = {resource: res},
            bundle = this._bundles[res.bundleName],
            type = res.type,
            subtype,
            selector = res.selector,
            name = res.name,
            promises = [];

        if (res.type) {
            if (EVENT_DELETED === eventType) {
                if (res.hasOwnProperty('subtype')) {
                    subtype = res.subtype;
                    bundle.resources[selector][type][subtype] = this._objectExclude(bundle.resources[selector][type][subtype], [name]);
                    if (0 === Object.keys(bundle.resources[selector][type][subtype]).length) {
                        bundle.resources[selector][type] = this._objectExclude(bundle.resources[selector][type], [subtype]);
                    }
                } else {
                    bundle.resources[selector][type] = this._objectExclude(bundle.resources[selector][type], [name]);
                }
                if (0 === Object.keys(bundle.resources[selector][type]).length) {
                    bundle.resources[selector] = this._objectExclude(bundle.resources[selector], [type]);
                }
                if (0 === Object.keys(bundle.resources[selector]).length) {
                    bundle.resources = this._objectExclude(bundle.resources, [selector]);
                }
            } else {
                if (!bundle.resources[selector]) {
                    bundle.resources[selector] = {};
                }
                if (!bundle.resources[selector][type]) {
                    bundle.resources[selector][type] = {};
                }
                if (res.hasOwnProperty('subtype')) {
                    subtype = res.subtype;
                    if (!bundle.resources[selector][type][subtype]) {
                        bundle.resources[selector][type][subtype] = {};
                    }
                    bundle.resources[selector][type][subtype][name] = res;
                } else {
                    bundle.resources[selector][type][name] = res;
                }
            }
            if (!this._bundleUpdates[res.bundleName]) {
                this._bundleUpdates[res.bundleName] = {files: {}, resources: {}};
            }
            this._bundleUpdates[res.bundleName].resources[res.relativePath] = res;
        }

        this._plugins.forEach(function (plugin) {
            if (self._filterResource(res, plugin.filter) && plugin.plugin[resourceEvent]) {
                promises.push(new libpromise.Promise(function (fulfill, reject) {
                    var ret;
                    try {
                        ret = plugin.plugin[resourceEvent](evt, self._pluginAPI);
                    } catch (err) {
                        reject(err);
                    }
                    if (libpromise.Promise.isPromise(ret)) {
                        ret.then(fulfill, reject);
                    } else {
                        fulfill();
                    }
                }));
            }
        });

        return libpromise.batch.apply(libpromise, promises);
    },


    /**
     * Determines whether a resource is filtered or not.
     * @private
     * @method _filterResource
     * @param {LocatorResource} res The resource to filter.
     * @param {object} filter The filter.
     * @return {boolean} Whether resource passes the filter.
     */
    _filterResource: function (res, filter) {
        if (!filter || !Object.keys(filter).length) {
            return false;
        }
        if (filter.extensions) {
            // sugar for users
            if ('string' === typeof filter.extensions) {
                filter.extensions = filter.extensions.split(',');
            }
            if (filter.extensions.indexOf(res.ext) === -1) {
                return false;
            }
        }
        if (filter.types) {
            // sugar for users
            if ('string' === typeof filter.types) {
                filter.types = filter.types.split(',');
            }
            if (filter.types.indexOf(res.type) === -1) {
                return false;
            }
        }
        return true;
    },


    /**
     * Walks the resources in the bundle, optionally applying the filter along the way.
     * @private
     * @method _walkBundleResources
     * @param {Bundle} bundle The bundle containing resources.
     * @param {object} filter Filter for deciding which resources to return.
     * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which resources to return.
     * @param {string|[string]} [filter.types] The resources types for which resources to return.
     * @param {function} callback Callback to call for each resources.
     * @param {LocatorResource} callback.res The resource.
     * @param {nothing} callback.return Return value of callback is ignored.
     */
    _walkBundleResources: function (bundle, filter, callback) {
        var self = this,
            ruleset = self._loadRuleset(bundle);
        Object.keys(bundle.resources).forEach(function (selector) {
            Object.keys(bundle.resources[selector]).forEach(function (resType) {
                var rule = ruleset[resType];
                if (rule.subtypeKey) {
                    Object.keys(bundle.resources[selector][resType]).forEach(function (subtype) {
                        Object.keys(bundle.resources[selector][resType][subtype]).forEach(function (name) {
                            var res = bundle.resources[selector][resType][subtype][name];
                            if (self._filterResource(res, filter)) {
                                callback(res);
                            }
                        });
                    });
                } else {
                    Object.keys(bundle.resources[selector][resType]).forEach(function (name) {
                        var res = bundle.resources[selector][resType][name];
                        if (self._filterResource(res, filter)) {
                            callback(res);
                        }
                    });
                }
            });
        });
    },


    /**
     * Walks a directory and returns a list of metadata about locator packages
     * installed in that directory (including the package for the directory itself).
     * @private
     * @method _walkNPMTree
     * @async
     * @param {string} dir Directory to walk.
     * @param {integer} _depth [internal] Depth of the directory being walked.
     * Internally used for recursion.
     * @return {Promise/A+} A promise that will be fulfilled with information
     * about locator packages in the directory.  If the directory is not an NPM
     * package then the promise will be fulfilled with an undefined value.
     */
    _walkNPMTree: function (dir, _depth) {
        var self = this;
        _depth = _depth || 0;
        return new libpromise.Promise(function (fulfill, reject) {
            var pkg,
                seed,
                seeds = [];

            try {
                pkg = require(libpath.resolve(dir, 'package.json'));
                if ((0 === _depth) && (!pkg.locator)) {
                    pkg.locator = {};
                }
                seed = self._makeBundleSeed(dir, libpath.basename(dir), DEFAULT_VERSION, pkg);
                if (seed.options) {
                    seed.npmDepth = _depth;
                    seeds.push(seed);
                }
            } catch (packageErr) {
                // Some build environments leave extraneous directories in
                // node_modules and we should ignore them gracefully.
                // (trello board:Modown card:124)
                if ('MODULE_NOT_FOUND' === packageErr.code) {
                    fulfill(undefined);
                } else {
                    reject(packageErr);
                }
                return;
            }

            if (_depth < self._options.maxPackageDepth) {
                libfs.readdir(libpath.join(dir, 'node_modules'), function (readdirErr, subdirs) {
                    var subpkgsPromises = [];
                    if (readdirErr) {
                        if ('ENOENT' === readdirErr.code) {
                            // missing node_modules/ directory is OK
                            fulfill(seeds);
                            return;
                        }
                        reject(readdirErr);
                        return;
                    }
                    subdirs.forEach(function (subdir) {
                        if ('.' === subdir.substring(0, 1)) {
                            return;
                        }
                        subpkgsPromises.push(
                            self._walkNPMTree(libpath.join(dir, 'node_modules', subdir), _depth + 1)
                        );
                    });

                    return libpromise.batch.apply(libpromise, subpkgsPromises).then(function (subpkgsResults) {
                        // merge in found packages
                        if (subpkgsResults && Array.isArray(subpkgsResults)) {
                            subpkgsResults.forEach(function (subpkgResults) {
                                if (subpkgResults && subpkgResults.length) {
                                    seeds = seeds.concat(subpkgResults);
                                }
                            });
                        }
                        fulfill(seeds);
                        return seeds;
                    }, function (batchErr) {
                        reject(batchErr);
                    });
                });
            } else {
                fulfill(seeds);
            }
        });
    },


    /**
     * Figures out which bundles to use from the list.
     * The returned list is sorted first by NPM package depth then by name.
     * @private
     * @method _filterBundleSeeds
     * @param {array} all List of all bundle seeds from NPM packages.
     * @return {array} The metas of the packages to actually use.
     */
    _filterBundleSeeds: function (all) {
        var byDepth = {}, // name: depth: [metas]
            out = [];
        all.forEach(function (seed) {
            if (!byDepth[seed.name]) {
                byDepth[seed.name] = {};
            }
            if (!byDepth[seed.name][seed.npmDepth]) {
                byDepth[seed.name][seed.npmDepth] = [];
            }
            byDepth[seed.name][seed.npmDepth].push(seed);
        });
        Object.keys(byDepth).forEach(function (name) {
            var pkgDepths = byDepth[name],
                depths,
                minDepth,
                maxDepth,
                seeds;
            depths = Object.keys(pkgDepths);
            minDepth = Math.min.apply(Math, depths);
            maxDepth = Math.max.apply(Math, depths);
            seeds = pkgDepths[minDepth];
            if (1 === seeds.length) {
                if (minDepth !== maxDepth) {
                    imports.log('multiple "' + name + '" packages found, using ' + seeds[0].baseDirectory);
                }
                out.push(seeds[0]);
                return;
            }
            seeds.sort(function (a, b) {
                return libsemver.rcompare(a.version, b.version);
            });
            imports.log('multiple "' + name + '" packages found, using ' + seeds[0].baseDirectory);
            out.push(seeds[0]);
        });
        return out;
    },


    /**
     * Creates a bundle from an NPM package, and queues up files in the package.
     * @private
     * @method _walkBundle
     * @param {object} bundleSeed Metadata about the package. See the docs for _makeBundleSeed()
     * for format of this metadata.
     * @return {Promise/A+} A promise that will be fulfilled with the bundle
     * made from the NPM package.
     */
    _walkBundle: function (bundleSeed) {
        var self = this,
            parentName,
            parent;
        // TODO -- merge options (second arg) over bundleSeed.options

        parentName = self._getBundleNameByPath(libpath.dirname(bundleSeed.baseDirectory));
        parent = self._bundles[parentName];

        return this._makeBundle(bundleSeed, parent).then(function (bundle) {
            self._bundles[bundle.name] = bundle;

            return new libpromise.Promise(function (fulfill, reject) {
                var walker = new ScanFS(null, function (err, fullPath) {
                    var relativePath = libpath.relative(bundle.baseDirectory, fullPath);
                    if ('node_modules' === relativePath) {
                        return 'ignored';
                    }
                    if ('.' === relativePath.substr(0, 1)) {
                        return 'ignored';
                    }
                });
                walker.on('file', function (err, fullPath) {
                    if (!self._isBuildFile(fullPath)) {
                        self._fileQueue.push([EVENT_UPDATED, fullPath]);
                    }
                });
                walker.on('dir', function (err, fullPath) {
                    if (!self._isBuildFile(fullPath)) {
                        self._fileQueue.push([EVENT_UPDATED, fullPath]);
                    }
                });
                walker.on('done', function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(bundle);
                    }
                });
                walker.absolutely(bundle.baseDirectory);
            });
        });
    },


    /**
     * Loads the rulesets for the bundle (or seed).
     * @private
     * @method _loadRuleset
     * @param {Bundle|object} bundle The bundle (or bundle seed, see _makeBundleSeed())
     * to load the ruleset for.
     * @return {object} The ruleset, or undefined if we couldn't load it.
     */
    _loadRuleset: function (bundle) {
        var cacheKey = bundle.baseDirectory,
            rulesetsPath,
            rulesets,
            dir,
            name,
            rules;

        rulesetsPath = this._cacheRulesetsPath[cacheKey];
        if (rulesetsPath) {
            rulesets = require(rulesetsPath);
        } else {
            if (bundle.options && bundle.options.rulesets) {
                try {
                    rulesetsPath = libpath.resolve(bundle.baseDirectory, bundle.options.rulesets);
                    rulesets = require(rulesetsPath);
                } catch (errLocal) {
                    if ('MODULE_NOT_FOUND' !== errLocal.code) {
                        throw errLocal;
                    }
                }
                if (!rulesets) {
                    dir = bundle.baseDirectory;
                    while (dir) {
                        try {
                            rulesetsPath = libpath.resolve(dir, bundle.options.rulesets);
                            rulesets = require(rulesetsPath);
                            break;
                        } catch (errDir) {
                            if ('MODULE_NOT_FOUND' !== errDir.code) {
                                throw errDir;
                            }
                        }
                        try {
                            rulesetsPath = libpath.resolve(dir, 'node_modules', bundle.options.rulesets);
                            rulesets = require(rulesetsPath);
                            break;
                        } catch (errDep) {
                            if ('MODULE_NOT_FOUND' !== errDep.code) {
                                throw errDep;
                            }
                        }

                        // not found, iterate
                        dir = libpath.dirname(dir);
                        if ('node_modules' === libpath.basename(dir)) {
                            dir = libpath.dirname(dir);
                        }
                        if (this._rootDirectory && dir.length < this._rootDirectory.length) {
                            return;
                        }
                    }
                }
                if (rulesets) {
                    this._cacheRulesetsPath[cacheKey] = rulesetsPath;
                }
            } else {
                rulesets = DEFAULT_RULESETS;
            }
        }
        if (!rulesets) {
            return;
        }

        name = (bundle.options && bundle.options.ruleset) || DEFAULT_RULESET;
        rules = rulesets[name];
        if (rules) {
            rules._name = name;
        }
        return rules;
    },


    /**
     * Determines whether file is in the build directory.
     * @private
     * @method _isBuildFile
     * @param {string} path Full path to file.
     * @return {boolean} true if the file is in the build directory
     */
    _isBuildFile: function (path) {
        return this._options.buildDirectory && this._options.buildDirectory === path.substr(0, this._options.buildDirectory.length);
    },


    /**
     * Creates a new object with the certain keys excluded.
     * This is used instead of "delete" since that has performance implications in V8.
     * @private
     * @method _objectExclude
     * @param {object} srcObject The original object.
     * @param {array} excludeKeys The keys to exclude from the results.
     * @return {object} A version of the original object with the keys excluded.
     */
    _objectExclude: function (srcObject, excludeKeys) {
        var destObject = {},
            key;
        for (key in srcObject) {
            if (srcObject.hasOwnProperty(key)) {
                if (-1 === excludeKeys.indexOf(key)) {
                    destObject[key] = srcObject[key];
                }
            }
        }
        return destObject;
    }


};


/**
 * This is not a class instantiated by locator, but is here to document the
 * API of locator plugins.
 * @class LocatorPlugin
 */
/**
 * An object used to describe the plugin to humans and to the locator.
 * @property describe
 * @type object
 * @optional
 */
/**
 * Text summary for humans.
 * @property describe.summary
 * @type string
 * @optional
 */
/**
 * A default list of extensions for which the plugin should be used.
 * This cal be overridden by the application developer when then call
 * `locator.plug()`.
 * @property describe.extensions
 * @type string|[string]
 * @optional
 */
/**
 * Method called when a file is added or updated.
 * @method fileUpdated
 * @optional
 * @async
 * @param {object} event A description of the events.
 * @param {LocatorFileMeta} event.file Metadata about the file that was added or updated.
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the file. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
 */
/**
 * Method called when a file is deleted.
 * @method fileDeleted
 * @optional
 * @async
 * @param {object} event A description of the events.
 * @param {LocatorFileMeta} event.file Metadata about the file that was deleted.
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the file. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
 */
/**
 * Method called when a resource is added or updated.
 * @method resourceUpdated
 * @optional
 * @async
 * @param {object} event A description of the events.
 * @param {LocatorResource} event.resource The resource that was added or updated.
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the resource. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
 */
/**
 * Method called when a resource is deleted.
 * @method resourceDeleted
 * @optional
 * @async
 * @param {object} event A description of the events.
 * @param {LocatorResource} event.resource The resource that was deleted.
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the resource. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
 */
/**
 * Method called when a bundle is updated.
 * @method bundleUpdated
 * @optional
 * @async
 * @param {object} event A description of the events.
 * @param {Bundle} event.bundle The bundle.
 * @param {object} event.files Which files causing the event.  Keys are relative
 * paths and values are the same structure passed to fileUpdated().
 * @param {object} event.resources Which resources causing the event.  Keys are
 * relative paths and values are the same structure passed to resourceUpdated().
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the resource. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
 */


/**
 * This object contains metadata about a file on the filesystem.
 * It is passed to the plugins during `fileUpdated` and `fileDeleted`.
 * @class LocatorFileMeta
 */
/**
 * The name of the bundle to which the resource belongs.
 * @property bundleName
 * @type string
 */
/**
 * The full filesystem path to the resources.
 * @property fullPath
 * @type string
 */
/**
 * The filesystem path relative to the bundle.
 * @property relativePath
 * @type string
 */
/**
 * The filesystem extension of the resource.
 * Does not include the dot.
 * @property ext
 * @type string
 */


/**
 * This object represents a resource on the filesystem, and is passed to
 * plugins.
 * @class LocatorResource
 */
/**
 * The name of the bundle to which the resource belongs.
 * @property bundleName
 * @type string
 */
/**
 * The full filesystem path to the resources.
 * @property fullPath
 * @type string
 */
/**
 * The filesystem path relative to the bundle.
 * @property relativePath
 * @type string
 */
/**
 * The filesystem extension of the resource.
 * Does not include the dot.
 * @property ext
 * @type string
 */
/**
 * The name of the resource.
 * @property name
 * @type string
 */
/**
 * The type of the resource.
 * @property type
 * @type string
 */
/**
 * The subtype of the resource, if it has one.
 * @property subtype
 * @type string
 * @optional
 */
/**
 * The selector for the resource.
 * @property selector
 * @type string
 */


/**
 * Contains utility methods for plugins.
 * @class LocatorPluginAPI
 */
/**
 * Utility method for listing all files in a bundle.
 * @method getBundleFiles
 * @param {string} bundleName The name of the bundle.
 * @param {object} filter Filter for deciding which files to return.
 * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which files to return.
 * @return {[string]} An array of filesystem paths.
 */
/**
 * Utility method for listing all resources in a bundle.
 * @method getBundleResources
 * @param {string} bundleName The name of the bundle.
 * @param {object} filter Filter for deciding which resources to return.
 * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which resources to return.
 * @param {string|[string]} [filter.types] The resources types for which resources to return.
 * @return {[string]} An array of filesystem paths.
 */
/**
 * Utility method for creating a Promises/A+ promise.
 * @method promise
 * @param {function} fn A function to insert the logic that resolves
 * this promise.
 * @param {function} fn.fulfill A function to call to fulfill the promise.
 * @param {function} fn.reject A function to call to reject the promise.
 * @return {Promise/A} The promise.
 */
/**
 * A utility to write out a new resource.
 * @method writeFileInBundle
 * @async
 * @param {string} bundleName The name of the bundle to which the file belongs.
 * @param {string} relativePath The path of the file, relative to the bundle’s directory.
 * @param {string} contents The contents of the file.
 * @param {object} options Options for the underlying require('fs').writeFile() call.
 * @return {Promise/A} The new promise which will be fulfilled once the file is
 * written (or rejected on failure). If fulfilled, the fullpath to the new file will be
 * passed as an argument.
 */


module.exports = BundleLocator;


// hooks for testing
module.exports.test = {
    imports: imports
};



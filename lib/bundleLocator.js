/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true, continue:true */
"use strict";


var libdive = require('dive'),
    libfs = require('fs'),
    libmkdirp = require('mkdirp'),
    libpath = require('path'),
    libpromise = require('yui/promise'),
    libwatch = require('watch'),
    Bundle = require('./bundle'),
    rulesets = require('./rulesets'),
    imports = {
        log: console.log
    },
    DEFAULT_SELECTOR = '{}',
    EVENT_UPDATED = 'Updated',
    EVENT_DELETED = 'Deleted',
    EVENT_BUNDLE_UPDATED = 'bundleUpdated';


/**
 * The Locator walks the filesystem and gives semantic meaning to
 * files in the application.
 * @module ModownLocator
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
                ruleset,
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
     * @return {nothing}
     */
    plug: function (plugin) {
        this._plugins.push({
            filter: plugin.describe || {},
            plugin: plugin
        });
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
        return this._makeBundle(dir, options || {}).then(function () {
            self._rootBundleName = self._bundlePaths[dir];
            return new libpromise.Promise(function (fulfill, reject) {
                libdive(dir,
                    {
                        all: false,         // no dot files
                        directories: true,  // so we find node_modules/foo/ as a separate item
                        files: true,
                        recursive: true
                    },
                    function divePath(err, path) {
                        if (err) {
                            // TODO:  This isn't quite right, since we could reject the
                            // promise mulitple times if there are more than one error.
                            // (The dive library doesn't stop when an error occurs.)
                            reject(err);
                            return;
                        }

                        // Ignore files written to buildDirectory that don't
                        // happen via api.writeFileInBundle()
                        if (self._isBuildFile(path)) {
                            return;
                        }

                        self._fileQueue.push([EVENT_UPDATED, path]);
                    },
                    function diveDone() {
                        if (self._fileQueue.length) {
                            self._processFileQueue().then(function () {
                                try {
                                    fulfill(self._bundles[self._getBundleNameByPath(dir)]);
                                } catch (err) {
                                    reject(err);
                                }
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
     * Watches a filesystem directory for changes.
     * Changes are communicated to the plugins via the `fileUpdated`,
     * `fileDeleted`, `resourceUpdated`, and `resourceDeleted` methods.
     * @method watch
     * @param {string} dir The directory to watch.
     * @return {Promise/A+} A promise that will be fulfilled once watching is setup.
     */
    watch: function (dir) {
        var self = this;
        return new libpromise.Promise(function (fulfill, reject) {
            libwatch.createMonitor(dir, {ignoreDotFiles: true}, function (monitor) {
                // Ignore files written to buildDirectory that don't
                // happen via api.writeFileInBundle()
                monitor.on('created', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_UPDATED, path]);
                        self._processFileQueue().then(function () {
                            // success isn't that interesting
                        }, function (err) {
                            imports.log('Error processing file ' + path);
                            imports.log(err.stack);
                        });
                    }
                });
                monitor.on('changed', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_UPDATED, path]);
                        self._processFileQueue().then(function () {
                            // success isn't that interesting
                        }, function (err) {
                            imports.log('Error processing file ' + path);
                            imports.log(err.stack);
                        });
                    }
                });
                monitor.on('removed', function (path) {
                    if (!self._isBuildFile(path)) {
                        self._fileQueue.push([EVENT_DELETED, path]);
                        self._processFileQueue().then(function () {
                            // success isn't that interesting
                        }, function (err) {
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
            if (0 === findPath.indexOf(bundlePath)) {
                found[bundlePath.length] = bundlePath;
            }
        });
        longest = Math.max.apply(Math, Object.keys(found));
        return this._bundlePaths[found[longest]];
    },


    /**
     * Makes a bundle out of a directory.
     * @private
     * @method _makeBundle
     * @async
     * @param {string} path The path of the bundle.
     * @param {object} options Options for processing the bundle.
     * @return {Promise/A+} A promise that will be fulfilled with the new bundle,
     * or undefined if the path isn't a modown bundle.
     */
    _makeBundle: function (path, options) {
        var self = this;
        return new libpromise.Promise(function (fulfill, reject) {
            var pkg,
                name = libpath.basename(path),
                bundle,
                ruleset = options.ruleset;

            try {
                pkg = require(libpath.resolve(path, 'package.json'));
                if (pkg.modown) {
                    if (pkg.modown.location) {
                        // This is fairly legacy, and we might be able to remove it.
                        path = libpath.resolve(path, pkg.modown.location);
                    }
                    if (pkg.modown.ruleset) {
                        ruleset = pkg.modown.ruleset;
                    }
                }
                name = pkg.name;
            } catch (err) {
                // missing package.json is OK for some bundle types
                // (specifically mojito-mojit)
            }
            if (!ruleset) {
                // Since we don't know how to parse this directory as a bundle
                // we can't really say that this directory is a bundle.
                // That's OK, since not every thing that's detected as a bundle
                // via a ruleset is -actually- a bundle.  (For example, not
                // every NPM module is a modown bundle.)
                fulfill();
                return;
            }
            if (!rulesets[ruleset]) {
                reject(new Error('Bundle "' + name + '" has unknown type "' + ruleset + '"'));
                return;
            }

            bundle = new Bundle(path, options);
            bundle.name = name;
            bundle.type = ruleset;
            self._bundles[name] = bundle;
            self._bundlePaths[bundle.baseDirectory] = name;
            if (self._options.buildDirectory) {
                bundle.buildDirectory = libpath.resolve(self._options.buildDirectory, name);
                self._bundlePaths[bundle.buildDirectory] = name;
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
            fullPath;

        event = this._fileQueue.shift();
        eventType = event[0];
        fullPath = event[1];
        return new libpromise.Promise(function (fulfill, reject) {
            var bundleName,
                bundle,
                ruleset,
                relativePath,
                options,
                res;

            bundleName = self._getBundleNameByPath(fullPath);
            bundle = self._bundles[bundleName];
            ruleset = rulesets[bundle.type];

            if (bundle.baseDirectory === fullPath.substr(0, bundle.baseDirectory.length)) {
                relativePath = fullPath.substr(bundle.baseDirectory.length + 1);
            } else if (bundle.buildDirectory === fullPath.substr(0, bundle.buildDirectory.length)) {
                relativePath = fullPath.substr(bundle.buildDirectory.length + 1);
            }

            if (ruleset._skip && self._ruleSkip(fullPath, relativePath, ruleset._skip)) {
                fulfill();
                return;
            }
            if (ruleset._bundles) {
                options = self._ruleBundles(relativePath, ruleset._bundles);
                if (options) {
                    return self._makeBundle(fullPath, options).then(function (newBundle) {
                        // What looks like a bundle in the filesystem path might
                        // not actually be a modown bundle.  (This is especially
                        // true for NPM modules that aren't modown bundles.)
                        if (newBundle) {
                            bundle.bundles = bundle.bundles || {};
                            bundle.bundles[newBundle.name] = newBundle;
                        }
                        fulfill();
                    }, reject);
                }
            }

            if ('node_modules' === relativePath.substr(0, 12)) {
                // File belongs to an NPM module that isn't actually a
                // modown bundle.
                fulfill();
                return;
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
     * @private
     * @method _ruleBundles
     * @param {string} relativePath The path relative to the parent bundle.
     * @param {object} rule The bundles rule.
     * @return {object|undefined} The processing options if the path is a child bundle.
     */
    _ruleBundles: function (relativePath, rule) {
        var r,
            regex;
        for (r = 0; r < rule.length; r += 1) {
            regex = rule[r].regex;
            if (regex.test(relativePath)) {
                return rule[r].options || {};
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
                    if ('_' === ruleName.charAt(0)) {
                        continue;
                    }

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
            ruleset = rulesets[bundle.type];
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



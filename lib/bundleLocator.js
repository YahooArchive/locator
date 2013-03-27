/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
"use strict";


var libdive = require('dive'),
    libfs = require('fs'),
    libmkdirp = require('mkdirp'),
    libpath = require('path'),
    libpromise = require('yui/promise'),
    Bundle = require('./bundle'),
    rulesets = require('./rulesets'),
    DEFAULT_SELECTOR = '{}',
    ADD_EVENT = 'resourceAdded';


/**
 * The Locator walks the filesystem and gives semantic meaning to
 * files in the application.
 * @module ModownLocator
 */


/**
 * @class Locator
 * @constructor
 * @param {object} options Options for how the configuration files are located.
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
    this._eventQueue = [];
    this._plugins = [];
    this._pluginAPI = {
        promise: function(fn) {
            return new libpromise.Promise(fn);
        },
        writeFileInBundle: function(bundleName, relativePath, contents, options) {
            return new libpromise.Promise(function(fulfill, reject) {
                var bundle,
                    path;
                bundle = self._bundles[bundleName];
                if (!bundle) {
                    reject(new Error('Unknown bundle "' + bundleName + '"'));
                    return;
                }
                path = libpath.resolve(bundle.buildDirectory ||
                                       bundle.baseDirectory, relativePath);
                libmkdirp(libpath.dirname(path), null, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        libfs.writeFile(path, contents, options, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                self._eventQueue.push([ADD_EVENT, path]);
                                fulfill();
                            }
                        });
                    }
                });
            }).then(function() {
                if (self._eventQueue.length) {
                    return self._processEvent(self._eventQueue.shift());
                }
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
     * @param {object} filter Filter for deciding which resources for which the plugin will be called.
     * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which the plugin should be called.
     * @param {string|[string]} [filter.types] The resources types for which the plugin should be called.
     * @param {LocatorPlugin} plugin The plugin to be used.
     * @return {nothing}
     */
    plug: function(filter, plugin) {
        if (!filter || !Object.keys(filter).length) {
            // FUTURE:  log error (once we know how)
            return;
        }
        // sugar for users
        if (filter.extensions && 'string' === typeof filter.extensions) {
            filter.extensions = filter.extensions.split(',');
        }
        if (filter.types && 'string' === typeof filter.types) {
            filter.types = filter.types.split(',');
        }
        this._plugins.push({
            filter: filter,
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
    parseBundle: function(dir, options) {
        var self = this;
        return this._makeBundle(dir, options || {}).then(function() {
            return new libpromise.Promise(function(fulfill, reject) {
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
                        self._eventQueue.push([ADD_EVENT, path]);
                    },
                    function diveDone() {
                        if (self._eventQueue.length) {
                            self._processEvent(self._eventQueue.shift()).then(function() {
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
    getBundle: function(name) {
        return this._bundles[name];
    },


    /**
     * Returns the name of the bundle to which the path belongs.
     * @private
     * @method _getBundleNameByPath
     * @param {string} findPath The path to consider.
     * @return {string} The name the bundle to which the findPath most closely matches.
     */
    _getBundleNameByPath: function(findPath) {
        // FUTURE OPTIMIZATION:  use a more complicated datastructure for faster lookups
        var found = {}, // length: path
            longest;
        Object.keys(this._bundlePaths).forEach(function(bundlePath) {
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
    _makeBundle: function(path, options) {
        var self = this;
        return new libpromise.Promise(function(fulfill, reject) {
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
     * @method _processEvent
     * @async
     * @param {array} event Filesystem event.
     * @param {string} event.0 What is happening to the path.
     * @param {string} event.1 The full filesystem path.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the path is processed.
     */
    _processEvent: function(event) {
        var self = this,
            what = event[0],
            fullPath = event[1];
        return new libpromise.Promise(function(fulfill, reject) {
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
                    return self._makeBundle(fullPath, options).then(function(newBundle) {
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

            // Make basics here, and only flesh out with details
            // once we've found a resource (by matching a rule).
            res = {
                bundleName: bundleName,
                bundlePath: bundle.baseDirectory,
                fullPath: fullPath,
                relativePath: relativePath,
                selector: DEFAULT_SELECTOR
            };

            // FUTURE OPTIMIZATION:  use for() loop so that we can break
            // if a rule matches.
            Object.keys(ruleset).forEach(function(ruleName) {
                var rule = ruleset[ruleName],
                    match,
                    subtype;

                // These special ones are handled already.
                if ('_' === ruleName.charAt(0)) {
                    return;
                }
                match = relativePath.match(rule.regex);
                if (match) {
                    res.name = match[rule.nameKey || 1];
                    res.type = ruleName;
                    if (rule.subtypeKey) {
                        res.subtype = match[rule.subtypeKey];
                    }
                    if (rule.selectorKey && match[rule.selectorKey]) {
                        res.selector = match[rule.selectorKey];
                    }
                }
            });

            if (res.type) {
                res.ext = libpath.extname(fullPath);
                libfs.stat(fullPath, function(err, stat) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    res.stat = stat;
                    self._onResource(res, what).then(fulfill, reject);
                });
            } else {
                // Resource doesn't match any rules, which is OK.
                fulfill();
            }
        }).then(function() {
            // This handles the list of initially walked paths/resources.
            // The list can change as new files are added.
            if (self._eventQueue.length) {
                return self._processEvent(self._eventQueue.shift());
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
    _ruleSkip: function(fullPath, relativePath, rule) {
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
    _ruleBundles: function(relativePath, rule) {
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
     * Handles the resource.
     * @private
     * @method _onResource
     * @async
     * @param {object} res The resource.
     * @param {string} what What is happening to the resource.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the resource is handled.
     */
    _onResource: function(res, what) {
        var self = this,
            ext = res.ext.substring(1),
            promises = [];

        this._plugins.forEach(function(plugin) {
            if (self._filterResource(res, plugin.filter)) {
                // Wrap all plugins in promises, so that sync plugins won't
                // run before async ones.
                promises.push(new libpromise.Promise(function(fulfill, reject) {
                    var ret = plugin.plugin[what](res, self._pluginAPI);
                    if (libpromise.Promise.isPromise(ret)) {
                        ret.then(fulfill, reject);
                    } else {
                        fulfill();
                    }
                }));
            }
        });

        // Wait until plugins are done to actually handle the resource change.
        promises.push(new libpromise.Promise(function(fulfill, reject) {
            var bundle = self._bundles[res.bundleName],
                type = res.type,
                subtype = res.subtype,
                selector = res.selector,
                name = res.name;
            // TODO:  resourceDeleted()
            if (!bundle.resources[selector]) {
                bundle.resources[selector] = {};
            }
            if (!bundle.resources[selector][type]) {
                bundle.resources[selector][type] = {};
            }
            if (subtype) {
                if (!bundle.resources[selector][type][subtype]) {
                    bundle.resources[selector][type][subtype] = {};
                }
                bundle.resources[selector][type][subtype][name] = res.fullPath;
            } else {
                bundle.resources[selector][type][name] = res.fullPath;
            }
            fulfill();
        }));
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
    _filterResource: function(res, filter) {
        if (!filter || !Object.keys(filter).length) {
            return false;
        }
        if (filter.extensions && filter.extensions.indexOf(res.ext.substring(1)) === -1) {
            return false;
        }
        if (filter.types && filter.types.indexOf(res.type) === -1) {
            return false;
        }
        return true;
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
 * Method called when a resource is added or updated.
 * @method resourceAdded
 * @optional
 * @async
 * @param {LocatorResource} res The resource that was added or updated.
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
 * @param {LocatorResource} res The resource that was deleted.
 * @param {LocatorPluginAPI} api An "api" object that has utility methods.
 * @return {Promise|undefined} Return a Promise/A
 * (http://wiki.commonjs.org/wiki/Promises/A) that the plugin will resolve once
 * it is done handling the resource. If the plugin returns undefined it
 * signifies that it is already done.  If the plugin has asynchronous work to
 * do it is -strongly- -advised- to return a promise, so as not to block the
 * locator.
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
 * The filesystem path of the bundle to which the resource belongs.
 * @property bundlePath
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
 * @property {string} selector The seletor for the resource.
 * @type string
 */
/**
 * The filesystem extension of the resource.
 * @property ext
 * @type string
 */
/**
 * The filesystem statistics about the resource.
 * @property stat
 * @type Stat
 */


/**
 * Contains utility methods for plugins.
 * @class LocatorPluginAPI
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
 * @return {Promise/A} The new promise which will be fulfilled once the file is written (or rejected on failure).
 */


module.exports = BundleLocator;



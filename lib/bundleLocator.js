/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
"use strict";


var libpath = require('path'),
    libfs = require('fs'),
    libdive = require('dive'),
    libasync = require('async'),
    Promise = require('yui/promise').Promise,
    Bundle = require('./bundle'),
    rulesets = require('./rulesets'),
    DEFAULT_SELECTOR = '{}';


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
    this._bundles = {};
    this._bundlePaths = {}; // path: name

    this._walkQueue = [];

    /* TODO PLUGINS
    this._plugins = 'TODO PLUGINS';
    this._pluginAPI = {
        promise: function(fn) {
            return new Promise(fn);
        },
        writeFile: function(path, contents, options) {
            return new Promise(function(fulfill, reject) {
                self.walkQueue.push(path);
                libfs.writeFile(path, contents, options, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill();
                    }
                });
            });
        }
    };
    */
}


BundleLocator.prototype = {


    /* TODO PLUGINS
    plug: function(extensions, plugin) {
    },
    */


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
        return this._makeBundle(dir, options).then(function() {
            return new Promise(function(fulfill, reject) {
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
                        self._walkQueue.push(path);
                    },
                    function diveDone() {
                        if (self._walkQueue.length) {
                            self._processPath(self._walkQueue.shift()).then(function() {
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
     * @asyc
     * @param {string} path The path of the bundle.
     * @param {object} options Options for processing the bundle.
     * @return {Promise/A+} A promise that will be fulfilled with the new bundle,
     * or undefined if the path isn't a modown bundle.
     */
    _makeBundle: function(path, options) {
        var self = this;
        return new Promise(function(fulfill, reject) {
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
            self._bundlePaths[path] = name;
            fulfill(bundle);
        });
    },


    /**
     * Turns the path into a resource in the associated bundle, if applicable.
     * @private
     * @method _processPath
     * @async
     * @param {string} fullPath The path to process.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the path is processed.
     */
    _processPath: function(fullPath) {
        var self = this;
        return new Promise(function(fulfill, reject) {
            var bundleName,
                bundle,
                ruleset,
                relativePath,
                options,
                res;

            bundleName = self._getBundleNameByPath(fullPath);
            bundle = self._bundles[bundleName];
            ruleset = rulesets[bundle.type];

            relativePath = fullPath.substr(bundle.baseDirectory.length + 1);

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
                    self._onResource(res).then(function() {
                        fulfill();
                    }, reject);
                });
            } else {
                // Resource doesn't match any rules, which is OK.
                fulfill();
            }
        }).then(function() {
            if (self._walkQueue.length) {
                return self._processPath(self._walkQueue.shift());
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
     * @param {object} res The resource.
     * @return {Promise/A+} A promise that will be fulfilled once
     * the resource is handled.
     */
    _onResource: function(res) {
        var self = this;
        return new Promise(function(fulfill, reject) {
            // TODO PLUGINS
            var bundle = self._bundles[res.bundleName],
                type = res.type,
                subtype = res.subtype,
                selector = res.selector,
                name = res.name;
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
                bundle.resources[selector][type][subtype][name] = res.relativePath;
            } else {
                bundle.resources[selector][type][name] = res.relativePath;
            }
            fulfill();
        });
    }


};


module.exports = BundleLocator;



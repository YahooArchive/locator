/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
"use strict";


var libpath = require('path'),
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
    this._options = options || {};
    this._bundles = {};
}


BundleLocator.prototype = {


    /**
     * @method parseBundle
     * @async
     * @param {string} dir The directory for the bundle.
     * @param {object} [options] Options for processing the bundle.
     * @return {Promise} A promise that will be fulfilled with the bundle.
     */
    parseBundle: function(dir, options) {
        var self = this,
            bundle = new Bundle(dir, options);

        return this._parseBundle(bundle);
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
     * Finds resources in a bundle.
     * @method _parseBundle
     * @async
     * @param {Bundle} bundle The bundle in which to find resources.
     * @return {Promise}
     */
    _parseBundle: function(bundle) {
        var self = this,
            ruleset = bundle.options.ruleset;
        return new Promise(function(fulfill, reject) {
            var pkg;
            try {
                pkg = require(libpath.resolve(bundle.baseDirectory, 'package.json'));
                bundle.name = pkg.name;
                if (pkg.modown) {
                    if (pkg.modown.location) {
                        // This is fairly legacy, and we might be able to remove it.
                        bundle.baseDirectory = libpath.resolve(bundle.baseDirectory, pkg.modown.location);
                    }
                    if (pkg.modown.ruleset) {
                        ruleset = pkg.modown.ruleset;
                    }
                }
            } catch (err) {
                // missing package.json is OK for some bundle types
            }
            if ('string' === typeof ruleset) {
                bundle.type = ruleset;
                ruleset = rulesets[ruleset];
            }
            if (!ruleset) {
                fulfill(bundle);
                return;
            }
            // FUTURE:  pre-process ruleset for faster iteration

            // FUTURE:  use something more efficient than dive
            libdive(bundle.baseDirectory,
                {
                    all: false,         // no dot files
                    directories: true,  // so we find node_modules/foo/ as a separate item
                    files: true,
                    recursive: true
                },
                function divePath(err, fullPath) {
                    var shortPath;
                    if (err) {
                        // TODO:  This isn't quite right, since we could reject the
                        // promise mulitple times if there are more than one error.
                        // (The dive library doesn't stop when an error occurs.)
                        reject(err);
                        return;
                    }
                    shortPath = fullPath.substr(bundle.baseDirectory.length + 1);
                    self._processPath(bundle, fullPath, shortPath, ruleset);
                },
                function diveDone() {
                    var list;
                    if (bundle.bundles) {
                        list = [];
                        Object.keys(bundle.bundles).forEach(function(childName) {
                            var child = bundle.bundles[childName];
                            list.push(function(asyncCb) {
                                self._parseBundle(child).then(function(child) {
                                    // skip child bundles that aren't actually usable
                                    if (!child.type) {
                                        delete bundle.bundles[childName];
                                    }
                                    asyncCb();
                                }, function(err) {
                                    asyncCb(err);
                                });
                            });
                        });
                        libasync.parallel(list, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                fulfill(bundle);
                            }
                        });
                    } else {
                        fulfill(bundle);
                    }
                });
        }).then(function(bundle) {
            if (bundle.type) {
                self._bundles[bundle.name] = bundle;
            }
            return bundle;
        });
    },


    /**
     * Processes a file path.
     * @private
     * @method _processPath
     * @param {Bundle} bundle The bundle in which the path was found.
     * @param {string} fullPath The full path to the file.
     * @param {string} shortPath The path relative to the bundle.
     * @param {object} ruleset The rules to use to process the path.
     * @return {nothing}
     */
    _processPath: function(bundle, fullPath, shortPath, ruleset) {
        var self = this,
            skip = false;
        Object.keys(ruleset).forEach(function(ruleName) {
            var rule = ruleset[ruleName],
                match,
                name,
                selector = DEFAULT_SELECTOR,
                subtype;

            if (skip) {
                return;
            }

            // These two are non-standard, so handle them separately.
            if ('_skip' === ruleName) {
                skip = self._skipPath(fullPath, shortPath, rule);
                return;
            }
            if ('_bundles' === ruleName) {
                self._processChildBundles(bundle, fullPath, shortPath, rule);
                return;
            }

            match = shortPath.match(rule.regex);
            if (match) {
                name = match[rule.nameKey || 1];
                if (rule.selectorKey && match[rule.selectorKey]) {
                    selector = match[rule.selectorKey];
                }
                if (!bundle.resources[selector]) {
                    bundle.resources[selector] = {};
                }
                if (!bundle.resources[selector][ruleName]) {
                    bundle.resources[selector][ruleName] = {};
                }
                if (rule.subtypeKey) {
                    subtype = match[rule.subtypeKey];
                    if (!bundle.resources[selector][ruleName][subtype]) {
                        bundle.resources[selector][ruleName][subtype] = {};
                    }
                    bundle.resources[selector][ruleName][subtype][name] = shortPath;
                } else {
                    bundle.resources[selector][ruleName][name] = shortPath;
                }
            }
        });
    },


    /**
     * @private
     * @method _skipPath
     * @param {string} fullPath The full path to the file.
     * @param {string} shortPath The path relative to the bundle.
     * @param {object} rule The skip rule to process.
     * @return {boolean} True if the path should be skipped, false otherwise.
     */
    _skipPath: function(fullPath, shortPath, rule) {
        var r, regex;
        for (r = 0; r < rule.length; r += 1) {
            regex = rule[r];
            if (regex.test(shortPath)) {
                return true;
            }
        }
        return false;
    },


    /**
     * @private
     * @method _processChildBundles
     * @param {Bundle} bundle The bundle in which the children were found.
     * @param {string} fullPath The full path to the file.
     * @param {string} shortPath The path relative to the bundle.
     * @param {object} rule The bundles rule to process.
     * @return {nothing}
     */
    _processChildBundles: function(bundle, fullPath, shortPath, rule) {
        var r,
            regex,
            options,
            child;
        for (r = 0; r < rule.length; r += 1) {
            regex = rule[r].regex;
            if (regex.test(shortPath)) {
                options = rule[r].options || {};
                child = new Bundle(fullPath, options);
                bundle.bundles = bundle.bundles || {};
                bundle.bundles[child.name] = child;
            }
        }
    }


};


module.exports = BundleLocator;



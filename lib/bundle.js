/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, anon:true, node:true */
"use strict";


var path = require('path'),
    dive = require('dive'),
    async = require('async'),
    Promise = require('yui/promise').Promise,
    rulesets = require('./rulesets'),
    DEFAULT_SELECTOR = '{}';


/**
 * The Locator walks the filesystem and gives semantic meaning to
 * files in the application.
 * @module ModownLocator
 */


/**
 * @class Bundle
 * @constructor
 * @param {string} baseDirectory Directory in which a bundle is rooted.
 * @param {object} options Options for how the configuration files are handled.
 */
function Bundle(baseDirectory, options) {
    this.options = options || {};
    this.name = path.basename(baseDirectory);
    this.baseDirectory = baseDirectory;
    this.type = undefined;
    this.resources = {};
}


Bundle.prototype = {


    /**
     * Returns resources that match the selector.
     * @method getResources
     * @param {object} options Options for returned resources
     * @param {string} [selector] Selector for the returned resources.
     * If none is given then the resources which have no selector will
     * be returned.
     * @return {object} The resources.
     */
    getResources: function(options, selector) {
        selector = selector || DEFAULT_SELECTOR;
        return this.resources[selector];
    },


    /**
     * Finds the resources in the bundle.
     * @method findResources
     * @async
     * @return {Promise}
     */
    findResources: function() {
        var self = this,
            ruleset = this.options.ruleset,
            promise;

        promise = new Promise(function(fulfill, reject) {
            var pkg;
            try {
                pkg = require(path.resolve(self.baseDirectory, 'package.json'));
                self.name = pkg.name;
                if (pkg.modown) {
                    if (pkg.modown.location) {
                        // This is fairly legacy, and we might be able to remove it.
                        self.baseDirectory = path.resolve(self.baseDirectory, pkg.modown.location);
                    }
                    if (pkg.modown.ruleset) {
                        ruleset = pkg.modown.ruleset;
                    }
                }
            } catch (err) {
                // missing package.json is OK for some bundle types
            }
            if ('string' === typeof ruleset) {
                self.type = ruleset;
                ruleset = rulesets[ruleset];
            }
            if (!ruleset) {
                fulfill(self);
                return;
            }
            // FUTURE:  pre-process ruleset for faster iteration

            // FUTURE:  use something more efficient than dive
            dive(self.baseDirectory,
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
                    shortPath = fullPath.substr(self.baseDirectory.length + 1);
                    self._processPath(fullPath, shortPath, ruleset);
                },
                function diveDone() {
                    var list;
                    if (self.bundles) {
                        list = [];
                        Object.keys(self.bundles).forEach(function(bundleName) {
                            var bundle = self.bundles[bundleName];
                            list.push(function(asyncCb) {
                                bundle.findResources().then(function(bundle) {
                                    // skip child bundles that aren't actually usable
                                    if (!bundle.type) {
                                        delete self.bundles[bundleName];
                                    }
                                    asyncCb();
                                }, function(err) {
                                    asyncCb(err);
                                });
                            });
                        });
                        async.parallel(list, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                fulfill(self);
                            }
                        });
                    } else {
                        fulfill(self);
                    }
                });
        });

        return promise;
    },


    /**
     * Processes a file path.
     * @private
     * @method _processPath
     * @param {string} fullPath The full path to the file.
     * @param {string} shortPath The path relative to the bundle.
     * @param {object} ruleset The rules to use to process the path.
     * @return {nothing}
     */
    _processPath: function(fullPath, shortPath, ruleset) {
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
                self._processBundles(fullPath, shortPath, rule);
                return;
            }

            match = shortPath.match(rule.regex);
            if (match) {
                name = match[rule.nameKey || 1];
                if (rule.selectorKey && match[rule.selectorKey]) {
                    selector = match[rule.selectorKey];
                }
                if (!self.resources[selector]) {
                    self.resources[selector] = {};
                }
                if (!self.resources[selector][ruleName]) {
                    self.resources[selector][ruleName] = {};
                }
                if (rule.subtypeKey) {
                    subtype = match[rule.subtypeKey];
                    if (!self.resources[selector][ruleName][subtype]) {
                        self.resources[selector][ruleName][subtype] = {};
                    }
                    self.resources[selector][ruleName][subtype][name] = shortPath;
                } else {
                    self.resources[selector][ruleName][name] = shortPath;
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
     * @method _processBundles
     * @param {string} fullPath The full path to the file.
     * @param {string} shortPath The path relative to the bundle.
     * @param {object} rule The bundles rule to process.
     * @return {nothing}
     */
    _processBundles: function(fullPath, shortPath, rule) {
        var r,
            regex,
            options,
            bundle;
        for (r = 0; r < rule.length; r += 1) {
            regex = rule[r].regex;
            if (regex.test(shortPath)) {
                options = rule[r].options || {};
                bundle = new Bundle(fullPath, options);
                this.bundles = this.bundles || {};
                this.bundles[bundle.name] = bundle;
            }
        }
    }


};


module.exports = Bundle;



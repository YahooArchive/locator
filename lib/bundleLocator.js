/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true */
"use strict";


var libfs       = require('fs'),
    libpath     = require('path'),
    walk        = require('walk'),
    libsemver   = require('semver'),
    Module      = require("module").Module,
    Bundle      = require('./bundle.js'),
    debug       = require('debug')('locator'),
    DEFAULT_RULESET = 'main',
    DEFAULT_RULESETS = require('./rulesets.js'),
    DEFAULT_SELECTOR = '{}',
    DEFAULT_MAX_PACKAGES_DEPTH = 9999,
    DEFAULT_VERSION = '0.0.1',  // for bundles w/out a version or parent
    PATH_SEP = libpath.sep;

function mix(target, source, overwrite) {
    for (var prop in source) {
        if (source.hasOwnProperty(prop) && (overwrite || !target.hasOwnProperty(prop))) {
            target[prop] = source[prop];
        }
    }
    return target;
}

/**
 * The Locator walks the filesystem and gives semantic meaning to
 * files in the application.
 * @module Locator
 */


/**
 * @class Locator
 * @constructor
 * @param {object} [options] Options for how the configuration files are located.
 *   @param {string} [options.applicationDirectory] Where the application will be found.
 *   If not given it defaults to the current working directory.
 *   @param {[string]} [options.exclude] folder names that should not be analyzed
 * @param {integer} options.maxPackageDepth Maximum depth in `node_modules/` to walk.
 * Defaults to 9999.
 *
 * @example (note constructor "BundleLocator" is exported as "Locator")
 *      var locOpts = {
 *              applicationDirectory: __dirname,
 *              exclude: ['build'],
 *              maxPackageDepth: 5
 *          },
 *          locator = new Locator(locOpts);
 */
function BundleLocator(options) {
    this._options = options || {};
    if (this._options.applicationDirectory) {
        this._options.applicationDirectory = libpath.resolve(process.cwd(), this._options.applicationDirectory);
    } else {
        this._options.applicationDirectory = process.cwd();
    }
    this._options.maxPackageDepth = this._options.maxPackageDepth || DEFAULT_MAX_PACKAGES_DEPTH;
    this._options.exclude = this._options.exclude || [];

    this._cacheRulesetsPath = {};   // package directory: path to rulesets file

    this._bundles = {};
    this._bundlePaths = {}; // path: name
    this._bundleUpdates = {};   // name: object describing why the update happened
}


BundleLocator.prototype = {


    /**
     * Parses the directory to turn it into a bundle.
     * @method parseBundle
     * @param {string} dir The directory for the bundle.
     * @param {object} [options] Options for processing the bundle.
     *
     * @example (note constructor "BundleLocator" is exported as "Locator")
     *      var locator = new Locator();
     *      var appBundle = locator.parseBundle(__dirname, {});
     *
     * @return {Bundle} The bundle.
     */
    parseBundle: function (dir, options) {
        var self = this,
            bundleSeeds;

        // Normalize the root directory before storing its value. If it is
        // stored before normalizing, other paths created afterwards may be
        // normalized and fail comparisons against the root directory
        dir = libpath.normalize(dir);

        this._rootDirectory = dir;

        bundleSeeds = this._walkNPMTree(dir);
        bundleSeeds = this._filterBundleSeeds(bundleSeeds);
        bundleSeeds.forEach(function (bundleSeed) {
            var opts = (bundleSeed.baseDirectory === dir) ? options : {};
            self._walkBundle(bundleSeed, opts);
        });
        this._rootBundleName = this._bundlePaths[dir];
        return this._bundles[this._rootBundleName];
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
     * Utility method for listing all files in a bundle.
     * @method getBundleFiles
     * @param {string} bundleName The name of the bundle.
     * @param {object} filter Filter for deciding which files to return.
     * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which files to return.
     * @return {[string]} An array of filesystem paths.
     */
    getBundleFiles: function (bundleName, filter) {
        var bundle,
            files = [];
        bundle = this._bundles[bundleName];
        if (!bundle) {
            throw new Error('Unknown bundle "' + bundleName + '"');
        }
        Object.keys(bundle.files).forEach(function (fullpath) {
            var res = {
                    ext: libpath.extname(fullpath).substr(1)
                };
            if (this._filterResource(res, filter)) {
                files.push(fullpath);
            }
        }, this);
        return files;
    },


    /**
     * Utility method for listing all resources in a bundle.
     * @method getBundleResources
     * @param {string} bundleName The name of the bundle.
     * @param {object} filter Filter for deciding which resources to return.
     * @param {string|[string]} [filter.extensions] The filesystem extensions (NOT including dot) for which resources to return.
     * @param {string|[string]} [filter.types] The resources types for which resources to return.
     * @return {[string]} An array of filesystem paths.
     */
    getBundleResources: function (bundleName, filter) {
        var bundle = this._bundles[bundleName];
        if (!bundle) {
            throw new Error('Unknown bundle "' + bundleName + '"');
        }
        return this._walkBundleResources(bundle, filter);
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
            self._walkBundleResources(bundle, filter).forEach(function (res) {
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
                    libpath.sep === findPath.charAt(bundlePath.length))) {
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
            seed.name = (pkg.locator && pkg.locator.name ? pkg.locator.name : pkg.name);
            seed.version = pkg.version;
            seed.options = pkg.locator;
        }
        if (options) {
            if (seed.options) {
                // merge options under seed.options
                mix(seed.options, options);
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
     * @param {object} seed The seed bundle, @see _makeBundleSeed()
     * @param {Bundle} parent Parent bundle. Only the root bundle doesn't have a parent.
     * @return {Bundle} The new bundle
     */
    _makeBundle: function (seed, parent) {
        var bundle,
            ruleset = this._loadRuleset(seed),
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
            throw new Error(msg);
        }

        bundle = new Bundle(seed.baseDirectory, seed.options);
        bundle.name = seed.name;
        bundle.version = seed.version;
        bundle.type = ruleset._name;
        this._bundles[bundle.name] = bundle;
        this._bundlePaths[bundle.baseDirectory] = bundle.name;

        // wire into parent
        if (parent) {
            if (!parent.bundles) {
                parent.bundles = {};
            }
            parent.bundles[bundle.name] = bundle;
        }
        return bundle;
    },


    /**
     * Turns the path into a resource in the associated bundle, if applicable.
     * @private
     * @method _processFile
     * @param {string} fullPath the path to the file to be processed
     */
    _processFile: function (fullPath) {
        var bundleName,
            bundle,
            ruleset,
            relativePath,
            pathParts,
            subBundleSeed,
            res;

        bundleName = this._getBundleNameByPath(fullPath);
        bundle = this._bundles[bundleName];
        if (bundle.baseDirectory === fullPath.substr(0, bundle.baseDirectory.length)) {
            relativePath = fullPath.substr(bundle.baseDirectory.length + 1);
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
            bundle = this._bundles[bundleName];

            // The package's directory is not a resource (... and is mostly uninteresting).
            if (!relativePath) {
                return;
            }

            // unknown bundle
            if (!bundle) {
                return;
            }
        }

        ruleset = this._loadRuleset(bundle);
        if (ruleset._skip && this._ruleSkip(fullPath, relativePath, ruleset._skip)) {
            return;
        }
        if (ruleset._bundles) {
            subBundleSeed = this._ruleBundles(fullPath, relativePath, ruleset._bundles, bundle);
            if (subBundleSeed) {
                // sub-bundle inherits options.rulesets from parent
                if (!subBundleSeed.options) {
                    subBundleSeed.options = {};
                }
                if (!subBundleSeed.options.rulesets) {
                    subBundleSeed.options.rulesets = bundle.options.rulesets;
                }
                this._makeBundle(subBundleSeed, bundle);
                return;
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

        this._onFile(res, ruleset);
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

        relativePath = BundleLocator._toUnixPath(relativePath);

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

        relativePath = BundleLocator._toUnixPath(relativePath);

        for (r = 0; r < rule.length; r += 1) {
            matches = relativePath.match(rule[r].regex);
            if (matches) {
                try {
                    pkg = require(libpath.resolve(fullPath, 'package.json'));
                } catch (packageErr) {
                    // It's OK for a sub-bundle to not have a package.json.
                }
                return this._makeBundleSeed(fullPath, libpath.normalize(matches[1]), defaultVersion, pkg, rule[r].options);
            }
        }
    },


    /**
     * Handles the file.
     * @private
     * @method _onFile
     * @param {object} res Metadata about the file.
     * @param {object} ruleset Rules to attempt on the file.
     */
    _onFile: function (res, ruleset) {
        var bundle = this._bundles[res.bundleName],
            ruleName,
            rule,
            relativePath = BundleLocator._toUnixPath(res.relativePath),
            match;

        bundle.files[res.fullPath] = true;

        for (ruleName in ruleset) {
            if (ruleset.hasOwnProperty(ruleName)) {
                // Rules that start with "_" are special directives,
                // and have already been handle by the time we get here.
                if ('_' !== ruleName.charAt(0)) {
                    rule = ruleset[ruleName];
                    match = relativePath.match(rule.regex);
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
                        // file will become a resource after the first match
                        return this._onResource(res);
                    }
                }
            }
        }
    },


    /**
     * Handles the resource.
     * @private
     * @method _onResource
     * @param {object} res The resource.
     */
    _onResource: function (res) {
        var bundle = this._bundles[res.bundleName],
            type = res.type,
            subtype,
            selector = res.selector,
            name = res.name;

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
        if (filter && filter.extensions) {
            // sugar for users
            if ('string' === typeof filter.extensions) {
                filter.extensions = filter.extensions.split(',');
            }
            if (filter.extensions.indexOf(res.ext) === -1) {
                return false;
            }
        }
        if (filter && filter.types) {
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
     * @return {[LocatorResource]} A collection of filtered resources.
     */
    _walkBundleResources: function (bundle, filter) {
        var self = this,
            ruleset = this._loadRuleset(bundle),
            ress = [];
        Object.keys(bundle.resources).forEach(function (selector) {
            Object.keys(bundle.resources[selector]).forEach(function (resType) {
                var rule = ruleset[resType];
                if (rule.subtypeKey) {
                    Object.keys(bundle.resources[selector][resType]).forEach(function (subtype) {
                        Object.keys(bundle.resources[selector][resType][subtype]).forEach(function (name) {
                            var res = bundle.resources[selector][resType][subtype][name];
                            if (self._filterResource(res, filter)) {
                                ress.push(res);
                            }
                        });
                    });
                } else {
                    Object.keys(bundle.resources[selector][resType]).forEach(function (name) {
                        var res = bundle.resources[selector][resType][name];
                        if (self._filterResource(res, filter)) {
                            ress.push(res);
                        }
                    });
                }
            });
        });
        return ress;
    },


    /**
     * Walks a directory and returns a list of metadata about locator packages
     * installed in that directory (including the package for the directory itself).
     * @private
     * @method _walkNPMTree
     * @param {string} dir Directory to walk.
     * @param {integer} _depth [internal] Depth of the directory being walked.
     * Internally used for recursion.
     * @return {Array} information about locator packages in the directory.
     * If the directory is not an NPM package then it returns undefined value.
     */
    _walkNPMTree: function (dir, _depth) {
        var self = this,
            pkg,
            seed,
            seeds = [],
            subdirs;

        _depth = _depth || 0;

        try {
            pkg = require(libpath.resolve(dir, 'package.json'));
            if ((0 === _depth) && (!pkg.locator)) {
                pkg.locator = {};
            }
            seed = this._makeBundleSeed(dir, libpath.basename(dir), DEFAULT_VERSION, pkg);
            if (seed.options) {
                seed.npmDepth = _depth;
                seeds.push(seed);
            }
        } catch (packageErr) {
            // Some build environments leave extraneous directories in
            // node_modules and we should ignore them gracefully.
            // (trello board:Modown card:124)
            if ('MODULE_NOT_FOUND' !== packageErr.code) {
                throw packageErr;
            }
            return seeds;
        }

        if (_depth < this._options.maxPackageDepth) {
            try {
                subdirs = libfs.readdirSync(libpath.join(dir, 'node_modules'));
            } catch (readdirErr) {
                if ('ENOENT' === readdirErr.code) {
                    // missing node_modules/ directory is OK
                    return seeds;
                }
                throw readdirErr;
            }
            subdirs.forEach(function (subdir) {
                var subpkgResults;
                if ('.' === subdir.substring(0, 1)) {
                    return;
                }
                subpkgResults = self._walkNPMTree(libpath.join(dir, 'node_modules', subdir), _depth + 1);
                // merge in found packages
                if (subpkgResults && subpkgResults.length) {
                    seeds = seeds.concat(subpkgResults);
                }
            });
        }
        return seeds;
    },


    /**
     * Figures out which seed to use from the list of available packages.
     * Select by depth, then by semver.
     * @private
     * @method _dedupeSeeds
     * @param {object} pkgDepths List of seed by deep.
     * @return {object} The metas of the selected package.
     */
    _dedupeSeeds: function (pkgDepths) {
        // pkgDepths -> depth: [metas]
        var depths,
            minDepth,
            maxDepth,
            seeds;
        depths = Object.keys(pkgDepths);
        minDepth = Math.min.apply(Math, depths);
        maxDepth = Math.max.apply(Math, depths);
        seeds = pkgDepths[minDepth];
        if (1 === seeds.length) {
            if (minDepth !== maxDepth) {
                debug('multiple "' + seeds[0].name + '" packages found, using version ' +
                    seeds[0].version + ' from ' + seeds[0].baseDirectory);
            }
            return seeds[0];
        }
        seeds.sort(function (a, b) {
            return libsemver.rcompare(a.version, b.version);
        });
        debug('multiple "' + seeds[0].name + '" packages found, using version ' +
            seeds[0].version + ' from ' + seeds[0].baseDirectory);
        return seeds[0];
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
        var byDepth = {}; // name: depth: [metas]
        all.forEach(function (seed) {
            if (!byDepth[seed.name]) {
                byDepth[seed.name] = {};
            }
            if (!byDepth[seed.name][seed.npmDepth]) {
                byDepth[seed.name][seed.npmDepth] = [];
            }
            byDepth[seed.name][seed.npmDepth].push(seed);
        });
        return Object.keys(byDepth).map(function (name) {
            return this._dedupeSeeds(byDepth[name]);
        }, this);
    },


    /**
     * Creates a bundle from an NPM package, and queues up files in the package.
     * @private
     * @method _walkBundle
     * @param {object} bundleSeed Metadata about the package. See the docs for _makeBundleSeed()
     * for format of this metadata.
     * @return {Bundle} The bundle made from the NPM package.
     */
    _walkBundle: function (bundleSeed) {
        var self = this,
            parentName,
            parent,
            bundle,
            filters;
        // TODO -- merge options (second arg) over bundleSeed.options

        parentName = this._getBundleNameByPath(libpath.dirname(bundleSeed.baseDirectory));
        parent = this._bundles[parentName];

        bundle = this._makeBundle(bundleSeed, parent);
        this._bundles[bundle.name] = bundle;
        filters = this._options.exclude.concat(['node_modules', /^\./]);
        // adding the bundle dir itself for BC
        this._processFile(bundle.baseDirectory);
        walk.walkSync(bundle.baseDirectory, {
            filters: [],
            listeners: {
                directories: function (root, dirStatsArray, next) {
                    var i, dirStats, exclude;
                    function filterDir(filter) {
                        if (dirStats.name.match(filter)) {
                            return true;
                        }
                    }
                    for (i = dirStatsArray.length - 1; i >= 0; i -= 1) {
                        dirStats = dirStatsArray[i];
                        exclude = filters.some(filterDir);
                        if (exclude) {
                            // the sync walk api is pretty bad, it requires to
                            // mutate the actual dir array
                            dirStatsArray.splice(i, 1);
                        } else {
                            self._processFile(libpath.join(root, dirStats.name));
                        }
                    }
                    next();
                },
                file: function(root, fileStats, next) {
                    self._processFile(libpath.join(root, fileStats.name));
                    next();
                },
                errors: function(root, nodeStatsArray, next) {
                    next();
                }
            }
        });

        return bundle;
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
                            // if we can find the ruleset anywhere near in the filesystem
                            // we should try to rely on npm lookup process
                            try {
                                rulesetsPath = Module._resolveFilename(bundle.options.rulesets,
                                        Module._cache[__filename]);
                                rulesets = require(rulesetsPath);
                            } catch (errLocalMod) {
                                return;
                            }
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
 * Rules are written in regular expressions that test paths as if they
 * were unix-based paths. Replacing path separators with unix style
 * separators ensures that these rules apply in other OSs too.
 *
 * @method toUnixPath
 * @param {String} path A path string
 * @return {String} A path with Unix style separators
 * @static
 * @private
 */
BundleLocator._toUnixPath = '/' !== libpath.sep ? function toUnixPath(path) {
    return path.split(PATH_SEP).join('/');
} : function toUnixPath(path) {
    return path;
};


/**
 * This object represents a resource on the filesystem.
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


module.exports = BundleLocator;

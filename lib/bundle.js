// vim: ts=2 sts=2 sw=2:
// TODO COPYRIGHT
// TODO DOCS module


var path = require('path')
  , dive = require('dive')
  , async = require('async')
  , rulesets = require('./rulesets')
  , DEFAULT_SELECTOR = '{}';


// TODO DOCS class
function Bundle (baseDirectory, options) {
  this.options = options || {};
  this.name = path.basename(baseDirectory);
  this.baseDirectory = baseDirectory;
  this.type = undefined;
  this.resources = {};
}


Bundle.prototype = {


  // TODO DOCS method
  // callback(err)
  findResources: function(callback) {
    var self = this
      , pkg
      , ruleset = this.options.ruleset
      ;

    try {
      pkg = require(path.resolve(this.baseDirectory, 'package.json'));
      this.name = pkg.name;
      if (pkg.modown) {
        if (pkg.modown.location) {
          // This is fairly legacy, and we might be able to remove it.
          this.baseDirectory = path.resolve(this.baseDirectory, pkg.modown.location);
        }
        if (pkg.modown.ruleset) {
          ruleset = pkg.modown.ruleset;
        }
      }
    } catch(err) {
      // missing package.json is OK for some bundle types
    }
    if ('string' === typeof ruleset) {
      this.type = ruleset;
      ruleset = rulesets[ruleset];
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
          // TODO:  This isn't quite right, since we could call the callback too
          // many times if there are more than one error.  (The dive library
          // doesn't stop when an error occurs.)
          callback(err);
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
              bundle.findResources(asyncCb);
            });
          });
          async.parallel(list, function(err) {
            callback(err);
          });
        } else {
          callback();
        }
      }
    );
  },


  // TODO DOCS method
  _processPath: function(fullPath, shortPath, ruleset) {
    var self = this
      , skip = false
      ;
    Object.keys(ruleset).forEach(function(ruleName) {
      var rule = ruleset[ruleName]
        , match
        ;

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

      var match = shortPath.match(rule.regex);
      if (match) {
        var name
          , selector = DEFAULT_SELECTOR
          , subtype
          ;
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


  // TODO DOCS method
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


  // TODO DOCS method
  _processBundles: function(fullPath, shortPath, rule) {
    var r
      , regex
      , options
      , bundle
      ;
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



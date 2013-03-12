// TODO COPYRIGHT
// TODO DOCS module


/*jslint nomen:true, white:true, node:true */
"use strict";


var Bundle = require('./bundle');


// TODO DOCS class
function BundleLocator(options) {
    this._options = options || {};
    this._rootBundle = undefined;
}


BundleLocator.prototype = {


    // TODO DOCS method
    // callback(err)
    locateBundles: function(dir, options, callback) {
        var self = this;
        options = options || {};
        callback = callback || function() {};
        self.parseBundle(dir, options, function(err, bundle) {
            if (err) {
                callback(err);
                return;
            }
            self._rootBundle = bundle;
            callback();
        });
    },


    // TODO DOCS method
    getRootBundle: function() {
        return this._rootBundle;
    },


    // TODO DOCS method
    // callback(err, bundle)
    parseBundle: function(dir, options, callback) {
        var bundle = new Bundle(dir, options);
        bundle.findResources(function(err) {
            callback(err, bundle);
        });
    }


};


module.exports = BundleLocator;



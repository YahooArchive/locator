// TODO COPYRIGHT
// TODO DOCS module


/*jslint nomen:true, white:true, node:true */
"use strict";


var Bundle = require('./bundle');


// TODO DOCS class
function BundleLocator(options) {
    this._options = options || {};
}


BundleLocator.prototype = {

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



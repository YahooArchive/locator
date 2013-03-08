// vim: ts=2 sts=2 sw=2:
// TODO COPYRIGHT
// TODO DOCS module


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



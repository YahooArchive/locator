/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, node:true */
"use strict";


var libpath = require('path'),
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
    this.name = libpath.basename(baseDirectory);
    this.baseDirectory = baseDirectory;
    this.type = undefined;
    this.files = {};
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
    getResources: function (options, selector) {
        selector = selector || DEFAULT_SELECTOR;
        return this.resources[selector];
    }


};


module.exports = Bundle;

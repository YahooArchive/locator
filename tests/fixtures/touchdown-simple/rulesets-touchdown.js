/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, white:true, regexp:true, node:true */
"use strict";


module.exports = {
    // nameKey defaults to 1
    // selectorKey has no default. selector is only used if selectorKey is given

    'touchdown-package': {
        _skip: [
            /^tests?\b/i,
            /^grunt?\b/i
        ],
        configs: {
            regex: /^configs\/([a-z_\-\/]+)\.(json|js)$/i
        },
        controllers: {
            regex: /^controllers\/([a-z_\-\/]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        },
        css: {
            regex: /^public\/css\/([a-z_\-\/]+)(\.([\w_\-]+))?\.css$/i,
            selectorKey: 3
        },
        js: {
            regex: /^public\/js\/([a-z_\-\/]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        },
        lang: {
            regex: /^lang\/([a-z_\-]+)(\.([\w_\-]+))?\.json$/i,
            subtypeKey: 3
        },
        models: {
            regex: /^models\/([a-z_\-]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        },
        stores: {
            regex: /^(lib\/)?stores\/([a-z_\-\/]+)\.js$/i,
            nameKey: 2
        },
        styles: {
            regex: /^styles\/css\/([a-z_\-\/]+)(\.([\w_\-]+))?\.[^\.\/]+$/i,
            selectorKey: 3
        },
        templates: {
            regex: /^templates\/([a-z_\-\/\.]+)\.[^\.\/]+$/i
        },
        views: {
            regex: /^views\/([a-z_\-]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        }
    }
};

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
            /\btests?\b/
        ],
        _bundles: [
            {
                regex: /^node_modules\/([^\/]+)$/
            }
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
            regex: /^(lib\/)?stores\/([a-z_\-\/]+)\.js$/i
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
    },

    'mojito-package': {
        _skip: [
            /^tests?(\/.*)?$/
        ],
        _bundles: [
            {
                regex: /^node_modules\/([^\/]+)$/
            },
            {
                regex: /^mojits\/([^\/]+)$/,
                options: {
                    ruleset: 'mojito-mojit'
                }
            }
        ],
        assets: {
            regex: /^assets\/([a-z_\-\/]+)(\.([\w_\-]+))?\.([^\.\/]+)/i,
            selectorKey: 3,
            subtypeKey: 4
        },
        configs: {
            regex: /^([a-z_\-]+)\.json$/i
        },
        middleware: {
            regex: /^middleware\/([a-z_\-]+)\.js$/i
        },
        models: {
            regex: /^models\/([a-z_\-]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        }
    },

    'mojito-mojit': {
        _skip: [
            /^tests?(\/.*)?$/
        ],
        assets: {
            regex: /^assets\/([a-z_\-\/]+)(\.([\w_\-]+))?\.([^\.\/]+)$/i,
            selectorKey: 3,
            subtypeKey: 4
        },
        configs: {
            regex: /^([a-z_\-]+)\.json$/i
        },
        controllers: {
            regex: /^(controller)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        },
        models: {
            regex: /^models\/([a-z_\-]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        },
        templates: {
            regex: /^templates\/([a-z_\-\/]+)(\.([\w_\-]+))?\.[^\.\/]+\.html$/i,
            selectorKey: 3
        },
        views: {
            regex: /^views\/([a-z_\-]+)(\.([\w_\-]+))?\.js$/i,
            selectorKey: 3
        }
    }

};

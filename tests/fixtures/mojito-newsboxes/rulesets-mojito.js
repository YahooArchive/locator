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

    'mojito-package': {
        _skip: [
            /^tests?(\/.*)?$/
        ],
        _bundles: [
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

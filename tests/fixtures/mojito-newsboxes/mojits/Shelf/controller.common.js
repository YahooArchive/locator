/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*global YUI*/


YUI.add('ShelfController', function (Y, NAME) {
    'use strict';

    function index(ac) {
        var vudata = { // Mustache template data.
                tiles: []
            };

        Y.each(ac.config.getDefinition('feeds'), function (feed, id) {
            feed.link = 'read.html?id=' + encodeURIComponent(id);
            vudata.tiles.push(feed);
        });

        ac.composite.done(vudata, {
            view: {
                name: 'index'
            }
        });
    }

    Y.namespace('mojito.controllers')[NAME] = {
        index: index
    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-config-addon',
    'mojito-composite-addon'
]});

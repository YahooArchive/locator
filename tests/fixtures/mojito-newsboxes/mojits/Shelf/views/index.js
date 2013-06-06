/*
 * Copyright (c) 2011-2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */


/*jslint anon:true, white:true, sloppy:true*/
/*global YUI*/


YUI.add('ShelfIndexBinder', function (Y, NAME) {

    function someColor(color) {
        var somenum = Math.floor(Math.random() * 9);
        color = color || '';
        return color.length > 2 ?
                ('#' + color + '234') :
                someColor(color + somenum);
    }

    function colorize(node) {
        setTimeout(function () {
            node.setStyles({
                'backgroundColor': someColor(),
                'color': '#eee'
            });
        }, Math.floor(Math.random() * 500));
    }

    Y.namespace('mojito.binders')[NAME] = {

        init: function (mojitProxy) {
            this.mp = mojitProxy;
        },

        bind: function (node) {
            node.all('div.toc ul li a').each(function (el) {
                colorize(el);
            });
        }
    };

}, '0.0.1', {requires: [
    'node'
]});

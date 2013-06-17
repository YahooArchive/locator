/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint anon:true, white:true, sloppy:true, nomen:true */
/*global YUI,YUITest*/


YUI.add('ShelfController-tests', function (Y, NAME) {

    var suite = new YUITest.TestSuite(NAME),
        controller = null,
        A = YUITest.Assert;

    suite.add(new YUITest.TestCase({

        name: 'ShelfController tests',

        'test 0': function () {},

        'test init config has 11 feeds': function () {},

        'BBC is 1st feed passed to ac.done()': function () {},

        'omg is 8th': function () {}

    }));

    YUITest.TestRunner.add(suite);

}, '0.0.1', {requires: [
    'mojito-test',
    'ShelfController',
    'oop'
]});

/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, white:true, node:true */
var rosterController = require('roster/controllers/roster.js');

module.exports = function (app) {
  app.get('/', rosterController);
};

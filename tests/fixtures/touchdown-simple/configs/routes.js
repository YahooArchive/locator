/*jslint nomen:true, white:true, node:true */
var rosterController = require('roster/controllers/roster.js');

module.exports = function (app) {
  app.get('/', rosterController);
};

var rosterController = require('roster/controllers/roster.js');

module.exports = function (app) {
  app.get('/', rosterController);
};
var locator = require('locator');

module.exports = function (req, res, options, next) {
  var viewConfig = {
      type: 'teamManager',
      data: {
        teamName: 'xxx'
      },
      subViews: {
        slot1: {
          view: 'field',
          config: {
            teamId: 'xxx'
          }
        },
        slot2: {
          view: 'roster'
        }
      }
    }
    , appAssets = locator.getAppAssets(req.context)
    , viewAssets = locator.getViewAssets(viewConfig, req.context)
    , data = {
      title: 'Team Manager',
      assets: appAssets.concat(viewAssets)
    };

  res.render('head', data, function (output) {
    res.write(output);

    var view = res.exposeView(viewConfig, function () {
      res.render('foot');
    });

  });
};
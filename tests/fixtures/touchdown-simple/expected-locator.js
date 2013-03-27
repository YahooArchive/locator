/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {},
    name: 'simple',
    baseDirectory: __dirname,
    type: 'touchdown-package',
    resources: {
        '{}': {
            configs: {
                app: __dirname + '/configs/app.json',
                dimensions: __dirname + '/configs/dimensions.json',
                routes: __dirname + '/configs/routes.js'
            },
            controllers: {
                player: __dirname + '/controllers/player.js',
                teamManager: __dirname + '/controllers/teamManager.js'
            },
            models: {
                player: __dirname + '/models/player.js',
                roster: __dirname + '/models/roster.js'
            }
        },
        smartphone: {
            controllers: {
                teamManager: __dirname + '/controllers/teamManager.smartphone.js'
            }
        }
    },
    bundles: {
        roster: {
            options: {},
            name: 'roster',
            baseDirectory: __dirname + '/node_modules/roster',
            type: 'touchdown-package',
            resources: {
                '{}': {
                    configs: {
                        roster: __dirname + '/node_modules/roster/configs/roster.json'
                    },
                    controllers: {
                        roster: __dirname + '/node_modules/roster/controllers/roster.js'
                    },
                    lang: {
                        'en-US': {
                            roster: __dirname + '/node_modules/roster/lang/roster.en-US.json'
                        }
                    },
                    styles: {
                        roster: __dirname + '/node_modules/roster/styles/css/roster.sass'
                    },
                    templates: {
                        roster: __dirname + '/node_modules/roster/templates/roster.dust',
                        'partials/player': __dirname + '/node_modules/roster/templates/partials/player.dust'
                    },
                    views: {
                        roster: __dirname + '/node_modules/roster/views/roster.js'
                    }
                }
            }
        }
    }
};

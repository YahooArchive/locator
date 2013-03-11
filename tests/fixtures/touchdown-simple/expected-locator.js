/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {},
    name: 'simple',
    baseDirectory: __dirname,
    type: 'touchdown-package',
    resources: {
        '{}': {
            configs: {
                app: 'configs/app.json',
                dimensions: 'configs/dimensions.json',
                routes: 'configs/routes.js'
            },
            controllers: {
                player: 'controllers/player.js',
                teamManager: 'controllers/teamManager.js'
            },
            models: {
                player: 'models/player.js',
                roster: 'models/roster.js'
            }
        },
        smartphone: {
            controllers: {
                teamManager: 'controllers/teamManager.smartphone.js'
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
                        roster: 'configs/roster.json'
                    },
                    controllers: {
                        roster: 'controllers/roster.js'
                    },
                    styles: {
                        roster: 'styles/css/roster.sass'
                    },
                    templates: {
                        roster: 'templates/roster.dust',
                        'partials/player': 'templates/partials/player.dust'
                    },
                    views: {
                        roster: 'views/roster.js'
                    }
                },
                'en-US': {
                    lang: {
                        roster: 'lang/roster.en-US.json'
                    }
                }
            }
        }
    }
};

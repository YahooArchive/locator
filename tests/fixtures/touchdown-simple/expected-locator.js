module.exports = {
    name: 'simple',
    type: 'package',
    baseDirectory: __dirname,
    resources: {
        '{}': {
            configs: {
                app: 'configs/app.json',
                dimensions: 'configs/dimensions.json'
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
            name: 'roster',
            type: 'package',
            baseDirectory: __dirname + '/node_modules/roster',
            resources: {
                '{}': {
                    configs: {
                        'test/test': 'configs/test/test.json',
                        roster: 'configs/roster.json'
                    },
                    controllers: {
                        roster: 'controllers/roster.js'
                    },
                    lang: {
                        roster: {
                            'en-US': 'lang/roster.en-US.json'
                        }
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
                }
            }
        }
    }
};

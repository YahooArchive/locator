/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {},
    name: 'simple',
    baseDirectory: __dirname,
    buildDirectory: __dirname + '/build/simple',
    type: 'touchdown-package',
    resources: {
        '{}': {
            configs: {
                app: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/configs/app.json',
                    relativePath: 'configs/app.json',
                    ext: 'json',
                    name: 'app',
                    type: 'configs',
                    selector: '{}'
                },
                dimensions: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/configs/dimensions.json',
                    relativePath: 'configs/dimensions.json',
                    ext: 'json',
                    name: 'dimensions',
                    type: 'configs',
                    selector: '{}'
                },
                routes: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/configs/routes.js',
                    relativePath: 'configs/routes.js',
                    ext: 'js',
                    name: 'routes',
                    type: 'configs',
                    selector: '{}'
                }
            },
            controllers: {
                player: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/controllers/player.js',
                    relativePath: 'controllers/player.js',
                    ext: 'js',
                    name: 'player',
                    type: 'controllers',
                    selector: '{}'
                },
                teamManager: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/controllers/teamManager.js',
                    relativePath: 'controllers/teamManager.js',
                    ext: 'js',
                    name: 'teamManager',
                    type: 'controllers',
                    selector: '{}'
                }
            },
            models: {
                player: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/models/player.js',
                    relativePath: 'models/player.js',
                    ext: 'js',
                    name: 'player',
                    type: 'models',
                    selector: '{}'
                },
                roster: {
                    bundleName: 'simple',
                    fullPath: __dirname + '/models/roster.js',
                    relativePath: 'models/roster.js',
                    ext: 'js',
                    name: 'roster',
                    type: 'models',
                    selector: '{}'
                }
            }
        },
        smartphone: {
            "controllers": {
                "teamManager": {
                    "bundleName": "simple",
                    "fullPath": __dirname + "/controllers/teamManager.smartphone.js",
                    "relativePath": "controllers/teamManager.smartphone.js",
                    "ext": "js",
                    "name": "teamManager",
                    "type": "controllers",
                    "selector": "smartphone"
                }
            }
        }
    },
    bundles: {
        roster: {
            options: {},
            name: 'roster',
            baseDirectory: __dirname + '/node_modules/roster',
            buildDirectory: __dirname + '/build/roster',
            type: 'touchdown-package',
            resources: {
                '{}': {
                    "configs": {
                        "roster": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/configs/roster.json",
                            "relativePath": "configs/roster.json",
                            "ext": "json",
                            "name": "roster",
                            "type": "configs",
                            "selector": "{}"
                        }
                    },
                    "controllers": {
                        "roster": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/controllers/roster.js",
                            "relativePath": "controllers/roster.js",
                            "ext": "js",
                            "name": "roster",
                            "type": "controllers",
                            "selector": "{}"
                        }
                    },
                    "lang": {
                        "en-US": {
                            "roster": {
                                "bundleName": "roster",
                                "fullPath": __dirname + "/node_modules/roster/lang/roster.en-US.json",
                                "relativePath": "lang/roster.en-US.json",
                                "ext": "json",
                                "name": "roster",
                                "type": "lang",
                                "subtype": "en-US",
                                "selector": "{}"
                            }
                        }
                    },
                    "templates": {
                        "roster": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/templates/roster.dust",
                            "relativePath": "templates/roster.dust",
                            "ext": "dust",
                            "name": "roster",
                            "type": "templates",
                            "selector": "{}"
                        },
                        "partials/player": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/templates/partials/player.dust",
                            "relativePath": "templates/partials/player.dust",
                            "ext": "dust",
                            "name": "partials/player",
                            "type": "templates",
                            "selector": "{}"
                        }
                    },
                    "views": {
                        "roster": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/views/roster.js",
                            "relativePath": "views/roster.js",
                            "ext": "js",
                            "name": "roster",
                            "type": "views",
                            "selector": "{}"
                        }
                    },
                    "styles": {
                        "roster": {
                            "bundleName": "roster",
                            "fullPath": __dirname + "/node_modules/roster/styles/css/roster.sass",
                            "relativePath": "styles/css/roster.sass",
                            "ext": "sass",
                            "name": "roster",
                            "type": "styles",
                            "selector": "{}"
                        }
                    }
                }
            }
        }
    }
};

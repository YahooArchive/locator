/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {
        ruleset: 'mojito-package',
        rulesets: 'modown/rulesets.js'
    },
    name: 'modown-newsboxes',
    version: '0.0.2',
    baseDirectory: __dirname,
    type: 'mojito-package',
    files: {},
    resources: {
        '{}': {
            "assets": {
                "ico": {
                    "favicon": {
                        "bundleName": "modown-newsboxes",
                        "fullPath": __dirname + "/assets/favicon.ico",
                        "relativePath": "assets/favicon.ico",
                        "ext": "ico",
                        "name": "favicon",
                        "type": "assets",
                        "subtype": "ico",
                        "selector": "{}"
                    }
                }
            },
            "configs": {
                "application": {
                    "bundleName": "modown-newsboxes",
                    "fullPath": __dirname + "/application.json",
                    "relativePath": "application.json",
                    "ext": "json",
                    "name": "application",
                    "type": "configs",
                    "selector": "{}"
                },
                "package": {
                    "bundleName": "modown-newsboxes",
                    "fullPath": __dirname + "/package.json",
                    "relativePath": "package.json",
                    "ext": "json",
                    "name": "package",
                    "type": "configs",
                    "selector": "{}"
                },
                "routes": {
                    "bundleName": "modown-newsboxes",
                    "fullPath": __dirname + "/routes.json",
                    "relativePath": "routes.json",
                    "ext": "json",
                    "name": "routes",
                    "type": "configs",
                    "selector": "{}"
                }
            },
            "middleware": {
                "debug": {
                    "bundleName": "modown-newsboxes",
                    "fullPath": __dirname + "/middleware/debug.js",
                    "relativePath": "middleware/debug.js",
                    "ext": "js",
                    "name": "debug",
                    "type": "middleware",
                    "selector": "{}"
                }
            }
        },
        common: {
            "models": {
                "flickr": {
                    "bundleName": "modown-newsboxes",
                    "fullPath": __dirname + "/models/flickr.common.js",
                    "relativePath": "models/flickr.common.js",
                    "ext": "js",
                    "name": "flickr",
                    "type": "models",
                    "selector": "common"
                }
            }
        }
    },
    bundles: {
        Shelf: {
            options: {
                ruleset: 'mojito-mojit',
                rulesets: 'modown/rulesets'
            },
            name: 'Shelf',
            version: '0.0.2',
            baseDirectory: __dirname + '/mojits/Shelf',
            type: 'mojito-mojit',
            files: {},
            resources: {
                common: {
                    "controllers": {
                        "controller": {
                            "bundleName": "Shelf",
                            "fullPath": __dirname + "/mojits/Shelf/controller.common.js",
                            "relativePath": "controller.common.js",
                            "ext": "js",
                            "name": "controller",
                            "type": "controllers",
                            "selector": "common"
                        }
                    }
                },
                '{}': {
                    "assets": {
                        "css": {
                            "shelf": {
                                "bundleName": "Shelf",
                                "fullPath": __dirname + "/mojits/Shelf/assets/shelf.css",
                                "relativePath": "assets/shelf.css",
                                "ext": "css",
                                "name": "shelf",
                                "type": "assets",
                                "subtype": "css",
                                "selector": "{}"
                            }
                        }
                    },
                    "configs": {
                        "definition": {
                            "bundleName": "Shelf",
                            "fullPath": __dirname + "/mojits/Shelf/definition.json",
                            "relativePath": "definition.json",
                            "ext": "json",
                            "name": "definition",
                            "type": "configs",
                            "selector": "{}"
                        }
                    },
                    "templates": {
                        "index": {
                            "bundleName": "Shelf",
                            "fullPath": __dirname + "/mojits/Shelf/templates/index.hb.html",
                            "relativePath": "templates/index.hb.html",
                            "ext": "html",
                            "name": "index",
                            "type": "templates",
                            "selector": "{}"
                        }
                    },
                    "views": {
                        "index": {
                            "bundleName": "Shelf",
                            "fullPath": __dirname + "/mojits/Shelf/views/index.js",
                            "relativePath": "views/index.js",
                            "ext": "js",
                            "name": "index",
                            "type": "views",
                            "selector": "{}"
                        }
                    }
                },
                'opera-mini': {
                    "assets": {
                        "css": {
                            "shelf": {
                                "bundleName": "Shelf",
                                "fullPath": __dirname + "/mojits/Shelf/assets/shelf.opera-mini.css",
                                "relativePath": "assets/shelf.opera-mini.css",
                                "ext": "css",
                                "name": "shelf",
                                "type": "assets",
                                "subtype": "css",
                                "selector": "opera-mini"
                            }
                        }
                    },
                    "templates": {
                        "index": {
                            "bundleName": "Shelf",
                            "fullPath": __dirname + "/mojits/Shelf/templates/index.opera-mini.hb.html",
                            "relativePath": "templates/index.opera-mini.hb.html",
                            "ext": "html",
                            "name": "index",
                            "type": "templates",
                            "selector": "opera-mini"
                        }
                    }
                }
            }
        },
        Weather: {
            options: {
                ruleset: 'mojito-mojit',
                rulesets: 'modown/rulesets'
            },
            name: 'Weather',
            version: '0.0.2',
            baseDirectory: __dirname + '/mojits/Weather',
            type: 'mojito-mojit',
            files: {},
            resources: {
                common: {
                    "controllers": {
                        "controller": {
                            "bundleName": "Weather",
                            "fullPath": __dirname + "/mojits/Weather/controller.common.js",
                            "relativePath": "controller.common.js",
                            "ext": "js",
                            "name": "controller",
                            "type": "controllers",
                            "selector": "common"
                        }
                    },
                    "models": {
                        "YqlWeatherModel": {
                            "bundleName": "Weather",
                            "fullPath": __dirname + "/mojits/Weather/models/YqlWeatherModel.common.js",
                            "relativePath": "models/YqlWeatherModel.common.js",
                            "ext": "js",
                            "name": "YqlWeatherModel",
                            "type": "models",
                            "selector": "common"
                        }
                    }
                },
                '{}': {
                    "templates": {
                        "index": {
                            "bundleName": "Weather",
                            "fullPath": __dirname + "/mojits/Weather/templates/index.hb.html",
                            "relativePath": "templates/index.hb.html",
                            "ext": "html",
                            "name": "index",
                            "type": "templates",
                            "selector": "{}"
                        }
                    }
                }
            }
        },
        modown: {
            options: {
                ruleset: 'mojito-package',
                rulesets: 'rulesets.js',
                location: 'lib/app'
            },
            name: 'modown',
            version: '0.0.1',
            baseDirectory: __dirname + '/node_modules/modown/lib/app',
            type: 'mojito-package',
            files: {},
            resources: {
                '{}': {
                    "configs": {
                        "dimensions": {
                            "bundleName": "modown",
                            "fullPath": __dirname + "/node_modules/modown/lib/app/dimensions.json",
                            "relativePath": "dimensions.json",
                            "ext": "json",
                            "name": "dimensions",
                            "type": "configs",
                            "selector": "{}"
                        }
                    },
                    "middleware": {
                        "modown-contextualizer": {
                            "bundleName": "modown",
                            "fullPath": __dirname + "/node_modules/modown/lib/app/middleware/modown-contextualizer.js",
                            "relativePath": "middleware/modown-contextualizer.js",
                            "ext": "js",
                            "name": "modown-contextualizer",
                            "type": "middleware",
                            "selector": "{}"
                        }
                    }
                }
            }
        },
        'modown-lib-read': {
            options: {
                ruleset: 'mojito-package',
                rulesets: 'modown/rulesets'
            },
            name: 'modown-lib-read',
            version: '0.0.3',
            baseDirectory: __dirname + '/node_modules/modown-lib-read',
            type: 'mojito-package',
            files: {},
            resources: {
                '{}': {
                    "configs": {
                        "package": {
                            "bundleName": "modown-lib-read",
                            "fullPath": __dirname + "/node_modules/modown-lib-read/package.json",
                            "relativePath": "package.json",
                            "ext": "json",
                            "name": "package",
                            "type": "configs",
                            "selector": "{}"
                        }
                    }
                }
            },
            bundles: {
                Read: {
                    options: {
                        ruleset: 'mojito-mojit',
                        rulesets: 'modown/rulesets'
                    },
                    name: 'Read',
                    version: '0.0.3',
                    baseDirectory: __dirname + '/node_modules/modown-lib-read/mojits/Read',
                    type: 'mojito-mojit',
                    files: {},
                    resources: {
                        '{}': {
                            "assets": {
                                "css": {
                                    "read": {
                                        "bundleName": "Read",
                                        "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/assets/read.css",
                                        "relativePath": "assets/read.css",
                                        "ext": "css",
                                        "name": "read",
                                        "type": "assets",
                                        "subtype": "css",
                                        "selector": "{}"
                                    }
                                }
                            },
                            "templates": {
                                "index": {
                                    "bundleName": "Read",
                                    "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/templates/index.hb.html",
                                    "relativePath": "templates/index.hb.html",
                                    "ext": "html",
                                    "name": "index",
                                    "type": "templates",
                                    "selector": "{}"
                                }
                            },
                            "views": {
                                "index": {
                                    "bundleName": "Read",
                                    "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/views/index.js",
                                    "relativePath": "views/index.js",
                                    "ext": "js",
                                    "name": "index",
                                    "type": "views",
                                    "selector": "{}"
                                }
                            }
                        },
                        common: {
                            "controllers": {
                                "controller": {
                                    "bundleName": "Read",
                                    "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/controller.common.js",
                                    "relativePath": "controller.common.js",
                                    "ext": "js",
                                    "name": "controller",
                                    "type": "controllers",
                                    "selector": "common"
                                }
                            },
                            "models": {
                                "rss": {
                                    "bundleName": "Read",
                                    "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/models/rss.common.js",
                                    "relativePath": "models/rss.common.js",
                                    "ext": "js",
                                    "name": "rss",
                                    "type": "models",
                                    "selector": "common"
                                }
                            }
                        },
                        'opera-mini': {
                            "assets": {
                                "css": {
                                    "read": {
                                        "bundleName": "Read",
                                        "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/assets/read.opera-mini.css",
                                        "relativePath": "assets/read.opera-mini.css",
                                        "ext": "css",
                                        "name": "read",
                                        "type": "assets",
                                        "subtype": "css",
                                        "selector": "opera-mini"
                                    }
                                }
                            },
                            "templates": {
                                "index": {
                                    "bundleName": "Read",
                                    "fullPath": __dirname + "/node_modules/modown-lib-read/mojits/Read/templates/index.opera-mini.hb.html",
                                    "relativePath": "templates/index.opera-mini.hb.html",
                                    "ext": "html",
                                    "name": "index",
                                    "type": "templates",
                                    "selector": "opera-mini"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
module.exports.files[__dirname] = true;
module.exports.files[__dirname + '/application.json'] = true;
module.exports.files[__dirname + '/assets'] = true;
module.exports.files[__dirname + '/assets/favicon.ico'] = true;
module.exports.files[__dirname + '/expected-locator.js'] = true;
module.exports.files[__dirname + '/middleware'] = true;
module.exports.files[__dirname + '/middleware/debug.js'] = true;
module.exports.files[__dirname + '/models'] = true;
module.exports.files[__dirname + '/models/flickr.common.js'] = true;
module.exports.files[__dirname + '/mojits'] = true;
module.exports.files[__dirname + '/package.json'] = true;
module.exports.files[__dirname + '/routes.json'] = true;
module.exports.files[__dirname + '/server.js'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/assets'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/controller.common.js'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/definition.json'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/templates'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/views'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/assets/shelf.css'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/assets/shelf.opera-mini.css'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/templates/index.hb.html'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/templates/index.opera-mini.hb.html'] = true;
module.exports.bundles.Shelf.files[__dirname + '/mojits/Shelf/views/index.js'] = true;
module.exports.bundles.Weather.files[__dirname + '/mojits/Weather/controller.common.js'] = true;
module.exports.bundles.Weather.files[__dirname + '/mojits/Weather/models'] = true;
module.exports.bundles.Weather.files[__dirname + '/mojits/Weather/templates'] = true;
module.exports.bundles.Weather.files[__dirname + '/mojits/Weather/models/YqlWeatherModel.common.js'] = true;
module.exports.bundles.Weather.files[__dirname + '/mojits/Weather/templates/index.hb.html'] = true;
module.exports.bundles.modown.files[__dirname + '/node_modules/modown/lib/app'] = true;
module.exports.bundles.modown.files[__dirname + '/node_modules/modown/lib/app/dimensions.json'] = true;
module.exports.bundles.modown.files[__dirname + '/node_modules/modown/lib/app/middleware'] = true;
module.exports.bundles.modown.files[__dirname + '/node_modules/modown/lib/app/middleware/modown-contextualizer.js'] = true;
module.exports.bundles['modown-lib-read'].files[__dirname + '/node_modules/modown-lib-read'] = true;
module.exports.bundles['modown-lib-read'].files[__dirname + '/node_modules/modown-lib-read/mojits'] = true;
module.exports.bundles['modown-lib-read'].files[__dirname + '/node_modules/modown-lib-read/package.json'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/assets'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/controller.common.js'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/models'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/templates'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/views'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/assets/read.css'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/assets/read.opera-mini.css'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/models/rss.common.js'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/templates/index.hb.html'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/templates/index.opera-mini.hb.html'] = true;
module.exports.bundles['modown-lib-read'].bundles.Read.files[__dirname + '/node_modules/modown-lib-read/mojits/Read/views/index.js'] = true;

/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {},
    name: 'modown-newsboxes',
    baseDirectory: __dirname,
    type: 'mojito-package',
    resources: {
        '{}': {
            configs: {
                'application.json': 'application.json',
                'package.json': 'package.json',
                'routes.json': 'routes.json'
            },
            assets: {
                ico: {
                    favicon: 'assets/favicon.ico'
                }
            },
            middleware: {
                debug: 'middleware/debug.js'
            }
        },
        common: {
            models: {
                flickr: 'models/flickr.common.js'
            }
        }
    },
    bundles: {
        Shelf: {
            options: {
                ruleset: 'mojito-mojit'
            },
            name: 'Shelf',
            baseDirectory: __dirname + '/mojits/Shelf',
            type: 'mojito-mojit',
            resources: {
                common: {
                    controllers: {
                        controller: 'controller.common.js'
                    }
                },
                '{}': {
                    configs: {
                        'definition.json': 'definition.json'
                    },
                    assets: {
                        css: {
                            shelf: 'assets/shelf.css'
                        }
                    },
                    templates: {
                        index: 'templates/index.hb.html'
                    },
                    views: {
                        index: 'views/index.js'
                    }
                },
                'opera-mini': {
                    assets: {
                        css: {
                            shelf: 'assets/shelf.opera-mini.css'
                        }
                    },
                    templates: {
                        index: 'templates/index.opera-mini.hb.html'
                    }
                }
            }
        },
        Weather: {
            options: {
                ruleset: 'mojito-mojit'
            },
            name: 'Weather',
            baseDirectory: __dirname + '/mojits/Weather',
            type: 'mojito-mojit',
            resources: {
                common: {
                    controllers: {
                        controller: 'controller.common.js'
                    },
                    models: {
                        YqlWeatherModel: 'models/YqlWeatherModel.common.js'
                    }
                },
                '{}': {
                    templates: {
                        index: 'templates/index.hb.html'
                    }
                }
            }
        },
        modown: {
            options: {},
            name: 'modown',
            baseDirectory: __dirname + '/node_modules/modown/lib/app',
            type: 'mojito-package',
            resources: {
                '{}': {
                    configs: {
                        'dimensions.json': 'dimensions.json'
                    },
                    middleware: {
                        'modown-contextualizer': 'middleware/modown-contextualizer.js'
                    }
                }
            }
        },
        'modown-lib-read': {
            options: {},
            name: 'modown-lib-read',
            baseDirectory: __dirname + '/node_modules/modown-lib-read',
            type: 'mojito-package',
            resources: {
                '{}': {
                    configs: {
                        'package.json': 'package.json'
                    }
                }
            },
            bundles: {
                Read: {
                    options: {
                        ruleset: 'mojito-mojit'
                    },
                    name: 'Read',
                    baseDirectory: __dirname + '/node_modules/modown-lib-read/mojits/Read',
                    type: 'mojito-mojit',
                    resources: {
                        '{}': {
                            assets: {
                                css: {
                                    read: 'assets/read.css'
                                }
                            },
                            templates: {
                                index: 'templates/index.hb.html'
                            },
                            views: {
                                index:  'views/index.js'
                            }
                        },
                        common: {
                            controllers: {
                                controller: 'controller.common.js'
                            },
                            models: {
                                rss:  'models/rss.common.js'
                            }
                        },
                        'opera-mini': {
                            assets: {
                                css: {
                                    read: 'assets/read.opera-mini.css'
                                }
                            },
                            templates: {
                                index: 'templates/index.opera-mini.hb.html'
                            }
                        }
                    }
                }
            }
        }
    }
};

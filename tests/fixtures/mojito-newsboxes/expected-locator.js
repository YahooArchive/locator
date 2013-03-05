module.exports = {
    name: 'modown-newsboxes',
    type: 'package',
    baseDirectory: __dirname,
    resources: {
        '{}': {
            assets: {
                ico: {
                    favicon: 'assets/favicon.ico'
                }
            },
            configs: {
                'application.json': 'application.json',
                'package.json': 'package.json',
                'routes.json': 'routes.json'
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
        'modown-lib-read': {
            name: 'modown-lib-read',
            type: 'package',
            baseDirectory: __dirname = '/node_modules/modown-lib-read',
            resources: {
                '{}': {
                    configs: {
                        'package.json': 'package.json'
                    }
                }
            },
            bundles: {
                Read: {
                    name: 'Read',
                    type: 'mojito-mojit',
                    baseDirectory: __dirname + '/node_modules/modown-lib-read/mojits/Read',
                    resources: {
                        '{}': {
                            assets: {
                                css: {
                                    read: 'assets/read.css'
                                }
                            },
                            binders: {
                                index:  'binders/index.js'
                            },
                            templates: {
                                index: 'templates/index.hb.html'
                            }
                        },
                        common: {
                            controllers: {
                                controller: 'controller.common.js'
                            },
                            models: {
                                rss:  'models/rss.common.js'
                            },
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
        },
        modown: {
            name: 'modown',
            type: 'package',
            baseDirectory: __dirname + '/node_modules/modown',
            resources: {
                '{}': {
                    configs: {
                        'dimensions.json': 'lib/app/dimensions.json',
                        'package.json': 'package.json'
                    },
                    middleware: {
                        'modown-contextualizer': 'lib/app/middleware/modown-contextualizer.js'
                    }
                }
            }
        },
        Shelf: {
            name: 'Shelf',
            type: 'mojito-mojit',
            baseDirectory: __dirname + '/mojits/Shelf',
            resources: {
                '{}': {
                    assets: {
                        css: {
                            shelf: 'assets/shelf.css'
                        }
                    },
                    binders: {
                        index: 'binders/index.js'
                    },
                    configs: {
                        'definition.json': 'definition.json'
                    },
                    templates: {
                        index: 'templates/index.hb.html'
                    }
                },
                common: {
                    controllers: {
                        controller: 'controller.common.js'
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
            name: 'Weather',
            type: 'mojito-mojit',
            baseDirector: __dirname + '/mojits/Weather',
            resources: {
                '{}': {
                    templates: {
                        index: 'templates/index.hb.html'
                    }
                },
                common: {
                    controllers: {
                        controller: 'controller.common.js'
                    },
                    models: {
                        YqlWeatherModel: 'models/YqlWeatherModel.common.js'
                    }
                }
            }
        }
    }
};

module.exports = {
    name: 'modown-newsboxes',
    type: 'package',
    baseDirectory: __dirname,
    resources: {
        '{}': {
            configs: {
                'application.json': 'application.json',
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
            name: 'Shelf',
            type: 'mojito-mojit',
            baseDirectory: __dirname + '/mojits/Shelf',
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
                    binders: {
                        index: 'binders/index.js'
                    },
                    templates: {
                        index: 'templates/index.hb.html'
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
            baseDirectory: __dirname + '/mojits/Weather',
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
            name: 'modown',
            type: 'package',
            baseDirectory: __dirname + '/node_modules/modown/lib/app',
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
            name: 'modown-lib-read',
            type: 'package',
            baseDirectory: __dirname + '/node_modules/modown-lib-read',
            resources: {},
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
        }
    }
};

/*jslint nomen:true, white:true, node:true */
module.exports = {
    options: {},
    name: 'modown-newsboxes',
    baseDirectory: __dirname,
    type: 'mojito-package',
    resources: {
        '{}': {
            configs: {
                application: __dirname + '/application.json',
                'package': __dirname + '/package.json',
                routes: __dirname + '/routes.json'
            },
            assets: {
                ico: {
                    favicon: __dirname + '/assets/favicon.ico'
                }
            },
            middleware: {
                debug: __dirname + '/middleware/debug.js'
            }
        },
        common: {
            models: {
                flickr: __dirname + '/models/flickr.common.js'
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
                        controller: __dirname + '/mojits/Shelf/controller.common.js'
                    }
                },
                '{}': {
                    configs: {
                        definition: __dirname + '/mojits/Shelf/definition.json'
                    },
                    assets: {
                        css: {
                            shelf: __dirname + '/mojits/Shelf/assets/shelf.css'
                        }
                    },
                    templates: {
                        index: __dirname + '/mojits/Shelf/templates/index.hb.html'
                    },
                    views: {
                        index: __dirname + '/mojits/Shelf/views/index.js'
                    }
                },
                'opera-mini': {
                    assets: {
                        css: {
                            shelf: __dirname + '/mojits/Shelf/assets/shelf.opera-mini.css'
                        }
                    },
                    templates: {
                        index: __dirname + '/mojits/Shelf/templates/index.opera-mini.hb.html'
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
                        controller: __dirname + '/mojits/Weather/controller.common.js'
                    },
                    models: {
                        YqlWeatherModel: __dirname + '/mojits/Weather/models/YqlWeatherModel.common.js'
                    }
                },
                '{}': {
                    templates: {
                        index: __dirname + '/mojits/Weather/templates/index.hb.html'
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
                        dimensions: __dirname + '/node_modules/modown/lib/app/dimensions.json'
                    },
                    middleware: {
                        'modown-contextualizer': __dirname + '/node_modules/modown/lib/app/middleware/modown-contextualizer.js'
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
                        'package': __dirname + '/node_modules/modown-lib-read/package.json'
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
                                    read: __dirname + '/node_modules/modown-lib-read/mojits/Read/assets/read.css'
                                }
                            },
                            templates: {
                                index: __dirname + '/node_modules/modown-lib-read/mojits/Read/templates/index.hb.html'
                            },
                            views: {
                                index:  __dirname + '/node_modules/modown-lib-read/mojits/Read/views/index.js'
                            }
                        },
                        common: {
                            controllers: {
                                controller: __dirname + '/node_modules/modown-lib-read/mojits/Read/controller.common.js'
                            },
                            models: {
                                rss:  __dirname + '/node_modules/modown-lib-read/mojits/Read/models/rss.common.js'
                            }
                        },
                        'opera-mini': {
                            assets: {
                                css: {
                                    read: __dirname + '/node_modules/modown-lib-read/mojits/Read/assets/read.opera-mini.css'
                                }
                            },
                            templates: {
                                index: __dirname + '/node_modules/modown-lib-read/mojits/Read/templates/index.opera-mini.hb.html'
                            }
                        }
                    }
                }
            }
        }
    }
};

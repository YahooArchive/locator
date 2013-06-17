locator
=======

The locator gives semantic meaning to files on the filesystem.
It does this with a set of "rules" that describes how each file path should be interpreted.
In addition it groups files into "bundles".
(Each bundle is usually an NPM module, but not always.)

The locator doesn't _interpret_ the semantic meaning of the files.
It is up to the user to understand and use the semantic meanings associated with the files.


## Goals & Design
* provide an abstraction over filesystem paths
    * set of "rules" (regexps basically) that determine the semantic meaning of each file
    * files that match a rule (and thus have semantic meaning) are called "resources"
    * built-in handling of "selectors", for resources that have multiple versions
* organize files in bundles
    * bundles are usually NPM modules
    * ...but can be something else, if an NPM module delivers multiple child bundles
    * bundles are recursively walked, since they are often organized in a tree structure on disk
    * bundles can have different types
        * for example, a mojito application bundle is walked differently (uses a different ruleset) than a mojito mojit bundle
        * each bundle can declare its type in its `package.json` (for those bundles that are NPM modules)
        * each bundle can also describe the type of child bundles found at certain paths (for e.g. mojito application that has mojit bundles at a certain place)
* configurable
    * the behavior of the locator should be configurable, which should include
    * ...defining new rulesets, for new bundle types
    * ...general runtime behavior configuration of returned values
    * ...etc
* extensible (plugins)
    * the locator also allows "plugins" to be informed about files/resources/bundles
    * one type of plugin is a "compiler" which takes a file in an unknown format and "compiles" it into a known format
        * for example, a "sass" compiler which generates "css" files
    * other types of plugins can do general processing
        * for example, a "config helper" plugin could load config files and cache their contents in memory
    * other types of plugins can process a bundle as a whole
        * for example, a "yui helper" plugin which can generate YUI loader metadata for the whole bundle


## Installation
Install using npm:

```shell
$ npm install locator
```



## Example: Mojito Application
In your app's `package.json`:
```javascript
{
    "dependencies": {
        ...
        "mojito": "*",
        ...
    },
    "locator": {
        "rulesets": "mojito/locator-rulesets"
    }
}
```


## Example: Defining Your Own Semantics
In your app's `package.json`:
```javascript
{
    "locator": {
        "rulesets": "locator-rulesets"
    }
}
```

A new `locator-rulesets.js` file which defines how to add semantic meaning to filesystem paths:
```javascript
module.exports = {
    // nameKey defaults to 1
    // selectorKey has no default. selector is only used if selectorKey is given
    main: {
        // we can use this to skip files
        _skip: [
            /^tests?\b/i
        ],

        // where to find configuration files
        configs: {
            regex: /^configs\/([a-z_\-\/]+)\.(json|js)$/i
        },

        // where to find templates
        templates: {
            regex: /^templates\/([a-z_\-\/]+)(\.([\w_\-]+))?\.[^\.\/]+\.html$/i,
            // We use "selectors" because we might use different templates based
            // on different circumstances.
            selectorKey: 3
        },

        // where to find CSS files
        css: {
            regex: /^public\/css\/([a-z_\-\/]+)\.css$/i
        }
    }
};
```


Then, in your `app.js` (or wherever makes sense to you) you can do something like:
```javascript
var Locator = require('locator');

locator = new Locator();
locator.parseBundle(__dirname).then(function() {
    var resources = locator.getRootBundle().getResources();

    // access your "configs/foo.json" configuration file
    ... resources.configs.foo ...

    // access all your templates
    Object.keys(resources.templates).forEach(function (templateName) {
        var templateResource = resources.templates[templateName];
        ...
    });

    // File watching is optional, and probably only desired when running in
    // a development environment.
    locator.watch(__dirname).then(function () {
        // File watching has started.
        // Actual changes will be reflected into the results of `getBundle()`,
        // `getRootBundle()`, `listAllResources()`, and `listBundleNames()`.
        // Changes are also reported (as they happen) to the locator plugins.
    });
});
```


## License
This software is free to use under the Yahoo! Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/yahoo/locator/blob/master/LICENSE.txt


## Contribute
See the [CONTRIBUTE.md file][] for info.

[CONTRIBUTE.md file]: https://github.com/yahoo/locator/blob/master/CONTRIBUTE.md



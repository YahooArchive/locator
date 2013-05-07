modown-locator
==============

The modown-locator gives semantic meaning to files on the filesystem.
It does this with a set of "rules" that describes how each file path should be interpreted.
In addition it groups files into "bundles".
(Each bundle is usually an NPM module, but not always.)

The locator doesn't _interpret_ the semantic meaning of the files.
It is up to the user to understand and use the semantic meanings associated with the files.


## Requirements and Use-Cases
* abstraction (semantic meaning) over filesystem paths
    * set of "rules" (regexps basically) that determine the semantic meaning of each file
    * files that match a rule (and thus have semantic meaning) are called "resources"
    * built-in handling of selectors, for resources that have multiple versions
* organize files in bundles
    * bundles are usually NPM modules
    * ...but can be something else, for example in mojito each mojit would be a separate bundle
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
        * for example, a "config helper" plugin could load and cache config file contents in memory, for easier access later
    * other types of plugins can process a bundle as a whole
        * for example, a "yui helper" plugin which can generate YUI loader metadata for the whole bundle


## Using the Locator, Basics


### Marking a Package
* the `"modown"` section in `package.json` should be an object
* it has a single `"ruleset"` field describing which ruleset should be used
* (FUTURE:  this will probably be renamed to `"type"`)
* currently, modown-locator only knows about a fixed set of rulesets, described below


### Loading a Tree of Packages
* the `locator.parseBundle()` call is used to load a bundle and all its child bundles
    * this is generally done once for the application directory
    * this is often called the "root" bundle


### Getting Information Out
Both `locator.getBundle(bundleName)` and `locator.getRootBundle()` return a Bundle object.

`locator.listAllResources(filter)` can also be used to get all resources regardless of bundle.


### Rulesets
The following rulesets ship with `modown-locator`:

* `files`
    * used for packages whose files should be walked by plugins, but which don't otherwise contain resources
* `touchdown-package`
    * used to interpret the layout of a touchdown application or extension package
* `mojito-package`
    * used to interpret the layout of a mojito application or extension package
* `mojito-mojit`
    * used to interpret the layout of a mojito mojit


## Using the Locator, Advanced


### Build Files
* plugins (see below) can create files
* these are created in a separate directory (which is configured in the locator constructor)
* this directory shouldn't be passed to `watch()` since changes made there by plugins are already caught


### File Watching
* the `locator.watch(directory)` can be used to enable filewatching
* this causes the locator to keep up-to-date with changes made to the filesystem
* this also calls the plugins as appropriate


## Plugins
Plugins are called with "events" (really just methods) at different points of the processing.

* `fileUpdated(evt, api)`
    * called when a file is added or updated
    * `evt.file` has details about the particular file
* `fileDeleted(evt, api)`
    * called when a file is deleted
    * `evt.file` has details about the particular file
* `resourceUpdated(evt, api)`
    * called when a resource is added or updated
    * `evt.resource` has details about the particular resource
* `resourceDeleted(evt, api)`
    * called when a resource is deleted
    * `evt.resource` has details about the particular resource
* `bundleUpdated(evt, api)`
    * called when a bundle is updated
    * `evt.bundle` has the bundle
    * `evt.files` has files that caused the trigger of this event
        * this might be a subset of files in the bundle
    * `evt.resources` has resources that caused the trigger of this event
        * this might be a subset of resources in the bundle
    * this event is deferred to the end of `locator.parseBundle()` for plugin optimization

All events receive an `api` object, which is an API back into the locator.
This API is customized for plugins (and can/should evolve with plugin requirements).


## Developing the Locator
Here are some details about the locator code itself.


### Code Organization
* `_fileQueue` is a queue of file events
    * value in queue is specifically designed to be full path, which makes `watch()` easy to implement
* `_processFileQueue` returns a promise fulfilled when the queue is empty
    * will also process the `bundleUpdated` queue
* `_onFile` handles each file
    * registers the file in the bundle
    * calls all plugins that handle file events
    * determines if the file is a resource (matches a rule in the ruleset)
    * queues up a `bundleUpdated` event
* `_onResource` handles each resource
    * registers the resource in the bundle
    * calls all plugins that handle resource events
    * queues up a `bundleUpdated` event

Since the file events have a full path, we need the following as support:

* `_makeBundle(path)` to create a bundle, if it doesn't already exist
* `_getBundleNameByPath(path)` to determine the bundle name from a path


### Problems and Gotchas
* making `watch()` easy to implement affected how rest of code (queues/methods) was organized
* keeping track of which directories belong to which bundles is unfortunately a bit tricky
* whether or not the build directory should be watched has subtle implications
* it's expected that the application code path (basically: set of plugins used) is the same in production as develop,
despite the fact that no files are created by plugins in production (because they're made during a build step prior to deploying to production)



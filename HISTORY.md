Locator Change History
======================

# 1.1.1

* PR #31: expands path to bundle using fs.realpathSync() for the internal
  registry to guarantee resolution when developing using symblinks to bundles.

# 1.1.0

PR #30: Fixes #25 - logs

* relied on `debug()` to log locator warnings
* moved logic to dedupe duplicates into its own method for better testing

PR #30: Fixes #27 - method deprecation:

    * listAllResources() -> getAllResources()
    * listBundleNames() -> getBundleNames()

PR #29: Fixes #25 - support rulesets generation thru `rulesetFn` configuration

# 1.0.2

* Use `Module._resolveFilename()` to resolve alien rulesets thru npm lookup. This
  helps if you want to parse a bundle that is a subdirectory of the current process.

# 1.0.1

* `locator.getBundleResources()`: to filter resources per bundle.
* `locator.getBundleFiles()`: to filter files per bundle.

# 1.0.0

* **!IMPORTANT!** This release contains a notable backward-incompatible change.
* **!Backwards-Incompatible Change!** sync version of locator without plugins.
* **!Backwards-Incompatible Change!** removed support for nodejs 0.8.x.

### No more plugins

The support for plugins was removed, and therefore, any build process for files
and resources should happen as a separate routine. This new version of locator can
be used by grunt/gulp/broccoli tasks to apply custom builds based on the semantic
of the application, in it can also be used during the runtime process as part of
application code to get the semantic of the source files and resources.

# 0.3.10

* Do not override an existing promise implementation with `ypromise`. This opens
up the possibility to use other promise libraries with Locator.

# 0.3.9

* Remove dependency on YUI. Use standalone `ypromise` for promises.

# 0.3.8

* Add support for custom names for each package bundle thru the `locator.name` entry in `package.json` (pr #20)

# 0.3.7

* Fix OS dependant path comparison to work on windows (pr #15)

# 0.3.6

* introducing `locatorObj.ready` (pr #15) where `locatorObj.ready` is a promise that will be fulfillled or rejected by `parseBundle()`

# 0.3.5
* fixed bug (pr #13) where `build.json` in the app root was being ignored

# 0.3.4
* enable custom bundle build dirnames w/constructor and/or parseBundle() option

# 0.3.3
* fix #5, issue with symlinked sub-packages

# 0.3.2
* adding `api.getRootBundleName` to plugin API to get the name of the root bundle, which is needed for some plugins.

# 0.3.1
* padding `evt.bundle` when calling fileUpdated as well as any other file event

# 0.3.0
* renamed to "locator"
* cleanup in preparation open source and publish to NPM

# 0.2.2
* delinted

# 0.2.1
* externally defined rulesets
* default ruleset is `main` (feedback from review)
* updated README.md
* sub-bundles inherit options.rulesets from their parent

# 0.1.14
* Ignoring artifacts folder

# 0.1.13
* (caridy) using version as part of the build directory

# 0.1.12
* ignore extraneous directories in node_modules

# 0.1.11
* delinting

# 0.1.10
* better handling of deeply nested packages

# 0.1.9
* (mridgway) Move fulfill out of try catch

# 0.1.8
* (mridgway) Change test skip rule to be a directory that begins with test or tests

# 0.1.7
* removing lint redefinition until can spend time to get it to work

# 0.1.6
* use jshint for linting

# 0.1.5
* we don't need the build number anymore

# 0.1.4-0
_nothing to report_

# 0.1.3-0
* now uses yui-lint rules for jshint

# 0.1.2-0
* ignore grunt folder

# 0.1.1-0
* Fixing stores regex

# 0.1.0-9
* (albertoc) `listBundleNames()` now supports filtering.

# 0.1.0-8
* added docs for "files" ruleset

# 0.1.0-7
* added the "files" ruleset

# 0.1.0-6
* (mridgway) Removing selectors for templates in Touchdown

# 0.1.0-5
* Add optional lib directory for stores

# 0.1.0-4
* `listBundleNames()`

# 0.1.0-3
* update patch level of package version (once that's available)

# 0.1.0-2
* added "repository" marker

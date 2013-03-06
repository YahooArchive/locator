

var libpath = require('path'),
    libfs = require('fs'),
    libwalker = require('./package-walker.server.js');  // copied from mojito@0.5.5


function Locator() {
    this._data = {};
}


// callback(error)
Locator.prototype.walkAppMojito = function(dir, callback) {
    var me = this,
        walker = new libwalker.BreadthFirst(dir);
    walker.walk(function(err, info) {
        //console.log('============================================================= PACKAGE ' + info.pkg.name);
        var name = info.pkg.name,
            data = me._data,
            dataDir = info.dir,
            parent,
            parents,
            m,
            mojit,
            mojits,
            mojitDir,
            mojitsDir;

        if (info.depth > 0) {
            parents = info.parents.concat();
            // first parent is the root, which we don't have keyed by name
            parents.pop();
            while ( parent = parents.pop() ) {
                if (! data.bundles) {
                    data.bundles = {};
                }
                if (! data.bundles[parent]) {
                    data.bundles[parent] = {};
                }
                data = data.bundles[parent];
            }
            if (! data.bundles) {
                data.bundles = {};
            }
            if (! data.bundles[name]) {
                data.bundles[name] = {};
            }
            data = data.bundles[name];
        }

        // TODO:  holdover from mojito.  not sure if we'll continue supporting this
        if (info.pkg.modown && info.pkg.modown.location) {
            dataDir = libpath.join(dataDir, info.pkg.modown.location);
        }

        data.name = name;
        data.type = 'package';
        data.baseDirectory = dataDir;

        data.resources = {};
        me._parseGroup(dataDir, data.resources);

        mojitsDir = libpath.join(dataDir, 'mojits');
        if (libfs.existsSync(mojitsDir)) {
            mojits = libfs.readdirSync(mojitsDir);
            mojits.sort();
            for (m = 0; m < mojits.length; m += 1) {
                mojit = mojits[m];
                mojitDir = libpath.join(mojitsDir, mojit);
                if (!data.bundles) {
                    data.bundles = {};
                }
                data.bundles[mojit] = {
                    name: mojit,
                    type: 'mojito-mojit',
                    baseDirectory: mojitDir,
                    resources: {}
                };
                me._parseGroup(mojitDir, data.bundles[mojit].resources);
            }
        }
    });
    callback();
};


Locator.prototype.getData = function() {
    return this._data;
};


Locator.prototype._parseGroup = function(baseDir, data) {
    //console.log('============================================================= GROUP ' + baseDir);
    var todo = [ '.' ],
        doing,
        doingPathFull,
        s,
        sub,
        subs,
        subStat,
        subPathFull,
        subPathShort;
    while ( doing = todo.shift() ) {
        doingPathFull = libpath.join(baseDir, doing);
        subs = libfs.readdirSync(doingPathFull);
        subs.sort();
        for (s = 0; s < subs.length; s += 1) {
            sub = subs[s];
            if ('.' === sub.substr(0, 1)) {
                continue;
            }
            if ('mojits' === sub || 'node_modules' === sub) {
                // these are handled elsewhere
                continue;
            }
            if ('tests' === sub) {
                // workaround wierdness in modown-resolver package
                continue;
            }
            subPathFull = libpath.join(doingPathFull, sub);
            subStat = libfs.statSync(subPathFull);
            if (subStat.isDirectory()) {
                todo.push(libpath.join(doing, sub));
                continue;
            }
            subPathShort = libpath.join(doing, sub);
            this._parsePath(subPathShort, subPathFull, data);
        }
    }
};


Locator.prototype._parsePath = function(shortpath, fullpath, data) {
    // NOTE:  only supporting enough for this strawman
    var matches,
        selector,
        basenameShort,
        basenameParts,
        ext,
        type;
    if (matches = shortpath.match(/^([^\/]+)\.(json|yaml|yml)/)) {
        if ('package.json' === shortpath) {
            // these will be infered
            return;
        }
        selector = '{}';
        data[selector] = data[selector] || {};
        data[selector].configs = data[selector].configs || {};
        data[selector].configs[shortpath] = shortpath;
        return;
    }
    if (matches = shortpath.match(/^(controller.+)\.js$/)) {
        basenameShort = matches[1];
        basenameParts = basenameShort.split('.');
        selector = '{}';
        if (basenameParts.length > 1) {
            selector = basenameParts.slice(1).join('.');
            basenameShort = basenameParts[0];
        }
        data[selector] = data[selector] || {};
        data[selector].controllers = data[selector].controllers || {};
        data[selector].controllers.controller = shortpath;
        return;
    }
    if (matches = shortpath.match(/^assets\/(.+)\.([^.]+)$/)) {
        basenameShort = matches[1];
        ext = matches[2];
        basenameParts = basenameShort.split('.');
        selector = '{}';
        if (basenameParts.length > 1) {
            selector = basenameParts.slice(1).join('.');
            basenameShort = basenameParts[0];
        }
        data[selector] = data[selector] || {};
        data[selector].assets = data[selector].assets || {};
        data[selector].assets[ext] = data[selector].assets[ext] || {};
        data[selector].assets[ext][basenameShort] = shortpath;
        return;
    }
    if (matches = shortpath.match(/^(binders|middleware|models|views)\/(.+)\.js$/)) {
        type = matches[1];
        basenameShort = matches[2];
        basenameParts = basenameShort.split('.');
        selector = '{}';
        if (basenameParts.length > 1) {
            selector = basenameParts.slice(1).join('.');
            basenameShort = basenameParts[0];
        }
        data[selector] = data[selector] || {};
        data[selector][type] = data[selector][type] || {};
        data[selector][type][basenameShort] = shortpath;
        return;
    }
    if (matches = shortpath.match(/^templates\/(.+)\.([^.]+)\.([^.]+)$/)) {
        basenameShort = matches[1];
        type = matches[2];
        ext = matches[3];
        basenameParts = basenameShort.split('.');
        selector = '{}';
        if (basenameParts.length > 1) {
            selector = basenameParts.slice(1).join('.');
            basenameShort = basenameParts[0];
        }
        data[selector] = data[selector] || {};
        data[selector].templates = data[selector].templates || {};
        data[selector].templates[basenameShort] = shortpath;
        return;
    }
    //console.log('UNKNOWN ' + shortpath);
};


module.exports = Locator;



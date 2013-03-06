var libpath = require('path'),
    expect = require('chai').expect,
    Locator = require('../..'),
    fixturesPath = libpath.join(__dirname, '../fixtures');


describe('locator', function() {

    describe('walkAppMojito', function() {
        it('mojito-newsboxes', function() {
            var locator = new Locator();
            locator.walkAppMojito(libpath.join(fixturesPath, 'mojito-newsboxes'), function(err) {
                if (err) {
                    throw err;
                }
                var have = locator.getData();
                var want = require(fixturesPath + '/mojito-newsboxes/expected-locator.js');
                expect(have).to.deep.equal(want);
            });
        });
    });


});



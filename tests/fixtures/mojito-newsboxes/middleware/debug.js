/*
 * Copyright 2013 Yahoo! Inc. All rights reserved.
 * Copyrights licensed under the BSD License.
 * See the accompanying LICENSE.txt file for terms.
 */


/*jslint node:true, indent: 4, regexp: true */

module.exports = function (req, res, next) {
    'use strict';

    var libynet,
        remoteIP;

    if (req.url.match(/^\/debug.*$/)) {

        // debug is in route -> reroute to page not found.
        // This prevents the debug mojit from being called directly by the user.
        req.url = null;
        console.warn('Request attempting to access debugger route directly');

    } else if (req.url.match(/^.*\?(.*&)?debug=.+$/)) {

        try {
            libynet = require('ynetdblib');
        } catch (e1) {
            console.warn('ynetdblib is not available on this system');
        }

        if (libynet) {

            remoteIP = req.headers.yahooremoteip ||
                req.connection.remoteAddress ||
                (req.connection.socket &&
                    req.connection.socket.remoteAddress);

            try {
                // Determine if request comes from Yahoo's internal network.
                // If so, reroute to debug...
                if (libynet.isYahooInternalAddress(remoteIP)) {
                    req.url = '/debug' + req.url;
                } else {
                    console.warn('Non internal address (' + remoteIP + ') attempting to access debugger');
                }
            } catch (e2) {
                console.warn('Unable to verify if request address is internal: ' + e2.message);
            }
        }
    }

    next();
};

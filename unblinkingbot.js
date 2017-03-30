#!/usr/bin/env node

/**
 * The unblinking bot.
 * @namespace unblinkingbot
 * @public
 * @author jmg1138 {@link https://github.com/jmg1138 jmg1138 on GitHub}
 */

/**
 * Invoke strict mode for the entire script.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode Strict mode}
 */
"use strict";

/**
 * Require the 3rd party modules that will be used.
 * @see {@link https://github.com/petkaantonov/bluebird bluebird}
 * @see {@link https://github.com/expressjs/express express}
 * @see {@link https://nodejs.org/api/http.html http}
 * @see {@link https://github.com/socketio/socket.io socket.io}
 * @see {@link https://github.com/Level/level level}
 * @see {@link https://github.com/juliangruber/level-pathwise level-pathwise}
 * @see {@link https://nodejs.org/api/path.html path}
 * @see {@link https://github.com/slackhq/node-slack-sdk node-slack-sdk}
 */
const bluebird = require('bluebird');
const express = require('express');
const http = require('http');
const io = require('socket.io');
const level = require('level');
const levelPathwise = require('level-pathwise');
const path = require('path');
const slackClient = require("@slack/client");

/**
 * Require the local modules that will be used.
 * @see {@link https://github.com/nothingworksright/unblinkingBot unblinkingbot}
 */
const routes = require("./routes/routes.js"); // Endpoints for the local web interface
const unblinking_sockets = require("./unblinkingsockets");

/**
 * Promisify the unblinkingslack.js callback functions.
 */
const getSlackCredentials = bluebird.promisify(require("./unblinkingslack.js").getCredentials);
const getRtmInstance = bluebird.promisify(require("./unblinkingslack.js").getRtmInstance);
const startRtmInstance = bluebird.promisify(require("./unblinkingslack.js").startRtmInstance);
const listenForRtmEvents = bluebird.promisify(require("./unblinkingslack.js").listenForEvents);
const disconnectRtmInstance = bluebird.promisify(require("./unblinkingslack.js").disconnectRtmInstance);

/**
 * Define all app configurations here except routes (define routes last).
 * 
 * Why instantiate the server constant here? From https://github.com/socketio/socket.io - Starting with 3.0, express applications have become request handler functions that you pass to http or http Server instances. You need to pass the Server to socket.io, and not the express application function. Also make sure to call .listen on the server, not the app.
 */
const app = express();
const server = http.Server(app); // To be able to use socket.io
app.use(express.static(path.join(__dirname, '/public')));
app.set('views', './views');
app.set('view engine', 'pug');

/**
 * Create the main bundle. An object reference to hold some things that will be passed around.
 */
var bundle = {};
bundle.db = new levelPathwise(level('./unblinkingbot.db'));
bundle.rtm = {}; // Add an empty starter object to hold the Slack RTM Client later.
bundle.socket = io(server);

unblinking_sockets.on(bundle);

/**
 * Define route configurations after other app configurations.
 * @param {object} app - The Express application instance.
 */
routes(app, bundle.db, bundle.rtm);

/**
 * Define error-handling middleware after app and route configurations.
 */
app.use(function (req, res, next) {
  res.status(404).render('404');
});
app.use(function (err, req, res, next) {
  if (err) {
    console.log(`Express error`);
    console.log(err.message);
    console.error(err.stack);
  }
  res.status(500).send('Something broke!');
});

/**
 * Listen for connections on the specified port.
 * @see {@link https://expressjs.com/en/api.html#app.listen Express API app.listen}
 */
const port = parseInt(process.env.PORT, 10) || 1138;
server.listen(port, function () {
  console.log(`unblinkingbot web-server listening on port ${port}`);
});

/**
 * Assign our app object to module.exports.
 * @see {@link https://nodejs.org/api/modules.html#modules_the_module_object Nodejs modules: The module object}
 * @see {@link https://nodejs.org/api/modules.html#modules_module_exports Nodejs modules: module exports}
 */
exports.app = app;

// exit the main server process gracefully when the time comes
process.on('exit', (code) => {
  console.log(`unblinkingbot process exiting with code ${code}`);

});
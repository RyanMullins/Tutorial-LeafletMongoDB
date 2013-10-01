// ---- Modules ----

var http = require('http');             // HTTP
var url = require('url');               // URI
var mongo = require('mongodb');         // MongoDB Driver

// ---- Routing and Handling ----


// ---- Servers ----

// MongoDB Server connection initialization 

var mdbServer = mongo.Server('localhost', 27017, {'auto_reconnect' : true});
var mdb = mongo.Db('streaming_db', mdbServer);

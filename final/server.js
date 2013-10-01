// ---- Modules ----

var http = require('http');             // HTTP
var url = require('url');               // URI
var mongo = require('mongodb');         // MongoDB Driver

// ---- Routing and Handling ----

// Function:    Process Response Data
// Parameters:
//              request  - Request with parameters for query.
//              response - Response to write data to, returned to 
//                         requesting client
// 
// This function: 
// 
//      Routes requests sent to this web service from clients. This service 
//      uses the URI structure below to access data in a MongoDB database. 
//      Collection information is stored in the URI's pathname, and query 
//      parameters are stored in the URI's query string. This URI is parsed by 
//      the Node.js URL module and the pathname is used to route requests to 
//      the correct handler.
//      
//          URI: http://{host}/{queryCollection}?{params}
// 
//          {host}            - web address of the service
//          {queryCollection} - name of the MongoDB Collection to query
//          {params}          - parameters associated with collection
// 
//      Responses to requests use a standard JSON response format, detailed 
//      below. Specific API methods may add information to this response based
//      on the various parameters used to request data.
// 
//          {
//              'data'    : [Array] list of objects representing query results
//              'error'   : [Object] error returned from MongoDB, default NULL
//              'message' : [String] text description of response data
//          }

var router = function (request, response) {

    // Parse request for routing

    var reqURI = url.parse(request.headers.host + request.url);

    // Route request to proper handler or return an 'invalid request' response

    if (reqURI.pathname == '/tweets') {
        tweets(request, response);
    } else  {

        // Create response object

        var res = {
            'data':null,
            'error':null,
            'message':'You did not ask to query a valid collection.',
            'terms':null
        };

        // Write response

        response.writeHead(200, {
            'Content-Type':'application/json',
            'Access-Control-Allow-Origin':'*'
        });
        response.write(JSON.stringify(res));
        response.end();
    }
};

// Function:    Process Response Data
// Parameters:
//              request  - Request with parameters for query.
//              response - Response to write data to, returned to 
//                         requesting client
// This function: 
// 
//      Handles requests for tweets from database. The request is again parsed 
//      by the Node.js URL Module to retrieve the parameters stored in the 
//      query string component. The function then opens a connection to the 
//      MongoDB database and uses the query string to find tweets that match 
//      the query. For details on how MongoDB handles text queries, see their 
//      documentation: 
//      (http://docs.mongodb.org/manual/reference/command/text/#search-field)
//      
//          URI: http://{host}/tweets?terms=
// 
//          terms - String of comma separated terms used to query tweet text
// 
//      Response is the standard format plus a 'terms' member that details the
//      query string used to find tweets in the database.
// 
//          {
//              'data'    : [Array] list of objects representing query results
//              'error'   : [Object] error returned from MongoDB, default NULL
//              'message' : [String] text description of response data
//              'terms'   : [String] space separated list of query terms used
//          }

var tweets = function (request, response) {

    // Parse request for query parameters

    var reqURI = url.parse("http://" + request.headers.host + request.url);
    var params = reqURI.query;
    var terms = params.substr(params.indexOf('=') + 1);

    // Open connection to database and collection

    mdb.open(function (err, db) {

        // Query collection for tweets containing this content using the 
        // db.command() function, providing options for the command to execute,
        // and a callback function to handle what's returned as a result.

        db.command(
            {
                'text'   : 'tweets',    // Command to execute :  on collection
                'search' : terms,       // Search term to query with
                'limit'  : 5000         // Max number of results to return
            }, 
            function (err, obj) {

                // Create response object 

                var res = {
                    'data'   : (err ? null : (obj.results ? obj.results : null)),
                    'error'  : (err ? err : null),
                    'message': (err ? err.message : 'JSON response for a tweets query'),
                    'stats'  : obj.stats,
                    'terms'  : terms
                };

                // Write response 

                response.writeHead(200, {
                    'Content-Type':'application/json',
                    'Access-Control-Allow-Origin':'*'
                });
                response.write(JSON.stringify(res));
                response.end();

                // Close connection to database

                db.close();
            });
    });
};

// ---- Servers ----

// MongoDB Server connection initialization 

var mdbServer = mongo.Server('localhost', 27017, {'auto_reconnect' : true});
var mdb = mongo.Db('streaming_db', mdbServer);

// Web Service (HTTP) Server initialization

http
    .createServer(router)
    .listen(8888);

Introducing Leaflet: Integrating with a Web Service
===================================================

Created by Ryan S Mullins and Joshua Stevens



# Background

This tutorial was created as part of a series of tutorials used in the graduate-level seminar Geography 597A: Visual Analytics — Leveraging GeoSocial Data at Penn State (held Fall 2013). These tutorials are designed to introduce students, with varying backgrounds, to the tools and skills employed in the collection, processing, and visualization of geographically attributed big data from social media outlets.

<!-- Specifics on this tutorial -->

### Goals

* Create a Web Service to query a database of tweets
* Integrate this web service as the data source for a mapping application
* Visualize the data returned from queries to this service on the map

### Other Tutorials

* Building a Simple Twitter Scraper, by Sasha Savelyev
* Introduction to Leaflet: Visualizing Twitter Data, by Josh Stevens
* [Piping Twitter into MongoDB][tut_twitterToMongo], by Ryan S Mullins



# Prerequisites 

## Skills and Tools

**Skills**

* Some experience with the JavaScript programming language
* Some knowledge of JSON data structures
* Some experience with MongoDB and Node,js
* Some experience with a Unix-like terminal or the Microsoft Command Prompt

**Tools**

* Installed Node.js on your machine
* Installed MongoDB on your machine 
* Installed Git on your machine
* Installed a text editor on your machine, we recommend Sublime Text

## Setup

### Cloning the Repo
 
The first thing to do is to acquire all of the code for the tutorial. There are a few ways to do this.

__Method 1:__ If you have git installed and are comfortable with the command line, simply run:

```Shell
git clone https://github.com/RyanMullins/Tutorial-LeafletMongoDB.git
```

__Method 2:__ If you don't have git, or if you just prefer using GUI tools, you can use the GitHub app for [Mac](http://mac.github.com/) or [Windows](http://windows.github.com/)
to clone the repo.

__Method 3:__ Simply click 'Download Zip' to the right of this tutorial page. This will download the tutorial, including all files and folders, as a zip that you can then extract. This is the least prefered method as it is no longer within the version control system.
### Setting up MongoDB for Text Queries 

<!-- Starting mongod with text search enabled -->

Once you have the code, it's time to get things up and running. The first thing we need to do is start MongoDB with the option to enable text search.

__For Unix/Linux:__

```Shell
nohup mongod --setParameter textSearchEnabled=true &
```

__For Windows:__

```Shell
start /min mongod --setParameter textSearchEnabled=true
```

### (Optional) Setting up a Primer Database

If you do not have an existing database of Tweets in Mongo, you should follow the previous tutorial on [Piping Tweets into Mongo](https://github.com/RyanMullins/Tutorial-TwitterToMongoDB).

However, if you wish to jump right in that's OK too. We've supplied a pre-cooked database for you. Running the code below will create a database and fill it with pre-collected Tweets. Only perform this action if you do not already have an existing database.

<!-- Run following command from the terminal/command prompt -->

```Shell
node src/primer_importScript.js
```

# Creating a Web Service

Now that MongoDB is up and running, we need to enable the web service so that our web-based map can communicate with it.

## Step 1: Creating an HTTP Server

<!-- Server.js | Starting Point -->

```JavaScript
// ---- Modules ----

var http = require('http');             // HTTP
var url = require('url');               // URI
var mongo = require('mongodb');         // MongoDB Driver

// ---- Routing and Handling ----


// ---- Servers ----

// MongoDB Server connection initialization 

var mdbServer = mongo.Server('localhost', 27017, {'auto_reconnect' : true});
var mdb = mongo.Db('streaming_db', mdbServer);
```

<!-- Server.js | Adding an HTTP Server -->

```JavaScript
// Web Service (HTTP) Server initialization

http                        // Uses HTTP to...
    .createServer(router)   // Create a server, which uses the router function to handle requests
    .listen(8888);          // Listens for requests on port 8888 of the localhost
```

## Step 2: Routing Requests

Presently, the web service won't do a whole lot as it doesn't yet know what to do with requests from the web browser. We can change that by adding a function to Server.js:

<!-- Server.js | Implementing the Router function -->

```JavaScript
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
```

## Step 3: Handling Requests for Tweets

After routing the requests appropriately, we need to let our HTTP server know what to do with them. In other words, we need to tell it to retreive Tweets from the database.

<!-- Server.js | Responding to Requests fro Tweets -->

```JavaScript
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
```


# Integrating the Web Service and Map

So far, the database is running, the HTTP server has been created and returns Tweets. All that is left is to take the Tweets and plot them on the map. This part of the tutorial is very similar to the initial mapping tutorial, though some changes will need to be made to support these changes.

## Step 1: Refactoring

The first step is to create a skeleton HTML page for the map view. It contains the calls to all the necessary JavaScript libraries needed, as well as the basic format of our functions (currently empty).

<!-- index.html | Full replacement -->
```HTML
<!DOCTYPE html>
<html>
<head>
  <title>My First Leaflet Map</title>
  <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.css" />
  <!--[if lte IE 8]>
    <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.ie.css" />
  <![endif]-->
  <script src="http://cdn.leafletjs.com/leaflet-0.6.4/leaflet.js"></script>
  <script type="text/javascript" src="http://code.jquery.com/jquery-1.7.1.min.js"></script>
</head>
<body>
<div id="search">
  <input type="text" id="searchfield" />
  <button type="button" id="searchbutton">Search</button>
</div>
<div id="map" style="width:800px; height: 500px;"></div>
<script>

  var map = null;
  var tweetslg = null;

  function initMap () {

  };

  function getTweets (terms) {
    
  };
 
  function drawTweets (tweetList) {
    
  };

  initMap();

</script>
</body>
</html>
```

## Step 2: Initializing the Map

<!-- index.html | Implementation of initMap function -->

```JavaScript
  function initMap () {

    // ---- Map ----

    var coords = [37.69, -59.23]; 
    var zoomLevel = 3; 
    
    map = L.map('map').setView(coords, zoomLevel);

    // ---- Tiles for Base Map ----

    var tiles = 'http://acetate.geoiq.com/tiles/acetate-hillshading/';

    L.tileLayer(tiles + '{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://FortiusOne.com">FortiusOne</a> and <a href="http://stamen.com">Stamen</a>',
      maxZoom: 18
    }).addTo(map);

    // ---- Data Layer for Tweets ----

    tweetslg = new L.LayerGroup().addTo(map);

    // ---- Query Fields ----

    $("#searchfield").on('keypress', function (e) {
      if (e.keyCode == 13)  { 
        getTweets($("#searchfield").val());
        return false;
      }
    });

    $("#searchbutton").on('click', function () {
      getTweets($("#searchfield").val());
    });

    // ---- Initial Query ----

    getTweets(null);
  };
```

## Step 3: Getting the Tweets

<!-- index.html | Implementation of getTweets function -->

```JavaScript
  function getTweets (terms) {
    $.ajax({
      'url' : 'http://localhost:8888/tweets',
      'data' : {
        'terms' : (terms ? terms : ' ')
      },
      'success' : function (res) {
        if (res.err) { 
          console.log("Error occurred when querying tweets: " + data.message); 
        } else {
          if (tweetslg) { tweetslg.clearLayers(); }
          drawTweets(res.data);
        }
      }
    });
  };
```

## Step 4: Drawing the Tweets

<!-- index.html | Implementation of drawTweets function -->

```JavaScript
  function drawTweets (tweetList) {
    $.each(tweetList, function () {
      if (this.obj) {
        var tweet = this.obj;

        if (tweet.coordinates) {
          var marker = new L.circleMarker(
            [tweet.coordinates.coordinates[1], tweet.coordinates.coordinates[0]], 
            {
              radius: 5,
              fillColor: "#58006c",
              color: "#58006c",
              weight: 2,
              opacity: 0.5,
              fillOpacity: 0.25,
            });

          tweetslg.addLayer(marker);
        }
      }
    });
  };
```
<!-- Hyperlinks -->

[tut_twitterToMongo]: https://github.com/RyanMullins/Tutorial-TwitterToMongoDB


var mongo = require('mongodb');
var tweets = require('./primer_tweets.json');


var mdbServer = mongo.Server('localhost', 27017, {'auto_reconnect' : true});
var mdb = mongo.Db('streaming_db', mdbServer);

mdb.open(function (err, db) {
    db.createCollection('tweets', function (err, collection) {
        for (var i = 0; i < tweets.length; i++) {
            var tweet = tweets[i];
            tweet._id = new mongo.Long.fromString(tweet.id_str, 10);
            collection.insert(tweet, function (err, doc) {
                if (err) { 
                    console.log("Error writing document to database. Most likely a duplicate.");
                }
            });
        }

        collection.ensureIndex({'text':'text'});

        db.close();
        process.exit(0);
    });
});
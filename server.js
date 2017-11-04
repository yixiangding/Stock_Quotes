var express = require('express');
var app = express();
var logger = require('morgan');
var request = require('request');
var xml2js = require('xml2js');

var port = process.env.PORT || 3000;

app.use(logger('dev'));
app.use('/', express.static('static'));

app.get('/', function(req, res) {
    res.end("Welcome!");
});

var parseString = xml2js.parseString;

app.get('/query', function(req, res){
    // res.send('id: ' + req.query.id);
    if (!req.query.func) { // query TIME_SERIES_DAILY

        var request_url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + req.query.symbol + '&apikey=QTAX2CXFZ8AQE95Z';
        request(request_url).pipe(res);

    } else if (req.query.func === "news") { // news

        var request_url = "https://seekingalpha.com/api/sa/combined/" + req.query.symbol + ".xml";
        request(request_url, function(error, respond, body) {
            parseString(body, function (err, result) {
                res.send(result.rss.channel);
            });
        });
        // xml_data.pipe(res);

    } else { // indicators

        var request_url = 'https://www.alphavantage.co/query?function=' + req.query.func+ '&symbol=' + req.query.symbol + '&&interval=weekly&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z';
        request(request_url).pipe(res);

    }
});

app.listen(port);
console.log("listening port " + port);

// eg: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey=QTAX2CXFZ8AQE95Z
// eg: https://www.alphavantage.co/query?function=SMA&symbol=MSFT&interval=15min&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z
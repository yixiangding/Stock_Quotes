var express = require('express');
var app = express();
var logger = require('morgan');
var request = require('request');

var port = process.env.PORT || 3000;

app.use(logger('dev'));
app.use('/', express.static('static'));

app.get('/', function(req, res) {
    res.end("Welcome!");
});

app.get('/query', function(req, res){
    // res.send('id: ' + req.query.id);
    if (!req.query.func) { // query TIME_SERIES_DAILY
        var request_url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + req.query.symbol + '&apikey=QTAX2CXFZ8AQE95Z';
    } else if (req.query.func === "news") {
        var request_url = "https://seekingalpha.com/api/sa/combined/" + req.query.symbol + ".xml";
    } else { // indicators
        var request_url = 'https://www.alphavantage.co/query?function=' + req.query.func+ '&symbol=' + req.query.symbol + '&&interval=15min&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z';
    }

    request(request_url).pipe(res);

});

app.listen(port);
console.log("listening port " + port);

// eg: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey=QTAX2CXFZ8AQE95Z
// eg: https://www.alphavantage.co/query?function=SMA&symbol=MSFT&interval=15min&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z
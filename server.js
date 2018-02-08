var express = require('express');
var app = express();
var logger = require('morgan');
var request = require('request');
var xml2js = require('xml2js');
var bodyParser = require("body-parser");

var port = process.env.PORT || 3000;

app.use(logger('dev'));
app.use('/', express.static('static'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.all('/query', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.all('/share', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});


var parseString = xml2js.parseString;
try {

    app.get('/query', function(req, res){
        // res.send('id: ' + req.query.id);
        if (!req.query.func) { // query TIME_SERIES_DAILY

            var request_url = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + req.query.symbol + '&outputsize=full&apikey=QTAX2CXFZ8AQE95Z';
            request(request_url).pipe(res);

        } else if (req.query.func === "news") { // news

            var request_url = "https://seekingalpha.com/api/sa/combined/" + req.query.symbol + ".xml";
            request(request_url, function(error, respond, body) {
                parseString(body, function (err, result) {
                    try {
                        res.send(result.rss.channel);
                    } catch (err) {
                        res.send(err.message);
                    }
                });
            });
            // xml_data.pipe(res);

        } else if (req.query.func === "ac") { // auto-complete

            var request_url = 'http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=' + req.query.symbol;
            request(request_url).pipe(res);

        } else { // indicators

            var request_url = 'https://www.alphavantage.co/query?function=' + req.query.func+ '&symbol=' + req.query.symbol + '&&interval=daily&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z';
            request(request_url).pipe(res);

        }
    });

    app.get('/share',function(req,res){
        var obj = {};
        obj.options = req.query.options;
        obj.type = req.query.type;
        obj.async = req.query.async;
        request.post({url:'https://export.highcharts.com', formData: obj}, function optionalCallback(err, httpResponse, body) {
            res.send(body);
        });
    });

    app.listen(port);
    console.log("listening port " + port);

} catch (err) {

    console.log(err.message);

}




// eg: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=MSFT&apikey=QTAX2CXFZ8AQE95Z
// eg: https://www.alphavantage.co/query?function=SMA&symbol=MSFT&interval=15min&time_period=10&series_type=close&apikey=QTAX2CXFZ8AQE95Z
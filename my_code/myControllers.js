var myControllers = angular.module('myControllers', ['ngAnimate']);

var host = 'http://yixiangd.us-east-2.elasticbeanstalk.com';

myControllers.controller('formController', ['$scope', '$http', '$rootScope', function ($scope, $http, $rootScope) {

    $scope.activated = false;
    $rootScope.showList = true;

    setTimeout(function () {
        $("#input-0").focus(function () {
            $scope.activated = true;
        });
    }, 100);

    $scope.query = function (searchText) {
        $scope.searchText = searchText;
        if (!searchText) return [];

        return $http.get(host + '/query?symbol=' + searchText + '&func=ac').then(function successCallback(data) {
            return data.data;
        });
    };

    $scope.empty = function () {

        if (!$scope.activated) return false; // initially not activated

        if (!$scope.searchText) {
            $("#input-0").css("box-shadow", "0 0px 5px rgba(151, 59, 58, 1)");
            $("#input-0").css("border", "1px solid rgba(151, 59, 58, 1)");
            return true;
        }
        else {
            $("#input-0").css("box-shadow", "none");
            $("#input-0").css("border", "1px solid rgb(233, 233, 233)");
            $("#input-0").focus(function () {
                $("#input-0").css("border-color", "#66afe9", "important");
                $("#input-0").css("box-shadow", "inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, .6)", "important");
            });
            return false;
        }
    }


    // clear btn
    $scope.clear = function () {
        $("#input-0").val("");
    };

}]);


myControllers.controller('ListController', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope) {
    $rootScope.showList = true;

    // construct fav list
    /*

    localStorage:

    favList: [item1, item2, ...]  (storing key names)
                |      |
    lStorage:{JSON1, JSON2, ...]  (storing values (JSON))

     */

    $scope.favNames = JSON.parse(localStorage.getItem("favList"));
    $scope.content = [];  // items in fav list
    angular.forEach($scope.favNames, function (value) {
        if (localStorage.getItem(value)) {
            $scope.content.push(JSON.parse(localStorage.getItem(value)));
        }
    });
    parseMember($scope.content);


    // retrieve last visited symbol
    $scope.lastURL = $rootScope.lastSymbol ?
    '#!/charts/' + $rootScope.lastSymbol : '#!/list';


    // parse member in content to number
    function parseMember (arr) {
        angular.forEach(arr, function (value) {
            value.price = parseFloat(value.price);
            value.change = parseFloat(value.change);
            value.changePercent = parseFloat(value.changePercent);
            value.volumeVal = parseFloat(value.volume.replace(/,/g, ""));
        });
    };


    // click event to delete
    $scope.deleteFav = function (targetSymbol) {
        var favListArr = JSON.parse(localStorage.getItem("favList"));
        var index = favListArr.indexOf(targetSymbol);
        if (index !== -1) { // this symbol is in fav
            // rm from list
            favListArr.splice(index, 1);
            localStorage.setItem("favList", JSON.stringify(favListArr));
            // rm from storage
            localStorage.removeItem(targetSymbol);
            $scope.content.splice($scope.content.indexOf(targetSymbol), 1);
        }
    };


    // JQuery
    // re-render toggle after routing
    $(function() {
        $('#refresh-toggle').bootstrapToggle();
    });

    // auto-refresh
    var interval = null;
    $('#refresh-toggle').change(function() {
        var status = $(this).prop('checked');
        if (status) {
            interval = setInterval(function () {
                // refresh per 5000ms
                $scope.refresh();
            }, 5000);
        } else {
            if (interval) clearInterval(interval);
        }
    });


    // http refresh
    $scope.refresh = function () {

        angular.forEach($scope.content, function (val) {

            $http.get(host + '/query?symbol=' + val.symbol).then(function successCallback(data) {
                // fav list http request

                var price = data.data["Time Series (Daily)"];
                var count = 0;
                var newData = {};
                var secondNewData = {};
                angular.forEach(price, function(value) {
                    if (count === 0) { // latest data
                        newData = value;
                    }
                    if (count == 1) {
                        secondNewData = value;
                    }
                    count++;
                });

                if (!newData["5. volume"]) return;

                val.price = parseFloat(newData["4. close"]);

                val.volume = newData["5. volume"];

                var formattedVolume = "";
                count = 1;
                for (var i = val.volume.length - 1; i >= 0 ; i--) {
                    formattedVolume = val.volume.charAt(i) + formattedVolume;
                    if (count % 3 == 0 && i != 0) formattedVolume = ',' + formattedVolume;
                    count++;
                }
                val.volumeVal = parseFloat(val.volume);
                val.volume = formattedVolume;

                val.change = Number(newData["4. close"]) - Number(secondNewData["4. close"]);
                val.color = val.change < 0 ? "red" : "green";

                val.changePercent = val.change / Number(secondNewData["4. close"]);
                val.img = val.changePercent >= 0 ? "http://cs-server.usc.edu:45678/hw/hw8/images/Up.png" : "http://cs-server.usc.edu:45678/hw/hw8/images/Down.png";

                // refresh in localStorage
                var oldData = JSON.parse(localStorage.getItem(val.symbol));
                oldData.price_data = val.price;
                oldData.price = val.price;
                oldData.changePercent = val.changePercent;
                oldData.color = val.color;
                oldData.img = val.img;
                oldData.volume = val.volume;
                localStorage.setItem(val.symbol, JSON.stringify(oldData));


            }, function errorCallback(data) {
                // error msg
                console.log("refresh failed: " + data);
            });

        });

    };


}]);




myControllers.controller('chartsController', ['$scope', '$http','$routeParams', '$route', '$rootScope', function($scope, $http, $routeParams, $route, $rootScope) {

    // last page
    $rootScope.lastSymbol = $routeParams.symbol;
    $rootScope.showList = false;
    $rootScope.searched = true;
    $scope.failure = {}; // if any failure occur


    // re-init interface
    $scope.reinit = function () {
        $route.reload();
    };

    // change showing chart
    $scope.showing = localStorage.showing === undefined ? 'price' : localStorage.showing;
    $scope.chartReady = {
        price: false,
        SMA: false,
        EMA: false,
        STOCH: false,
        RSI: false,
        ADX: false,
        CCI: false,
        BBANDS: false,
        MACD: false
    };
    $scope.showChart = function (ind) {
        $scope.showing = ind;
        localStorage.setItem('showing', ind);
    };

    // price
    $http.get(host + '/query?symbol=' + $routeParams.symbol).then(function successCallback(data) {
        if (!data.data["Time Series (Daily)"]) {
            $scope.failure.price = true;
            return;
        }

        $scope.chartReady.price = true;
        $scope.price = data.data["Time Series (Daily)"]; // being parsed here
        $scope.lastTimeStamp = data.data["Meta Data"]["3. Last Refreshed"];
        var count = 0;
        var secondLastPrice = null;
        angular.forEach($scope.price, function(value) {
            if (count == 0) {
                $scope.lastPrice = value;
            }
            if (count == 1) {
                secondLastPrice = value;
            }
            count++;
        });
        $scope.symbol = $routeParams.symbol;
        $scope.change = Number($scope.lastPrice["4. close"]) - Number(secondLastPrice["4. close"]);
        $scope.changePercent = $scope.change / Number(secondLastPrice["4. close"]);
        $scope.arrowURL = $scope.changePercent >= 0 ? "http://cs-server.usc.edu:45678/hw/hw8/images/Up.png" : "http://cs-server.usc.edu:45678/hw/hw8/images/Down.png";
        $scope.changeColor = $scope.change >= 0 ? "green" : "red";
        $scope.lastTimeStamp += $scope.lastTimeStamp.length < 11 ? " 16:00:00 EST" : " EST";
        $scope.previousClose = secondLastPrice["4. close"];
        var volume = $scope.lastPrice["5. volume"];
        $scope.formattedVolume = "";
        count = 1;
        for (var i = volume.length - 1; i >= 0 ; i--) {
            $scope.formattedVolume = volume.charAt(i) + $scope.formattedVolume;
            if (count % 3 == 0 && i != 0) $scope.formattedVolume = ',' + $scope.formattedVolume;
            count++;
        }

        if (!localStorage.getItem("favList")) { // if favList has not been initialized
            localStorage.setItem("favList", JSON.stringify([]));
        }
        $scope.favStatus = JSON.parse(localStorage.getItem("favList")).indexOf($scope.symbol) !== -1;


        // price charts

        $scope.price_data = [];
        $scope.vol_data = [];
        $scope.key_data=[];
        var count = 0;
        angular.forEach($scope.price, function(val, key) {
            if (count < 121) {
                $scope.price_data.unshift(Number(val['4. close']));
                $scope.vol_data.unshift(Number(val['5. volume']));
                $scope.key_data.unshift(key);
            }
            count++;
        });


        // historical charts
        $scope.his_data = [];
        var count = 0;
        angular.forEach($scope.price, function(val, key) {
            if (count < 1000) {
                var date = new Date(key);
                $scope.his_data.unshift([date.getTime(), Number(val['4. close'])]);
            }
            count++;
        });

        // draw price chart
        $scope.makePrice($scope.key_data, $scope.price_data, $scope.vol_data);


    }, function errorCallback(data) {
        // error msg
        console.log(data);
    });


    // SMA
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=SMA').then(function successCallback(data) {
            if (!data.data["Technical Analysis: SMA"]) {
                $scope.failure.SMA = true;
                return;
            }

            $scope.chartReady.SMA = true;
            $scope.SMA = data.data["Technical Analysis: SMA"];


            // SMA chart

            $scope.SMA_data = [];
            $scope.SMA_key = [];
            var count = 0;
            angular.forEach($scope.SMA, function(val, key) {
                if (count < 121){
                    $scope.SMA_data.unshift(Number(val['SMA']));
                    $scope.SMA_key.unshift(key);
                }
                count++;
            });

            $scope.makeSingle($scope.SMA_key, $scope.SMA_data, 'SMA', "Simple Moving Average (SMA)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 300);



    // EMA
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=EMA').then(function successCallback(data) {
            if (!data.data["Technical Analysis: EMA"]) {
                $scope.failure.EMA = true;
                return;
            }

            $scope.chartReady.EMA = true;
            $scope.EMA = data.data["Technical Analysis: EMA"];


            // EMA chart

            $scope.EMA_data = [];
            $scope.EMA_key = [];
            var count = 0;
            angular.forEach($scope.EMA, function(val, key) {
                if (count < 121){
                    $scope.EMA_data.unshift(Number(val['EMA']));
                    $scope.EMA_key.unshift(key);
                }
                count++;
            });

            $scope.makeSingle($scope.EMA_key, $scope.EMA_data, 'EMA', "Exponential Moving Average (EMA)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 600);



    // STOCH
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=STOCH').then(function successCallback(data) {
            if (!data.data["Technical Analysis: STOCH"]) {
                $scope.failure.STOCH = true;
                return;
            }

            $scope.chartReady.STOCH = true;
            $scope.STOCH = data.data["Technical Analysis: STOCH"];


            // STOCH chart

            $scope.d_data = [];
            $scope.k_data = [];
            $scope.STOCH_key = [];
            var count = 0;
            angular.forEach($scope.STOCH, function(val, key) {
                if (count < 121){
                    $scope.d_data.unshift(Number(val["SlowD"]));
                    $scope.k_data.unshift(Number(val["SlowK"]));
                    $scope.STOCH_key.unshift(key);
                }
                count++;
            });

            $scope.makeDouble($scope.STOCH_key, $scope.d_data, $scope.k_data, 'STOCH', "Stochastic (STOCH)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 900);


    // RSI
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=RSI').then(function successCallback(data) {
            if (!data.data["Technical Analysis: RSI"]) {
                $scope.failure.RSI = true;
                return;
            }

            $scope.chartReady.RSI = true;
            $scope.RSI = data.data["Technical Analysis: RSI"];



            // RSI chart

            $scope.RSI_data = [];
            $scope.RSI_key = [];
            var count = 0;
            angular.forEach($scope.RSI, function(val, key) {
                if (count < 121){
                    $scope.RSI_data.unshift(Number(val['RSI']));
                    $scope.RSI_key.unshift(key);
                }
                count++;
            });

            $scope.makeSingle($scope.RSI_key, $scope.RSI_data, 'RSI', "Relative Strength Index (RSI)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 1200);


    // ADX
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=ADX').then(function successCallback(data) {
            if (!data.data["Technical Analysis: ADX"]) {
                $scope.failure.ADX = true;
                return;
            }

            $scope.chartReady.ADX = true;
            $scope.ADX = data.data["Technical Analysis: ADX"];


            // ADX chart

            $scope.ADX_data = [];
            $scope.ADX_key = [];
            var count = 0;
            angular.forEach($scope.ADX, function(val, key) {
                if (count < 121){
                    $scope.ADX_data.unshift(Number(val['ADX']));
                    $scope.ADX_key.unshift(key);
                }
                count++;
            });

            $scope.makeSingle($scope.ADX_key, $scope.ADX_data, 'ADX', "Average Directional Movement Index (ADX)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 1500);


    // CCI
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=CCI').then(function successCallback(data) {
            if (!data.data["Technical Analysis: CCI"]) {
                $scope.failure.CCI = true;
                return;
            }

            $scope.chartReady.CCI = true;
            $scope.CCI = data.data["Technical Analysis: CCI"];


            // CCI chart

            $scope.CCI_data = [];
            $scope.CCI_key = [];
            var count = 0;
            angular.forEach($scope.CCI, function(val, key) {
                if (count < 121){
                    $scope.CCI_data.unshift(Number(val['CCI']));
                    $scope.CCI_key.unshift(key);
                }
                count++;
            });

            $scope.makeSingle($scope.CCI_key, $scope.CCI_data, 'CCI', "Commodity Channel Index (CCI)");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 1800);


    // BBANDS
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=BBANDS').then(function successCallback(data) {
            if (!data.data["Technical Analysis: BBANDS"]) {
                $scope.failure.BBANDS = true;
                return;
            }

            $scope.chartReady.BBANDS = true;
            $scope.BBANDS = data.data["Technical Analysis: BBANDS"];


            // BBANDS chart

            $scope.upper_data = [];
            $scope.lower_data = [];
            $scope.middle_data = [];
            $scope.BBANDS_key = [];
            var count = 0;
            angular.forEach($scope.BBANDS, function(val, key) {
                if (count < 121){
                    $scope.upper_data.unshift(Number(val["Real Upper Band"]));
                    $scope.lower_data.unshift(Number(val["Real Lower Band"]));
                    $scope.middle_data.unshift(Number(val["Real Middle Band"]));
                    $scope.BBANDS_key.unshift(key);
                }
                count++;
            });

            $scope.makeTreble($scope.BBANDS_key, $scope.upper_data, $scope.lower_data, $scope.middle_data, 'BBANDS', "Bollinger Bands (BBANDS)", "Real Upper Band", "Real Lower Band", "Real Middle Band");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 2100);

    // MACD
    setTimeout(function () {
        $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=MACD').then(function successCallback(data) {
            if (!data.data["Technical Analysis: MACD"]) {
                $scope.failure.MACD = true;
                return;
            }

            $scope.chartReady.MACD = true;
            $scope.MACD = data.data["Technical Analysis: MACD"];


            // MACD chart

            $scope.MACDS_data = [];
            $scope.MACDH_data = [];
            $scope.MACD_data = [];
            $scope.MACD_key = [];
            var count = 0;
            angular.forEach($scope.MACD, function(val, key) {
                if (count < 121){
                    $scope.MACDS_data.unshift(Number(val["MACD_Signal"]));
                    $scope.MACDH_data.unshift(Number(val["MACD_Hist"]));
                    $scope.MACD_data.unshift(Number(val["MACD"]));
                    $scope.MACD_key.unshift(key);
                }
                count++;
            });

            $scope.makeTreble($scope.MACD_key, $scope.MACDS_data, $scope.MACDH_data, $scope.MACD_data, 'MACD', "Moving Average Convergence/Divergence (MACD)", "MACD_Signal", "MACD_Hist", "MACD");


        }, function errorCallback(data) {
            // error msg
            console.log(data);
        });
    }, 2400);


    // news
    $http.get(host + '/query?symbol=' + $routeParams.symbol + '&func=news').then(function successCallback(data) {
        if (!data.data[0].item) {
            $scope.failure.news = true;
            return;
        }

        $scope.news = data.data[0].item;
    }, function errorCallback(data) {
        // error msg
        console.log(data);
    });


    // fav toggle
    $scope.favToggle = function() {
        $scope.favStatus === false ? $scope.favStatus = true : $scope.favStatus = false;
        if ($scope.favStatus === true) {
            var favListArr = JSON.parse(localStorage.getItem("favList"));
            favListArr.push($scope.symbol);
            localStorage.setItem("favList", JSON.stringify(favListArr));

            localStorage.setItem($scope.symbol, JSON.stringify({
                symbol: $scope.symbol,
                price: $scope.lastPrice["4. close"].slice(0, -2),
                change: $scope.change,
                changePercent: $scope.changePercent,
                img: $scope.arrowURL,
                color: $scope.changeColor,
                volume: $scope.formattedVolume
            }));
        } else {
            var favListArr = JSON.parse(localStorage.getItem("favList"));
            var index = favListArr.indexOf($scope.symbol);
            if (index !== -1) { // this symbol is in fav
                // rm from list
                favListArr.splice(index, 1);
                localStorage.setItem("favList", JSON.stringify(favListArr));
                // rm from storage
                localStorage.removeItem($scope.symbol);
            }
        }
    };

    $scope.options = {};

    // fb sharing
    $scope.fbshare = function () {


        // post to export server to get img URL
        var obj = {};
        var option = $scope.options[$scope.showing];
        obj.options= JSON.stringify(option);
        obj.type = 'image/png';
        obj.async = true;
        // $http.post("https://export.highcharts.com/", obj).then(function suc(data) {
        $http.get(host + '/share?options=' + obj.options + '&type=' + obj.type + '&async=' + obj.async).then(function suc(data) {

            var url = "https://export.highcharts.com/" + data.data;

            FB.ui({
                method: 'share',
                display: 'popup',
                href: url
            }, function(response){
                if (response && !response.error_message) alert("Posted Successfully.");
                else alert('Error while posting.');
            });

        }, function err() {
           console.log(err.message);
        });
    };

    // chart drawing functions
    $scope.makePrice = function (key_data, price_data, vol_data) {
        var option = {
            chart: {
                zoomType: 'x'
            },
            title: {
                text: $scope.symbol + ' Stock Price and Volume'
            },
            subtitle: {
                useHTML: true,
                text: '<a id="source" href="https://www.alphavantage.co/" target="_blank">Source: Alpha Vantage</a>',
                style: {
                    color: 'rgb(54, 61, 206)'
                }
            },
            xAxis: {
                type: 'category',
                categories: key_data,
                tickInterval: 5,
                labels: {
                    formatter: function () {
                        return this.value.substring(5,7) + '/' + this.value.substring(8);
                    },
                    style: {
                        fontSize: '6px'
                    }
                }
            },
            yAxis: [{
                labels: {
                    format: '{value}'
                },
                title: {
                    text: 'Stock Price'
                },
                tickInterval: 5
            },
                {
                    labels: {
                        formatter: function () {
                            return this.value / 1000000 + 'M';
                        }
                    },
                    title: {
                        text: 'Volume'
                    },
                    tickInterval: 80000000,
                    max: 300000000,
                    opposite: true
                }],
            plotOptions: {
                area: {
                    fillColor: 'rgba(233, 233, 253, 0.8)',
                    lineColor: 'rgb(35, 42, 206)',
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                },
                column: {
                    color: 'rgb(190, 55, 25)',
                    groupPadding: 0.1,
                    pointWidth: 0.2
                },
                series: {
                    marker: {
                        enabled: false,
                    }
                }
            },

            tooltip: {
                formatter: function() {
                    var tip = this.x.substring(5,7) + '/' + this.x.substring(8);
                    tip += '<br/><span style="color:' + this.color + '">\u25CF</span> ' + this.series.name + ': ' + this.y;
                    return tip;
                }
            },

            series: [{
                type: 'area',
                name: $scope.symbol,
                data: price_data,
                color: 'rgba(231, 143, 142, 0.80)',
            },
                {
                    type: 'column',
                    name: $scope.symbol + " Volume",
                    data: vol_data,
                    yAxis: 1
                }]
        };

        $scope.options["price"] = option;

        Highcharts.chart('price', option);
    };

    $scope.makeSingle = function (keys, values, target, title) {
        var option = {
            chart: {
                zoomType: 'x'
            },
            title: {
                text: title
            },
            subtitle: {
                useHTML: true,
                text: '<a id="source" href="https://www.alphavantage.co/" target="_blank">Source: Alpha Vantage</a>',
                style: {
                    color: 'rgb(54, 61, 206)'
                }
            },
            xAxis: {
                type: 'category',
                categories: keys,
                tickInterval: 5,
                labels: {
                    formatter: function () {
                        return this.value.substring(5,7) + '/' + this.value.substring(8);
                    },
                    style: {
                        fontSize: '6px'
                    }
                }
            },
            yAxis: {
                labels: {
                    format: '{value}'
                },
                title: {
                    text: target
                },
                tickInterval: null,
                max: null,
                style: {
                    fontSize: '7px'
                }
            },
            tooltip: {
                formatter: function() {
                    var tip = this.x.substring(5,7) + '/' + this.x.substring(8);
                    tip += '<br/><span style="color:' + this.color + '">\u25CF</span> ' + this.series.name + ': ' + Highcharts.numberFormat(this.y, 2);
                    return tip;
                }
            },
            plotOptions: {
                spline: {
                    lineWidth: 1.2
                }
            },
            series: [{
                type: 'spline',
                name: target,
                data: values,
                color: 'rgb(176, 181, 206)'
            }]
        };

        $scope.options[target] = option;

        Highcharts.chart(target, option);
    };

    $scope.makeDouble = function (keys, value1, value2, target, title) {
        var option = {
            chart: {
                zoomType: 'x'
            },
            title: {
                text: title
            },
            subtitle: {
                useHTML: true,
                text: '<a id="source" href="https://www.alphavantage.co/" target="_blank">Source: Alpha Vantage</a>',
                style: {
                    color: 'rgb(54, 61, 206)'
                }
            },
            xAxis: {
                type: 'category',
                categories: keys,
                tickInterval: 5,
                labels: {
                    formatter: function () {
                        var temp = new Date(this.value);
                        temp = (temp.getUTCMonth() + 1) + '/' + temp.getUTCDate();
                        return temp;
                    },
                    style: {
                        fontSize: '6px'
                    }
                },
                crosshair: true
            },
            yAxis: {
                labels: {
                    format: '{value}'
                },
                title: {
                    text: title
                },
                tickInterval: null,
                max: null,
                style: {
                    fontSize: '6px'
                }
            },
            plotOptions: {
                spline: {
                    lineWidth: 1.2
                }
            },

            tooltip: {
                formatter: function() {
                    var points = this.points; // array[# of series]
                    var tip = this.x.substring(5,7) + '/' + this.x.substring(8);
                    for (var i in points) {
                        tip += '<br/><span style="color:' + points[i].color + '">\u25CF</span> ' + points[i].series.name + ': ' + Highcharts.numberFormat(points[i].y);
                    }
                    return tip;
                },
                shared: true
            },

            series: [{
                type: 'spline',
                name: target + " SlowD",
                data: value1,
                color: 'rgb(184, 44, 11)',
            },
                {
                    type: 'spline',
                    name: target + " SlowK",
                    data: value2,
                    color: 'rgb(152, 193, 233)',
                }]
        };

        $scope.options[target] = option;

        Highcharts.chart(target, option);
    };

    $scope.makeTreble = function (keys, value1, value2, value3, target, title, name1, name2, name3) {
        var option = {
            chart: {
                zoomType: 'x'
            },
            title: {
                text: title
            },
            subtitle: {
                useHTML: true,
                text: '<a id="source" href="https://www.alphavantage.co/" target="_blank">Source: Alpha Vantage</a>',
                style: {
                    color: 'rgb(54, 61, 206)'
                }
            },
            xAxis: {
                type: 'category',
                categories: keys,
                tickInterval: 5,
                labels: {
                    formatter: function () {
                        return this.value.substring(5,7) + '/' + this.value.substring(8);
                    },
                    style: {
                        fontSize: '6px'
                    }
                },
                crosshair: true
            },
            yAxis: {
                labels: {
                    format: '{value}'
                },
                title: {
                    text: title
                },
                tickInterval: null,
                max: null,
                style: {
                    fontSize: '6px'
                }
            },
            plotOptions: {
                spline: {
                    lineWidth: 1.2
                }
            },

            tooltip: {
                formatter: function() {
                    var points = this.points; // array[# of series]
                    var tip = this.x.substring(5,7) + '/' + this.x.substring(8);
                    for (var i in points) {
                        tip += '<br/><span style="color:' + points[i].color + '">\u25CF</span> ' + points[i].series.name + ': ' + Highcharts.numberFormat(points[i].y);
                    }
                    return tip;
                },
                shared: true
            },

            series: [{
                type: 'spline',
                name: target + " " + name1,
                data: value1,
                color: 'rgb(180, 50, 24)'
            },
                {
                    type: 'spline',
                    name: target + " " + name2,
                    data: value2,
                    color: 'rgb(84, 84, 86)'
                },
                {
                    type: 'spline',
                    name: target + " " + name3,
                    data: value3,
                    color: 'rgb(180, 230, 162)'
                }]
        };

        $scope.options[target] = option;

        Highcharts.chart(target, option);
    };

}]);


// controller for switch between detailed pages
myControllers.controller('detailsController', ['$scope', function($scope) {
    $scope.details = 'units/current.html';
    $scope.changeDetailsURL = function(url) {
        $scope.details = url;
        // redraw all indicator charts when back to 'current'
        if (url === 'units/current.html') {
            setTimeout(function () {
                if (!$scope.failure.price)$scope.makePrice($scope.key_data, $scope.price_data, $scope.vol_data);
                if (!$scope.failure.SMA)$scope.makeSingle($scope.SMA_key, $scope.SMA_data, 'SMA', "Simple Moving Average (SMA)");
                if (!$scope.failure.EMA)$scope.makeSingle($scope.EMA_key, $scope.EMA_data, 'EMA', "Exponential Moving Average (EMA)");
                if (!$scope.failure.STOCH)$scope.makeDouble($scope.STOCH_key, $scope.d_data, $scope.k_data, 'STOCH', "Stochastic (STOCH)");
                if (!$scope.failure.RSI)$scope.makeSingle($scope.RSI_key, $scope.RSI_data, 'RSI', "Relative Strength Index (RSI)");
                if (!$scope.failure.ADX)$scope.makeSingle($scope.ADX_key, $scope.ADX_data, 'ADX', "Average Directional Movement Index (ADX)");
                if (!$scope.failure.CCI)$scope.makeSingle($scope.CCI_key, $scope.CCI_data, 'CCI', "Commodity Channel Index (CCI)");
                if (!$scope.failure.BBANDS)$scope.makeTreble($scope.BBANDS_key, $scope.upper_data, $scope.lower_data, $scope.middle_data, 'BBANDS', "Bollinger Bands (BBANDS)", "Real Upper Band", "Real Lower Band", "Real Middle Band");
                if (!$scope.failure.MACD)$scope.makeTreble($scope.MACD_key, $scope.MACDS_data, $scope.MACDH_data, $scope.MACD_data, 'MACD', "Moving Average Convergence/Divergence (MACD)", "MACD_Signal", "MACD_Hist", "MACD");
            }, 100);
        }
    };
}]);


// controller for historical chart page
myControllers.controller('historicalController', ['$scope', '$http','$routeParams', function($scope, $http, $routeParams) {
        if ($scope.failure['price']) {
            return;
        }

        Highcharts.stockChart('historical', {

            title: {
                text: $routeParams.symbol + ' Stock Value'
            },

            subtitle: {
                useHTML: true,
                text: '<a id="source" href="https://www.alphavantage.co/" target="_blank">Source: Alpha Vantage</a>',
                style: {
                    color: 'rgb(54, 61, 206)'
                }
            },

            tooltip: {
                formatter: function() {
                    var points = this.points[0].x; // array[# of series]
                    var date = new Date(points);
                    var format = "";
                    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                    var months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
                    format += days[date.getDay()] + ", " + months[date.getMonth()] + " " + (date.getDate() + 1) + ", " + date.getFullYear();
                    format += '<br/><span style="color:' + this.points[0].color + '">\u25CF</span> ' + this.points[0].series.name + ': ' + Highcharts.numberFormat(this.points[0].y)
                    return format;
                }
            },

            rangeSelector: {
                selected: 0,
                buttons: [{
                    type: 'week',
                    count: 1,
                    text: '1w'
                },
                {
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'month',
                    count: 3,
                    text: '3m'
                }, {
                    type: 'month',
                    count: 6,
                    text: '6m'
                }, {
                    type: 'ytd',
                    text: 'YTD'
                }, {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, {
                    type: 'all',
                    text: 'All'
                }]
            },

            series: [{
                name: $routeParams.symbol,
                type: 'area',
                data: $scope.his_data,
                tooltip: {
                    valueDecimals: 2
                }
            }],

            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        rangeSelector: {
                            inputEnabled: false
                        }
                    }
                }]
            }
        });

        $scope.historicalFinished = true;

}]);




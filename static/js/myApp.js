var myApp = angular.module('myApp', [
    'ngRoute',
    'myControllers',
    'ngMaterial'
]);

myApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
    when('/list', {
        templateUrl: 'units/list.html',
        controller: 'ListController'
    }).
    when('/charts/:symbol', {
        templateUrl: 'units/charts.html',
        controller: 'chartsController'
    }).
    otherwise({
        redirectTo: '/list'
    });
}]);
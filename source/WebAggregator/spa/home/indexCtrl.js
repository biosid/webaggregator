(function (app) {
    "use strict";

    app.controller("indexCtrl", indexCtrl);

    indexCtrl.$inject = ["$scope"];
    function indexCtrl($scope) {
        $scope.pageClass = "page-home";
    }

})(angular.module("webAggegator"));
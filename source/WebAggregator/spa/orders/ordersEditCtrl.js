(function (app) {
    "use strict";

    app.controller("ordersEditCtrl", ordersEditCtrl);
    ordersEditCtrl.$inject = ["$scope", "$interval", "membershipService", "notificationService", "$rootScope", "$location", "apiService", "systemConfig", "$routeParams", "mapService"];

    function ordersEditCtrl($scope, $interval, membershipService, notificationService, $rootScope, $location, apiService, systemConfig, $routeParams, mapService) {
        var serviceBase = systemConfig.BaseUrl;
        var action = "orders/";
        //model fields
        $scope.order = {};
        $scope.order.id = $routeParams.id;
        $scope.completionReasons = {};
        $scope.currentCompletionReason = "";
        //metods
        $scope.complete = completeOrder;
        $scope.returnToOrders = returnToOrders;
        $scope.map = { control: {}, center: { latitude: 0, longitude: 0 }, zoom: 13, polylines: [] };
        //options
        $scope.autocompleteOptions = { componentRestrictions: { country: "ru" }, types: ["geocode"] }
        $scope.windowOptions = { visible: false };
        $scope.completionEnabled = true;

        apiService.get(serviceBase + "order-completion-reasons", null, function (result) {
            console.log(result);
            $scope.completionReasons = result.data.items;
        });

        function getOrder() {
            apiService.get(serviceBase + action + $scope.order.id, null, function (result) {
                console.log(result);
                $scope.order = result.data;

                $scope.completionEnabled = $scope.order.state.id !== 50;
            });
        }

        function returnToOrders() {
            $location.path("/");
        }

        function completeOrder() {
            console.log($scope.currentCompletionReason);

            var data = {
                id: $scope.currentCompletionReason,
                name: "string"
            }

            apiService.put(serviceBase + "orders/" + $scope.order.id + "/close",
                data,
                function (result) {
                    notificationService.displayInfo("Заказ № " + $scope.order.id + " закрыт!");

                    getOrder();

                    mapService.getOfferRoute($scope);
                });
        }

        mapService.loadCurrentLocation($scope);

        getOrder();

        mapService.getOfferRoute($scope);
    };

})(angular.module("webAggegator"));
(function (app) {
    "use strict";

    app.controller("registerCtrl", registerCtrl);

    registerCtrl.$inject = ['$scope', "membershipService", "notificationService", "$rootScope", "$location", "apiService", "systemConfig"];

    function registerCtrl($scope, membershipService, notificationService, $rootScope, $location, apiService, systemConfig) {
        $scope.pageClass = "page-login";
        $scope.register = register;
        $scope.user = {};

        function register() {
            var serviceBase = systemConfig.BaseUrl;
            var registerData = {
                login: $scope.user.email,
                profile: {
                    name: $scope.user.name
                }
            }
            if (systemConfig.debugMode) {
                console.log("Данные на создание пользователя:");
                console.log(registerData);
            }
            apiService.post(serviceBase + "accounts/email", registerData, registerCompleted);
        }

        function registerCompleted(result) {
            if (systemConfig.debugMode) {
                console.log("Успешное создание пользователя:");
                console.log(result);
            }
            $location.path("/register/confirm");
        }
    }

})(angular.module('common.core'));
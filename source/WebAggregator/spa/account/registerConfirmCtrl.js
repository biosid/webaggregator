(function (app) {
    "use strict";

    app.controller("registerConfirm", registerConfirm);

    registerConfirm.$inject = ["$scope", "membershipService", "notificationService", "$rootScope", "$location", "apiService", "systemConfig"];

    function registerConfirm($scope, membershipService, notificationService, $rootScope, $location, apiService, systemConfig) {
        $scope.pageClass = "page-login";
        $scope.register = register;
        $scope.user = {};

        function register() {
            var confirmData = {
                code: $scope.user.code,
                password: $scope.user.password
            }
            if (systemConfig.debugMode) {
                console.log("Данные на подтверждение:");
                console.log(confirmData);
            }
            var serviceBase = systemConfig.BaseUrl;
            apiService.put(serviceBase + "accounts/code/confirm", confirmData, registerCompleted);
        }

        function registerCompleted(result) {
            if (systemConfig.debugMode) {
                console.log("Успешное подтверждение создания пользователя:");
                console.log(result);
            }

            $location.path("/login");
        }
    }

})(angular.module("common.core"));
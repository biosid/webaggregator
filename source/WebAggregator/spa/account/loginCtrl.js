(function (app) {
    "use strict";

    app.controller("loginCtrl", loginCtrl);

    loginCtrl.$inject = ["$scope", "membershipService", "notificationService", "$rootScope", "$location", "apiService", "systemConfig"];

    function loginCtrl($scope, membershipService, notificationService, $rootScope, $location, apiService, systemConfig) {

        var serviceBase = systemConfig.BaseUrl;

        $scope.pageClass = 'page-login';
        $scope.login = login;
        $scope.user = {};
        $scope.invite = {};
        $scope.acceptInvite = acceptInvite;

        function login() {
            membershipService.login($scope.user, loginCompleted);
        }

        function loginCompleted() {
            notificationService.displaySuccess("Привет " + $scope.user.username);
            if ($rootScope.previousState)
                $location.path("/");
            else
                $location.path("/");

            $scope.userData.displayUserInfo();
        }


        function acceptInvite() {
            var action = "accounts/email/accept-invite";
            apiService.put(serviceBase + action, $scope.invite, function (result) {
                $location.path("/login");
            });
        }

        $scope.$emit("LoginRedirectEvent", null);
    }

})(angular.module("common.core"));
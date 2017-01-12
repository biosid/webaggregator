(function (app) {
    "use strict";

    app.controller("recoverCtrl", recoverCtrl);

    recoverCtrl.$inject = ["$scope", "membershipService", "notificationService", "$rootScope", "$location"];

    function recoverCtrl($scope, membershipService, notificationService, $rootScope, $location) {
        $scope.pageClass = "page-login";
        $scope.recover = recover;
        $scope.user = {};

        function recover() {
            membershipService.recover($scope.user.email, recoverCompleted);
        }

        function recoverCompleted() {
            notificationService.displaySuccess("Переход к следующему шагу");
            $location.path('/recover/confirm');
        }
    }

})(angular.module("common.core"));
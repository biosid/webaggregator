(function (app) {
    'use strict';

    app.controller('recoverConfirmCtrl', recoverConfirmCtrl);

    recoverConfirmCtrl.$inject = ['$scope', 'membershipService', 'notificationService', '$rootScope', '$location'];

    function recoverConfirmCtrl($scope, membershipService, notificationService, $rootScope, $location) {
        $scope.pageClass = 'page-login';
        $scope.confirm = confirm;
        $scope.confirmData = {};

        function confirm() {
            membershipService.confirmRecover($scope.confirmData.code, $scope.confirmData.password, confirmCompleted);
        }

        function confirmCompleted() {
            membershipService.removeCredentials();
            notificationService.displaySuccess("Восстановление прошло успешно");
            $location.path('/login');
        }
    }

})(angular.module('common.core'));
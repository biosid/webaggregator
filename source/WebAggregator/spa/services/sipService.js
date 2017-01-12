(function (app) {
    "use strict";

    app.factory("sipService", sipService);

    sipService.$inject = ["$scope"];

    function sipService($scope) {

        var service = {
            init: init,
            logIn: login,
            logOut: logOut,
            audioCall: audioCall,
            videoCall: videoCall,
            screenShare: screenShare
        };

        function init(sipSettings) {
            $scope.sipSettings = sipSettings;
        }

        function login() { }
        function logOut() { }
        function audioCall() { }
        function videoCall() { }
        function screenShare() { }
        return service;
    }

})(angular.module("common.core"));
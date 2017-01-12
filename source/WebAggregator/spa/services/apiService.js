(function (app) {
    "use strict";

    app.factory("apiService", apiService);

    apiService.$inject = ["$http", "notificationService", "systemConfig"];

    function apiService($http, notificationService, systemConfig) {

        var service = {
            get: get,
            post: post,
            put: put
        };

        function processResponseErrors(error) {
            if (typeof (error) === "undefined") {
                notificationService.displayError("Не удалось распознать ошибку от сервера");
            }
            if (typeof error.data != "undefined" && error.data != null) {
                if (typeof error.data.message != "undefined" && error.data.message != null) {
                    notificationService.displayError(error.data.message);
                }
                if (typeof error.data.errors != "undefined" && error.data.errors != null) {
                    for (var i = 0; i < error.data.errors.length; i++) {
                        notificationService.displayError(error.data.errors[i].title);
                    }
                }
            }
        }

        function get(url, config, success, failure) {
            return $http
                .get(url, config)
                .then(function (result) {
                    success(result);
                }, function (error) {
                    if (systemConfig.debugMode) {
                        console.log("$http.get success:");
                        console.log(error);
                    }
                    if (failure != null) {
                        failure(error);
                    }
                });
        }

        function post(url, data, success, failure) {
            return $http
                .post(url, data)
                .then(function (result) {
                    if (systemConfig.debugMode) {
                        console.log("$http.post success:");
                        console.log(result);
                    }

                    success(result);
                }, function (error) {
                    if (systemConfig.debugMode) {
                        console.log("$http.post error:");
                        console.log(error);
                    }
                    processResponseErrors(error);
                    if (failure != null) {
                        failure(error);
                    }
                });
        }

        function put(url, data, success, failure, config) {
            return $http
                .put(url, data, config)
                .then(function (result) {
                    if (systemConfig.debugMode) {
                        console.log("$http.put success:");
                        console.log(result);
                        console.log(config);
                    }
                    success(result);
                }, function (error) {
                    if (systemConfig.debugMode) {
                        console.log("$http.put error:");
                        console.log(error);
                    }
                    processResponseErrors(error);
                    if (failure != null) {
                        failure(error);
                    }
                });
        }

        return service;
    }

})(angular.module("common.core"));
(function (app) {
    "use strict";

    app.factory("membershipService", membershipService);

    membershipService.$inject = ["apiService", "notificationService", "$http", "$base64", "$cookieStore", "$rootScope", "systemConfig"];

    function membershipService(apiService, notificationService, $http, $base64, $cookieStore, $rootScope, systemConfig) {

        var serviceBase = systemConfig.BaseUrl;

        var service = {
            login: login,
            recover: recover,
            confirmRecover: confirmRecover,
            removeCredentials: removeCredentials,
            isUserLoggedIn: isUserLoggedIn,
            refreshToken: refreshToken,
            loginByPhoneCode: loginByPhoneCode
        };

        function login(user, completed, config) {

            var actionPath = "tokens";
            var authData = { grant_type: 'password', username: user.username, password: user.password }
            if (systemConfig.debugMode) {
                console.log("logins data:");
                console.log(authData);
            }
            apiService.put(systemConfig.BaseUrl + actionPath, authData, function (result) {
                if (systemConfig.debugMode) {
                    console.log("logins response:");
                    console.log(result);
                }
                $rootScope.authorization = {
                    loggedUser: {
                        phone: "",
                        username: authData.username,
                        token: result.data.access_token,
                        refresh_token: result.data.refresh_token
                    }
                };
                $cookieStore.put("authorization", $rootScope.authorization);
                if (completed != null)
                    completed();
            }, function () { }, config);
        }

        function recover(email, completed) {
            var actionPath = "accounts/email/recover";
            var recoverData = {
                email: email
            }
            if (systemConfig.debugMode) {
                console.log("recovery password data:");
                console.log(recoverData);
            }
            apiService.post(serviceBase + actionPath, recoverData, function () {
                completed();
            });
        }

        function confirmRecover(code, password, completed) {
            var actionPath = "accounts/code/password";
            var recoverData =
            {
                code: code,
                password: password
            }
            if (systemConfig.debugMode) {
                console.log("Данные для подтверждения восстановления пароля:");
                console.log(recoverData);
            }
            apiService.put(serviceBase + actionPath, recoverData, completed);
        }

        function removeCredentials() {
            $rootScope.authorization = {};
            $cookieStore.remove("authorization");
        };

        function isUserLoggedIn() {
            return $rootScope.authorization.loggedUser != null;
        }

        function refreshToken() {
            var authorization = $cookieStore.get("authorization");
            if (authorization.loggedUser) {

                var actionPath = "tokens";
                var authData = { grant_type: "refresh_token", refresh_token: authorization.loggedUser.refresh_token };

                apiService.put(systemConfig.BaseUrl + actionPath, authData, function (result) {
                    if (systemConfig.debugMode) {
                        console.log("refresh token response:");
                        console.log(result);
                    }
                    authorization.loggedUser.token = result.data.access_token;
                    authorization.loggedUser.refresh_token = result.data.refresh_token;
                    $rootScope.authorization = authorization;
                    $cookieStore.put("authorization", $rootScope.authorization);

                }, function () { }, { ignoreLoadingBar: true });
            }
            return service;
        }

        function loginByPhoneCode(phone, code, completed) {

            var actionPath = "tokens";
            var authData = { grant_type: "http://taxys.ru/schema/grants/passwordless", username: phone, code: code };

            apiService.put(systemConfig.BaseUrl + actionPath, authData, function (result) {
                if (systemConfig.debugMode) {
                    console.log("loginByPhoneCode response:");
                    console.log(result);
                }
                $rootScope.authorization = {
                    loggedUser: {
                        phone: phone,
                        username: "",
                        token: result.data.access_token,
                        refresh_token: result.data.refresh_token
                    }
                };
                $cookieStore.put('authorization', $rootScope.authorization);
                if (completed != null)
                    completed();
            }, function () { }, { ignoreLoadingBar: true });
        }
        return service;
    }

})(angular.module("common.core"));
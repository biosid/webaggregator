(function (app) {
    "use strict";

    app.factory("notificationService", notificationService);

    function notificationService() {

        var loadingScreen = null;

        toastr.options = {
            "debug": false,
            "positionClass": "toast-top-right",
            "onclick": null,
            "fadeIn": 300,
            "fadeOut": 1000,
            "timeOut": 3000,
            "extendedTimeOut": 1000
        };

        var service = {
            displaySuccess: displaySuccess,
            displayError: displayError,
            displayWarning: displayWarning,
            displayInfo: displayInfo,
            showLoadingScreen: showLoadingScreen,
            hideLoadinScreen: hideLoadinScreen
        };

        return service;

        function displaySuccess(message) {
            toastr.success(message);
        }

        function displayError(error) {
            if (Array.isArray(error)) {
                error.forEach(function (err) {
                    toastr.error(err);
                });
            } else {
                toastr.error(error);
            }
        }

        function displayWarning(message) {
            toastr.warning(message);
        }

        function displayInfo(message) {
            toastr.info(message);
        }

        function showLoadingScreen(message) {
            loadingScreen = window.pleaseWait({
                backgroundColor: "#ddd",
                logo: "",
                loadingHtml: "<p class='loading-message'> <i class='fa fa-spinner fa-pulse fa-3x fa-fw' aria-hidden='true'></i></p>" +
                    "<p class='loading-message'><h3>" + message + "</h3></p>"
            });
        }

        function hideLoadinScreen() {
            if (loadingScreen != null)
                loadingScreen.finish();
        }
    }

})(angular.module("common.core"));
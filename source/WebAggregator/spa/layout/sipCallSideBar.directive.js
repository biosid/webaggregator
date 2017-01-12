(function (app) {
    "use strict";

    app.directive("sipCallSideBar", sipCallSideBar);

    function sipCallSideBar() {
        return {
            restrict: "E",
            replace: true,
            templateUrl: "/spa/layout/sipCallSideBar.html"
        }
    }

})(angular.module("common.ui"));
(function(app) {
    "use strict";

    app.directive("map", map);

    function map() {
        return {
            restrict: "E",
            replace: true,
            templateUrl: "/spa/map/map.html"
        }
    }

})(angular.module("common.ui"));
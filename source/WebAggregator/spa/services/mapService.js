(function (app) {
    "use strict";

    app.factory("mapService", mapService);

    mapService.$inject = ["uiGmapIsReady", "uiGmapGoogleMapApi", "systemConfig", "apiService"];

    function mapService(uiGmapIsReady, uiGmapGoogleMapApi, systemConfig, apiService) {
        var serviceBase = systemConfig.BaseUrl;

        var service = {
            loadCurrentLocation: loadCurrentLocation,
            getOfferRoute: getOfferRoute
        };

        function loadCurrentLocation(a) {

            var action = "companies/current/location";
            // marker object
            a.marker = { id: 1, center: { latitude: 0, longitude: 0 } };
            apiService.get(serviceBase + action, { ignoreLoadingBar: true }, function (result) {
                console.log(result);
                a.map.center.latitude = result.data.latitude;
                a.map.center.longitude = result.data.longitude;
                a.marker.center.latitude = result.data.latitude;
                a.marker.center.longitude = result.data.longitude;
            });
        };

        function getOfferRoute(a) {

            uiGmapIsReady.promise().then(
                function (instances) {                 // instances is an array object
                    // pass the map to your function
                    uiGmapGoogleMapApi.then(
                        function (maps) {
                            var actionPreffix = "searches/";
                            var actionSuffix = "/route";
                            apiService.get(serviceBase + actionPreffix + a.order.searchSessionId + actionSuffix,
                                { ignoreLoadingBar: true },
                                function (result) {
                                    // coordinates center
                                    a.windowOptions.visible = true;
                                    a.map.center.latitude = result.data.center.latitude;
                                    a.map.center.longitude = result.data.center.longitude;
                                    a.marker.center.latitude = result.data.center.latitude;
                                    a.marker.center.longitude = result.data.center.longitude;
                                    a.distance = result.data.distance;
                                    a.duration = result.data.duration;

                                    function createPolyline(items) {

                                        return {
                                            id: 1,
                                            path: items,
                                            stroke: {
                                                color: "#FF0000",
                                                weight: 3
                                            },
                                            editable: false,
                                            draggable: false,
                                            geodesic: true,
                                            visible: true
                                        };
                                    };

                                    a.map.polylines = [];
                                    a.map.polylines.push(createPolyline(result.data.items));
                                });
                        });
                });
        }

        return service;
    }

})(angular.module("common.core"));
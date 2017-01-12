(function (app) {
    "use strict";

    app.controller("ordersCtrl", ordersCtrl);

    ordersCtrl.$inject = ["$scope", "$interval", "membershipService", "notificationService", "$rootScope", "$location", "apiService", "systemConfig", "mapService"];

    function ordersCtrl($scope, $interval, membershipService, notificationService, $rootScope, $location, apiService, systemConfig, mapService) {
        var serviceBase = systemConfig.BaseUrl;

        $scope.ordersGridColumns = initOrderGridColumns();
        $scope.ordersOptions = ordersOptions();
        $scope.onOrderSelection = onOrderSelection;
        $scope.onOrderGridChange = onOrderGridChange;
        $scope.ordersData = [];
        $scope.currentOrderId = 0;
        $scope.onTabSelect = onTabSelect;
        $scope.getOrdersData = getOrdersData;
        $scope.currentGridFilter = "All";
        $scope.ordersRefreshWork = {};
        $scope.map = { control: {}, center: { latitude: 0, longitude: 0 }, zoom: 13, polylines: [] };
        //options
        $scope.autocompleteOptions = { componentRestrictions: { country: "ru" }, types: ["geocode"] }
        $scope.windowOptions = { visible: false };

        function onTabSelect(e) {
            console.log("Selected: " + $(e.item).find("> .k-link").text());
            $scope.currentGridFilter = $(e.item).find("> .k-link").text();
            $scope.getOrdersData();
        };

        function initOrderGridColumns() {
            return [
                { field: "employeeName", title: "Сотрудник" },
                { field: "passengerName", title: "Пассажир" },
                { field: "passengerPhone", title: "Телефон" },
                { field: "registrationPlate", title: "Номер автомобиля" },
                { field: "driverPhone", title: "Номер водителя" },
                { field: "startAddress", title: "Начальный адрес" },
                { field: "endAddress", title: "Конечный адрес" },
                { field: "departedAt", title: "Контрольное время" },
                { field: "state.name", title: "Статус" },
                { command: { text: "открыть", click: onOrderGridChange }, title: " " }
            ];
        }

        function rowTemplateString() {
            return '<tr style="#= typeof(isScheduled) === \'undefined\' ? \'\' : (isScheduled ? \'background-color: LightSkyBlue\' : \'\') #" data-uid="#: id #">' +
                '<td>#= typeof(employeeName) === \'undefined\' ? \'\' : dataSource.name #</td>' +
                '<td>#= typeof(passengerName) === \'undefined\' ? \'\' : passengerName #</td>' +
                '<td>#= typeof(passengerPhone) === \'undefined\' ? \'\' : passengerPhone #</td>' +
                '<td>#= typeof(registrationPlate) === \'undefined\' ? \'\' : registrationPlate #</td>' +
                '<td>#= typeof(driverPhone) === \'undefined\' ? \'\' : driverPhone #</td>' +
                '<td>#= typeof(startAddress) === \'undefined\' ? \'\' : startAddress #</td>' +
                '<td>#= typeof(endAddress) === \'undefined\' ? \'\' : endAddress #</td>' +
                '<td>#= typeof(departedAt) === \'undefined\' ? \'\' : departedAt #</td>' +
                '<td>#= state.name #</td>' +
                '<td>#= state.name === \'Scheduled\' || state.name === \'Searching\' ? \'\' : \'<button class="k-button k-button-icontext" onclick="return onOrderGridChange(this);">открыть</button>\' #</td>' +
                '</tr>'; 
        }
        function ordersOptions() {
            return {
                columns: initOrderGridColumns(),
                onChange: onOrderSelection,
                selectable: true,
                sortable: false,
                pageable: false,
                rowTemplate: rowTemplateString()
            };
        }

        function onOrderGridChange(id) {
            console.log(id);
            $location.path('/orders/edit/' + id);
        }

        function onOrderSelection(e) {
            var selectedRow = e.sender.select();
            var dataItem = e.sender.dataItem(selectedRow);
            console.log(dataItem);
            $scope.currentOrderId = dataItem.id;
            mapService.getOfferRoute($scope);
        }

        function getOrdersData() {
            var action = "orders";
            apiService.get(serviceBase + action, { ignoreLoadingBar: true }, function (result) {
                $scope.ordersData = [];
                if ($scope.currentGridFilter === "All") {
                    $scope.ordersData = result.data.items;
                } else {
                    for (var i = 0; i < result.data.items.length; i++) {
                        if (result.data.items[i].state.name === $scope.currentGridFilter)
                            $scope.ordersData.push(result.data.items[i]);
                    }
                }
            });
        }

        mapService.loadCurrentLocation($scope);

        $scope.ordersRefreshWork = $interval(function () {
            $scope.getOrdersData();
        }, 2500);

        $scope.$on("$destroy", function () {
            if ($scope.ordersRefreshWork) {
                $interval.cancel($scope.ordersRefreshWork);
            }
        });
    };

})(angular.module('webAggegator'));
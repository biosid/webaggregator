(function (app) {
    "use strict";

    app.controller("ordersAddCtrl", ordersAddCtrl);

    ordersAddCtrl.$inject = ["$scope", "membershipService", "notificationService", "$rootScope", "apiService", "systemConfig", "$window", "$interval", "mapService"];

    function ordersAddCtrl($scope, membershipService, notificationService, $rootScope, apiService, systemConfig, $window, $interval, mapService) {

        var serviceBase = systemConfig.BaseUrl;

        //model fields
        $scope.order = { phone: "" };
        var d = new Date();
        $scope.order.date = d.toLocaleString();

        $scope.offersData = {};
        $scope.offersPanelVisilble = false;

        $scope.promoData = {};
        $scope.promoPanelVisilble = false;

        $scope.currentSuggestionId = 0;

        $scope.dateTimeOptions = {
            min: new Date()
        }
        $scope.connection = {};
        $scope.places = {};

        var checkOrderTimer;

        //metods
        $scope.calculate = getOffers;
        $scope.offersGridColumns = initOffersGridColumns();
        $scope.onOffersGridSelect = onOffersGridSelect;
        $scope.onSelection = mapService.getOfferRoute;
        $scope.passangerNumberChange = createOrUpdatePassanger;
        //options
        $scope.autocompleteOptions = { componentRestrictions: { country: 'ru' }, types: ['geocode'] }
        $scope.windowOptions = { visible: false };

        //promo grid
        $scope.promoGridColumns = initPromoGridColumns();

        $scope.map = { control: {}, center: { latitude: 0, longitude: 0 }, zoom: 13, polylines: [] };

        //events
        $scope.$on("g-places-autocomplete:select", function (event, param) { console.log(event); console.log(param); });

        function getDapartedAt() {
            var departedAt = null;
            var datepicker = $("#inputOrderDate").data("kendoDatePicker");
            var timepicker = $("#inputOrderTime").data("kendoTimePicker");

            if (datepicker != null) {
                departedAt = datepicker.value();
                if (departedAt != null) {
                    if (timepicker != null) {
                        var departedTime = timepicker.value();
                        if (departedTime !== "undefined" && departedTime != null) {
                            departedAt.setHours(departedTime.getHours());
                            departedAt.setMinutes(departedTime.getMinutes());
                        }
                    }
                }
            }
            return departedAt;
        }

        function getOffers() {
            //$scope.offersPanelVisilble = !promoVisible;
            var action = "passengers/";
            var passengerData = {
                name: $scope.order.passengerName
            }
            apiService.put(serviceBase + action + $scope.order.passengerId, passengerData, function (result) {
                if (systemConfig.debugMode) {
                    console.log("Получен идентификатор пассажира");
                    console.log(result.data);
                }
                $scope.order.passengerId = result.data.id;
                var filter = {
                    passengerId: $scope.order.passengerId,
                    start: {
                        address: $scope.order.startAdress
                    },
                    end: {
                        address: $scope.order.finishAdress
                    },
                    preferOrder: {
                        id: 1
                    },
                    paymentMethod: {
                        id: 1
                    }
                };

                var departedAt = getDapartedAt();

                if (departedAt != null) {
                    filter.departedAt = departedAt;
                }

                action = "searches";

                $scope.promoData = {};
                $scope.offersData = {};

                apiService.post(serviceBase + action, filter, function (result) {

                    console.log(result);

                    $scope.order.searchSessionId = result.data.searchId;

                    var promoVisible = typeof (result.data) !== "undefined" && typeof (result.data.promo) !== "undefined";
                    $scope.promoPanelVisilble = promoVisible;
                    $scope.offersPanelVisilble = !promoVisible;

                    if (promoVisible) {
                        $scope.promoData = [result.data.promo];
                    } else {
                        $scope.offersData = result.data.toAdd;
                        //  updateOffersGrid(); // Запускаем периодическое обновление
                    }

                    mapService.getOfferRoute($scope); //Получаем маршрут

                });
            });
        }

        function initPromoGridColumns() {
            return [
                   { field: "name", title: "Название акции" },
                   { field: "price", title: "Цена" },
                   { command: { text: "выбрать", click: onPromoGridSelect }, title: " " }
            ];
        }

        function scheduleStart() {
            notificationService.displayInfo("Заказ занесен в лист ожидания");
            $window.location.assign("/");
        }

        function onPromoGridSelect(e) {
            e.preventDefault();
            var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
            if (systemConfig.debugMode) {
                console.log("onPromoGridSelect: ");
                console.log(dataItem);
            }

            var scheduledSearchesData = {
                passengerId: $scope.order.passengerId,
                start: {
                    address: $scope.order.startAdress
                },
                end: {
                    address: $scope.order.finishAdress
                },
                preferOrder: {
                    id: 1
                },
                paymentMethod: {
                    id: 1
                }
            };

            var departedAt = getDapartedAt();

            if (departedAt != null) {
                scheduledSearchesData.departedAt = departedAt;
            }

            var url = serviceBase + "scheduled-searches";
            apiService.post(url, scheduledSearchesData, function (result) {
                $scope.promoPanelVisilble = false;

                scheduleStart();
            });
        }

        function initOffersGridColumns() {
            var getPromoValue = function (container, options) {
                var s = container.estimatedPrice;
                var p = container.promo;
                if (typeof (p) !== "undefined") {
                    var title = typeof (p.Name) === "undefined" ? "" : p.Name;
                    s +=
                        '&nbsp;<span style="margin-top:6px;font-size:26px;font-weight: bold"><a href="#" onclick="return false;" title="' + title + '" style="text-decoration: none !important; color: red !important">*</a></span>';
                }
                return '<div style="white-space:nowrap;">' + s + '<div></div>';
            }

            return [
                    { field: "vehicleModel", title: "Марка" },
                    { field: "vehicleClass", title: "Класс" },
                    { field: "vehicleColor", title: "Цвет" },
                    { field: "arrivalTime", title: "Время прибытия" },
                    { field: "estimatedPrice", title: "Цена", template: getPromoValue },
                    { command: { text: "выбрать", click: onOffersGridSelect }, title: " " }
            ];
        }

        function onOffersGridSelect(e) {
            e.preventDefault();
            var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
            if (systemConfig.debugMode) {
                console.log("onOffersGridSelect: ");
                console.log(dataItem);
            }

            var url = serviceBase + "searches/suggestion-id/" + dataItem.id + "/make-request";
            apiService.post(url, null, function (result) {
                _startCheckOrderTimer(dataItem.id, result.data.seconds);
                $scope.currentSuggestionId = dataItem.id;
                notificationService.displayInfo("Предложение было отправлено водителю " + url);
                notificationService.showLoadingScreen("Ожидаем ответа водителя...");
            });
        }

        function suggestionHubStart() {

            $.signalR.ajaxDefaults.headers = {
                Authorization: "Bearer " + $rootScope.authorization.loggedUser.token
            };

            // Declare a proxy to reference the hub.
            $scope.connection = $.hubConnection(systemConfig.SiteUrl);

            var proxy = $scope.connection.createHubProxy('notificationHub');

            proxy.on('NewSuggestionState', newSuggestionState);
            proxy.on('OrderStateChanged', orderStateChanged);

            // Start the connection.
            $scope
                .connection
                .start({ transport: ['longPolling'] })
                .done(function () {
                    if (systemConfig.debugMode) {
                        console.log('Now connected, connection ID=' + $scope.connection.id);
                    }
                })
                .fail(function (error) {
                    if (systemConfig.debugMode) {
                        console.log('Error: ' + error);
                    }
                });
        }

        /*suggestionHub methods begin*/
        function _approved() {
            $scope.currentSuggestionId = 0;
            notificationService.displayInfo("Водитель подтвердил заказ");
            _stopCheckOrderTimer();
            $window.location.assign('/');
        }

        function _declined() {
            $scope.currentSuggestionId = 0;
            notificationService.displayWarning("Водитель отклонил заказ");
            _stopCheckOrderTimer();
        }

        function _expired() {
            $scope.currentSuggestionId = 0;
            notificationService.displayWarning("Водитель не откликнулся на заказ");
            _stopCheckOrderTimer();
        }

        function newSuggestionState(data) {

            if (systemConfig.debugMode) {
                console.log("Получен ewSuggestionState: ");
                console.log(data);
            }
            if (data.SuggestionId == $scope.currentSuggestionId) {
                notificationService.hideLoadinScreen();
                /*
                 * /// <summary>
    /// Диспетчер подготовил предложение.
    /// </summary>
    Created = 1,

    /// <summary>
    /// Пассажир получил предложение.
    /// </summary>
    Sent = 2,

    /// <summary>
    /// Пассажир выбрал предложение. Водителю отправлено уведомление.
    /// </summary>
    Chosen = 3,

    /// <summary>
    /// Водитель подтвердил предложение и начал исполнение заказа.
    /// </summary>
    Approved = 4,

    /// <summary>
    /// Водитель отклонил предложение.
    /// </summary>
    Declined = 5,

    /// <summary>
    /// Предложение просрочено.
    /// </summary>
    /// <remarks>
    /// Водитель не успел отреагировать и предложение ушло другому водителю. Google Translator утверждает, что
    /// формы "Overdued" у слова нет, поэтому Overdue правильно.
    /// </remarks>
    Overdue = 6,

    /// <summary>
    /// Диспетчер отклонил предложение, потому что Водитель был выбран другим Пассажиром.
    /// </summary>
    Expired = 7,
                 */
                suggestionStateSelect(data.Result.Id);

            }
        }

        function orderStateChanged(data) {

            if (systemConfig.debugMode) {
                console.log("Получен OrderId: ");
                console.log(data);
            }
            if (data.OrderId == $scope.currentSuggestionId) {
                notificationService.hideLoadinScreen();

                console.log(data);

                /*
                 *   /// <summary>
    /// Поиск предложений по заказу.
    /// </summary>
    Searching = 1,

    /// <summary>
    /// Доезд. Водитель принял заказ и поехал на адрес.
    /// </summary>
    Arrival = 10,

    /// <summary>
    /// Ожидание. Водитель на адресе ждет выхода пассажира.
    /// </summary>
    Waiting = 20,

    /// <summary>
    /// Исполнение. Водитель везет пассажира.
    /// </summary>
    Executing = 30,

    /// <summary>
    /// Исполнен. Водитель довез пассажира.
    /// </summary>
    Finished = 40,

    /// <summary>
    /// Закрыт. Пассажир расплатился с водителем.
    /// </summary>
    Closed = 50,
                 * 
                 */

                /* switch (data.Result.Id) {
                     case 10:
                         _approved();
                         break;
                     default:
                         break;
                 }*/

                if (data.Result.Id >= 10)
                    _approved();
            }
        }

        function _suggestionHubStop() {
            if (angular.isDefined($scope.connection)) {
                if (systemConfig.debugMode) {
                    console.log('Now will be disconnect, connection ID=' + $scope.connection.id);
                }
                $scope.connection.stop();
                if (systemConfig.debugMode) {
                    console.log('Now disconnected, connection ID=' + $scope.connection.id);
                }
            }

        }

        /*suggestionHub methods end*/

        function createOrUpdatePassanger() {
            var action = 'passengers';
            if ($scope.order.phone.length >= 10) {
                var passengerData = {
                    phone: "7" + $scope.order.phone
                }
                apiService.put(serviceBase + action, passengerData, function (result) {
                    if (systemConfig.debugMode) {
                        console.log("Получен идентификатор пассажира");
                        console.log(result.data);
                    }
                    $scope.order.passengerId = result.data.id;
                    $scope.order.passengerName = result.data.name;
                });
            }
        }

        //function _setFakeModelValues() {
        //    var d = new Date();
        //    $scope.order.date = d.toLocaleString();
        //    $scope.order.phone = '9057408137';
        //    $scope.order.passengerName = 'Sid';
        //    $scope.order.startAdress = 'Москва, проспект Вернадского, 29';
        //    $scope.order.finishAdress = 'Москва, улица Лобачевского, 11';
        //}

        //function _updateOffersGrid() {
        //    var timerId = setInterval(function () {
        //        var action = "searches/";
        //        apiService.post(serviceBase + action + $scope.order.searchSessionId, null, function (result) {
        //            $scope.offersData = result.data.toAdd;
        //            console.log(result);
        //        });
        //    }, 10000);
        //}

        function suggestionStateSelect(stateId) {
            switch (stateId) {
                /// Водитель подтвердил предложение и начал исполнение заказа.
                // Approved = 4,
                case 4:
                    _approved();
                    break;

                    /// Водитель отклонил предложение.
                    //  Declined = 5,
                case 5:
                    _declined();
                    break;

                    /// Диспетчер отклонил предложение, потому что Водитель был выбран другим Пассажиром.
                    //  Overdue = 6,
                case 6:
                    _expired();
                    break;

                default:
                    break;

            }
        }

        function _startCheckOrderTimer(suggestionId, seconds) {
            checkOrderTimer = $interval(function () {

                apiService.get(serviceBase + "searches/suggestion-id/" + suggestionId, { ignoreLoadingBar: true }, function (result) {
                    console.log(result);

                    var stateId = result.data.stateId;

                    suggestionStateSelect(stateId);

                    notificationService.hideLoadinScreen();

                    _stopCheckOrderTimer();
                });

            }, seconds * 1000);

            console.log("Timer has started");
        }

        function _stopCheckOrderTimer() {
            if (angular.isDefined(checkOrderTimer)) {
                $interval.cancel(checkOrderTimer);
                checkOrderTimer = undefined;
            }
        }

        mapService.loadCurrentLocation($scope);

        suggestionHubStart();

        $scope.$on("$destroy", function () {

            _suggestionHubStop();
            _stopCheckOrderTimer();
        });

    };

})(angular.module("webAggegator"));
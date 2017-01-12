(function () {
    'use strict';

    var settings = settingsHttpGet();

    var app = angular
        .module('webAggegator', ['common.core', 'common.ui'])
        .config(config)
        .constant('systemConfig', {
            AppName: 'WebAggegator',
            GoogleAnalitycsId: '',
            BaseUrl: settings.Host + '/api/v1/aggregator/',
            SiteUrl: settings.Host,
            debugMode: true,
            disableAuthorization: false,
            GoogleApiKey: "",
            sipSettings: {
                DisplayName: "VNEWP_00003337_003",
                PrivateIdentity: "84955140202",
                PublicIdentity: "sip:84955140202@sip.beeline.ru:5060", // здесь должен быть обязательно порт в конце
                Password: "5djQQECf",
                Realm: "sip.beeline.ru",
                OutBoundProxyUrl: "udp://msk.sip.beeline.ru:5060"
            }
            /*  sipSettings: {
                  DisplayName: "mod_sofia",
                  PrivateIdentity: "mod_sofia",
                  PublicIdentity: "sip:mod_sofia@172.20.0.104",
                  Password: "",
                  Realm: "172.20.0.104",
                  // OutBoundProxyUrl: "udp://msk.sip.beeline.ru:5060"
              }*/
        })
        .run(run);

    // IdleProvider подтягивает шпиона https://mc.yandex.ru/metrika/watch.js \/
    config.$inject = ['$routeProvider', '$httpProvider', 'uiGmapGoogleMapApiProvider', 'KeepaliveProvider', 'IdleProvider'];
    function config($routeProvider, $httpProvider, uiGmapGoogleMapApiProvider, KeepaliveProvider, IdleProvider) {

        KeepaliveProvider.interval(100);

        IdleProvider.idle(1801);

        uiGmapGoogleMapApiProvider.configure({
            key: 'AIzaSyBdPSq0KI8S_Ctpd2eqCEcRXP1KEeH2G2s',
            v: '3.20', //defaults to latest 3.X anyhow
            libraries: 'weather,geometry,visualization'
        });

        $httpProvider.interceptors.push('authInterceptorService');
        $httpProvider.defaults.useXDomain = true;
        delete $httpProvider.defaults.headers.common['X-Requested-With'];
        $routeProvider
            .when("/", {
                templateUrl: "spa/home/index.html",
                controller: "indexCtrl",
                resolve: { isAuthenticated: isAuthenticated }

            })
            .when("/login", {
                templateUrl: "spa/account/login.html",
                controller: "loginCtrl",
                resolve: { isAuthenticated: isAuthenticated }
            })
            .when("/recover", {
                templateUrl: "spa/account/recover.html",
                controller: "recoverCtrl"
            }).when("/invite", {
                templateUrl: "spa/account/invite.html",
                controller: "loginCtrl"
            }).when("/recover/confirm", {
                templateUrl: "spa/account/recoverConfirm.html",
                controller: "recoverConfirmCtrl"
            })
             .when("/register", {
                 templateUrl: "spa/account/register.html",
                 controller: "registerCtrl"
             }).when("/register/confirm", {
                 templateUrl: "spa/account/registerConfirm.html",
                 controller: "registerConfirm"
             })
            .when("/offers", {
                templateUrl: "spa/offers/offers.html",
                controller: "offersCtrl",
                resolve: { isAuthenticated: isAuthenticated }
            })
            .when("/orders", {
                templateUrl: "spa/orders/orders.html",
                controller: "ordersCtrl",
                resolve: { isAuthenticated: isAuthenticated }
            }).when("/orders/add", {
                templateUrl: "spa/orders/add.html",
                controller: "ordersAddCtrl",
                resolve: { isAuthenticated: isAuthenticated }
            })
            .when("/orders/edit/:id", {
                templateUrl: "spa/orders/edit.html",
                controller: "ordersEditCtrl"
            })
            .when("/map", {
                templateUrl: "spa/map/map.html",
                controller: "mapCtrl",
                resolve: { isAuthenticated: isAuthenticated }
            });
    }

    run.$inject = ['$rootScope', '$location', '$cookieStore', '$http', 'Idle', 'Keepalive'];

    function run($rootScope, $location, $cookieStore, $http, Idle, Keepalive) {
        // handle page refreshes

        Idle.watch();
        Keepalive.start();


        $rootScope.authorization = $cookieStore.get('authorization') || {};

        $(document).ready(function () {
            $(".fancybox").fancybox({
                openEffect: 'none',
                closeEffect: 'none'
            });
            $('.fancybox-media').fancybox({
                openEffect: 'none',
                closeEffect: 'none',
                helpers: {
                    media: {}
                }
            });
            $('[data-toggle=offcanvas]').click(function () {
                $('.row-offcanvas').toggleClass('active');
            });
        });
    }

    isAuthenticated.$inject = ['membershipService', '$rootScope', '$location'];

    function isAuthenticated(membershipService, $rootScope, $location) {
        if (!membershipService.isUserLoggedIn()) {
            $rootScope.previousState = $location.path();
            $location.path('/login');
        }
    }

    app.factory('authInterceptorService', ['$q', '$location', '$cookieStore', '$rootScope', function ($q, $location, $cookieStore, $rootScope) {

        var authInterceptorServiceFactory = {};

        var request = function (config) {
            config.headers = config.headers || {};
            var authData = $cookieStore.get('authorization');
            if (authData) {
                config.headers.Authorization = 'Bearer ' + authData.loggedUser.token;
            }
            return config;
        }

        var responseError = function (rejection) {
            if (rejection.status === 401 || rejection.status === 403) {
                $rootScope.authorization = {};
                $cookieStore.remove('authorization');
                $location.path('/login');
            }
            return $q.reject(rejection);
        }

        var response = function (response) {
            if (response.status === 401 || response.status === 403) {
                $rootScope.authorization = {};
                $cookieStore.remove('authorization');
                $location.path('/login');
            }

            return response;
        }

        authInterceptorServiceFactory.request = request;
        authInterceptorServiceFactory.response = response;
        authInterceptorServiceFactory.responseError = responseError;
        return authInterceptorServiceFactory;
    }]);

    function settingsHttpGet() {
        var r;

        function settingsParser(xml) {
            var configuration = $(xml).find('configuration');

            var host = configuration.find('Host').text();

            r = { Host: host };
        };

        // чтение конфигурации
        $.ajax({
            type: "GET",
            url: "../spa/settings.xml",
            dataType: "xml",
            success: settingsParser,
            async: false
        });

        return r;
    }
})();
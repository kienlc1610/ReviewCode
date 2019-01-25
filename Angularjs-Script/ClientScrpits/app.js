(function () {
    'use strict';

    var app = angular.module('laptopStoreApp', [
        // Angular modules 
        'ngRoute',
        'ngSanitize',
        'ui.bootstrap',
        'angularUtils.directives.dirPagination',
        'fancyboxplus',
        'rzModule',
        'ngStorage'

        // Custom modules 

        // 3rd Party Modules

    ]);

    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: '/Html/home.html',
                controller: 'HomeController'
            })
            .when('/products/:id', {
                templateUrl: 'Html/product-detail.html',
                controller: 'ProductDetailController'
            })
            .when('/cart', {
                templateUrl: 'Html/cart.html',
                controller: 'CartController'

            })
            .when('/checkout', {
                templateUrl: 'Html/checkout.html',
                controller: 'CheckOutController'
            })
            .otherwise({
                redirectTo: '/'
            });
    }]);

    app.run(['NgStorageService', '$rootScope', '$http', function (ngStorageService, $rootScope, $http) {
        $rootScope.user = ngStorageService.getLocalStorage('user');
        console.log($rootScope.user);
        $rootScope.carts = {};

        $rootScope.removeProductFromCart = removeProductFromCart;
        $rootScope.logout = logout;

        if ($rootScope.user) {
            $http.defaults.headers.common.Authorization = 'Bearer ' + $rootScope.user.token;
        }

        $rootScope.$watchCollection('carts.products', function (newValue, oldValue) {
            var total = 0;

            if (!angular.isUndefined(newValue) || newValue.length !== 0 || newValue !== null) {

                newValue.forEach(function (product) {
                    total += (product.price * product.quantity);
                });

                $rootScope.carts.total = total;
            } else {
                $rootScope.carts.total = total;
            }
        }, true);

        function removeProductFromCart(product) {
            var productsInCart = ngStorageService.getSessionStorage('carts');
            var index = null;

            productsInCart.forEach(function (p, i) {
                if (p.productId === product.productId) {
                    index = i;
                }
            });

            productsInCart.splice(index, 1);
            $rootScope.carts.products.splice(index, 1);
            ngStorageService.setSessionStorage('carts', productsInCart);
        }

        function logout() {
            $http.get('http://localhost:49595/api/Account/Logout', { headers: { Authorization: 'Bearer ' + $rootScope.user.token } })
                .then(function (res) {
                    $rootScope.user = null;

                    ngStorageService.resetLocalStorage();
                })
                .catch(function (err) {
                    console.log(err);
                });
        };

        var foundCarts = ngStorageService.getSessionStorage('carts');
        if (!angular.isUndefined(foundCarts)) {
            $rootScope.carts.products = foundCarts
        } else {
            $rootScope.carts.products = [];
        }

    }]);

})();
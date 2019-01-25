(function () {
    'use strict';

    var app = angular.module('AdminApp', [
        // Angular modules 
        'ngRoute',
        'toastr',
        'ui.bootstrap',
        'ngStorage',
        'ngFileUpload'

        // Custom modules 

        // 3rd Party Modules

    ]);

    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider
            .when('/products', {
                templateUrl: '/Html/Admin/Product/products.html',
                controller: 'AdminProductController'
            })
            .when('/products/:id', {
                templateUrl: '/Html/Admin/Product/product-detail.html',
                controller: 'AdminProductDetail'
            })
            .when('/create/product', {
                templateUrl: '/Html/Admin/Product/product-create.html',
                controller: 'AdminProductCreate'
            })
            .when('/categories', {
                templateUrl: '/Html/Admin/Category/category.html',
                controller: 'AdminCategoryController'
            })
            .when('/categories/:id', {
                templateUrl: '/Html/Admin/Category/category-detail.html',
                controller: 'AdminCategoryDetail'
            })
            .when('/create/category', {
                templateUrl: '/Html/Admin/Category/category-create.html',
                controller: 'AdminCategoryCreate'
            })
            .when('/orders', {
                templateUrl: '/Html/Admin/Order/order.html',
                controller: 'AdminOrderController'
            })
            .when('/orders/:id', {
                templateUrl: '/Html/Admin/Order/order-detail.html',
                controller: 'AdminOrderDetail'
            })
            .when('/create/order', {
                templateUrl: '/Html/Admin/Order/order-create.html',
                controller: 'AdminOrderCreate'
            })
            .otherwise({
                redirectTo: '/'
            });
    }]);

    app.run(['$localStorage', '$rootScope', '$http', '$window', function ($localStorage, $rootScope, $http, $window) {
        var rvm = $rootScope;
        rvm.logout = logout;

        try {
            rvm.user = JSON.parse($localStorage['user']);
        } catch (err) {
            rvm.user = $localStorage['user'];
        }
        console.log(rvm.user);

        if (rvm.user) {

            if (rvm.user.isadmin === false) {
                $window.location.href = '/';
            } else {
                $http.defaults.headers.common.Authorization = 'Bearer ' + rvm.user.token;
            }
        } else {
            $window.location.href = '/Account/Login';
        }

        function logout() {
            $http.get('http://localhost:49595/api/Account/Logout', { headers: { Authorization: 'Bearer ' + rvm.user.token } })
                .then(function (res) {
                    rvm.user = null;

                    $localStorage.$reset();

                    $window.location.href = '/Account/Login';
                })
                .catch(function (err) {
                    console.log(err);
                });
        };

    }]);


})();
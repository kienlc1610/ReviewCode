(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .controller('CheckOutController', CheckOutController);

    CheckOutController.$inject = ['$location', 'HomeService', '$scope', '$rootScope', '$q', 'NgStorageService', '$sessionStorage'];

    function CheckOutController($location, HomeService, $scope, $rootScope, $q, NgStorageService, $sessionStorage) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.customer = {};

        vm.checkOut = checkOut;

        function checkOut(products, customer) {
            var doCreateCustomer = function () {
                var createCustomer = {
                    Fullname: customer.fullName,
                    Email: customer.email,
                    Address: customer.address
                };

                HomeService.createCustomer(createCustomer)
                    .then(function (createdCustomer) {
                        var order = {
                            CustomerId: createdCustomer.customerId,
                            Address: createdCustomer.address,
                            Amount: $rootScope.carts.products.length,
                            OrderDate: new Date(),
                            RequireDate: new Date(),
                        };

                        HomeService.createOrder(order)
                            .then(function (createdOrder) {
                                var tasks = [];
                                for (var i = 0; i < products.length; i++) {
                                    var orderDetail = {
                                        OrderID: createdOrder.orderId,
                                        Discount: products[i].discount,
                                        ProductID: products[i].productId,
                                        Quantity: products[i].quantity,
                                        UnitPrice: products[i].price,
                                        Id: null
                                    }

                                    tasks.push(HomeService.createOrderDetail(orderDetail));
                                }

                                if (tasks.length > 0) {
                                    $q.all(tasks)
                                        .then(function (data) {
                                            delete $sessionStorage['carts']
                                            $rootScope.carts = {
                                                products: []
                                            };

                                            $location.path('/');
                                            $location.replace();
                                        })
                                        .catch(function (err) {
                                            console.log(err);
                                       })
                                }

                            })
                            .catch(function (err) {
                                console.log(err);
                            })
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            };

            doCreateCustomer();
        }
    }
})();

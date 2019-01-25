(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .factory('HomeService', HomeService);

    HomeService.$inject = ['$http', '$q'];

    function HomeService($http, $q) {
        var service = {
            getAllProducts: getAllProducts,
            getFiveLatestProducts: getFiveLatestProducts,
            getAllCategories: getAllCategories,
            countProducts: countProducts,
            getProductDetail: getProductDetail,
            getMinPriceOfProduct: getMinPriceOfProduct,
            getMaxPriceOfProduct: getMaxPriceOfProduct,
            createCustomer: createCustomer,
            createOrder: createOrder,
            createOrderDetail: createOrderDetail,
            searchProductByName: searchProductByName
        };

        return service;

        function getAllProducts(filter) {
            var deferred = $q.defer();
            var api = 'http://localhost:49595/api/Products/?'

            if (filter) {
                if (filter.cateId) {
                    api = api + '&CateID=' + filter.cateId;
                }

                if (filter.priceFrom) {
                    api = api + '&PriceFrom=' + filter.priceFrom;
                }

                if (filter.priceTo) {
                    api = api + '&PriceTo=' + filter.priceTo;
                }

                if (filter.discount) {
                    api = api + '&Discount=' + filter.discount;
                }

                if (filter.pageIndex) {
                    api = api + '&pageIndex= ' + filter.pageIndex;
                }
            }

            $http.get(api)
                .then(function (foundProducts) {
                    deferred.resolve(foundProducts.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function getFiveLatestProducts() {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/Latest')
                .then(function (foundProducts) {
                    deferred.resolve(foundProducts.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function getAllCategories() {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Categories')
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function countProducts() {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/Count')
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function getProductDetail(productId) {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/' + productId)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;

        }

        function getMaxPriceOfProduct() {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/Price/Max')
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function getMinPriceOfProduct() {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/Price/Min')
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function createCustomer(customer) {
            var deferred = $q.defer();

            $http.post('http://localhost:49595/api/Customers/Create', customer)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function createOrder(order) {
            var deferred = $q.defer();

            $http.post('http://localhost:49595/api/Orders', order)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function createOrderDetail(orderDetail) {
            var deferred = $q.defer();

            $http.post('http://localhost:49595/api/OrderDetails', orderDetail)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }

        function searchProductByName(text) {
            var deferred = $q.defer();

            $http.get('http://localhost:49595/api/Products/Search/' + '?productName=' + text)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }
    }
})();
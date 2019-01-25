(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .controller('HomeController', HomeController);

    HomeController.$inject = [
        '$location',
        'HomeService',
        '$scope',
        '$uibModal',
        '$q',
        '$rootScope',
        'NgStorageService',
        '$filter'
    ];

    function HomeController($location, HomeService, $scope, $uibModal, $q, $rootScope, ngStorageService, $filter) {
        /* jshint validthis:true */
        var vm = $scope;
        var rootScope = $rootScope;

        
        vm.latestProducts = null;
        vm.products = null;
        vm.filter = {};
        vm.numOfProducts = 0;
        vm.priceSlider = {
            options: {
                step: 1000000
            }
        };
        vm.sort = {}

        
        vm.openProductDetail = openProductDetail;
        vm.addCart = addCart;
        vm.getProductByCategory = getProductByCategory;
        vm.searchProduct = searchProduct;

        activate();

        function activate() {
           
            getAllProducts();
            getFiveLatestProducts();
            getAllCategories();
            countProducts();
            getMinMaxPriceOfProduct();

        }

        function getAllProducts() {
            
            HomeService.getAllProducts()
                .then(function (res) {
                    vm.products = res;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        function getFiveLatestProducts() {
            HomeService.getFiveLatestProducts()
                .then(function (res) {
                    vm.latestProducts = res;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        function getAllCategories() {
            HomeService.getAllCategories()
                .then(function (res) {
                    vm.categories = res;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        
        function countProducts() {
            HomeService.countProducts()
                .then(function (numProducts) {
                    vm.numOfProducts = numProducts;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        function openProductDetail(product) {

            vm.product = product;

            var modalInstance = $uibModal.open({
                templateUrl: '../Html/product-detail-popup.html',
                controller: 'ProductDetailController',
                size: 'lg',
                scope: $scope
               
            });
        }

        function getProductByCategory(cateId) {
            vm.filter.cateId = cateId;
            HomeService.getAllProducts(vm.filter)
                .then(function (foundProduct) {
                    vm.products = foundProduct;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        function getMinMaxPriceOfProduct() {
            var getMinValue = function () {
                HomeService.getMinPriceOfProduct()
                    .then(function (minPrice) {
                        vm.priceSlider.minValue = minPrice;
                        vm.priceSlider.options.floor = minPrice;
                        getMaxValue();
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            };

            var getMaxValue = function () {
                HomeService.getMaxPriceOfProduct()
                    .then(function (maxPrice) {
                        vm.priceSlider.maxValue = maxPrice;
                        vm.priceSlider.options.ceil = maxPrice;
                        vm.$broadcast('rzSliderForceRender');
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            };

            getMinValue();
        }

        function addCart(product) {
            var productInCart = ngStorageService.getSessionStorage('carts');

            if (angular.isUndefined(productInCart)) {
                product.quantity = 1;
                productInCart = [product]
                rootScope.carts.products.push(product);
            } else {
                if (productInCart.length === 0) {
                    product.quantity = 1;
                    productInCart.push(product);
                    rootScope.carts.products.push(product);
                } else {
                    var filter = $filter('filter')(productInCart, { productId: product.productId });
                    if (filter && filter.length !== 0) {
                        productInCart.forEach(function (p) {
                            if (p.productId === product.productId) {
                                p.quantity++;
                                rootScope.carts.total += p.price;
                            }
                        });
                    } else {
                        product.quantity = 1;
                        productInCart.push(product);
                        rootScope.carts.products.push(product);
                    }
                }
                
            }
            ngStorageService.setSessionStorage('carts', productInCart);
        }

        function searchProduct(searchText) {
            if (searchText) {
                HomeService.searchProductByName(searchText)
                    .then(function (res) {
                        vm.products = res;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            } else {
                getAllProducts();
            }
        }

        
    }
})();

(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .controller('ProductDetailController', ProductDetailController);

    ProductDetailController.$inject = ['$location', '$scope', '$routeParams', 'HomeService', 'NgStorageService', '$rootScope', '$filter'];

    function ProductDetailController($location, $scope, $routeParams, HomeService, ngStorageService, $rootScope, $filter) {
        /* jshint validthis:true */
        var vm = $scope;
        var rootScope = $rootScope;

        var productId = $routeParams.id;
        vm.quantityOfProductAddToCart = 1;
        vm.addCart = addCart;

        activate();

        function activate() {
            
            getProductDetail();
        }

        function getProductDetail() {
            if (productId != null) {
                HomeService.getProductDetail(productId)
                    .then(function (product) {
                        vm.productDetail = product;
                        vm.productDetail.quantity = 1;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            } else {
                vm.productDetail = vm.product;
            }
            
        }

        function addCart(product) {
            var productInCart = ngStorageService.getSessionStorage('carts');

            if (angular.isUndefined(productInCart)) {
                productInCart = [product]
                rootScope.carts.products.push(product);
            } else {
                if (productInCart.length === 0) {
                    productInCart.push(product);
                    rootScope.carts.products.push(product);
                } else {
                    var filter = $filter('filter')(productInCart, { productId: product.productId });
                    if (filter && filter.length !== 0) {
                        productInCart.forEach(function (p) {
                            if (p.productId === product.productId) {
                                p.quantity += product.quantity;
                                rootScope.carts.total += (product.price * product.quantity);
                            }
                        });
                    } else {
                        productInCart.push(product);
                        rootScope.carts.products.push(product);
                    }
                }
            }
            ngStorageService.setSessionStorage('carts', productInCart);
        }

        
    }
})();

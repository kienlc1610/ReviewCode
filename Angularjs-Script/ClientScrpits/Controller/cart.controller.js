(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .controller('CartController', CartController);

    CartController.$inject = ['$location', 'NgStorageService', '$rootScope', '$filter','$scope'];

    function CartController($location, ngStorageService, $rootScope, $filter, $scope) {
        /* jshint validthis:true */
        var vm = $scope;
        var rootScope = $rootScope;
        vm.redirectToHome = redirectToHome;
        vm.updateQuantityOfProduct = updateQuantityOfProduct;


        activate();

        function activate() { }

        function redirectToHome() {
            $location.path('/');
            $location.replace();
        }

        function updateQuantityOfProduct(indexOfProduct, quantity) {
            var getCartSession = ngStorageService.getSessionStorage('carts');
            getCartSession[indexOfProduct].quantity = quantity;
            ngStorageService.setSessionStorage('carts', getCartSession);
        }
    }
})();

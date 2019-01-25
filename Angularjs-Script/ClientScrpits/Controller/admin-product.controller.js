(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminProductController', AdminProductController);

    AdminProductController.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$uibModal'];

    function AdminProductController($location, AdminService, toastr, $scope, $uibModal) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.deleteProduct = deleteProduct;
        vm.openModal = openModal;
        vm.close = close;

        activate();

        function activate() {
            getAllProducts();
        }

        function getAllProducts() {
            AdminService.getAllProducts()
                .then(function (products) {
                    vm.products = products;
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function deleteProduct(id) {
            AdminService.deleteProduct(id)
                .then(function (products) {
                    toastr.success("Product " + id + " is deleted!");
                    vm.modalInstance.close('deleted');
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function openModal(product) {
            vm.productPopup = product;

            vm.modalInstance = $uibModal.open({
                templateUrl: 'myModalContent.html',
                controller: 'AdminProductController',
                scope: vm
            });

            vm.modalInstance.result.then(function (result) {
                activate();
            });
        }

        function close() {
            vm.modalInstance.close('close');
        }
    }
})();

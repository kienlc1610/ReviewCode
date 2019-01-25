(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminCategoryController', AdminProductController);

    AdminProductController.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$uibModal'];

    function AdminProductController($location, AdminService, toastr, $scope, $uibModal) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.deleteCategory = deleteCategory;
        vm.openModal = openModal;
        vm.close = close;

        activate();

        function activate() {
            getAllCategory();
        }

        function getAllCategory() {
            AdminService.getAllCategories()
                .then(function (category) {
                    vm.categories = category;
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function deleteCategory(id) {
            AdminService.deleteCategory(id)
                .then(function (products) {
                    toastr.success("Category " + id + " is deleted!");
                    vm.modalInstance.close('deleted');
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function openModal(category) {
            vm.categoryPopup = category;

            vm.modalInstance = $uibModal.open({
                templateUrl: 'myModalContent.html',
                controller: 'AdminCategoryController',
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

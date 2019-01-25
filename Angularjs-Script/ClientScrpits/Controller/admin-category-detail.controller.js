(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminCategoryDetail', AdminProductDetail);

    AdminProductDetail.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$routeParams'];

    function AdminProductDetail($location, AdminService, toastr, $scope, $routeParams) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.isEditModel = false;
        var categoryId = $routeParams.id;
        vm.editProduct = {};
        vm.category = {};
        vm.enableEditModel = enableEditModel;
        vm.updateProduct = updateProduct;
        vm.editCategoty = {}


        activate();

        function activate() {
            getCategoryDetail();
        }

        function getCategoryDetail() {
            AdminService.getCategoryDetail(categoryId)
                .then(function (res) {
                    vm.category = res;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));
                })
        }

        function enableEditModel() {
            vm.isEditModel = !vm.isEditModel;
            vm.editCategoty = angular.copy(vm.category);
        }

        function updateProduct(category) {
            var obj = {
                CateId: category.cateId,
                Name: category.name,
                Alias: category.alias
            };

            AdminService.updateCategory(obj)
                .then(function (res) {
                    toastr.success("Update Successfully");
                    vm.category = angular.copy(category);
                    vm.isEditModel = false;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));

                })
        }
    }
})();

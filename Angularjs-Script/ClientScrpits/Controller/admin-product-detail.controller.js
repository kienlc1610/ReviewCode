(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminProductDetail', AdminProductDetail);

    AdminProductDetail.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$routeParams'];

    function AdminProductDetail($location, AdminService, toastr, $scope, $routeParams) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.isEditModel = false;
        var productId = $routeParams.id;
        vm.editProduct = {};
        vm.product = {};
        vm.categories = [];
        vm.enableEditModel = enableEditModel;
        vm.updateProduct = updateProduct;


        activate();

        function activate() {
            getProductDetail();
            getAllCategory();
        }

        function getProductDetail() {
            AdminService.getProductDetail(productId)
                .then(function (foundProduct) {
                    vm.product = foundProduct;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));
                })
        }

        function enableEditModel() {
            vm.isEditModel = !vm.isEditModel;
            vm.editProduct = angular.copy(vm.product);
        }

        function getAllCategory() {
            AdminService.getAllCategories()
                .then(function (foundCate) {
                    vm.categories = foundCate;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));
                });

        }

        function updateProduct(product) {
            if (product.cateId && angular.isObject(product.cateId)) {
                product.cateId = product.cateId.cateId;
            }

            AdminService.updateProduct(product)
                .then(function (res) {
                    toastr.success("Update Successfully");
                    vm.product = angular.copy(product);
                    vm.isEditModel = false;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));

                })
        }
    }
})();

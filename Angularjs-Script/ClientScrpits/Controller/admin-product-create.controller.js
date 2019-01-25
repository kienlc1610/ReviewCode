(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminProductCreate', AdminProductCreate);

    AdminProductCreate.$inject = ['$location', 'AdminService', 'toastr', '$scope', 'Upload', '$q', '$timeout', '$uibModal'];

    function AdminProductCreate($location, AdminService, toastr, $scope, Upload, $q, $timeout, $uibModal) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.categories = [];
        vm.createProduct = {
            image: {
                animate: true,
                progress: 0
            }
        };
        vm.doCreateProduct = doCreateProduct;

        activate();

        function activate() {
            getAllCategory();
        }

        function getAllCategory() {
            AdminService.getAllCategories()
                .then(function (foundCate) {
                    vm.categories = foundCate;
                })
                .catch(function (err) {
                    toastr.error("Error:" + JSON.stringify(err));
                    console.log(err);
                });

        }

        function doCreateProduct(product) {
            uploadImageToServer(product.image)
                .then(function (res) {

                    var obj = {
                        CateId: product.cateId.cateId,
                        Name: product.name,
                        Price: product.price,
                        Image: res.file.fileName,
                        Description: product.description,
                        Quantity: product.quantity,
                        Discount: product.discount,
                    };

                    if (product.status === 'true') {
                        obj.Status = true;
                    } else {
                        obj.Status = false;
                    }

                    AdminService.createProduct(obj)
                        .then(function (res) {
                            toastr.success("Create Product Successfully!");
                            $location.path('/products');
                            $location.replace();
                        })
                        .catch(function (err) {
                            toastr.error("Error:" + JSON.stringify(err));
                            console.log(err);
                        });
                })
                .catch(function (err) {
                    if (err.status > 0) {
                        toastr.error(err.status + ': ' + err.data);
                        console.log(err);
                    }
                });

        }

        function uploadImageToServer(file) {
            var deferred = $q.defer();

            Upload.upload({
                url: 'http://localhost:49595/api/UploadImage',
                data: { file: file },
                method: 'POST'
            }).then(function (res) {
                $timeout(function () {
                    vm.createProduct.image.animate = false;
                    deferred.resolve(res.data);
                });
                }, function (err) {
                    deferred.reject(err);
                }, function (evt) {
                    // Math.min is to fix IE which reports 200% sometimes
                    file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                });

            return deferred.promise;

        }

    }
})();

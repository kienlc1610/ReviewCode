(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminOrderController', AdminOrderController);

    AdminOrderController.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$uibModal'];

    function AdminOrderController($location, AdminService, toastr, $scope, $uibModal) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.deleteOrder = deleteOrder;

        vm.openModal = openModal;
        vm.close = close;

        activate();

        function activate() {
            getAllOrders();
        }

        function getAllOrders() {
            AdminService.getAllOrders()
                .then(function (orders) {
                    vm.orders = orders;
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function deleteOrder(id) {
            AdminService.deleteOrder(id)
                .then(function (products) {
                    toastr.success("Order " + id + " is deleted!");
                    vm.modalInstance.close('deleted');
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function openModal(order) {
            vm.orderPopup = order;

            vm.modalInstance = $uibModal.open({
                templateUrl: 'myModalContent.html',
                controller: 'AdminOrderController',
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

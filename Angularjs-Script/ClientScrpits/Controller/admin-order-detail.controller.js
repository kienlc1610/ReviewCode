(function () {
    'use strict';

    angular
        .module('AdminApp')
        .controller('AdminOrderDetail', AdminOrderDetail);

    AdminOrderDetail.$inject = ['$location', 'AdminService', 'toastr', '$scope', '$routeParams'];

    function AdminOrderDetail($location, AdminService, toastr, $scope, $routeParams) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.deleteOrderDetail = deleteOrderDetail;
        vm.OrderId = $routeParams.id;

        activate();

        function activate() {
            getDetailOfOrder();
        }

        function getDetailOfOrder() {
            AdminService.getDetailOfOrder(vm.OrderId)
                .then(function (orders) {
                    vm.orderDetails = orders;
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }

        function deleteOrderDetail(id) {
            AdminService.deleteOrderDetail(id)
                .then(function (res) {
                    toastr.success("Order Detail " + id + " is deleted!");
                    if (vm.orderDetails.length === 1) {
                        AdminService.deleteOrder(vm.orderDetails[0].orderId)
                            .then(function (res) {
                                $location.path('/orders');
                                $location.replace();
                            })
                            .catch(function (err) {
                                toastr.error('Error:' + JSON.stringify(err));
                            });
                    } else {
                        activate();
                    }
                })
                .catch(function (err) {
                    toastr.error('Error:' + JSON.stringify(err));
                });
        }
    }
})();

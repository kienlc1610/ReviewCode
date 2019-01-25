(function () {
    'use strict';

    angular
        .module('LoginApp')
        .controller('RegisterController', RegisterController);

    RegisterController.$inject = ['$location', '$scope', 'AccountService', 'toastr', '$window'];

    function RegisterController($location, $scope, AccountService, toastr, $window) {
        /* jshint validthis:true */
        var vm = $scope;

        vm.account = {};
        vm.isConfirmPasswordWrong = false;
        vm.passwordIsWrong = false;

        vm.comparePassword = comparePassword;
        vm.checkPassword = checkPassword;
        vm.doRegisterAccount = doRegisterAccount;

        activate();

        function activate() { }

        function comparePassword() {
            if (vm.account.password !== vm.account.confirmPassword) {
                vm.isConfirmPasswordWrong = true;
            } else {
                vm.isConfirmPasswordWrong = false;
            }
        }

        function checkPassword(pass) {
            var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z])(?!.*\s).{6,255}$/;  

            if (!angular.isUndefined(pass)) {
                if (pass.match(re)) {
                    vm.passwordIsWrong = false;
                } else {
                    vm.passwordIsWrong = true;
                }
            } else {
                vm.passwordIsWrong = false;
            }
        }

        function doRegisterAccount(account) {
            if (account) {
                var registerAccount = {
                    Email: account.email,
                    Password: account.password,
                    ConfirmPassword: account.confirmPassword,
                    FristName: account.fristName,
                    LastName: account.lastName,
                }
                AccountService.registerAccount(registerAccount)
                    .then(function (res) {
                        toastr.success('Register Successfully!');
                        $window.location.href='/Account/Login';
                        //$location.replace();
                    })
                    .catch(function (err) {
                        toastr.error(err.message);
                    })
            }
        }
    }
})();

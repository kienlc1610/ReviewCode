(function () {
    'use strict';

    angular
        .module('LoginApp')
        .controller('LoginController', LoginController);

    LoginController.$inject = ['$location', '$scope', 'AccountService', 'toastr', '$localStorage', '$window','$rootScope'];

    function LoginController($location, $scope, AccountService, toastr, $localStorage, $window, $rootScope) {
        /* jshint validthis:true */
        var vm = $scope;
        var rvm = $rootScope;

        vm.login = login;

        activate();

        function activate() {
            if ($localStorage['user'] || rvm.user) {
                $window.location.href = '/';
            }
        }

        function login(account) {
            if (account) {
                var loginAccount = {
                    Email: account.email,
                    Password: account.password
                }

                AccountService.loginAccount(loginAccount)
                    .then(function (res) {
                        toastr.success('Login Successfully!');
                        var user = res;
                        $localStorage['user'] = JSON.stringify(res);
                        if (user.isadmin) {
                            $window.location.href = '/Admin/Home';

                        } else {
                            $window.location.href = '/';
                        }
                    })
                    .catch(function (err) {
                        toastr.error(err.message);
                    });
            }
        }
    }
})();

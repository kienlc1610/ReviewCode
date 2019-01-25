(function () {
    'use strict';

    angular
        .module('LoginApp')
        .factory('AccountService', AccountService);

    AccountService.$inject = ['$http', '$q'];

    function AccountService($http, $q) {
        var service = {
            registerAccount: registerAccount,
            loginAccount: loginAccount
        };

        return service;

        function registerAccount(account) {
            var deferred = $q.defer();

            $http.post('http://localhost:49595/api/Account/Register', account)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;

        }

        function loginAccount(account) {
            var deferred = $q.defer();

            $http.post('http://localhost:49595/api/Account/Login', account)
                .then(function (res) {
                    deferred.resolve(res.data);
                })
                .catch(function (err) {
                    deferred.reject(err);
                });

            return deferred.promise;
        }
    }
})();
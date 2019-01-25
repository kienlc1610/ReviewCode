(function () {
    'use strict';

    angular
        .module('laptopStoreApp')
        .factory('NgStorageService', NgStorageService);

    NgStorageService.$inject = ['$http', '$localStorage', '$sessionStorage'];

    function NgStorageService($http, $localStorage,
        $sessionStorage) {
        var service = {
            setSessionStorage: setSessionStorage,
            setLocalStorage: setLocalStorage,
            getSessionStorage: getSessionStorage,
            getLocalStorage: getLocalStorage,
            resetLocalStorage: resetLocalStorage
        };

        return service;

        function setSessionStorage(key, value) {
            if (angular.isObject(value)) {
                $sessionStorage[key] = JSON.stringify(value);
            } else {
                $sessionStorage[key] = value
            }
        }

        function setLocalStorage(key, value) {
            if (angular.isObject(value)) {
                $localStorage[key] = JSON.stringify(value);
            } else {
                $localStorage[key] = value;
            }
        }

        function getSessionStorage(key) {
            try {
                return JSON.parse($sessionStorage[key])
            } catch (err) {
                return $sessionStorage[key];
            }
        }

        function getLocalStorage(key) {
            try {
                return JSON.parse($localStorage[key]);
            } catch(err) {
                return $localStorage[key];
            }
        }

        function resetLocalStorage() {
            $localStorage.$reset();
        }
    }
})();
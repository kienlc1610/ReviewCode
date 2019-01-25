'use strict';

function ApplicationSyncService($q, $log, $http, request, params) {
    BaseSyncService.call(this, $q, $log, $http, request, params);
    console.log('Quotation Sync Service');
}

ApplicationSyncService.prototype = Object.create(BaseSyncService.prototype);

ApplicationSyncService.prototype.prepareDataForSync = function () {
    var self = this;
    var deferred = self.$q.defer();

    self.delegateNative(self.request).then(function (res) {
        var builtData = self.buildDataForCallSyncAPI(res);

        deferred.resolve(builtData);
    }).catch(function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
}

ApplicationSyncService.prototype.handleDataAfterSynced = function () {
    var self = this;
    var deferred = self.$q.defer();
    var dataInRemoteServer = self.request['messages'].dataJson;
    var tasksOfDataInRemoteServer = dataInRemoteServer.tasks;
    var lengthOfTasks = dataInRemoteServer.tasks.length;

    if (lengthOfTasks && lengthOfTasks == 1) {
        self.updateLocalDBWithSyncedData(tasksOfDataInRemoteServer[0])
            .then(function (successfullyData) {
                deferred.resolve(successfullyData);
            });
    } else {
        /*Using loop to handle data*/
        tasksOfDataInRemoteServer.forEach(function (task) {
            self.updateLocalDBWithSyncedData(task);
        })
    }
    return deferred.promise;
}

ApplicationSyncService.prototype.updateLocalDBWithSyncedData = function (sequenceTasks) {
    var self = this;
    var deferred = self.$q.defer();
    var lengthOfSequenceTasks = 0;
    var requestForCallLocal = self.deepCopy(self.request);

    lengthOfSequenceTasks = sequenceTasks.length;

    /*Call to local DB to handle data*/
    if (lengthOfSequenceTasks == 1) {
        requestForCallLocal.messages.dataJson = sequenceTasks[0];
        self.delegateNative(requestForCallLocal).then(function (successfullyData) {
            console.log(successfullyData);
            deferred.resolve(successfullyData);
        })
    } else {
        /*Using loop to call local DB*/
        sequenceTasks.forEach(function (task) {
            requestForCallLocal.messages.dataJson = task;
            self.delegateNative(requestForCallLocal).then(function (successfullyData) {
                console.log(successfullyData);
                deferred.resolve(successfullyData);
            });
        })
    }

    return deferred.promise;

};
'use strict';

function FnaSyncService($q, $log, $http, request, params) {
    BaseSyncService.call(this, $q, $log, $http, request, params);
    console.log('Fna Sync Service');
}

FnaSyncService.prototype = Object.create(BaseSyncService.prototype);

FnaSyncService.prototype.prepareDataForSync = function () {
    var self = this;
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var argsPreparedData = [];

    return new Promise(function(resolve, reject) {
        self.delegateNative(self.request).then(function (res) {
            argsPreparedData.push(res);
    
            contactSyncService.prepareContactInsideFNAForSync(res)
            .then(function(preparedContacts) {
                if (self.hasValueNotEmpty(preparedContacts)) {
                    preparedContacts.forEach(function(item) {
                        argsPreparedData.push(item);
                    });
                }

                var builtData = self.buildDataForCallSyncAPI(argsPreparedData);
                resolve(builtData);
            });
        }).catch(function (err) {
            reject(err);
        });
    });
}

FnaSyncService.prototype.prepareDataForSyncWithoutBuild = function () {
    var self = this;
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);

    return new Promise(function(resolve, reject) {
        self.delegateNative(self.request).then(function (res) {
            contactSyncService.prepareContactInsideFNAForSync(res)
            .then(function(preparedContacts) {
                if (self.hasValueNotEmpty(preparedContacts)) {
                    preparedContacts.push(res);
                    resolve(preparedContacts);
                } else {
                    resolve(res);
                }
            });
        }).catch(function (err) {
            reject(err);
        });
    });
}

FnaSyncService.prototype.handleDataAfterSynced = function () {
    var self = this;
    var dataInRemoteServer = self.request['messages'].dataJson;
    var tasksOfDataInRemoteServer = dataInRemoteServer.tasks;
    var promiseTasks = [];

    return new Promise(function(resolve, reject) {
        if (Array.isArray(tasksOfDataInRemoteServer)) {
            tasksOfDataInRemoteServer.forEach(function (task) {
                promiseTasks.push(self.updateLocalDBWithSyncedData(task));
            });

            Promise.all(promiseTasks)
            .then(function(argsData) {
                resolve(argsData[0]);
            })
            .catch(function(err) {
                reject(err);
            })
        } else {
            self.updateLocalDBWithSyncedData(tasksOfDataInRemoteServer)
            .then(function(argsData) {
                resolve(argsData[0]);
            })
            .catch(function(err) {
                reject(err);
            });
        }
    });
}

FnaSyncService.prototype.updateLocalDBWithSyncedData = function (sequenceTasks) {
    var self = this;
    var localReqInfor = self.deepCopy(self.request);
    var promiseTasks = [];
    var fnaPackage = sequenceTasks[0];
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);

    return new Promise(function(resolve, reject) {
        var execWhenNoDupContact = function() {
            sequenceTasks.forEach(function (task) {
                localReqInfor.messages.dataJson = task;
                localReqInfor.messages.docType = self.buildDocTypeForMessages(task.module.toLocaleLowerCase());
                promiseTasks.push(self.delegateNative(localReqInfor));
            });
        
            Promise.all(promiseTasks)
            .then(function (successfullyData) {
                resolve(self.buildResponseForHandlingAfterSynced(successfullyData[0], false));
            })
            .catch(function(err) {
                reject(err);
            });
        };

        var execWhenDupContact = function(argsDupContacts) {
            self.$log.info(argsDupContacts);
            self.$log.info('Have ' + argsDupContacts.length + ' contacts is duplicated with server');

            localReqInfor.messages.dataJson = fnaPackage;
            localReqInfor.messages.docType = self.buildDocTypeForMessages(fnaPackage.module.toLocaleLowerCase());
            self.delegateNative(localReqInfor)
            .then(function(handledFNA) {
                contactSyncService.handleDupContactData(argsDupContacts)
                .then(function() {
                    resolve(self.buildResponseForHandlingAfterSynced(handledFNA, false));
                })
                .catch(function(err) {
                    reject(err);
                });
            })
            .catch(function(err) {
                reject(err);
            });
        };

        var checkDuplicateContact = function() {
            self.checkDuplicateContactWithServer(sequenceTasks)
            .then(function(argsDupContacts) {
                if (self.hasValueNotEmpty(argsDupContacts)) {
                    execWhenDupContact(argsDupContacts);
                } else {
                    execWhenNoDupContact();
                }
            })
            .catch(function(err) {
                reject(err);
            });
        };

        checkDuplicateContact();
    });

};
'use strict';

function QuotationSyncService($q, $log, $http, request, params) {
    BaseSyncService.call(this, $q, $log, $http, request, params);
    console.log('Quotation Sync Service');
}

QuotationSyncService.prototype = Object.create(BaseSyncService.prototype);

QuotationSyncService.prototype.prepareDataForSync = function () {
    var self = this;

    return new Promise(function(resolve, reject) {
        self.delegateNative(self.request).then(function (res) {
            var builtData = self.buildDataForCallSyncAPI(res);
    
            resolve(builtData);
        }).catch(function (err) {
            reject(err);
        });
    });
};

QuotationSyncService.prototype.handleDataAfterSynced = function () {
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
            .then(function(handledRes) {
                resolve(handledRes[0], false);
            })
            .catch(function(err) {
                reject(err);
            })
        } else {
            self.$log.error('Wrong Format');
            reject(null);
        }
        
    });
}

QuotationSyncService.prototype.updateLocalDBWithSyncedData = function (sequenceTasks) {
    var self = this;
    var localReqInfor = self.deepCopy(self.request);
    var promiseTasks = [];

    return new Promise(function (resolve, reject) {
        if (Array.isArray(sequenceTasks)) {
            sequenceTasks.forEach(function (task) {
                localReqInfor.messages.dataJson = task;
                localReqInfor.messages.docType = self.buildDocTypeForMessages(task.module.toLocaleLowerCase())
                
                promiseTasks.push(self.delegateNative(localReqInfor))
            });

            Promise.all(promiseTasks)
            .then(function(handledArgsRes) {
                resolve(self.buildResponseForHandlingAfterSynced(handledArgsRes[0]));
            })
            .catch(function(err) {
                reject(err);
            })
        }
    });
};

QuotationSyncService.prototype.prepareDataForSyncingContactInQuo = function (quotationModel) {
    var self = this;
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var liContact = null;
    var tasks = [];

    return new Promise(function (resolve, reject) {
        if (quotationModel.isAddLifeInsured === 'N' &&
            self.hasValueNotEmpty(quotationModel.documentRelation.refContactLifeInsured.refDocName)) {
            liContact = quotationModel.documentRelation.refContactLifeInsured;
        }

        var messagesForSyncContact = {
            docType: self.buildDocTypeForMessages(ConstantConfig.MODULE_NAME.CONTACT),
            businessType: null,
            productName: null,
            docId: null,
            docName: null,
            version: null
        };

        /* Sync For LI */
        if (liContact != null) {
            messagesForSyncContact.docName = liContact.refDocName;
            messagesForSyncContact.version = liContact.refVersion;

            self.buildNewRequestForService(contactSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
            tasks.push(contactSyncService.delegateNative(contactSyncService.request));

            /*Sync the original contact*/
            messagesForSyncContact.version = 0;
            self.buildNewRequestForService(contactSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
            tasks.push(contactSyncService.delegateNative(contactSyncService.request));
        }

        Promise.all(tasks)
            .then(function (arrDataAfterPreparing) {
                resolve(arrDataAfterPreparing);
            })
            .catch(function (err) {
                reject(err);
            });
    });
};
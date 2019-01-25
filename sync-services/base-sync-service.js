'use strict';

function BaseSyncService($q, $log, $http, request, params) {
    this.$q = $q;
    this.$log = $log;
    this.$http = $http;
    this.request = request;
    this.params = params;
    this.ACTION_TYPE = {
        CREATE: 'CREATE',
        UPDATE: 'UPDATE',
        NONE: 'NONE',
        DELETE: 'DELETE'
    }

    this.$filter = angular.injector(['ng']).get('$filter');
    this.iposDocService = Object.create(angular.element('#ngAppDiv').injector().get('detailCoreService').IposDocService.prototype);
    //this.commonService = angular.element('#ngAppDiv').injector().get('commonService');
}

BaseSyncService.prototype.delegateNative = function (request) {
    var self = this;

    return new Promise(function (resolve, reject) {
        console.log('Start to call native runtime');

        if (!request || request == null) {
            request = self.request;
        }

        self.$log.debug('Request:' + request.action + ', message:');
        self.$log.debug(request.messages);

        Cordova.exec(
            resolve,
            reject,
            "iPosAppPlugin", "executeProcess",
            [request]);
    });
}

var delegateSyncProcess = function ($q, $log, $http, request) {
    var deferred = $q.defer();
    var action = request.action;
    var messages = request.messages;
    var docType;

    if (messages != undefined)
        docType = messages.docType;

    var service = getSyncService($q, $log, $http, request, docType);
    var promise = null;

    if (service !== undefined && action !== undefined) {
        switch (action) {
            case 'PREPARE_DATA_FOR_SYNCING':
                promise = service.prepareDataForSync();
                break;
            case 'HANDLE_DATA_AFTER_SYNCED':
                promise = service.handleDataAfterSynced();
                break;
            default:
                promise = service.delegateNative(service.request);
        }

        if (promise != null) {
            promise.then(function (data) {
                deferred.resolve(data);
            }, function (err) {
                deferred.reject(err);
            });
        } else {
            var response = iPosAppPlugin.getSystemErrorMassage();
            deferred.reject(response);
        }

    } else {
        var response = iPosAppPlugin.getSystemErrorMassage();
        deferred.reject(response);
    }
    return deferred.promise;
}

/**
 * get service by doc type
 */
var getSyncService = function ($q, $log, $http, request, docType) {
    var service = undefined;
    if (docType == "contacts") {
        service = new ContactSyncService($q, $log, $http, request, docType);
    } else if (docType == "quotations") {
        service = new QuotationSyncService($q, $log, $http, request, docType);
    } else if (docType == 'cases') {
        service = new CaseSyncService($q, $log, $http, request, docType);
    } else if (docType == 'fnas') {
        service = new FnaSyncService($q, $log, $http, request, docType);
    }
    else {
        service = new BaseSyncService($q, $log, $http, request, docType);
    }
    return service;
}

/*
    Format data to send for API
    @param ownerName*      {String} owner name of data
    @param tasks*           {Array}  Lists data need to sync in server
    @param task*            {Array} Sequence of document need to be sync. Important a first element in there
*/
BaseSyncService.prototype.buildDataForCallSyncAPI = function (data, sortOrder, condition) {
    var self = this;
    var result = {};
    var sequenceTask = [];
    var tasks = [];
    var ownerName = localStorage.getItem('username');

    if (Array.isArray(data)) {
        data = self.sortDataBaseOnCondition(data, sortOrder, condition);
        data.forEach(function (item) {
            var builtSequenceTaskItem = self.buildSequenceTaskItem(item);
            sequenceTask.push(builtSequenceTaskItem);
        });
    } else {
        sequenceTask.push(self.buildSequenceTaskItem(data));
    }

    tasks.push(sequenceTask);
    //TODO: Get owner name from locaDB
    result.ownerName = ownerName;

    result.tasks = tasks;

    return result;
}
/*
    Build a sequence task object

*/
BaseSyncService.prototype.buildSequenceTaskItem = function (localData) {
    var task = {};

    task.actionType = localData.actionType;
    delete localData.actionType;

    task.localID = localData.localID;
    delete localData.localID;

    if (localData.lastSyncDate == 'null') {
        task.lastSyncDate = null;
    } else {
        task.lastSyncDate = localData.lastSyncDate;
    }
    
    delete localData.lastSyncDate;

    task.module = localData.metaData.docType.toUpperCase();
    if (task.module == ConstantConfig.MODULE_NAME.MANAGERREVIEW.toUpperCase()) {
        task.group = null;
        task.product = null;
    } else {
        task.group = localData.metaData.businessType;
        task.product = localData.metaData.productName;
    }

    task.data = localData;

    if (localData.serverId && localData.serverId != undefined) {
        task.serverId = localData.serverId;
    } else {
        task.serverId = null;
    }

    return task;
}

BaseSyncService.prototype.buildNewRequestForService = function (service, action, messages, config) {
    if (!action || action === '') {
        return null;
    }

    service.request.action = action;
    service.request.messages = messages;
    if (config && config != null) {
        Object.assign(service.request, config);
    }

};

/*Sort data base on condition and follow a order
 @param arrLocalData* {Array} Array data to sort
 @param sortOrder*    {Array} Order to sort. Eg: ['case', 'contact', ....]
 @param condition*    {String} Specify a condition to sort. Eg: 'metaData.docType'
 @return Array
 */
BaseSyncService.prototype.sortDataBaseOnCondition= function (arrLocalData, sortOrder, condition) {
    var self = this;
    var sortedArrData = [];
    var count = 0;

    if (!Array.isArray(arrLocalData) || !self.hasValueNotEmpty(arrLocalData)) {
        self.$log.warn('Data is not specified!');
        return arrLocalData;
    }

    if (!Array.isArray(sortOrder) || !self.hasValueNotEmpty(sortOrder)) {
        self.$log.warn('Sort Order is not specified!');
        return arrLocalData;
    }

    if (!Array.isArray(condition) || !self.hasValueNotEmpty(condition)) {
        self.$log.warn('Condition is not specified!');
        return arrLocalData;
    }

    for (var i = 0; i < sortOrder.length; i ++) {
        if (arrLocalData.length == sortedArrData.length) {
            break;
        }
        self.$filter('filter')(arrLocalData, function (data, index) {
            if (self.iposDocService.findElementInElement(data, condition) == sortOrder[i]
                || self.iposDocService.findElementInElement(data, condition) == sortOrder[i].toUpperCase()) {
                sortedArrData.push(data);
                return data;
            }
        });

    }

    return sortedArrData;

}
/*
    checkedArray    {Array}  The array will be push data if it don't duplicate
    data            {Object} The data model need to check duplicate
*/
BaseSyncService.prototype.handleDuplicateData = function(checkedArray, data) {
    var self = this;

    if (!self.hasValueNotEmpty(data)) {
        self.$log.warn('Cannot execute function handleDuplicateData: data is not provided');
        return checkedArray;
    }

    if (!checkedArray || !Array.isArray(checkedArray)) {
        self.$log.warn('Cannot execute function handleDuplicateData: checkedArray is not provided');
        return checkedArray;
    }

    if (checkedArray.length === 0) {
        checkedArray.push(data);
        return checkedArray;
    }

    var queryToFilter = {
        metaData: {
            docType: data.metaData.docType
        }
    };

    var isDuplicated = false;
    var arrFilteredWithDocType = self.$filter('filter')(checkedArray, queryToFilter);

    arrFilteredWithDocType.forEach(function(filteredItem) {
        if (filteredItem.metaData.docName == data.metaData.docName && filteredItem.version == data.version ) {
            isDuplicated = true;
        }
    });

    if (isDuplicated === false) {
        checkedArray.push(data);
    }


    return checkedArray;
}

BaseSyncService.prototype.checkDuplicateContactWithServer = function(sequenceTasks) {
    var self = this;
    var deferred = self.$q.defer();
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request,self.params);
    var promiseTasks = [];
    var lstDuplicatedContacts = [];

    var contactSequenceTasks = self.$filter('filter')(sequenceTasks, function(task, index) {
        if (task.module == ConstantConfig.MODULE_NAME.CONTACT.toUpperCase()) {
            promiseTasks.push(contactSyncService.checkDuplicatesBetweenLocalWithServer(task));
            return  task;
        }
     });

    if (!self.hasValueNotEmpty(contactSequenceTasks)) {
        /*Return to continue if case does'n have new contacts*/
        deferred.resolve(null);
    }

    self.$q.all(promiseTasks)
    .then(function(lstRsAfterChecked) {
        promiseTasks.length = 0;

        lstRsAfterChecked.forEach(function(item) {
            contactSequenceTasks.forEach(function(task) {
                if (task.localID == item.localContact.id) {
                    task.docName = item.localContact.metaData.docName;
                    task.version = item.localContact.version;
                }
            });

            if (self.hasValueNotEmpty(item)) {
                if (item.isDuplicated == true) {
                    var latestContact = contactSyncService.getNewContactToUpdate(item.localContact, item.serverContact);
                    contactSequenceTasks.forEach(function(task) {
                        if (task.localID == item.localContact.id) {
                            task.data = self.deepCopy(latestContact);
                            item.serverContact = self.deepCopy(latestContact);
                            lstDuplicatedContacts.push(item);
                        }
                    });
                }
            }
        });

        deferred.resolve(lstDuplicatedContacts);
    })
    .catch(function(err) {
        deferred.reject(err);
    });



    return deferred.promise;
}

BaseSyncService.prototype.buildDocTypeForMessages = function(docType) {
    return docType.split('').pop() == 's'? docType: docType + 's';    
}

BaseSyncService.prototype.deepCopy = function(object) {
    return JSON.parse(JSON.stringify(object));
}

BaseSyncService.prototype.hasValue = function (variable){
    return (typeof variable !== 'undefined') && (variable !== null);
};
BaseSyncService.prototype.hasValueNotEmpty = function (variable){
    return (typeof variable !== 'undefined') && (variable !== null) && (variable.length !== 0);
};
BaseSyncService.prototype.buildResponseForHandlingAfterSynced = function (model, isResync) {
    var self = this;

    var handledResponse = {
        isReSync: false,
        dataInfoAfterHandled: null
    }

    if (self.hasValueNotEmpty(model)) {
        handledResponse.dataInfoAfterHandled = model;
    }

    if (self.hasValueNotEmpty(isResync) && typeof isResync == 'boolean') {
        handledResponse.isReSync = isResync;
    }

    return handledResponse;
};
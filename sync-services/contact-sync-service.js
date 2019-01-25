'use strict';

function ContactSyncService($q, $log, $http, request, params) {
    console.log('Contact Sync Service');
    BaseSyncService.call(this, $q, $log, $http, request, params);
}

ContactSyncService.prototype = Object.create(BaseSyncService.prototype);

ContactSyncService.prototype.prepareDataForSync = function () {
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


ContactSyncService.prototype.handleDataAfterSynced = function () {
    var self = this;
    var dataInRemoteServer = self.request['messages'].dataJson;
    var tasksOfDataInRemoteServer = dataInRemoteServer.tasks;
    var promiseTasks = [];

    return new Promise(function(resolve, reject) {
        tasksOfDataInRemoteServer.forEach(function (task) {
            promiseTasks.push(self.updateLocalDBWithSyncedData(task));
        });

        Promise.all(promiseTasks)
        .then(function(res) {
            resolve(res[0]);
        })
        .catch(function(err) {
            reject(err);
        });
    });
}

ContactSyncService.prototype.updateLocalDBWithSyncedData = function (sequenceTasks) {
    var self = this;
    var localReqInfo = self.deepCopy(self.request);
    var contactTask = sequenceTasks[0];

    return new Promise(function(resolve, reject) {
        var updateDataInLocal = function() {
            localReqInfo.messages.dataJson = contactTask;
            localReqInfo.messages.docType = self.buildDocTypeForMessages(contactTask.module.toLocaleLowerCase());

            self.delegateNative(localReqInfo)
            .then(function(handledContact) {
                /* Finish */
                resolve(self.buildResponseForHandlingAfterSynced(handledContact, false));
            })
            .catch(function(err) {
                reject(err);
            });
        }

        var handleAfterChecked = function(checkedContact) {
            if (checkedContact.isDuplicated == true) {
                /* Change localID to serverId and keep docName of Contact */
                contactTask.data = self.deepCopy(checkedContact.localContact);
                contactTask.data.id = checkedContact.serverContact.id;
                contactTask.data.metaData.docId = checkedContact.serverContact.metaData.docId;

                localReqInfo.messages.dataJson = self.deepCopy(contactTask);
                localReqInfo.messages.docType = self.buildDocTypeForMessages(contactTask.module.toLocaleLowerCase());
                self.delegateNative(localReqInfo)
                .then(function(handledContact) {
                    var latestContact = self.getNewContactToUpdate(checkedContact.localContact, checkedContact.serverContact);
                    var arrDuplicatedContacts = [];
                    checkedContact.serverContact = self.deepCopy(latestContact);
                    arrDuplicatedContacts.push(checkedContact);

                    self.handleDupContactData(arrDuplicatedContacts)
                    .then(function() {
                        resolve(self.buildResponseForHandlingAfterSynced(handledContact, true));
                    })
                    .catch(function(err) {
                        reject(err);
                    });
                })
                .catch(function(err) {
                    reject(err);
                });
            } else {
                updateDataInLocal();
            }
        };

        var checkDupContact = function() {
            self.checkDuplicatesBetweenLocalWithServer(contactTask)
            .then(function(resAfterChecked) {
                handleAfterChecked(resAfterChecked);
            })
            .catch(function(err) {
                reject(err);
            })
        };

        if (contactTask.actionType == 'CREATE') {
            /* Need to check duplicate contact */
            checkDupContact();
        } else {
            updateDataInLocal();
        }

    });
}

ContactSyncService.prototype.prepareContactInsideFNAForSync = function(fnaModel) {
    var self = this;
    var deferred = self.$q.defer();
    var promiseTasks = [];
    var messagesForSyncContact = {
        docType: self.buildDocTypeForMessages('contact'),
        businessType: 'personal',
        productName: null,
        docId: ''
    };

    if (self.hasValueNotEmpty(fnaModel)) {
        if (self.hasValueNotEmpty(fnaModel.client.refContact.refDocName)
        && self.hasValueNotEmpty(fnaModel.client.refContact.refVersion)) {
            var client =  fnaModel.client;

            if (fnaModel.client.dependants.childrenObject.children.length > 0) {
                var childrens = fnaModel.client.dependants.childrenObject.children;

                childrens.forEach(function(item) {
                    messagesForSyncContact.docName = item.refContact.refDocName;
                    messagesForSyncContact.version = item.refContact.refVersion;
                    self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
                    promiseTasks.push(self.delegateNative(self.request));
                });
            }

            if (fnaModel.client.dependants.elderlyObject.elderlyDependants.length > 0) {
                var elderlyDependants = fnaModel.client.dependants.elderlyObject.elderlyDependants;

                elderlyDependants.forEach(function(item) {
                    messagesForSyncContact.docName = item.refContact.refDocName;
                    messagesForSyncContact.version = item.refContact.refVersion;
                    self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
                    promiseTasks.push(self.delegateNative(self.request));
                });
            }

            messagesForSyncContact.docName = client.refContact.refDocName;
            messagesForSyncContact.version = client.refContact.refVersion;
            self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
            promiseTasks.push(self.delegateNative(self.request));
            
        }

        if (self.hasValueNotEmpty(fnaModel.jointApplicant.refContact.refDocName)
        && self.hasValueNotEmpty(fnaModel.jointApplicant.refContact.refVersion)) {
            var jointApplicant = fnaModel.jointApplicant;

            messagesForSyncContact.docName = jointApplicant.refContact.refDocName;
            messagesForSyncContact.version = jointApplicant.refContact.refVersion;
            self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);
            promiseTasks.push(self.delegateNative(self.request));
        }
        
        self.$q.all(promiseTasks)
        .then(function(args) {
            var listContactPrepared = []

            args.forEach(function(lstContacts) {
                if (angular.isArray(lstContacts)) {
                    lstContacts.forEach(function(preparedContact) {
                        self.handleDuplicateData(listContactPrepared, preparedContact);
                    });
                } else {
                    self.handleDuplicateData(listContactPrepared, lstContacts);
                }
                
            });

            deferred.resolve(listContactPrepared);
        })
        .catch(function(err) {
            deferred.resolve(null);
        });
    
        
    } else {
        deferred.resolve(null);
    }

    return deferred.promise;
}

ContactSyncService.prototype.getNewContactToUpdate = function(localContact, serverContact) {
    var self = this;
    var contactToUpdate = {};
    var lContact = self.deepCopy(localContact);
    var sContact = self.deepCopy(serverContact);
    var modifyDateOfLocalData = moment(localContact.metaData.modifyDate);
    var modifyDateOfServerData = moment(serverContact.metaData.modifyDate);

    if (!self.hasValueNotEmpty(lContact)) {
        self.$log.error('Local Contact is not provided!');
        self.$log.debug(lContact);
        return null;
    }

    if (!self.hasValueNotEmpty(sContact)) {
        self.$log.error('Server Contact is not provided!');
        self.$log.debug(sContact);
        return null;
    }

    if (modifyDateOfLocalData.isBefore(modifyDateOfServerData)) {
        //Server Data is newest
        Object.assign(contactToUpdate, sContact);
    } else {
        Object.assign(contactToUpdate, lContact);
    }

    contactToUpdate.id = serverContact.id;
    contactToUpdate.version = serverContact.version;
    contactToUpdate.metaData.docName = serverContact.metaData.docName;
    contactToUpdate.metaData.docId = serverContact.metaData.docId;

    return contactToUpdate;
}

ContactSyncService.prototype.checkDuplicatesBetweenLocalWithServer = function (contactSequenceTask) {
    var self = this;
    var deferred = self.$q.defer();
    var serverContact = contactSequenceTask.data;
    var localContact = null;
    var contactOfflineService = new ContactOfflineService(self.$q, self.$log, self.$http, self.request, self.params);

    return new Promise(function (resolve, reject) {
        self.buildNewRequestForService(contactOfflineService, 'OPERATE_DOCUMENT_BY_ID');
        contactOfflineService.getDocumentByIdService(contactSequenceTask.module.toLocaleLowerCase(), contactSequenceTask.group, contactSequenceTask.product, contactSequenceTask.localID)
            .then(function (foundContact) {
                localContact = foundContact;
                var resultAfterChecked = {
                    isDuplicated: false,
                    serverContact: serverContact,
                    localContact: localContact
                };

                if (localContact.metaData.docName !== serverContact.metaData.docName) {
                    /*contact information between remote server and local device are different */
                    resultAfterChecked.isDuplicated = true;
                    resolve(resultAfterChecked);
                } else {
                    resultAfterChecked.isDuplicated = false;
                    resolve(resultAfterChecked);
                }

            })
            .catch(function (err) {
                reject(err)
            });
    });
};

ContactSyncService.prototype.handleDupContactData = function(arrDuplicatedContacts) {
    var self = this;
    var deferred = self.$q.defer();
    var promiseTasks = [];
    var response = [];
    var baseOfflineService = new BaseOfflineService(self.$q, self.$log, self.$http, self.request, self.params);

    if (!angular.isArray(arrDuplicatedContacts) || !self.hasValueNotEmpty(arrDuplicatedContacts)) {
        deferred.resolve(null);
    }
    
    var updateContactWithNewDocName = function(arrContacts, currentIndexOfArrDupContact) {
        /* Count the number of version that are set for contacts*/
        var countVersion = 0;

        for (var i = 0; i < arrContacts.length; i++) {
            var contact = self.deepCopy(arrContacts[i]);
            var localID = contact.id;
            var filterDupContactsByDocName = self.$filter('filter')(arrDuplicatedContacts, function(item) {
                if (item.localContact.metaData.docName == contact.metaData.docName
                    && item.localContact.version == 0) {
                    return item;
                }
            });
            var serverContact = self.deepCopy(filterDupContactsByDocName[0].serverContact);

            /* Update Doc Name and Version */
            Object.assign(contact, serverContact);
            contact.metaData.docName = serverContact.metaData.docName;
            contact.id = localID;
            contact.metaData.docId = localID;
            if (contact.version > 0) {
                var latestVersion = self.getLatestVersionBaseOnDocName(serverContact.metaData.docName, arrDuplicatedContacts) + 1;
                if (latestVersion > 0) {
                    /* Don't update the version of contact to zero */
                    contact.version = latestVersion + countVersion;
                    countVersion++;
                }
            }
            promiseTasks.push(baseOfflineService.updateDocumentService(contact));
        } 

        self.$q.all(promiseTasks)
        .then(function(lstResAfterUpdating) {
            promiseTasks.length = 0;
            console.log(lstResAfterUpdating);
            lstResAfterUpdating.forEach(function(updatedContact, index) {
                response.push(updatedContact);
                var listDocTypes = ['case', 'quotation', 'application', 'fna'];
                promiseTasks.push(self.updateEffectedDataByContact(listDocTypes, arrContacts[index], updatedContact));
            });

            self.$q.all(promiseTasks)
            .then(function(updatedData) {
                console.log(updatedData);
                return searchAllContactsBaseOnDocName(currentIndexOfArrDupContact +1);
            })
            .catch(function(err) {
                deferred.reject(err);
            });
        })
        .catch(function(err) {
            deferred.reject(err)
        });
    }

    var searchAllContactsBaseOnDocName = function (i) {
        if (i < arrDuplicatedContacts.length) {
            var docType = arrDuplicatedContacts[i].localContact.metaData.docType;
            var docName = arrDuplicatedContacts[i].localContact.metaData.docName;
            var version = arrDuplicatedContacts[i].localContact.version;
            var messages = {
                docType: self.buildDocTypeForMessages(docType),
                docName: docName
            }
            //Get All Contacts With Docname
            self.buildNewRequestForService(baseOfflineService, 'SEARCH_DOCUMENTS_HAVE_CONTACT', messages);
            //Just using contact version 0 to get all the other contacts are version over 0
            if (version == 0) {
                self.delegateNative(self.request)
                .then(function(foundContacts) {
                    var mergeArray = [];

                    foundContacts.forEach(function(item) {
                        mergeArray.push(item);
                    });

                    return updateContactWithNewDocName(mergeArray, i);
                }, function(err) {
                    deferred.reject(err);
                });
            } else {
                return searchAllContactsBaseOnDocName(i + 1);
            }
        } else {
            deferred.resolve(response);
        }
    };

    searchAllContactsBaseOnDocName(0);

    return deferred.promise;
}

ContactSyncService.prototype.getLatestVersionBaseOnDocName = function (docName, arrDuplicatedContacts) {
    var self = this;
    var latestVersion = 0;
    
    var filterDocNameContact = self.$filter('filter')(arrDuplicatedContacts, function(item) {
        if (item.serverContact.metaData.docName == docName) {
            return item;
        }
    });

    filterDocNameContact.forEach(function(contact) {
        if (contact.serverContact.version >= latestVersion) {
            latestVersion = contact.serverContact.version;
        }
    });

    return latestVersion;
}

ContactSyncService.prototype.updateEffectedDataByContact = function(listDocTypes ,contact, dataForUpdating) {
    var self = this;
    var deferred = self.$q.defer();
    var promiseTasks = [];
    var response = [];
    var baseOfflineService = new BaseOfflineService(self.$q, self.$log, self.$http, self.request, self.params);

    var updateDocumentWithNewDocName = function(arrDocuments, currentIndexOfLstDocTypes) {
        for (var i = 0; i < arrDocuments.length; i++) {
            var document = arrDocuments[i];
            
            switch(document.metaData.docType) {
                case ConstantConfig.MODULE_NAME.SALECASE:
                    var prospect = document.prospects[0];
                    if (prospect.refDocName == contact.metaData.docName && prospect.refVersion == contact.version) {
                        prospect.refDocName = dataForUpdating.metaData.docName;
                        prospect.refVersion = dataForUpdating.version;
                        prospect.refId = dataForUpdating.metaData.docId;
                        promiseTasks.push(baseOfflineService.updateDocumentService(document));
                    }
                    break;
                case ConstantConfig.MODULE_NAME.QUOTATION:
                    var refContact = document.documentRelation.refContact;
                    var refContactLifeInsured = document.documentRelation.refContactLifeInsured;
                    if (self.hasValueNotEmpty(refContact) && refContact.refDocName == contact.metaData.docName) {
                        document.documentRelation.refContact.refDocName = dataForUpdating.metaData.docName;
                        document.documentRelation.refContact.refVersion = dataForUpdating.version;
                    }

                    if (self.hasValueNotEmpty(refContactLifeInsured) && refContactLifeInsured == contact.metaData.docName) {
                        document.documentRelation.refContactLifeInsured.refDocName = dataForUpdating.metaData.docName;
                        document.documentRelation.refContactLifeInsured.refVersion = dataForUpdating.version;
                    }
                    promiseTasks.push(baseOfflineService.updateDocumentService(document));
                    break;
                case ConstantConfig.MODULE_NAME.APPLICATION:
                    var refProposer = document.documentRelation.refProposer;
                    var refLifeAssured = document.documentRelation.refLifeAssured;

                    if (self.hasValueNotEmpty(refProposer) && refProposer.refDocName == contact.metaData.docName) {
                        document.documentRelation.refProposer.refDocName = dataForUpdating.metaData.docName;
                        document.documentRelation.refProposer.refVersion = dataForUpdating.version;
                    }

                    if (self.hasValueNotEmpty(refLifeAssured) && refLifeAssured == contact.metaData.docName) {
                        document.documentRelation.refLifeAssured.refDocName = dataForUpdating.metaData.docName;
                        document.documentRelation.refLifeAssured.refVersion = dataForUpdating.version;
                    }
                    promiseTasks.push(baseOfflineService.updateDocumentService(document));
                    break;
                case ConstantConfig.MODULE_NAME.FNA:
                    var client = document.client;
                    var jointApplicant = document.jointApplicant;


                    if (self.hasValueNotEmpty(client)) {
                        var children = client.dependants.childrenObject.children;
                        var elderlyDependants = client.dependants.elderlyObject.elderlyDependants;

                        if (client.refContact.refDocName == contact.metaData.docName) {
                            document.metaData.clientDocName = dataForUpdating.metaData.docName;
                            document.client.refContact.refDocName = dataForUpdating.metaData.docName;
                        }
                        
                        if (children.length > 0) {
                            children.forEach(function(item) {
                                if (item.refContact.refDocName == contact.metaData.docName) {
                                    item.refContact.refDocName = dataForUpdating.metaData.docName
                                }
                            })
                        }

                        if (elderlyDependants.length > 0) {
                            elderlyDependants.forEach(function(item) {
                                if (item.refContact.refDocName == contact.metaData.docName) {
                                    item.refContact.refDocName = dataForUpdating.metaData.docName
                                }
                            })
                        }
                    }

                    if (self.hasValueNotEmpty(jointApplicant)) {
                        if (jointApplicant.refContact.refDocName == contact.metaData.docName) {
                            document.jointApplicant.refContact.refDocName = dataForUpdating.metaData.docName;
                        }
                    }
                    promiseTasks.push(baseOfflineService.updateDocumentService(document));
                    break;
            }
            
            
        } 

        self.$q.all(promiseTasks)
        .then(function(updatedRes) {
            response.push(updatedRes);
            return searchEffectedDocs(currentIndexOfLstDocTypes + 1);
        })
        .catch(function(err) {
            deferred.reject(err)
        });
    }

    var searchEffectedDocs = function(i) {
        if (i < listDocTypes.length) {
            var docType = self.buildDocTypeForMessages(listDocTypes[i]);
            var docName = contact.metaData.docName;
            var messages = {
                docType: docType,
                docName: docName
            }
             //Get All Contacts With Docname
            self.buildNewRequestForService(baseOfflineService, 'SEARCH_DOCUMENTS_HAVE_CONTACT', messages);
            self.delegateNative(self.request).then(function(foundDoc) {
                if (self.hasValueNotEmpty(foundDoc)) {
                    return updateDocumentWithNewDocName(foundDoc, i);
                } else {
                    return searchEffectedDocs(i + 1);
                }
            }, function(err) {
                deferred.reject(err);
            });
        } else {
            deferred.resolve(response);
        }
    }

    searchEffectedDocs(0);

    return deferred.promise;
}
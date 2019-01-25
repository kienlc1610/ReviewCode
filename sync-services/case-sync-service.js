'use strict';

function CaseSyncService($q, $log, $http, request, params) {
    this.DEFAULT_SORT_ORDER = {
        PREPARE_DATA_FOR_SYNCING: [ConstantConfig.MODULE_NAME.SALECASE, ConstantConfig.MODULE_NAME.CONTACT, ConstantConfig.MODULE_NAME.QUOTATION, ConstantConfig.MODULE_NAME.APPLICATION, ConstantConfig.MODULE_NAME.FNA, ConstantConfig.MODULE_NAME.ATTACHMENT, ConstantConfig.MODULE_NAME.PAYMENT, ConstantConfig.MODULE_NAME.MANAGERREVIEW, ConstantConfig.MODULE_NAME.UNDERWRITING],
        AFTER_SYNCED: [ConstantConfig.MODULE_NAME.CONTACT, ConstantConfig.MODULE_NAME.QUOTATION, ConstantConfig.MODULE_NAME.APPLICATION, ConstantConfig.MODULE_NAME.FNA, ConstantConfig.MODULE_NAME.ATTACHMENT,ConstantConfig.MODULE_NAME.PAYMENT, ConstantConfig.MODULE_NAME.MANAGERREVIEW, ConstantConfig.MODULE_NAME.UNDERWRITING, ConstantConfig.MODULE_NAME.SALECASE]
    };
    this.DEFAULT_SORT_CONDITION = {
        PREPARE_DATA_FOR_SYNCING: ['metaData', 'docType'],
        AFTER_SYNCED: ['module']
    };
    BaseSyncService.call(this, $q, $log, $http, request, params);
}

CaseSyncService.prototype = Object.create(BaseSyncService.prototype);

/**
 * Get the result after preparing element inside case. Another hand it will handle duplicate packages
 * After that it return the array contain data after prepared
 * @param: dataAfterPrepared {Array} List of data after prepared
 * @param: args {Array} The array will contain all package after handled duplicate data
 * 
 * @returns: {Array} 
 */
CaseSyncService.prototype.handleAfterPreparingElementInsideCase = function(dataAfterPrepared, args) {
    var self = this;

    if (Array.isArray(dataAfterPrepared) && dataAfterPrepared.length > 0) {
        dataAfterPrepared.forEach(function(item) {
            if (item && item != null) {
                if (Array.isArray(item)) {
                   self.handleAfterPreparingElementInsideCase(item, args);
                } else {
                    self.handleDuplicateData(args, item);
                }
            }
        })
    } else {
        self.handleDuplicateData(args, dataAfterPrepared);
    }

    return args;
}

/**
 * Prepare all elements are releated to case. Eg: FNA inside, Quotation, Application....
 * 
 * @param: caseModel {Object}           The case model
 * @param: specifiedEleNames {Array}    List of element names you want to prepare inside a case.If no provide, will prepare all elements
 * @returns: {Array}
 */
CaseSyncService.prototype.prepareAllElementsInCase = function(caseModel, specifiedEleNames) {
    var self = this;
    var promiseTasks = [];
    var dataAfterPreparedEachElement = [];
    
    dataAfterPreparedEachElement.push(caseModel);

    return new Promise(function(resolve, reject) {
        var callDBToPrepareData = function() {
            Promise.all(promiseTasks)
                .then(function (arrSuccessRes) {
                    self.handleAfterPreparingElementInsideCase(arrSuccessRes, dataAfterPreparedEachElement);
                    resolve(dataAfterPreparedEachElement);
                })
                .catch(function (err) {
                    reject(err);
                });
        };

        var defineElementsNeedToPrepare = function() {
            if (self.hasValueNotEmpty(specifiedEleNames) && Array.isArray(specifiedEleNames)) {
                specifiedEleNames.forEach(function(item) {
                    switch (item) {
                        case ConstantConfig.MODULE_NAME.CONTACT:
                            promiseTasks.push(self.prepareDataForSyncingProspectInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.QUOTATION:
                            promiseTasks.push(self.prepareDataForSyncingQuotationInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.ATTACHMENT:
                            promiseTasks.push(self.prepareDataForSyncingAttachmentInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.APPLICATION:
                            promiseTasks.push(self.prepareDataForSyncingApplicationInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.FNA:
                            promiseTasks.push(self.prepareDataForSyncingFNAInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.PAYMENT:
                            promiseTasks.push(self.prepareDataForSyncingPaymentInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.MANAGERREVIEW:
                            promiseTasks.push(self.prepareDataForSyncingManagerReviewInBC(caseModel));
                            break;
                        case ConstantConfig.MODULE_NAME.UNDERWRITING:
                            promiseTasks.push(self.prepareDataForSyncingUWInBC(caseModel));
                            break;
                    }
                })
            } else {
                /* Prepare Data For Syncing each component in a case. Eg: Quotations inside, FNA inside... */
                promiseTasks.push(self.prepareDataForSyncingProspectInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingQuotationInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingApplicationInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingFNAInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingAttachmentInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingManagerReviewInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingPaymentInBC(caseModel));
                promiseTasks.push(self.prepareDataForSyncingUWInBC(caseModel));
            }
            

            callDBToPrepareData();
        }


        defineElementsNeedToPrepare();
    })
}

CaseSyncService.prototype.prepareDataForSync = function () {
    var self = this;
    var builtData = null;
    var isPrepareFullyData = self.request.messages.isPreparedFully;

    return new Promise(function (resolve, reject) {
        /* Prepare data of Case */
        self.delegateNative(self.request).then(function (caseModel) {

            if (caseModel) {
                if (self.hasValueNotEmpty(isPrepareFullyData) && isPrepareFullyData == false) {
                    if (self.hasValueNotEmpty(caseModel.payment.refId)) {
                        /* For STP Case */
                        /* Noted : The first time, while syncing the case always update payment and manager review to remote server.
                            If don't do that, manager and payment model in remote server will save the local ID of case
                        */
                        self.prepareAllElementsInCase(caseModel, [ConstantConfig.MODULE_NAME.PAYMENT, ConstantConfig.MODULE_NAME.MANAGERREVIEW])
                            .then(function (argsAfterPreparedEle) {
                                builtData = self.buildDataForCallSyncAPI(argsAfterPreparedEle, self.DEFAULT_SORT_ORDER.PREPARE_DATA_FOR_SYNCING, self.DEFAULT_SORT_CONDITION.PREPARE_DATA_FOR_SYNCING);
                                resolve(builtData);
                            })
                    } else if (caseModel.underwriting.refId) {
                        /* For Non-STP Case */
                        self.prepareAllElementsInCase(caseModel, [ConstantConfig.MODULE_NAME.UNDERWRITING])
                        .then(function (argsAfterPreparedEle) {
                            builtData = self.buildDataForCallSyncAPI(argsAfterPreparedEle, self.DEFAULT_SORT_ORDER.PREPARE_DATA_FOR_SYNCING, self.DEFAULT_SORT_CONDITION.PREPARE_DATA_FOR_SYNCING);
                            resolve(builtData);
                        })
                    } else {
                        /* For Cases Aren't Pre-Submit*/
                        builtData = self.buildDataForCallSyncAPI(caseModel);
                        resolve(builtData);
                        return;
                    }
                }
                /* Prepare data of element inside case */
                self.prepareAllElementsInCase(caseModel)
                    .then(function (argsAfterPreparedEle) {
                        /* Build package for sync in remote server */
                        builtData = self.buildDataForCallSyncAPI(argsAfterPreparedEle, self.DEFAULT_SORT_ORDER.PREPARE_DATA_FOR_SYNCING, self.DEFAULT_SORT_CONDITION.PREPARE_DATA_FOR_SYNCING);
                        resolve(builtData);
                    })
                    .catch(function (err) {
                        reject(err);
                    })

            } else {
                self.$log.error('Not found case to synch!');
                reject(caseModel);
            }

            /* deferred.resolve(builtData); */
        }).catch(function (err) {
            reject(err);
        });
    });

}

CaseSyncService.prototype.prepareDataForSyncingFNAInBC = function(caseModel) {
    var self = this;
    var deferred = self.$q.defer();
    var fnaSyncService = new FnaSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var fnaInside = null;
    var messagesForSyncFNA = null;

    fnaInside = caseModel.fnaInside;

    if (self.hasValueNotEmpty(fnaInside)
    && self.hasValueNotEmpty(fnaInside.refIdModel.refId)) {
        messagesForSyncFNA = {
            docType: self.buildDocTypeForMessages(fnaInside.refIdModel.refType),
            businessType: fnaInside.refIdModel.refBusinessType,
            productName: fnaInside.refIdModel.refProductName,
            docId: fnaInside.refIdModel.refId
        }

        self.buildNewRequestForService(fnaSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncFNA);

        fnaSyncService.prepareDataForSyncWithoutBuild(fnaSyncService.request)
        .then(function(dataAfterPrepared) {
            console.log(dataAfterPrepared);
            deferred.resolve(dataAfterPrepared);
        })
        .catch(function(err) {
            deferred.reject(err);
        });

    } else {
        self.$log.debug('Don\'t have FNA to sync!');
        deferred.resolve(null);
    }

    return deferred.promise;
}

CaseSyncService.prototype.prepareDataForSyncingManagerReviewInBC = function(caseModel) {
    var self = this;
    var managerReview = caseModel.managerreview;
    var messagesForSyncManagerReview = null;
    var baseSyncService = new BaseSyncService(self.$q, self.$log, self.$http, self.request, self.params);

    return new Promise(function (resolve, reject) {
        if (self.hasValueNotEmpty(managerReview) &&
            self.hasValueNotEmpty(managerReview.refId) &&
            caseModel.metaData.businessStatus == 'READY_FOR_SUBMISSION') {
                messagesForSyncManagerReview = {
                    docType: self.buildDocTypeForMessages(managerReview.refType),
                    businessType: managerReview.refBusinessType,
                    productName: managerReview.refProductName,
                    docId: managerReview.refId
                };

                self.buildNewRequestForService(baseSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncManagerReview);
                baseSyncService.delegateNative(baseSyncService.request)
                .then(function(preparedData) {
                    resolve(preparedData);
                })
                .catch(function(err) {
                    reject(err);
                })
        } else {
            resolve(null);
        }
    });
}

CaseSyncService.prototype.prepareDataForSyncingUWInBC = function(caseModel) {
    var self = this;
    var underwriting = caseModel.underwriting;
    var messagesForSyncUW = null;

    return new Promise(function (resolve, reject) {
        if (self.hasValueNotEmpty(underwriting) &&
            self.hasValueNotEmpty(underwriting.refId)) {
                messagesForSyncUW = {
                    docType: self.buildDocTypeForMessages(underwriting.refType),
                    businessType: underwriting.refBusinessType,
                    productName: underwriting.refProductName,
                    docId: underwriting.refId
                };

                self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncUW);
                self.delegateNative(self.request)
                .then(function(preparedData) {
                    resolve(preparedData);
                })
                .catch(function(err) {
                    reject(err);
                })
        } else {
            resolve(null);
        }
    });
}

CaseSyncService.prototype.prepareDataForSyncingPaymentInBC = function (caseModel) {
    var self = this;
    var payment = caseModel.payment;
    var messagesForSyncPayment = null;

    return new Promise(function (resolve, reject) {
        if (self.hasValueNotEmpty(payment) &&
            self.hasValueNotEmpty(payment.refId) &&
            caseModel.metaData.businessStatus == 'READY_FOR_SUBMISSION') {
                messagesForSyncPayment = {
                    docType: self.buildDocTypeForMessages('payment'),
                    businessType: payment.refBusinessType,
                    productName: payment.refProductName,
                    docId: payment.refId
                };

                self.buildNewRequestForService(self, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncPayment);
                self.delegateNative(self.request)
                .then(function(preparedData) {
                    resolve(preparedData);
                })
                .catch(function(err) {
                    reject(err);
                })
        } else {
            resolve(null);
        }
    });
}

CaseSyncService.prototype.prepareDataForSyncingApplicationInBC = function(caseModel) {
    var self = this;
    var deferred = self.$q.defer();
    var applicationSyncService = new ApplicationSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var application = null;
    var messagesForSyncApplication = null;

    application = caseModel.application;

    if (self.hasValueNotEmpty(application)
    && self.hasValueNotEmpty(application.refId)) {
        messagesForSyncApplication = {
            docType: application.refType + 's',
            businessType: application.refBusinessType,
            productName: application.refProductName,
            docId: application.refId
        }

        self.buildNewRequestForService(applicationSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncApplication);

        applicationSyncService.delegateNative(applicationSyncService.request)
        .then(function(dataAfterPrepared) {
            deferred.resolve(dataAfterPrepared);
        })
        .catch(function(err) {
            deferred.reject(err);
        })
    } else {
        self.$log.debug('Don\'t have application to sync!');
        deferred.resolve(null);
    }
    
    return deferred.promise;
}

CaseSyncService.prototype.prepareDataForSyncingProspectInBC = function (caseModel) {
    var self = this;
    var deferred = self.$q.defer();
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var prospect = null;
    var tasks = [];

    if (!self.hasValueNotEmpty(caseModel.prospects)) {
        deferred.resolve(null);
    } else {
        /* Only support one prospect */
        prospect = caseModel.prospects[0];

        var messagesForSyncContact = {
            docType: prospect.refType + 's',
            businessType: prospect.refBusinessType,
            productName: prospect.refProductName,
            docId: prospect.refId
        };

        self.buildNewRequestForService(contactSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);

        tasks.push(contactSyncService.delegateNative(contactSyncService.request));

        /* Sync Prospect With Version 0 */
        messagesForSyncContact = {
            docType: prospect.refType + 's',
            businessType: prospect.refBusinessType,
            productName: prospect.refProductName,
            docId: null,
            docName: prospect.refDocName,
            version: 0
        };

        self.buildNewRequestForService(contactSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncContact);

        tasks.push(contactSyncService.delegateNative(contactSyncService.request));

        self.$q.all(tasks)
            .then(function (dataAfterPreparing) {
                deferred.resolve(dataAfterPreparing);
            })
            .catch(function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise;
};

CaseSyncService.prototype.prepareDataForSyncingQuotationInBC = function (caseModel) {
    var self = this;
    var deferred = self.$q.defer();
    var quotationSyncService = new QuotationSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var quotations = null;
    var tasks = [];
    var response = [];

    if (!self.hasValueNotEmpty(caseModel.quotations)) {
        deferred.resolve(null);
    } else {
        quotations = caseModel.quotations;

        quotations.forEach(function (quotation) {
            var messagesForSyncQuotation = {
                docType: quotation.refType + 's',
                businessType: quotation.refBusinessType,
                productName: quotation.refProductName,
                docId: quotation.refId
            };

            self.buildNewRequestForService(quotationSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncQuotation);
            tasks.push(quotationSyncService.delegateNative(quotationSyncService.request));

            /* messagesForSyncQuotation = {
                docType: quotation.refType + 's',
                businessType: quotation.refBusinessType,
                productName: quotation.refProductName,
                docId: null,
                docName: quotation.refDocName,
                version: 0
            };

            self.buildNewRequestForService(quotationSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncQuotation);
            tasks.push(quotationSyncService.delegateNative(quotationSyncService.request)); */
        });

        self.$q.all(tasks)
            .then(function (arrDataAfterPreparing) {
                tasks = [];

                arrDataAfterPreparing.forEach(function (item) {
                    self.handleDuplicateData(response, item);
                });

                response.forEach(function(item) {
                    /* Get All Contact Inside Quotation */
                    tasks.push(quotationSyncService.prepareDataForSyncingContactInQuo(item));
                });

                self.$q.all(tasks)
                    .then(function (contactInQuotations) {
                        contactInQuotations.forEach(function (contacts) {
                            contacts.forEach(function(item) {
                                response.push(item);
                            });
                        });

                        deferred.resolve(response);
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            })
            .catch(function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise;
};

CaseSyncService.prototype.prepareDataForSyncingAttachmentInBC = function (caseModel) {
    var self = this;
    var deferred = self.$q.defer();
    var attachmentSyncService = new AttachmentSyncService(self.$q, self.$log, self.$http, self.request, self.params);
    var attachments = null;
    var tasks = [];
    var response = [];

    if (!self.hasValueNotEmpty(caseModel.attachments)) {
        deferred.resolve(null);
    } else {
        attachments = caseModel.attachments;

        attachments.forEach(function (attachment) {
            if(attachment.attachment.refId != null && attachment.attachment.refId != undefined) {
                var messagesForSyncAttachment = {
                    docType: 'attachments',
                    businessType: undefined,
                    productName: undefined,
                    docId: attachment.attachment.refId
                };

                self.buildNewRequestForService(attachmentSyncService, 'PREPARE_DATA_FOR_SYNCING', messagesForSyncAttachment);
                tasks.push(attachmentSyncService.delegateNative(attachmentSyncService.request));
            }
        });

        self.$q.all(tasks)
            .then(function (arrDataAfterPreparing) {
                deferred.resolve(arrDataAfterPreparing);
            })
            .catch(function (err) {
                deferred.reject(err);
            });
    }

    return deferred.promise;
};

CaseSyncService.prototype.handleDataAfterSynced = function () {
    var self = this;
    var sortOrder = null;
    var condition = null;
    var dataInRemoteServer = self.request['messages'].dataJson;
    var tasksOfDataInRemoteServer = dataInRemoteServer.tasks;
    var promiseTasks = [];

    return new Promise(function(resolve, reject) {
        if (self.request.messages.sortOrder) {
            sortOrder = self.request.messages.sortOrder;
        } else {
            sortOrder = self.DEFAULT_SORT_ORDER.AFTER_SYNCED;
        }

        if (self.request.messages.condition) {
            condition = self.request.messages.condition;
        } else {
            condition = self.DEFAULT_SORT_CONDITION.AFTER_SYNCED;
        }

        tasksOfDataInRemoteServer.forEach(function(task) {
            promiseTasks.push(self.updateLocalDBWithSyncedData(task, sortOrder, condition))
        });

        Promise.all(promiseTasks)
        .then(function (result) {
            resolve(result[0]);
        })
        .catch(function (err) {
            reject(err);
        });
    });
}

CaseSyncService.prototype.checkExistedOfEleInPackage = function(sequenceTasks, moduleName, element) {
    var self = this;
    var casePackage = sequenceTasks[0];
    var promiseTasks = [];
    var baseOfflineService = new BaseOfflineService(self.$q, self.$log, self.$http, self.request,self.params);

    return new Promise(function(resolve, reject) {
        var craetePackageNonexistent = function(doc) {
            var packageTmp = {
                actionType : "CREATE",
                lastSyncDate : moment().format("YYYY-MM-DDTHH:mm:ssZZ"),
                localID : doc.refId,
                serverId : doc.refId,
                module : moduleName,
                data : null
              };
    
            if (moduleName == 'CONTACT') {
                packageTmp.group = doc.refBusinessType;
            } else {
                packageTmp.group = casePackage.group;
                packageTmp.product = casePackage.product;
            }
    
            var docType = self.buildDocTypeForMessages(moduleName.toLocaleLowerCase());
    
            return baseOfflineService.getEmptyModel(docType, packageTmp.group, packageTmp.product)
            .then(function(emptyModel) {
                emptyModel.metaData.docId = doc.refId;
                emptyModel.version = '0';
                emptyModel.id = doc.refId;
                emptyModel.metaData.createDate = moment('2000-01-01').format("YYYY-MM-DDTHH:mm:ssZZ");
                emptyModel.metaData.modifyDate = moment('2000-01-01').format("YYYY-MM-DDTHH:mm:ssZZ");
                packageTmp.data = emptyModel;
                sequenceTasks.push(packageTmp);
            });
        }
    
        if (self.hasValueNotEmpty(element) && Array.isArray(element)) {
            element.forEach(function(item) {
                promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, moduleName, item))
            });

            Promise.all(promiseTasks)
            .then(function() {
                resolve(sequenceTasks);
            })
            .catch(function(err) {
                reject(err);
            });
        }
    
        if (self.hasValueNotEmpty(element) && typeof element === 'object') {
            if (element.refId) {
                /* Default is not existed */
                var isExisted = false;
    
                for(var i = 0; i < sequenceTasks.length; i++) {
                    if (sequenceTasks[i].module == moduleName) {
                        if (sequenceTasks[i].localID == element.refId) {
                            isExisted = true;
                            break;
                        }
                    }
                }
    
                if (isExisted == false) {
                    console.log(moduleName + ' is\'nt existed', element.refId);
                    /* Create Package For Nonexistent Doc */
                    craetePackageNonexistent(element)
                    .then(function() {
                        resolve(sequenceTasks)
                    })
                    .catch(function(err) {
                        reject(err);
                    })
                } else {
                    resolve(sequenceTasks);
                }
            } else {
                resolve(sequenceTasks);
            }
        } else {
            resolve(sequenceTasks);
        }
    })
}

CaseSyncService.prototype.scanAllEleInCase = function (sequenceTasks) {
    var self = this;
    var casePackage = sequenceTasks[0];
    var caseModel = casePackage.data;
    var prospects = caseModel.prospects;
    var quotations = caseModel.quotations;
    var payment = caseModel.payment;
    var underwriting = caseModel.underwriting;
    var managerreview = caseModel.managerreview;
    var fnaInside = caseModel.fnaInside;
    var promiseTasks = [];

    return new Promise(function (resolve, reject) {
        if (self.hasValueNotEmpty(prospects)) {
            /* Check Contact */
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.CONTACT.toUpperCase(), prospects));
        }

        if (self.hasValueNotEmpty(quotations)) {
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.QUOTATION.toUpperCase(), quotations));
        }

        if (self.hasValueNotEmpty(payment)) {
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.PAYMENT.toUpperCase(), payment));
        }

        if (self.hasValueNotEmpty(underwriting)) {
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.UNDERWRITING.toUpperCase(), underwriting));
        }

        if (self.hasValueNotEmpty(managerreview)) {
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.MANAGERREVIEW.toUpperCase(), managerreview));
        }

        if (self.hasValueNotEmpty(fnaInside)) {
            promiseTasks.push(self.checkExistedOfEleInPackage(sequenceTasks, ConstantConfig.MODULE_NAME.FNA.toUpperCase(), fnaInside));
        }

        Promise.all(promiseTasks)
        .then(function() {
            resolve(sequenceTasks);
        })
        .catch(function(err) {
            reject(err);
        })

        console.log(casePackage);
        console.log(sequenceTasks);
    });
}

CaseSyncService.prototype.updateLocalDBWithSyncedData = function (sequenceTasks, sortOrder, condition) {
    var self = this;
    var localReqInfor = self.deepCopy(self.request);
    var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request, self.params);


    return new Promise(function (resolve, reject) {
        var handleCaseDataAfterSyncing = function (lstDuplicatedContacts) {
            var dataAfterHandling = {
                contact: [],
                quotation: [],
                attachment: [],
                application: null,
                fna: null,
                payment: null,
                managerreview: null
            }

            sequenceTasks = self.sortDataBaseOnCondition(sequenceTasks, sortOrder, condition);

            localReqInfor.messages.dataJson = sequenceTasks[0];
            localReqInfor.messages.docType = sequenceTasks[0].module.toLocaleLowerCase() + 's';

            var chainPromise = self.$q.when(self.delegateNative(localReqInfor));

            self.processToNextRequestSync(chainPromise, false, 1, localReqInfor, sequenceTasks, dataAfterHandling)
                .then(function (savedCase) {
                    /* After finished updating data at Local DB. Then updating the duplicate contact at Local DB */
                    if (self.hasValueNotEmpty(lstDuplicatedContacts)) {
                        self.$log.info(lstDuplicatedContacts);
                        self.$log.info('Have ' + lstDuplicatedContacts.length + ' contacts is duplicated with server');

                        contactSyncService.handleDupContactData(lstDuplicatedContacts)
                            .then(function (rsAfterHandlingDupContact) {
                                self.$log.info(rsAfterHandlingDupContact);
                                self.$log.info('Finished handling duplicate contact when sync Case!');

                                resolve(self.buildResponseForHandlingAfterSynced(savedCase, true));
                            })
                            .catch(function (err) {
                                reject(err);
                            });
                    } else {
                        resolve(self.buildResponseForHandlingAfterSynced(savedCase, true));
                    }
                })
                .catch(function (err) {
                    reject(err);
                });
        };
        
        self.scanAllEleInCase(sequenceTasks)
            .then(function (pckAfterScaned) {
                /*Call to local DB to handle data*/
                self.checkDuplicateContactWithServer(sequenceTasks)
                    .then(function (lstDuplicatedContacts) {
                        /* Update the case's data at Local DB */
                        handleCaseDataAfterSyncing(lstDuplicatedContacts);
                    })
                    .catch(function (err) {
                        reject(err);
                    });
            })
            .catch(function (err) {
                reject(err);
            });
    });
}
//TODO: Move To Base Sync
// CaseSyncService.prototype.checkDuplicateContactWithServer = function(sequenceTasks) {
//     var self = this;
//     var deferred = self.$q.defer();
//     var contactSyncService = new ContactSyncService(self.$q, self.$log, self.$http, self.request,self.params);
//     var promiseTasks = [];
//     var lstDuplicatedContacts = [];

//     var contactSequenceTasks = self.$filter('filter')(sequenceTasks, function(task, index) {
//         if (task.module == ConstantConfig.MODULE_NAME.CONTACT.toUpperCase()) {
//             promiseTasks.push(contactSyncService.checkDuplicatesBetweenLocalWithServer(task));
//             return  task;
//         }
//      });

//     if (!self.hasValueNotEmpty(contactSequenceTasks)) {
//         /*Return to continue if case does'n have new contacts*/
//         deferred.resolve(null);
//     }

//     self.$q.all(promiseTasks)
//     .then(function(lstRsAfterChecked) {
//         promiseTasks.length = 0;

//         lstRsAfterChecked.forEach(function(item) {
//             contactSequenceTasks.forEach(function(task) {
//                 if (task.localID == item.localContact.id) {
//                     task.docName = item.localContact.metaData.docName;
//                     task.version = item.localContact.version;
//                 }
//             });

//             if (self.hasValueNotEmpty(item)) {
//                 if (item.isDuplicated == true) {
//                     var latestContact = contactSyncService.getNewContactToUpdate(item.localContact, item.serverContact);
//                     contactSequenceTasks.forEach(function(task) {
//                         if (task.localID == item.localContact.id) {
//                             task.data = self.deepCopy(latestContact);
//                             item.serverContact = self.deepCopy(latestContact);
//                             lstDuplicatedContacts.push(item);
//                         }
//                     });
//                 }
//             }
//         });

//         deferred.resolve(lstDuplicatedContacts);
//     })
//     .catch(function(err) {
//         deferred.reject(err);
//     });



//     return deferred.promise;
// }

CaseSyncService.prototype.handleQuoDataAfterSynced = function (request, listUpdatedContacts) {
    var self = this;
    var deferred = self.$q.defer();
    var quotation = request.messages.dataJson.data;

    console.log('Quotation Before Update:');
    console.log(request);

    /* Need to update refId inside a quotation before create */
    if (listUpdatedContacts.length != 0
        && request.messages.dataJson.actionType === self.ACTION_TYPE.CREATE) {
            listUpdatedContacts.forEach(function (contact) {
            if (contact.oldDocName) {
                if (quotation.documentRelation.refContact.refDocName == contact.oldDocName && quotation.documentRelation.refContact.refVersion == contact.oldVersion) {
                    quotation.documentRelation.refContact.refDocName = contact.updatedData.metaData.docName;
                    quotation.documentRelation.refContact.refVersion = contact.updatedData.version;
                }
    
                if (quotation.documentRelation.refContactLifeInsured.refDocName == contact.oldDocName && quotation.documentRelation.refContactLifeInsured.refVersion == contact.oldVersion) {
                    quotation.documentRelation.refContactLifeInsured.refDocName = contact.updatedData.metaData.docName;
                    quotation.documentRelation.refContactLifeInsured.refVersion = contact.updatedData.version;
                }
            } else {
                if (quotation.documentRelation.refContact.refDocName == contact.updatedData.metaData.docName && quotation.documentRelation.refContact.refVersion == contact.updatedData.version) {
                    quotation.documentRelation.refContact.refDocName = contact.updatedData.metaData.docName;
                    quotation.documentRelation.refContact.refVersion = contact.updatedData.version;
                }
    
                if (quotation.documentRelation.refContactLifeInsured.refDocName == contact.updatedData.metaData.docName && quotation.documentRelation.refContactLifeInsured.refVersion == contact.updatedData.version) {
                    quotation.documentRelation.refContactLifeInsured.refDocName = contact.updatedData.metaData.docName;
                    quotation.documentRelation.refContactLifeInsured.refVersion = contact.updatedData.version;
                }
            }
            
        });
    }

    self.$log.debug('Quotation After Update:');
    self.$log.debug(request);

    self.delegateNative(request)
        .then(function (res) {
            deferred.resolve(res);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}

CaseSyncService.prototype.handleAppDataAfterSynced = function(request, listUpdatedQuotations) {
    var self = this;
    var deferred = self.$q.defer();
    var application = request.messages.dataJson.data;

    self.$log.debug('Application Before Update:');
    self.$log.debug(request.messages.dataJson.data);

    if (listUpdatedQuotations.length != 0 && request.messages.dataJson.actionType === self.ACTION_TYPE.CREATE) {
        listUpdatedQuotations.forEach(function (quotation) {
            if (application.documentRelation.quotationId == quotation.oldId) {
                application.documentRelation.docNameQuotation = quotation.updatedData.metaData.docName;
                application.documentRelation.quotationId = quotation.updatedData.metaData.docId;
            }
        });
    }

    self.$log.debug('Application After Update:');
    self.$log.debug(request.messages.dataJson.data);

    self.delegateNative(request)
        .then(function (res) {
            deferred.resolve(res);
        })
        .catch(function (err) {
            deferred.reject(err);
        });

    return deferred.promise;
}

CaseSyncService.prototype.handleCaseDataAfterSynced = function (request, dataAfterHandling) {
    var self = this;
    var caseModel = request.messages.dataJson.data;
    var prospect = caseModel.prospects[0];
    var listUpdatedContacts = dataAfterHandling.contact;
    var listQuotations = dataAfterHandling.quotation;
    var application = dataAfterHandling.application;
    var listUpdatedAttachments = dataAfterHandling.attachment;
    var payment = dataAfterHandling.payment;
    var managerReview = dataAfterHandling.managerreview;
    var uwModel = dataAfterHandling.underwriting;
    var updatedFNA = dataAfterHandling.fna;
    var baseOfflineService = new BaseOfflineService(self.$q, self.$log, self.$http, self.request,self.params);

    return new Promise(function(resolve, reject) {
        if (request.messages.dataJson.actionType === self.ACTION_TYPE.CREATE) {
            if (listUpdatedContacts && Array.isArray(listUpdatedContacts) && listUpdatedContacts.length > 0) {
                self.$log.debug('Prospect Inside Case Before Updating:');
                self.$log.debug(caseModel.prospects[0]);
    
                for (var i = 0; i < listUpdatedContacts.length; i++) {
                    if (prospect.refId == listUpdatedContacts[i].oldId) {
                        prospect.refId = listUpdatedContacts[i].updatedData.id;
                        prospect.refDocName = listUpdatedContacts[i].updatedData.metaData.docName;
                        prospect.refVersion = listUpdatedContacts[i].updatedData.version;
                        listUpdatedContacts.splice(i, 1);
                        break;
                    }
                }
    
                self.$log.debug('Prospect Inside Case After Updating:');
                self.$log.debug(caseModel.prospects[0]);
            }
    
            if (self.hasValueNotEmpty(application)) {
                self.$log.debug('Application Inside Case Before Updating:');
                self.$log.debug(caseModel.application);
    
                /* Update RefId Of Application in Case */
               /* caseModel.application.refId = application.updatedData.metaData.docId;
                caseModel.application.refBusinessType = application.updatedData.metaData.businessType;
                caseModel.application.refProductName = application.updatedData.metaData.productName;
                caseModel.application.refType = application.updatedData.metaData.docType;
                caseModel.application.refBusinessStatus = application.updatedData.metaData.businessStatus;
                caseModel.application.status = application.updatedData.metaData.documentStatus;*/
                caseModel.application.refVersion = application.updatedData.version;
                caseModel.application.refDocName = application.updatedData.metaData.docName;
                caseModel.application.refId = application.updatedData.metaData.docId;
    
                self.$log.debug('Application Inside Case After Updating:');
                self.$log.debug(caseModel.application);
            }
    
            if (self.hasValueNotEmpty(payment)) {
                if (caseModel.payment.refId == payment.oldId) {
                    /* Update new id of payment to case */
                    caseModel.payment.refId = payment.updatedData.id;
                    /* Update new id of case to payment */
                    payment.updatedData.referenceInfo.caseId = caseModel.id;
                    baseOfflineService.updateDocumentService(payment.updatedData);
                }
            }
    
            if (self.hasValueNotEmpty(managerReview)) {
                try {
                    if (caseModel.managerreview.refId == managerReview.oldId) {
                        /* Update new id of managerreview to case */
                        caseModel.managerreview.refId = managerReview.updatedData.id;
                        caseModel.managerreview.refType = managerReview.updatedData.metaData.docType;
                        caseModel.managerreview.refDocName = managerReview.updatedData.metaData.docName;
                        caseModel.managerreview.refBusinessStatus = managerReview.updatedData.metaData.businessStatus;
                        /* Update new id of case to managerreview */
                        managerReview.updatedData.documentRelation.caseId = caseModel.id;
                        managerReview.updatedData.documentRelation.caseName = caseModel.metaData.docName;
                        baseOfflineService.updateDocumentService(managerReview.updatedData);
                    }
                } catch(err) {
                    reject(err);
                }
            }

            if (self.hasValueNotEmpty(uwModel)) {
                if (caseModel.underwriting.refId == uwModel.oldId) {
                    try {
                        /* Update new id of underwriting to case */
                        caseModel.underwriting.refId = uwModel.updatedData.id;
                        caseModel.underwriting.refType = uwModel.updatedData.metaData.docType;
                        caseModel.underwriting.refDocName = uwModel.updatedData.metaData.docName;
                        caseModel.underwriting.refBusinessStatus = uwModel.updatedData.metaData.businessStatus;
                        /* Update new id of case and quotation to underwriting */
                        uwModel.updatedData.documentRelation.caseId = caseModel.metaData.docId;
                        uwModel.updatedData.documentRelation.caseBusinessType = caseModel.metaData.businessType;
                        uwModel.updatedData.documentRelation.caseProduct = caseModel.metaData.productName;
                        uwModel.updatedData.documentRelation.caseName = caseModel.metaData.docName;
                        if (listQuotations.length != 0) {
                            listQuotations.forEach(function(item) {
                                if (item.oldId == uwModel.updatedData.documentRelation.agentQuoId) {
                                    uwModel.updatedData.documentRelation.agentQuoBusinessType = item.updatedData.metaData.businessType;
                                    uwModel.updatedData.documentRelation.agentQuoId = item.updatedData.metaData.docId;
                                    uwModel.updatedData.documentRelation.agentQuoName = item.updatedData.metaData.docName;
                                    uwModel.updatedData.documentRelation.agentQuoProduct = item.updatedData.metaData.productName;
                                }
                            })
                        }

                        baseOfflineService.updateDocumentService(uwModel.updatedData);
                    } catch(err) {
                        reject(err);
                    }
                }
            }
    
            if (listUpdatedAttachments.length != 0) {
                try{
                    /* Update RefId Of Application in Case */
                    listUpdatedAttachments.forEach(function (attachment) {
                        caseModel.attachments.forEach(function (attachmentInsideCase) {
                            if (attachmentInsideCase.attachment.refId == attachment.oldId) {
                                attachmentInsideCase.attachment.refId = attachment.updatedData.metaData.docId;
                            }
                        });
                    });
                } catch(err) {
                    reject(err);
                }
            }
    
            if (self.hasValueNotEmpty(updatedFNA)) {
                caseModel.fnaInside.refIdModel.refId = updatedFNA.updatedData.id;
            }
    
            if (listQuotations.length != 0) {
                self.$log.debug(listQuotations);
    
                self.$log.debug('Quotation Inside Case Before Updating:');
                self.$log.debug(caseModel.quotations);
                /* Update RefId Of Quotation in Case */
                listQuotations.forEach(function (quotation) {
                    caseModel.quotations.forEach(function (quoInsideCase) {
                        if (quoInsideCase.refId == quotation.oldId) {
                            /*quoInsideCase.refBusinessType = quotation.updatedData.metaData.businessType;
                            quoInsideCase.refProductName = quotation.updatedData.metaData.productName;
                            quoInsideCase.refType = quotation.updatedData.metaData.docType;
                            quoInsideCase.refBusinessStatus = quotation.updatedData.metaData.businessStatus;
                            quoInsideCase.status = quotation.updatedData.metaData.documentStatus;*/
                            quoInsideCase.refVersion = quotation.updatedData.version;
                            quoInsideCase.refDocName = quotation.updatedData.metaData.docName;
                            quoInsideCase.refId = quotation.updatedData.metaData.docId;
                        }
                    });
                });
    
                self.$log.debug('Quotation Inside Case After Updating:');
                self.$log.debug(caseModel.quotations);
            }
        }

        self.delegateNative(request)
        .then(function (res) {
            resolve(res);
        })
        .catch(function (err) {
            reject(err);
        });
    });
}

CaseSyncService.prototype.handleFNADataAfterSynced = function(request, lstUpdatedContacts) {
    var self = this;
    var fnaModel = request.messages.dataJson.data;
    var client = fnaModel.client;
    var jointApplicant = fnaModel.jointApplicant;

    lstUpdatedContacts.forEach(function(item) {
        if (self.hasValueNotEmpty(client.refContact.refDocName)) {
            var children = client.dependants.childrenObject.children;
            var elderlyDependants = client.dependants.elderlyObject.elderlyDependants;
            
            if (item.oldDocName == client.refContact.refDocName) {
                client.refContact.refDocName = item.updatedData.metaData.docName;
            }

            if (self.hasValueNotEmpty(children)) {
                for(var i = 0; i < children.length; i++) {
                    if (children[i].refContact.refDocName == item.oldDocName) {
                        children[i].refContact.refDocName = item.updatedData.metaData.docName;
                        break;
                    }
                }
            }
    
            if (self.hasValueNotEmpty(elderlyDependants)) {
                for(var i = 0; i < elderlyDependants.length; i++) {
                    if (elderlyDependants[i].refContact.refDocName == item.oldDocName) {
                        elderlyDependants[i].refContact.refDocName = item.updatedData.metaData.docName;
                        break;
                    }
                }
            }
        }

        if (self.hasValueNotEmpty(jointApplicant.refContact.refDocName)) {
            if (item.oldDocName == jointApplicant.refContact.refDocName) {
                jointApplicant.refContact.refDocName = item.updatedData.metaData.docName;
            }
        }
    });
    

    return self.delegateNative(request);
};

CaseSyncService.prototype.processToNextRequestSync = function (promise, stopCondition, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling) {
    var self = this;

    if (!promise) {
        self.$log.debug('Process to next request sync: No Specify Promise Function!');
    }

    if (stopCondition) {
        return promise;
    } else {
        return promise.then(function (res) {
                if (self.hasValueNotEmpty(res)) {
                    getResponseAfterHandling(localReqInfor, res, dataAfterHandling);
                }

                //Build the next request
                localReqInfor.messages.dataJson = sequenceTasks[nextIndexSequenceTasks];
                localReqInfor.messages.docType = sequenceTasks[nextIndexSequenceTasks].module.toLocaleLowerCase() + 's';

                switch (sequenceTasks[nextIndexSequenceTasks].module.toLocaleLowerCase()) {
                    case ConstantConfig.MODULE_NAME.CONTACT:
                        nextIndexSequenceTasks++;
                        promise = self.delegateNative(localReqInfor);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.QUOTATION:
                        nextIndexSequenceTasks++;
                        promise = self.handleQuoDataAfterSynced(localReqInfor, dataAfterHandling.contact);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.ATTACHMENT:
                        nextIndexSequenceTasks++;
                        promise = self.delegateNative(localReqInfor);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.APPLICATION:
                        nextIndexSequenceTasks++;
                        promise = self.handleAppDataAfterSynced(localReqInfor, dataAfterHandling.quotation);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.FNA:
                        nextIndexSequenceTasks++;
                        promise = self.handleFNADataAfterSynced(localReqInfor, dataAfterHandling.contact);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.PAYMENT:
                        nextIndexSequenceTasks++;
                        promise = self.delegateNative(localReqInfor);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.MANAGERREVIEW:
                        nextIndexSequenceTasks++;
                        promise = self.delegateNative(localReqInfor);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.UNDERWRITING:
                        nextIndexSequenceTasks++;
                        promise = self.delegateNative(localReqInfor);
                        return self.processToNextRequestSync(promise, false, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                    case ConstantConfig.MODULE_NAME.SALECASE:
                        nextIndexSequenceTasks++;
                        promise = self.handleCaseDataAfterSynced(localReqInfor, dataAfterHandling);
                        return self.processToNextRequestSync(promise, true, nextIndexSequenceTasks, localReqInfor, sequenceTasks, dataAfterHandling);
                }
            })
            .catch(function (err) {
                return self.$q.reject(err);
            });
    }
}

function getResponseAfterHandling(request, data, dataAfterHandling) {
    //Get the result of the old request
    switch (data.metaData.docType) {
        case ConstantConfig.MODULE_NAME.CONTACT:
            dataAfterHandling[data.metaData.docType].push({
                oldId: request.messages.dataJson.localID,
                oldDocName: request.messages.dataJson.docName,
                oldVersion: request.messages.dataJson.version,
                updatedData: data
            });
            break;
        case ConstantConfig.MODULE_NAME.ATTACHMENT:
        case ConstantConfig.MODULE_NAME.QUOTATION:
            dataAfterHandling[data.metaData.docType].push({
                oldId: request.messages.dataJson.localID,
                updatedData: data
            })
            break;
        case ConstantConfig.MODULE_NAME.APPLICATION:
        case ConstantConfig.MODULE_NAME.PAYMENT:
        case ConstantConfig.MODULE_NAME.MANAGERREVIEW:
        case ConstantConfig.MODULE_NAME.UNDERWRITING:
        case ConstantConfig.MODULE_NAME.FNA:
            dataAfterHandling[data.metaData.docType] = {
                oldId: request.messages.dataJson.localID,
                updatedData: data
            }
            break;
    }

    return dataAfterHandling;
}
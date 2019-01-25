'use strict';

function AttachmentSyncService($q, $log, $http, request, params) {
    BaseSyncService.call(this, $q, $log, $http, request, params);
    console.log('Attachment Sync Service');
}

AttachmentSyncService.prototype = Object.create(BaseSyncService.prototype);


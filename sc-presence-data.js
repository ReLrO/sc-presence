'use strict';
﻿module.exports.presenceConfig;

module.exports.insertUserChannel = function (connection, socket, channel, callback) {
    if (socket.state == "open" && channel && channel.toLowerCase() !== '_scpresence') {
        var user_id = null;
        var user_authToken = null;
        var user_origin = null;

        var authToken = socket.getAuthToken();
        if (authToken != null && typeof authToken == 'object') {
                user_id = authToken[module.exports.presenceConfig.scpUserIdField];
                user_authToken = JSON.stringify(authToken);
        }
        var insertParams = [
             socket.id
            ,user_id
            ,channel
            ,user_authToken
            ,socket.remoteAddress
            ,socket.request.headers.origin
        ];


        execSQL("INSERT INTO " + module.exports.presenceConfig.scpDbTablename + " (SCP_socket_id, SCP_user_id, SCP_channel, SCP_authToken, SCP_ip, SCP_origin, SCP_updated) " +
                "VALUES($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (SCP_user_id, SCP_channel) DO UPDATE SET SCP_socket_id = $1, SCP_authToken = $4, SCP_ip = $5, SCP_origin=$6, SCP_user_id=$2", connection, insertParams, callback);



    }
}





module.exports.removeUserChannel = function (connection, socket, channel, callback) {

    var params = [
         socket.id
        ,channel
    ];
    // console.log(module.exports.presenceConfig.scpDbTablename);
    execSQL("DELETE FROM " + module.exports.presenceConfig.scpDbTablename + " WHERE SCP_socket_id = $1 AND SCP_channel = $2 ;", connection, params, callback);
}



module.exports.updatePresencePing = function (connection, socket, presenceChannel, channels, callback) {

    if (socket.state == "open") {
        var user_id = null;
        var user_authToken = null;

        var authToken = socket.getAuthToken();

        if (authToken != null) {
            user_id = authToken[module.exports.presenceConfig.scpUserIdField];
            user_authToken = JSON.stringify(authToken);
        }

        var params = [
           user_authToken
          ,user_id
          ,socket.id
          ,presenceChannel
        ];

        execSQL("UPDATE  " + module.exports.presenceConfig.scpDbTablename + "  SET SCP_updated = NOW(), SCP_authToken = $1, SCP_user_id = $2 " +
                "WHERE SCP_socket_id = $3 AND SCP_channel = $4;",
                connection, params, function () {

                        var params = [
                            user_authToken
                           ,socket.id
                           ,channels
                        ];

                        execSQL("UPDATE  " + module.exports.presenceConfig.scpDbTablename + "  SET SCP_updated = NOW(), SCP_authToken = $1 " +
                                "WHERE SCP_socket_id = $2 AND FIND_IN_SET(SCP_channel, $3);",
                                connection, params, callback);
        });
    }
}




module.exports.getSocketcount = function (connection, scpPresenceChannel, activeUserThreshold, callback) {

    var params = [
        scpPresenceChannel,
        activeUserThreshold
    ];

    execSQL("SELECT COUNT(*) AS active_users FROM  " + module.exports.presenceConfig.scpDbTablename + "  up WHERE SCP_channel = $1 AND SCP_updated >= DATE_ADD(NOW(), INTERVAL -$2 SECOND);", connection, params, callback);
}





module.exports.getUsercount = function (connection, activeUserThreshold, callback) {

    var params = [
        activeUserThreshold
    ];

    execSQL("SELECT COUNT(*) AS active_users FROM (SELECT CASE WHEN SCP_user_id IS NULL THEN -1 ELSE SCP_user_id END AS user_id, COUNT(*) FROM " +
            module.exports.presenceConfig.scpDbTablename + " WHERE SCP_user_id IS NULL GROUP BY user_id) AS a", connection, params, callback);
}






module.exports.getSubscriptioncount = function (connection, activeUserThreshold, callback) {

    var params = [
        activeUserThreshold
    ];

    execSQL("SELECT COUNT(*) AS active_users FROM  " + module.exports.presenceConfig.scpDbTablename + "  up WHERE SCP_updated >= DATE_ADD(NOW(), INTERVAL -$1 SECOND);", connection, params, callback);
}




module.exports.getSocketData = function (connection, activeUserThreshold, callback) {
    var params = [activeUserThreshold];
    execSQL("SELECT * FROM  " + module.exports.presenceConfig.scpDbTablename + "  WHERE SCP_updated > DATE_ADD(NOW(), INTERVAL -$1 SECOND) ORDER BY SCP_user_id, SCP_socket_id, SCP_channel DESC;", connection, params, callback);
}





module.exports.presenceGC = function (connection, GcThreshold, callback) {
    var params = [GcThreshold];
    execSQL("DELETE FROM  " + module.exports.presenceConfig.scpDbTablename + "  WHERE SCP_updated < DATE_ADD(NOW(), INTERVAL -$1 SECOND);", connection, params, callback);
}





function execSQL(sql, connection, params, callback) {
    try {
        connection.query(sql, params, function (err, result) {
            console.log('result', result);
            if (typeof callback === 'function') {
                if (err) {
                    callback(err, {});
                } else {
                    if (result.length > 0) {
                        callback(null, result);
                    } else {
                        callback(null, {});
                    }
                }
            }
        });
    } catch (ex) {
        console.log('ex', ex);
    }

}

/*
Authomatically create temporary channel and assing special group for specific user
*/
registerPlugin({
    name: 'Temporary assign',
    version: '1.04',
    description: 'This plugin manage temporary assigned groups and subchannels ',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    vars: [{
	    name: 'rootChannel',
	    indent: 0,
	    title: 'Root channel for all subchannels',
	    type: 'channel',
	},{
	    name: 'userList',
	    indent: 0,
	    title: 'List of special users',
	    type: 'array',
		vars: [{
			name: 'dbID',
			title: 'User database ID',
			type: 'number',
		},{
			name: 'serverGroupID',
			title: 'Server group ID',
			type: 'number'
		},{
			name: 'channelName',
			title: 'Channel name',
			type: 'string',
			default: "channel"
		},{
			name: 'channelID',
			title: "Created channel (don't change it manually)",
			type: 'channel',
		},{
			name: 'expireDate',
			title: 'Expiration date (yyyy-mm-dd or yyyy-mm-ddThh:mm:ss)',
			type: 'string',
			placeholder: (new Date()).toISOString().replace(/\.(.+)/,'')
		}]
	}]
}, 

function (sinusbot, config) {
    const backend = require('backend');
    const engine = require('engine');
    const event = require('event');
//    engine.log(config);

    function onExpire(dbID, serverGroupID, channelID) {
	let ch = backend.getChannelByID(channelID);
	let gr = backend.getServerGroupByID(serverGroupID);
	if (ch !== undefined) {
	    ch.delete();
	}
	if (gr !== undefined) {
	    gr.removeClientByDatabaseId(dbID);
	}
    }

    function init() {
	var today = new Date();
	for ( let i=0; i < config.userList.length; i++) {
	    let expire = new Date(config.userList[i].expireDate);
	    if (isNaN(expire.valueOf())) {
		    expire = "Wrong date!!!";
		    config.userList[i].expireDate = expire;
	    } else {
		config.userList[i].expireDate = expire.toISOString().replace(/\.(.+)/,'');
	    }
	    if (expire > today) {
		let ch = backend.getChannelByID(config.userList[i].channelID);
		if (ch === undefined) {
		    let chParams = {
	        	name: config.userList[i].channelName,
			parent: config.rootChannel,
			permanent: true
		    };
		    while (ch === undefined) {
			ch = backend.createChannel(chParams);
			chParams.name += '!';
		    }
		    config.userList[i].channelID = ch.id();
		}
		let gr = backend.getServerGroupByID(config.userList[i].serverGroupID);
		if (gr !== undefined) {
		    gr.addClientByDatabaseId(config.userList[i].dbID);
		} else {
//		    config.userList[i].serverGroupID = "Wrong server group ID";
		}
		let delay = expire-today;
		let timer = setTimeout( () => {onExpire(config.userList[i].dbID, config.userList[i].serverGroupID, config.userList[i].channelID)}, delay );
	    } else {
		onExpire(config.userList[i].dbID, config.userList[i].serverGroupID, config.userList[i].channelID);
	    }
	    engine.saveConfig(config);
	}
    }

    event.on("load", () => {
        if (backend.isConnected()) {
            init();
        }
        else {
            event.on("connect", () => init());
        }
    });

});

/* Wargaming public API authorization manager
Authomatically create clan channel for any clan member and give him one of three channel groups - Boss, Officer or just member
Some vars are hardcoded for now. They will be partially moved to config and partially will be recoded to request values from TS engine.
*/
registerPlugin({
    name: 'Auto permissions',
    version: '1.0a',
    description: 'This plugin manage Wargaming OpenID auth.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    requiredModules: ['http', 'db', 'crypto'],
    vars: [{
		name: 'authchannel',
	    indent: 0,
	    title: 'Channel for WG auhorization',
	    type: 'channel'
	}, {
		name: 'channeldata',
	    title: 'New clans owned channels parameters',
	},{
	    name: 'channelName',
	    indent: 2,
	    title: 'Channel name format (placeholders: &t-clan TAG, &n-clan name)',
	    type: 'string',
		default: '[&t]&n'
	}, {
	    name: 'channelDesc',
	    indent: 2,
	    title: 'Channel description format (placeholders: &t-clan TAG, &n-clan name, &e-64x64 emblem)',
	    type: 'multiline',
		default: '[center][size=x-large][COLOR=#ff0000][&t]&n[/COLOR][/size][/center][center]&e[/center]'
	}, {
	    name: 'parentchannel',
	    indent: 2,
	    title: 'Parent channel for clan\'s lobbies',
	    type: 'channel'
	}, {
	    name: 'channelOptions',
	    indent: 2,
	    title: 'Channel options for clan\'s lobbies',
	    type: 'array',
		vars: [{
			name: 'optionName',
			title: 'Permission name (string like i_channel_needed_join_power)',
			type: 'string'
		},{
			name: 'optionValue',
			title: 'Permission value',
			type: 'string'
		}]
	}, {
		name: 'tsdata',
	    title: 'Teamspeak WebQuery access data',
	}, {
	    name: 'apikeyWebQuery',
	    indent: 2,
	    title: 'Teamspeak WebQuery apikey',
	    placeholder: '987654321',
	    type: 'password'
	}, {
	    name: 'addrTS3',
	    indent: 2,
	    title: 'TeamSpeak WebQuery address',
	    type: 'string'
	}, {
		name: 'wgdata',
	    title: 'Wargaming public API access data',
	}, {
	    name: 'realm',
	    indent: 2,
	    title: 'Realm for the request',
	    type: 'select',
		options: [ 'ru', 'eu', 'na', 'asia' ]
	}, {
	    name: 'gametype',
	    indent: 2,
	    title: 'API(game) type (not working yet)',
	    type: 'select',
		options: [ 'WORLD OF TANKS', 'WORLD OF WARSHIPS' ] // also available: WORLD OF WARPLANES, WORLD OF TANKS BLITZ, WORLD OF TANKS CONSOLE
	}, {
	    name: 'WGapiID',
	    indent: 2,
	    title: 'Wargaming application ID',
	    placeholder: '12345678901234567890123456789012',
	    type: 'password'
	}, {
		name: 'dbdata',
	    title: 'Database access data',
	}, {
    	name: 'dbhost',
	    title: 'MySQL database server',
	    indent: 2,
	    type: 'string'
	}, {
    	name: 'dbuser',
	    title: 'DB user',
	    indent: 2,
	    type: 'string'
	}, {
	    name: 'dbpassword',
	    title: 'DB password',
	    indent: 2,
	    type: 'password'
	}, {
	    name: 'dbname',
	    title: 'DB name',
	    indent: 2,
	    type: 'string'
	}]
}, 

function (sinusbot, config) {
    const event = require('event');
    const http = require('http');
    const crypto = require('crypto');
    const backend = require('backend');
    const engine = require('engine');
    const db = require('db');
    const store = require('store');
    const helpers = require('helpers');
	
	const realms = [ 'ru', 'eu', 'com', 'asia' ];
	const wgAPIurl = 'https://api.worldoftanks.'+realms[config.realm]+'/wot/';
	
function parseString(numberBuffer) {
    if (!Array.isArray(numberBuffer)) return "";
    const bytewriter = helpers.newBytes();
    numberBuffer.forEach(num => bytewriter.append(helpers.bytesFromHex(num.toString(16))));
    return bytewriter.toString();
}

function setClanRank( uid, clanchannel, role) {
	let group = undefined;
	switch (role) {
		case 'commander':
		case 'executive_officer':
			// Set channel admin(5)
			group = 5;
			break;
		case 'personnel_officer':
		case 'combat_officer':
		case 'intelligence_officer':
		case 'quartermaster':
		case 'recruitment_officer':
		case 'junior_officer':
			// Set channel officer(6)
			group = 6;
			break;
		case 'private':
		case 'recruit':
		case 'reservist':
			// Set channel member(7)
			group = 7;
			break;
		default:
			engine.log(role);
	}
	// Find DBid for 'uid' using TS WebQuery
	http.simpleRequest({
		'method': 'GET',
		'url': 'http://'+config.addrTS3+':10080/1/clientdbfind?pattern='+encodeURIComponent(uid)+'&-uid',
		'timeout': 6000,
		'headers': {'x-api-key': config.apikeyWebQuery}
	}, function (error, response) {
		if (error) {
		engine.log("Error: " + error);
		return;
		}
		if (response.statusCode != 200) {
		engine.log("HTTP Error: " + response.status);
		return;
		}
		// success!
		let mydata = JSON.parse(response.data);
		//engine.log("Response: " + mydata.body[0].cldbid);
		// Set channelgroup 'group' for channel 'channel_id' for client 'client.uid()' using TS WebQuery
		http.simpleRequest({
			'method': 'GET',
			'url': 'http://'+config.addrTS3+':10080/1/setclientchannelgroup?cgid='+group+'&cid='+clanchannel+'&cldbid='+mydata.body[0].cldbid,
			'timeout': 6000,
			'headers': {'x-api-key': config.apikeyWebQuery }
		}, function (error, response) {
			if (error) {
				engine.log("Error: " + error);
				return;
			}
			if (response.statusCode != 200) {
				engine.log("HTTP Error: " + response.status);
				return;
			}
			// success!
			let clnt = backend.getClientByUID(uid);
			if (Boolean(clnt)) {
				if ( clnt.getChannels()[0].id() == config.authchannel ) {
					clnt.moveTo(clanchannel);
				}
			}
		});
	});
}

function setPermission(wgid, uid) {
	// Request Clan member detail (asc clanid and role) using WG API
	let clanIDurl = wgAPIurl+'clans/accountinfo/?application_id='+config.WGapiID+'&account_id='+wgid+'&fields=clan%2C+role';
	http.simpleRequest({
		'method': 'GET',
		'url': clanIDurl,
		'timeout': 6000,
	}, function (error, response) {
		if (error) {
			engine.log("Error: " + error);
			return;
		}
		if (response.statusCode != 200) {
			engine.log("HTTP Error: " + response.status);
			return;
		}
		// success!
		let mydata = JSON.parse(response.data);
		if ( Boolean(mydata.data[wgid])) {
			let clan = mydata.data[wgid].clan;
			let role = mydata.data[wgid].role;
			// Search in database channel ID by clanID
			var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
				if (err) {
					engine.log(err);
				}
			});
			if (dbc) dbc.exec("UPDATE wgplayers SET clanid=(?) WHERE uid=(?) AND wgid=(?)", clan.clan_id, uid, wgid);
			if (dbc) dbc.query("SELECT channelid FROM wgchannels WHERE clanid ='"+clan.clan_id+"'", function(err, res) {
				if (!err) {
					let channel_id = undefined;
					if (res.length == 1) {
						channel_id = parseString(res[0].channelid);
					}
					// Create channel if not exist
					if ( !Boolean(channel_id) ) {
						// Replace placeholders and URLencode channel name and channel description
						let channel_name = encodeURIComponent(config.channelName.replace('&t',clan.tag).replace('&n',clan.name));
//						let channel_desc = encodeURIComponent("[img]"+clan.emblems.x64.wot+"[/img]");
						let channel_desc = encodeURIComponent(config.channelDesc.replace('&e',"[img]"+clan.emblems.x64.wot+"[/img]").replace('&t',clan.tag).replace('&n',clan.name));
						http.simpleRequest({
							'method': 'GET',
							'url': 'http://'+config.addrTS3+':10080/1/channelcreate?channel_name='+channel_name+'&channel_description='+channel_desc+'&cpid='+config.parentchannel,
							'timeout': 6000,
							'headers': {'x-api-key': config.apikeyWebQuery}
						}, function (error, response) {
							if (error) {
								engine.log("Error: " + error);
								return;
							}
							if (response.statusCode != 200) {
								engine.log("HTTP Error: " + response.status);
								return;
							}
							// success!
							channel_id = JSON.parse(response.data).body[0].cid;
							http.simpleRequest({
								'method': 'GET',
								'url': 'http://'+config.addrTS3+':10080/1/channeladdperm?cid='+channel_id+'&permsid=i_channel_needed_join_power&permvalue=55',
								'timeout': 6000,
								'headers': {'x-api-key': config.apikeyWebQuery}
							}, function (error, response) {
								if (error) {
									engine.log("Error: " + error);
									return;
								}
								if (response.statusCode != 200) {
									engine.log("HTTP Error: " + response.status);
									return;
								}
								// success! Store new clan channel in DB
								engine.log("Response: " + response.data.toString());
								setClanRank(uid, channel_id, role);
								if (dbc) dbc.exec("INSERT INTO wgchannels (channelid, clanid) VALUES (?, ?)", channel_id, clan.clan_id);
							});
						});
					} else {
						setClanRank(uid, channel_id, role);
					}
				}
			});
		}
	});
}

    event.on('clientMove', ({ client, fromChannel, toChannel }) => 
    {
		if ( toChannel == undefined ) {
			return;
		}
		// If client just connect to server
		if ( !Boolean(fromChannel) ){
			var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
				if (err) {
					engine.log(err);
				}
			});
			// Search player by uid
			if (dbc) dbc.query("SELECT wgid FROM wgplayers WHERE uid ='"+client.uid()+"'", function(err, res) {
				if (!err) {
					res.forEach( row => {
						let wgid = parseString(row.wgid);
						setPermission(wgid, client.uid());
						// Update access_token
						// ...
					});
				}
			});
			return;
		}
		// If client enter Auth channel
        if ( toChannel.id() == config.authchannel ) {
			// Generate auth link via send request
			let ruid = crypto.randomBytes(16).toHex();
			let initURL = wgAPIurl+'auth/login/?application_id='+config.WGapiID+'&nofollow=1&redirect_uri=https%3A%2F%2Fsinusbot.alexwolf.ru%2Fauth%2FWGanswer%3Fruid='+ruid;
			http.simpleRequest({
				'method': 'GET',
				'url': initURL,
			'timeout': 6000,
			}, function (error, response) {
				if (error) {
						engine.log("Error: " + error);
						return;
				}
				if (response.statusCode != 200) {
					engine.log("HTTP Error: " + response.status);
					return;
				}
				// success!
				// Store request in DB
				var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
					if (err) {
						engine.log(err);
					}
				});
				let mydata = JSON.parse(response.data);
				if (dbc) dbc.exec("INSERT INTO requests (ruid, uid, url) VALUES (?, ?, ?)", ruid, client.uid(), mydata.data.location);
				// Send link to client chat
//				client.poke("Link for authorization: https://ts3.alexwolf.ru/auth/?ruid="+ruid);
				client.poke("Ссылка для авторизации: https://ts3.alexwolf.ru/auth/?ruid="+ruid);
			});
			return;
		}
		// If client enter  clan channel 1412 -> clanid 29859
		if ( toChannel.id() == 1412) {
			let clanid = 29859;
			var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
				if (err) {
					engine.log(err);
				}
			});
			// Search player by uid
			//select p.access_token from wgchannels as c, wgplayers as p where c.channelid=1412 and c.clanid=p.clanid and p.uid=
			if (dbc) dbc.query("SELECT p.access_token AS token FROM wgchannels AS c, wgplayers as p WHERE c.channelid=1412 AND c.clanid=p.clanid AND p.uid='"+client.uid()+"'", function(err, res) {
				if (!err) {
					// Request online clan members from WG API
					let token = parseString(res[0].token);
					http.simpleRequest({
						'method': 'GET',
//						'url': "https://api.worldoftanks.ru/wot/clans/info/?application_id="+config.WGapiID+"&clan_id="+clanid+"&access_token="+token+"&extra=private.online_members&fields=private.online_members",
						'url': "https://api.worldoftanks.ru/wot/clans/info/?application_id="+config.WGapiID+"&clan_id="+clanid+"&access_token="+token+"&extra=private.online_members&fields=private.online_members%2C+members%2C+tag%2C+name%2C+emblems.x64&members_key=id",
					'timeout': 6000,
					}, function (error, response) {
						if (error) {
								engine.log("Error: " + error);
								return;
						}
						if (response.statusCode != 200) {
							engine.log("HTTP Error: " + response.status);
							return;
						}
						// success!
						let mydata = JSON.parse(response.data);
						let clan = mydata.data[clanid];
						engine.log(engine.getUsers());
/*						if (dbc) dbc.query("SELECT p.access_token AS token FROM wgchannels AS c, wgplayers as p WHERE c.channelid=1412 AND c.clanid=p.clanid AND p.uid='"+client.uid()+"'", function(err, res) {
							if (!err) {
							}
						});
*/						let channel_desc = config.channelDesc.replace('&e',"[img]"+clan.emblems.x64.wot+"[/img]").replace('&t',clan.tag).replace('&n',clan.name);
						channel_desc += "[center][size=12]Online("+clan.private.online_members.length+"):[/size][/center]";
						clan.private.online_members.forEach( id => {
							channel_desc += ("[center]"+clan.members[id].account_name+"[/center]");
						});
						toChannel.setDescription(channel_desc);
					});
				}
			});
			return;
		}
		return;
    });

    event.on('public:WGanswer', ev => {
	//	engine.log('Received public event from api!'+ev.queryParams().ruid);
		if (ev.queryParams().status == 'ok') {
			if( Boolean(ev.queryParams().ruid) && Boolean(ev.queryParams().account_id) && Boolean(ev.queryParams().nickname) && Boolean(ev.queryParams().access_token) && Boolean(ev.queryParams().expires_at) ) {
				var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
					if (err) {
						engine.log(err);
					}
				});
				// Delete old requests
				if (dbc) dbc.exec("DELETE FROM requests WHERE time < (now()- interval 1 hour)");
				// Search request by ruid
				if (dbc) dbc.query("SELECT uid FROM requests WHERE ruid ='"+ev.queryParams().ruid+"'", function(err, res) {
					if (!err) {
						if (res.length == 1) {
							let uid = parseString(res[0].uid);
							engine.log(uid);
							// Verify player name and wgid
							http.simpleRequest({
								'method': 'GET',
								'url': wgAPIurl+'account/info/?application_id='+config.WGapiID+'&account_id='+ev.queryParams().account_id+'&access_token='+ev.queryParams().access_token+'&fields=nickname%2C+clan_id%2C+private',
								'timeout': 6000,
							}, function (error, response) {
								if (error) {
									engine.log("Error: " + error);
									return;
								}
								if (response.statusCode != 200) {
									engine.log("HTTP Error: " + response.status);
										return;
								}
								// success!
								let mydata = JSON.parse(response.data);
								engine.log("Response: " + mydata.data[ev.queryParams().account_id].nickname);
								// Save (identity<->WGid) pair into DB
								if (dbc) dbc.exec("REPLACE INTO wgplayers (uid, wgid, nickname, access_token, expires_at) VALUES (?, ?, ?, ?, ?)", uid, ev.queryParams().account_id, ev.queryParams().nickname, ev.queryParams().access_token, ev.queryParams().expires_at);
								// Delete current ruid
								if (dbc) dbc.exec("DELETE FROM requests WHERE ruid = (?)", ev.queryParams().ruid);
								setPermission(ev.queryParams().account_id, uid);
							});
						} else {
							engine.log("Unique ruid not found in DB");
						}
					} else {
						engine.log(err);
					}
				});
//				return {result:'Auth ok. (Success) Just close this window and return to TeamSpeak'};
				return {result:'Auth ok. (Успешно) Можете просто закрыть это окно и вернуться в TeamSpeak'};
			}
		}
		return {result:'Auth fail'};
    });

    event.on('channelDelete', (channel, invoker) => {
		var dbc = db.connect({ driver: 'mysql', host: config.dbhost, username: config.dbuser, password: config.dbpassword, database: config.dbname }, function(err) {
			if (err) {
				engine.log(err);
			}
		});
		if (dbc) dbc.exec("DELETE FROM wgchannels WHERE channelid = (?)", channel.id());
	});
})

/* Wargaming public API authorization manager
Authomatically create clan channel for any clan member and give him one of three channel groups - Boss, Officer or just member
 */
/*global registerPlugin*/
registerPlugin({
    name: 'Wargaming OpenID auth',
    version: '1.01a',
    description: 'This plugin manage Wargaming OpenID auth.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    requiredModules: ['http', 'db', 'crypto'],
    vars: [{
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
            name: 'channeldata',
            title: 'Parameters for creating new clan channel',
        }, {
            name: 'channelName',
            indent: 2,
            title: 'Channel name format (placeholders: &t-clan TAG, &n-clan name)',
            type: 'string',
            'default': '[&t]&n'
        }, {
            name: 'channelDesc',
            indent: 2,
            title: 'Channel description format (placeholders: &t-clan TAG, &n-clan name, &e-64x64 emblem)',
            type: 'multiline',
            'default': '[center][size=x-large][COLOR=#ff0000][&t]&n[/COLOR][/size][/center][center]&e[/center]'
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
                }, {
                    name: 'optionValue',
                    title: 'Permission value',
                    type: 'string'
                }
            ]
        }, {
            name: 'hqChannelName',
            indent: 2,
            title: 'Channel name for HQ subchannel',
            type: 'string',
        }, {
            name: 'hqChannelOptions',
            indent: 2,
            title: 'HQ subchannel options',
            type: 'array',
            vars: [{
                    name: 'optionName',
                    title: 'Permission name (string like i_channel_needed_join_power)',
                    type: 'string'
                }, {
                    name: 'optionValue',
                    title: 'Permission value',
                    type: 'string'
                }
            ]
        }, {
            name: 'cluster',
            title: 'Config for every regional API',
            type: 'array',
            vars: [{
                    name: 'authchannel',
                    indent: 2,
                    title: 'Channel for WG auhorization',
                    type: 'channel'
                }, {
                    name: 'realm',
                    indent: 2,
                    title: 'Realm for the request',
                    type: 'select',
                    options: ['ru', 'eu', 'na', 'asia']
                }, {
                    name: 'gametype',
                    indent: 2,
                    title: 'API(game) type (not working yet)',
                    type: 'select',
                    options: ['WORLD OF TANKS', 'WORLD OF WARSHIPS']// also available: WORLD OF WARPLANES, WORLD OF TANKS BLITZ, WORLD OF TANKS CONSOLE
                }, {
                    name: 'WGapiID',
                    indent: 2,
                    title: 'Wargaming application ID',
                    placeholder: '12345678901234567890123456789012',
                    type: 'password'
                }
            ]
        }
    ]

},

    function (sinusbot, config) {
    const event = require('event');
    const http = require('http');
    const crypto = require('crypto');
    const backend = require('backend');
    const engine = require('engine');
    const db = require('db');
    const helpers = require('helpers');

    const wgAPIurl = [
        'https://api.tanki.su/wot/',
        'https://api.worldoftanks.eu/wot/',
        'https://api.worldoftanks.com/wot/',
        'https://api.worldoftanks.asia/wot/'
    ];

    var dbOptions = {
        driver: 'mysql',
        host: config.dbhost,
        username: config.dbuser,
        password: config.dbpassword,
        database: config.dbname,
    }

    function parseString(numberBuffer) {
        if (!Array.isArray(numberBuffer))
            return "";
        const bytewriter = helpers.newBytes();
        numberBuffer.forEach(num => bytewriter.append(helpers.bytesFromHex(num.toString(16))));
        return bytewriter.toString();
    }

    function setClanRank(uid, clanchannel, role) {
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
            'url': 'http://' + config.addrTS3 + ':10080/1/clientdbfind?pattern=' + encodeURIComponent(uid) + '&-uid',
            'timeout': 6000,
            'headers': {
                'x-api-key': config.apikeyWebQuery
            }
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
                'url': 'http://' + config.addrTS3 + ':10080/1/setclientchannelgroup?cgid=' + group + '&cid=' + clanchannel + '&cldbid=' + mydata.body[0].cldbid,
                'timeout': 6000,
                'headers': {
                    'x-api-key': config.apikeyWebQuery
                }
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
                    if (clnt.getChannels()[0].id() == config.authchannel) {
                        clnt.moveTo(clanchannel);
                    }
                }
            });
        });
    }

    function createClanChannel() {
        
    }

    function searchClanChannel(wgid, uid, realm) {
        // Request Clan member detail (retrieve clanid and role) using WG API
        let clanIDurl = wgAPIurl[realm] + 'clans/accountinfo/?application_id=' + config.cluster[realm].WGapiID + '&account_id=' + wgid + '&fields=clan%2C+role%2C+account_name';
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
            if (mydata.status == "error") {
                engine.log(mydata.error);
                return;
            }
            if (Boolean(mydata.data[wgid])) {
                let name = mydata.data[wgid].account_name;
                let clan = mydata.data[wgid].clan;
                let role = mydata.data[wgid].role;
                //engine.log(clan);

                // Search in database channel ID by clanID
                var dbc = db.connect(dbOptions, (err) => {
                    if (err) {
                        engine.log(err);
                        return;
                    }
                });
                if (dbc)
                    dbc.exec("UPDATE wgplayers SET nickname=(?), clanid=(?) WHERE uid=(?) AND wgid=(?)", name, clan.clan_id, uid, wgid);
                if (dbc)
                    dbc.query("SELECT channelid FROM wgchannels WHERE clanid =" + clan.clan_id, function (err, res) {
                        if (!err) {
                            let channel_id = undefined;
                            if (res.length == 1) {
                                channel_id = parseString(res[0].channelid);
                            }
                            // Create channel if not exist using SinusBot methods
                            if (!Boolean(channel_id)) {
                                // Replace placeholders and URLencode channel name and channel description
                                let channel_name = encodeURIComponent(config.channelName.replace('&t', clan.tag).replace('&n', clan.name));
                                let channel_desc = encodeURIComponent(config.channelDesc.replace('&e', "[img]" + clan.emblems.x64.wot + "[/img]").replace('&t', clan.tag).replace('&n', clan.name));
                                let chParams = {
                                    name: channel_name,
                                    description: channel_desc,
                                    parent: config.parentchannel,
                                    permanent: false,
                                    deleteDelay: 256000,
                                };
                                let ch = backend.createChannel(chParams);
                                channel_id = ch.id();
                                setClanRank(uid, channel_id, role);
                            }
/*
                            // Create channel if not exist using TS WebQuery
                            if (!Boolean(channel_id)) {
                                // Replace placeholders and URLencode channel name and channel description
                                let channel_name = encodeURIComponent(config.channelName.replace('&t', clan.tag).replace('&n', clan.name));
                                let channel_desc = encodeURIComponent(config.channelDesc.replace('&e', "[img]" + clan.emblems.x64.wot + "[/img]").replace('&t', clan.tag).replace('&n', clan.name));
                                http.simpleRequest({
                                    'method': 'GET',
                                    'url': 'http://' + config.addrTS3 + ':10080/1/channelcreate?channel_name=' + channel_name + '&channel_description=' + channel_desc + '&cpid=' + config.parentchannel,
                                    'timeout': 6000,
                                    'headers': {
                                        'x-api-key': config.apikeyWebQuery
                                    }
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
                                    setClanRank(uid, channel_id, role);
                                    // Set additional channel permissions using TS WebQuery
                                    config.channelOptions.forEach(opt => {
                                        http.simpleRequest({
                                            'method': 'GET',
                                            'url': 'http://' + config.addrTS3 + ':10080/1/channeladdperm?cid=' + channel_id + '&permsid=' + opt.optionName + '&permvalue=' + opt.optionValue,
                                            'timeout': 6000,
                                            'headers': {
                                                'x-api-key': config.apikeyWebQuery
                                            }
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
                                        });
                                    });
                                    // Create HQ subchannel
                                    let channel_name = encodeURIComponent(config.hqChannelName);
                                    http.simpleRequest({
                                        'method': 'GET',
                                        'url': 'http://' + config.addrTS3 + ':10080/1/channelcreate?channel_name=' + channel_name + '&cpid=' + channel_id,
                                        'timeout': 6000,
                                        'headers': {
                                            'x-api-key': config.apikeyWebQuery
                                        }
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
                                        let hq_id = JSON.parse(response.data).body[0].cid;
                                        //  Store new clan channel in DB
                                        if (dbc)
                                            dbc.exec("INSERT INTO wgchannels (clanid, channelid, hq) VALUES (?, ?, ?)", clan.clan_id, channel_id, hq_id);
                                        setClanRank(uid, channel_id, role);
                                        // Set additional channel permissions using TS WebQuery
                                        config.hqChannelOptions.forEach(opt => {
                                            http.simpleRequest({
                                                'method': 'GET',
                                                'url': 'http://' + config.addrTS3 + ':10080/1/channeladdperm?cid=' + hq_id + '&permsid=' + opt.optionName + '&permvalue=' + opt.optionValue,
                                                'timeout': 6000,
                                                'headers': {
                                                    'x-api-key': config.apikeyWebQuery
                                                }
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
                                            });
                                        });
                                    });
                                });
                            } else {
                                setClanRank(uid, channel_id, role);
                            }
*/
                        }
                    });
            }
        });
    }

    function checkWGanswer(ev) {
        //    engine.log('Received public event from api!'+ev.queryParams().ruid);
        if (ev.queryParams().status == 'ok') {
            if (Boolean(ev.queryParams().ruid) && Boolean(ev.queryParams().account_id) && Boolean(ev.queryParams().nickname) && Boolean(ev.queryParams().access_token) && Boolean(ev.queryParams().expires_at)) {
                var dbc = db.connect(dbOptions, (err) => {
                    if (err) {
                        engine.log(err);
                        return;
                    }
                });
                // Delete old requests
                if (dbc)
                    dbc.exec("DELETE FROM requests WHERE time < (now()- interval 1 hour)");
                // Search request by ruid
                if (dbc)
                    dbc.query("SELECT uid, tsname, realm FROM requests WHERE ruid ='" + ev.queryParams().ruid + "'", function (err, res) {
                        if (err) {
                            engine.log(err);
                            return;
                        }
                        if (res.length == 1) {
                            let uid = parseString(res[0].uid);
                            let tsname = parseString(res[0].tsname);
                            let realm = parseString(res[0].realm);
                            let WGapiID = config.cluster[realm].WGapiID;
                            // Verify player name and wgid
                            http.simpleRequest({
                                'method': 'GET',
                                'url': wgAPIurl[realm] + 'account/info/?application_id=' + WGapiID + '&account_id=' + ev.queryParams().account_id + '&access_token=' + ev.queryParams().access_token + '&fields=nickname%2C+clan_id%2C+private',
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
                                if (mydata.status == "error") {
                                    engine.log(mydata.error);
                                    return;
                                }
                                engine.log("Response: " + mydata.data[ev.queryParams().account_id].nickname);
                                // Save (identity<->WGid) pair into DB
                                if (dbc) {
//                                    let WGid = ev.queryParams().account_id;
                                    let WGid = 60719;
                                    dbc.exec("REPLACE INTO wgplayers (uid, tsname, wgid, realm, nickname, access_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)", uid, tsname, WGid, realm, ev.queryParams().nickname, ev.queryParams().access_token, ev.queryParams().expires_at);
                                }
                                // Delete current ruid
                                if (dbc)
                                    dbc.exec("DELETE FROM requests WHERE ruid = (?)", ev.queryParams().ruid);
                                searchClanChannel(ev.queryParams().account_id, uid, realm);
                            });
                        } else {
                            engine.log("Unique ruid not found in DB");
                            return;
                        }
                    });
                //                return {result:'Auth ok. (Success) Just close this window and return to TeamSpeak'};
                return {
                    result: 'Auth ok. (Успешно) Можете просто закрыть это окно и вернуться в TeamSpeak'
                };
            }
        } else {
            return {
                result: 'Auth fail(' + ev.queryParams().message + ')'
            };
        }
    }

    function generateAuthLink(client, clusterConfig) {
        var dbc = db.connect(dbOptions, (err) => {
            if (err) {
                engine.log(err);
                return;
            }
        });
        // Generate auth link via send request
        let ruid = crypto.randomBytes(16).toHex();
        let initURL = wgAPIurl[clusterConfig.realm] + 'auth/login/?application_id=' + clusterConfig.WGapiID + '&nofollow=1&redirect_uri=https%3A%2F%2Fsinusbot.alexwolf.ru%2Fauth%2FWGanswer%3Fruid=' + ruid;
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
            let mydata = JSON.parse(response.data);
            if (mydata.status == "error") {
                engine.log(mydata.error);
                return;
            }
            if (dbc)
                dbc.exec("INSERT INTO requests (ruid, uid, tsname, realm, url) VALUES (?, ?, ?, ?, ?)",
                    ruid, client.uid(), client.name(), clusterConfig.realm, mydata.data.location);
            // Send link to client chat
            client.poke("Ссылка для авторизации: https://ts3.alexwolf.ru/auth/?ruid=" + ruid);
        });
        return;
    }

    function removeChannelFromDB(channel, invoker) {
        var dbc = db.connect(dbOptions, (err) => {
            if (err) {
                engine.log(err);
                return;
            }
        });
        if (dbc)
            dbc.exec("DELETE FROM wgchannels WHERE channelid = (?)", channel.id());
    }

    event.on('clientMove', ({
            client,
            fromChannel,
            toChannel
        }) => {
        if (toChannel == undefined) {
            return;
        }
        // If client enter Auth channel
        for (var i = 0; i < config.cluster.length; i++) {
            if (toChannel.id() == config.cluster[i].authchannel)
                generateAuthLink(client, config.cluster[i]);
        }
    });
    event.on('public:WGanswer', checkWGanswer);
    event.on('channelDelete', removeChannelFromDB);
})

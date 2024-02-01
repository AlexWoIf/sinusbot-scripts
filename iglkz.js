registerPlugin({
    name: 'IGL.KZ teleport',
    version: '1.0a',
    description: 'This plugin provide some matchmaking functions to Counterstrike2.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    vars: [{
            name: 'entryChannel',
            title: 'Teleport channel',
            indent: 0,
            type: 'channel'
        }, {
            name: 'authSiteURL',
            title: 'Site API url',
            indent: 0,
            type: 'string',
            placeholder: 'http://sitename.com/teamspeak/'
        }, {
            name: 'endpoint',
            title: 'API endpoint name',
            indent: 0,
            type: 'string',
        }, {
            name: 'passAPI',
            title: 'Password for incoming API requests',
            indent: 0,
            type: 'password',
        }, {
            name: 'rootChannel',
            title: 'Parent (root) channel for created rooms',
            indent: 0,
            type: 'channel',
        }, {
            name: 'channelOptions',
            indent: 2,
            title: 'Channel options for gaming rooms',
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
        },
    ]
},

    function (sinusbot, config) {
    const backend = require('backend');
    const event = require('event');

    //const http = require('http');
    const crypto = require('crypto');
    const engine = require('engine');

    event.on('clientMove', function (ev) {
        if (ev.client.isSelf()) {
            return;
        }
        if (ev.toChannel !== undefined) {
            if (ev.toChannel.id() == config.entryChannel) {
                //ev.client.poke("Ссылка для авторизации: "+config.authSiteURL+crypto.randomBytes(8).toHex());
                ev.client.poke("Ссылка для авторизации: " + encodeURI(config.authSiteURL+'?teamspeakID='+ev.client.uid()));
            }
        }
    });
    
    event.on('public:'+config.endpoint, ev => {
        params = ev.queryParams()
        engine.log(params);
/*        params.forEach( (name, value) => {
            engine.log( name, value);
        });
*/        if (params.password == config.passAPI) {
            engine.log('Pass OK');
        } else {
            engine.log('Pass BAD');
            return;
        }

        let channels = [];
        channelNames = decodeURI(params.channelNames).split(',').forEach( (channelName, n) => {
            
            while (backend.getChannelByName(channelName)) {
                channelName += '!';
            }
            let chParams = {
                name: channelName,
                //description: channel_desc,
                permanent: true,
                parent: config.rootChannel,
                codecQuality: 6,
            };
            engine.log(chParams);
            ch = backend.createChannel(chParams);
            if (ch == undefined) {
                engine.log('Channel not created!');
                return;
            }
            channel_id = ch.id();
            if (config.channelOptions) {
                config.channelOptions.forEach(opt => {
                    //engine.log(opt.optionName, opt.optionValue);
                    let perm = ch.addPermission(opt.optionName);
                    perm.setValue(opt.optionValue);
                    perm.save();
                });
            }
            ch.update({
                permanent: false,
                deleteDelay: 7200,
            });
            channels[n] = channel_id;
        });
    });
})

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
        },
    ]
},

    function (sinusbot, config) {
    var backend = require('backend');
    var event = require('event');

    const http = require('http');
    const crypto = require('crypto');
    const engine = require('engine');

    event.on('clientMove', function (ev) {
        if (ev.client.isSelf()) {
            return;
        }
        if (ev.toChannel !== undefined) {
            if (ev.toChannel.id() == config.entryChannel) {
                ev.client.poke("Ссылка для авторизации: "+config.authSiteURL+crypto.randomBytes(8).toHex());
            }
        }
    });
    
    event.on('public:'+config.endpoint, ev => {
        params = ev.queryParams()
        if (params.password == config.passAPI) {
            engine.log('Pass OK');
        } else {
            engine.log('Pass BAD');
            return;
        }
        channelName = params.channelName;
        let chParams = {
            name: channelName,
            //description: channel_desc,
            parent: config.rootChannel,
            permanent: true,
        };
        engine.log(chParams);
        ch = backend.createChannel(chParams);
        if (ch == undefined) {
            engine.log('Channel not created!');
            return;
        }
    });
})

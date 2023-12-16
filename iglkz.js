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
        var userChannel = ev.toChannel;
        if (userchannel) {
            if (userChannel.id() == config.entryChannel) {
                ev.client.poke("Ссылка для авторизации: "+config.authSiteURL+crypto.randomBytes(8).toString('hex'));
            }
        }
    });
})

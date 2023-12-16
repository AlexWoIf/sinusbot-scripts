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
    var event = require('event');
    var backend = require('backend');
    const engine = require('engine');

    engine.log(config);
    event.on('clientMove', function (ev) {
        if (ev.client.isSelf()) {
            return;
        }
        var userChannel = ev.toChannel;
        if (userChannel == config.entryChannel) {
            ev.client.poke("Ссылка для авторизации: "+config.authSiteURL);
        }
    });
})

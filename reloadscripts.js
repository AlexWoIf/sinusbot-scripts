registerPlugin({
    name: 'Scripts reloader',
    version: '1.0a',
    description: 'This plugin reload all script by webhook.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    vars: [{
            name: 'eventName',
            indent: 0,
            title: 'Name of event for reloading scripts',
            type: 'string',
        }
    ]
},

    function (sinusbot, config) {
    const event = require('event');
    const backend = require('backend');
//    const engine = require('engine');

    event.on('public:' + config.eventName, function() {
        engine.reloadScripts();
    });
})

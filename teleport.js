registerPlugin({
    name: 'Teleport (automove)',
    version: '1.0',
    description: 'This plugin teleport clients frome entry channels to another defined channels.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    vars: [{
    name: 'routes',
    title: 'Moving rules',
    type: 'array',
    vars: [{
    	name: 'name',
	title: 'Rule\'s name or comment',
	indent: 0,
	type: 'string'
	}, {
    	name: 'entrychannel',
	title: 'Entry channel ID',
	indent: 2,
	type: 'channel'
	}, {
	name: 'targetchannel',
	title: 'Target Channel ID',
	indent: 2,
	type: 'channel'
        }]
    }]
}, 

function (sinusbot, config) {
    
    var event = require('event');
    var backend = require('backend');
    const engine = require('engine');
    
    event.on('clientMove', function (ev) {
    if (ev.client.isSelf()) {
	    engine.log('Hello from a script!');
        return;
    }
    var botchannel = backend.getCurrentChannel();
    var userchannel = ev.toChannel;
    if ( userchannel != undefined ) {
        for (let i = 0; typeof config.routes[i] != 'undefined'; i++)
        {
    	if ( userchannel.id() == config.routes[i].entrychannel ) {
		ev.client.moveTo( config.routes[i].targetchannel );
		return;
	    }
        }
    }
    });
});
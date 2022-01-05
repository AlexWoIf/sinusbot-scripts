/*
Telegram notification

Small script wich notify you via telegram when some user entered certain channel.
*/
registerPlugin({
    name: 'Telegram notification',
    version: '1.0',
    description: 'This plugin notify me via telegram when somebody enter certain channel.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    requiredModules: ["http"],

    vars: [{
		name: 'rooms',
		title: 'Seeking channels',
		type: 'array',
		vars: [{
			name: 'entrychannel',
			title: 'Channel ID',
			indent: 0,
			type: 'channel'
			}]
		},{
			name: 'userIgnoreServerGroupId',
			indent: 0,
			title: 'Ignore servergroup ID',
			type: 'strings'
		},{
			name: 'apiTelegramToken',
			indent: 0,
			title: 'Telegram Bot token',
			placeholder: '987654321',
			type: 'password'
		}, {
			name: 'telegramChatID',
			indent: 0,
			title: 'Telegram ChatId',
			placeholder: '123456789',
			type: 'string',
        }, {
            name: 'incomingUserMessage',
            indent: 0,
            title: 'Message sent to the user when he joins the support channel',
            placeholder: 'Hello &u, please wait. Admin has been informed [Variable &u = Username]',
            type: 'string'
		},{
			name: 'telegrammTextMessage',
			indent: 0,
			title: 'Telegram message [Variables: &u = username, &c = channel]',
			placeholder: 'Hello admin,\n\n User &u joined the channel &c.',
			type: 'multiline',
        }]
}, 

function (sinusbot, config) {
    
    var event = require('event');
    var backend = require('backend');
    const engine = require('engine');
    
    event.on('clientMove', function (ev) {
		if (ev.client.isSelf()) {
//		    engine.log('Hello from a script!');
			return;
		}
		var botchannel = backend.getCurrentChannel();
		if ( ev.toChannel != undefined ) {
			var userchannel = ev.toChannel;
			for (let i = 0; typeof config.rooms[i] != 'undefined'; i++)
			{
				if ( userchannel.id() == config.rooms[i].entrychannel ) {
					var clientServerGroups = ev.client.getServerGroups();
					for (let el of clientServerGroups) {
						if ( config.userIgnoreServerGroupId.indexOf(el.id()) !== -1 ) {
							return;
						}
					}
					http.simpleRequest({
						url: "https://api.telegram.org/bot" + encodeURIComponent(config.spTelegramToken) + "/sendMessage?chat_id=" + encodeURIComponent(config.spTelegramID) + "&text=" + encodeURIComponent(text),
						timeout: 60000,
					});
					engine.log('TelegramNotification send...')
					ev.client.poke( config.incomingUserMessage.replace("&u", ev.client.name()) );
					return;
				}
			}
		}
    });
});
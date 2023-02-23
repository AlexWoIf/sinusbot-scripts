/*
Telegram notification

Small script wich notify you via telegram when some user entered certain channel.
 */
registerPlugin({
    name: 'Telegram notification',
    version: '1.1',
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
                }
            ]
        }, {
            name: 'userIgnoreServerGroupId',
            indent: 0,
            title: 'Ignore servergroup ID',
            type: 'strings'
        }, {
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
            name: 'notificationType',
            title: 'Incoming user notification method',
            type: 'select',
            options: ['Private message', 'Poke', 'Not notify']
        }, {
            name: 'incomingUserPrivateMessage',
            indent: 2,
            title: 'Message sent to the user when he joins the support channel',
            placeholder: 'Hello &u, please wait. Admin has been informed [Variable &u = Username]',
            type: 'string',
            conditions: [{
                    field: 'notificationType',
                    value: 0,
                }
            ]
        }, {
            name: 'incomingUserPokeMessage',
            indent: 2,
            title: 'Message sent to the user when he joins the support channel',
            placeholder: 'Hello &u, please wait. Admin has been informed [Variable &u = Username]',
            type: 'string',
            conditions: [{
                    field: 'notificationType',
                    value: 1,
                }
            ]
        }, {
            name: 'telegrammTextMessage',
            indent: 0,
            title: 'Telegram message [Variables: &u = username, &c = channel]',
            placeholder: 'Hello admin,\n\n User &u joined the channel &c.',
            type: 'multiline',
        }
    ]
},

    function (sinusbot, config) {

    const event = require('event');
    const backend = require('backend');
    const engine = require('engine');
    const http = require('http');

    event.on('clientMove', function (ev) {
        if (ev.client.isSelf()) {
            //		    engine.log('Hello from a script!');
            return;
        }
        var botchannel = backend.getCurrentChannel();
        if (ev.toChannel != undefined) {
            var userchannel = ev.toChannel;
            for (let i = 0; typeof config.rooms[i] != 'undefined'; i++) {
                if (userchannel.id() == config.rooms[i].entrychannel) {
                    var clientServerGroups = ev.client.getServerGroups();
                    for (let el of clientServerGroups) {
                        if (config.userIgnoreServerGroupId.indexOf(el.id()) !== -1) {
                            return;
                        }
                    }
                    var tgURL = "https://api.telegram.org/bot" +
                        encodeURIComponent(config.apiTelegramToken) +
                        "/sendMessage?chat_id=" +
                        encodeURIComponent(config.telegramChatID) + "&text=" +
                        encodeURIComponent(config.telegrammTextMessage.replace("&u", ev.client.name()).replace("&c", userchannel.name()));
                    //					engine.log(tgURL);
                    http.simpleRequest({
                        url: tgURL,
                        timeout: 60000,
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
                        engine.log('TelegramNotification send...');
                        switch (config.notificationType) {
                            case "0":
                                ev.client.poke(config.incomingUserPokeMessage.replace("&u", ev.client.name()));
                                break;
                            case "1":
                                ev.client.chat(config.incomingUserPokeMessage.replace("&u", ev.client.name()));
                                break;
                            default:
                                engine.log(config.notificationType);
                        }
                        return;
                    });
                }
            }
        }
    });
});

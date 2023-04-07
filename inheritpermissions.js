/*
Inherit parent permissions

Copy set of certain permissions from the parent channel to the new created subchannel
 */
registerPlugin({
    name: 'Inherit parent channel permissions',
    version: '1.0',
    description: 'This plugin copy certain permissions from parent channel to created subchannel.',
    author: 'AlexWolf <alexwolf@inbox.ru>',
    vars: [{
            name: 'perms',
            title: 'Inherited permissions',
            type: 'array',
            vars: [{
                    name: 'name',
                    title: 'Name of permission',
                    type: 'string'
                }
            ]
        }
    ]
},

    function (sinusbot, config) {

    var event = require('event');
    var backend = require('backend');
    const engine = require('engine');

    event.on('channelCreate', function (ch, cl) {
        if (cl == undefined) {
            engine.log('Undefined creator of channel', ch.name());
            return;
        }
        if (cl.isSelf()) {
            // engine.log('Hello from a script!');
            return;
        }
        let parent = ch.parent();
        if (parent != null) {
            let parentPerms = {};
            parent.getPermissions().forEach(perm => {
//                engine.log(Object.keys(perm));
                parentPerms[perm.name()] = perm.value();
            });
//            engine.log(parentPerms);
            config.perms.forEach((perm) => {
                if (perm.name in parentPerms) {
                    let newperm = ch.addPermission(perm.name);
                    newperm.setValue(parentPerms[perm.name]);
                    newperm.save();
                }
            });
        }
    });
});

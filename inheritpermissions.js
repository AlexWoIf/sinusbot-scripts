/*
Inherit parent permissions

Copy set of certain permissions from the parent channel to the new created subchannel
 */
registerPlugin({
    name: 'Inherit parent permissions',
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
        if (cl.isSelf()) {
            // engine.log('Hello from a script!');
            return;
        }
        let parent = ch.parent();
        if (parent != null) {
            let parentPerms = {};
            parent.getPermissions().forEach(perm => {
                engine.log(perm.ChannelPermission.Name,perm.ChannelPermission.Value);
                parentPerms[perm.Name] = perm.Value;
            });
            engine.log(parentPerms);
            config.perms.forEach((perm) => {
                if (perm in parentPerms) {
                    let newperm = ch.addPermission(perm);
                    newperm.setValue(parentPerms[perm]);
                    newperm.save();
                }
                engine.log(perm);
            });
        }
    });
});

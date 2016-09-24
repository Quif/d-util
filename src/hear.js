const EventEmitter = require('events').EventEmitter;

class Hearing extends EventEmitter {
    constructor(bot){
        super();
        this.bot = bot;
        this.connections = {};
        this.hearing = {};
    }
    
    listing(voiceChannel){
        var $this = this;
        return new Promise(function(resolve, reject){
            if(!voiceChannel) return reject('missing parameters');
            voiceChannel.join().then(function(connections){
                var recever = connections.createReceiver();
                recever.on('opus', function(user, buffer){
                    var readable = recever.createOpusStream(user);
                    $this.emit('readbleStream', readable);
                });
            })
        })
    }
}

module.exports = Hearing;
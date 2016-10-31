const EventEmitter = require("events").EventEmitter;
const Youtube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const moment = require("moment");
var youtube;
var optsTemplate;

function timestamps(time, other){
    var time = time/1000;
    var timestamp = moment.unix(time);
    if(!other || other.split(":").length == 2){
        return timestamp.format("mm:ss");
    }else{
        return timestamp.format("HH:mm:ss");
    }
}

class MusicClient extends EventEmitter {
    constructor(key, skipRequired, timeNewSong, autoLeave) {
        super();
        if(!key) throw new Error("Missing youtube api key");
        youtube = new Youtube(key);
        optsTemplate = {
            "part": 'snippet',
            "maxResults": 10,
            "key": key
        };
        this.options = {
            "skipRequired": skipRequired || "auto",
            "timeNewSong": timeNewSong || 2000,
            "autoLeave": autoLeave
        };
        this.queues = [];
        this.skips = [];
        this.dispatchers = [];
    }
    
    getTime(time, other){
        if(!time) throw new Error('no time to convert');
        var time = time/1000;
        var timestamp = moment.unix(time);
        if(!other || other.split(":").length == 2){
            return timestamp.format("mm:ss");
        }else{
            return timestamp.format("HH:mm:ss");
        }
    }
    
    getQueue(guild){
        if(!guild) throw new Error("Missing the guild object or guild id argument");
        if(typeof guild == "object") guild = guild.id;
        let found;
        this.queues.forEach(obj => {
            if(obj.Guild_id == guild) return found = obj.queue;
        });
        if(!found) return [];
        else return found;
    }
    
    connect(channel){
        return new Promise((resolve, reject) => {
            if(!channel || !typeof channel == "object") return reject("Missing channel object in arguments");
            channel.join().then(connection => {
                return resolve(connection);
            }).catch(err => {
                return reject(err);
            });
        });
    }
    
    leave(channel){
        if(!channel || !typeof channel == "object") throw new Error("Missing channel object in arguments");
        return channel.leave();
    }
}
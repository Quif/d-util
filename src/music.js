const EventEmitter = require("events").EventEmitter;
const Youtube = require("simple-youtube-api");
const ytdl = require("ytdl-core");
const search = require('youtube-search');
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
        this.timesOut = [];
    }
    
    addDispatcher(guild, dispacther){
        if(!dispacther || !guild) throw new Error("missing arguments");
        this.dispatchers.push({
             "Guild_id": guild,
             "dispacther": dispacther
        });
    }
    
    delDispatcher(guild){
        if(!guild) throw new Error("missing arguments");
        if(typeof guild == "object") guild = guild.id;
        let test = this.getDisaptcher(guild);
        this.dispatchers.splice(this.dispatchers.indexOf(test));
    }
    
    updateDispatcher(guild, dispacther){
        if(!guild || !dispacther) throw new Error("missing arguments");
        if(typeof guild == "object") guild = guild.id;
        this.dispatchers[this.dispatchers.indexOf(this.getDisaptcher(guild))].dispacther = dispacther;
    }
    
    findDispatcher(guild){
        if(!guild) throw new Error("missing arguments");
        if(typeof guild == "object") guild = guild.id;
        let test = this.getDisaptcher(guild);
        if(test) return true;
        else return false;
    }
    
    getDisaptcher(guild){
        if(!guild) throw new Error("missing arguments");
        if(typeof guild == "object") guild = guild.id;
        let found;
        this.dispatchers.forEach(obj => {
            if(obj.Guild_id == guild) return found = obj;
        });
        return found;
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
    
    addQueue(guild){
        if(!guild) throw new Error("Missing the guild object or guild id argument");
        if(typeof guild == "object") guild = guild.id;
        if(!this.getQueue(guild)){
            this.queues.push({
                "Guild_id": guild,
                "queue": []
            });
        }
    }
    
    delQueue(guild){
        if(!guild) throw new Error("Missing the guild object or guild id argument");
        if(typeof guild == "object") guild = guild.id;
        let test = this.getQueue(guild);
        if(test){
            this.queues.splice(this.queues.indexOf(test));
        }
    }
    
    getQueue(guild){
        if(!guild) throw new Error("Missing the guild object or guild id argument");
        if(typeof guild == "object") guild = guild.id;
        let found;
        this.queues.forEach(obj => {
            if(obj.Guild_id == guild) return found = obj.queue;
        });
        return found;
    }
    
    connect(channel){
        let $this = this;
        return new Promise((resolve, reject) => {
            if(!channel || !typeof channel == "object") return reject("Missing channel object in arguments");
            channel.join().then(connection => {
                if(!$this.getQueue(channel.guild.id)){
                    $this.addQueue(channel.guild.id);
                    return resolve(connection);
                }
            }).catch(err => {
                return reject(err);
            });
        });
    }
    
    leave(channel){
        if(!channel || !typeof channel == "object") throw new Error("Missing channel object in arguments");
        if(this.getQueue(channel.guild.id)){
            this.delQueue(channel.guild.id);
        }
        return channel.leave();
   }
   
   addSong(queue, user, song){
       let $this = this;
       return new Promise((resolve, reject) => {
           search(song, optsTemplate, function(err, results){
                if(!queue || !user || !song) return reject("Missing arguments");
                if(err) return reject(err);
                song = (song.includes("https://" || "http://")) ? song : results[0].link;
                let stream = ytdl(song, {audioonly: true});
                youtube.getVideo(song).then(logs => {
                    var duration = "";
                    for(let x of Object.keys(logs.duration)){
                        duration += logs.duration[x];
                        if(x != "secondes") duration += ";";
                    }
                    queue.push({
                        "name": results[0].title,
                        "duration": duration,
                        "requested": user.username,
                        "toplay": stream,
                        "description": results[0].description
                    });
                    return resolve(queue);
                }).catch(reject);
           });
       });
   }
   
   delSong(queue, index){
       let $this = this;
       return new Promise((resolve, reject) => {
            if(!queue || !index) return reject("Missing arguments");
            if(queue.length < index) return reject("Invalide index");
            let last = queue[index];
            queue.splice(index);
            return resolve(last);
       });
   }
   
   getTimeout(guild){
       if(!guild) throw new Error("Missing arguments");
       if(typeof guild == "object") guild = guild.id;
       let found;
       this.timesOut.forEach(obj => {
            if(obj.Guild_id == guild) return found = obj;
       });
       return found;
   }
   
   play(msg, queue, song){
       let $this = this;
       return new Promise((resolve, reject) => {
            if(!msg, !queue) return reject("Missing two inportant arguments (msg and queue)");
            let timeOut = $this.getTimeout(msg.guild.id);
            if(timeOut){
                clearTimeout(timeOut.time);
                this.timesOut.splice(this.timesOut.indexOf(timeOut));
            }
            if(song){
                this.addSong(queue, msg.author, song).then(queue => {
                    if(queue.length == 1){
                        resolve(queue[(queue.length - 1)]);
                        setTimeout(() => {
                            $this.play(msg, queue);
                        }, $this.options.timeNewSong);
                    }else{
                        resolve(queue[(queue.length - 1)]);
                    }
                }).catch(reject);
            }else if(queue.length != 0){
                let connection = msg.client.voiceConnections.get(msg.guild.id);
                if(!connection) return reject("Not connected to a voice channel");
                let dispatcher = connection.playStream(queue[0].toplay);
                dispatcher.on("end", () => {
                    setTimeout(() => {
                        queue.shift();
                        //skips here
                        //skips end
                        $this.play(msg, queue);
                    }, $this.options.timeNewSong);
                });
                if(!$this.findDispatcher(msg.guild.id)) $this.addDispatcher(msg.guild.id, dispatcher);
                else $this.updateDispatcher(msg.guild.id, dispatcher);
            }else{
                if($this.options.autoLeave){
                    let time = setTimeout(() => {
                        let channel = msg.client.voiceConnections.get(msg.guild.id);
                        if(channel){
                            channel.channel.leave();
                        }
                    }, $this.options.autoLeave);
                    $this.timesOut.push({
                        "Guild_id": msg.guild.id,
                        "time": time
                    });
                }
            }
       });
   }
   
   np(guild){
       if(!guild) throw new Error("Missing arguments");
       if(typeof guild == "object") guild = guild.id;
       if(!this.findDispatcher(guild)) throw new Error("Dispacther not found");
       let dispatcher = this.getDisaptcher(guild).dispacther;
       let time  = dispatcher.time;
       let queue = this.getQueue(guild)[0];
       queue.timeOfPlaying = time;
       return queue;
   }
   
}
module.exports = MusicClient;
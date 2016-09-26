const EventEmitter = require('events').EventEmitter;
var ytdl = require('ytdl-core');
var fs = require("fs");
var search = require('youtube-search');
var moment = require("moment");
const YouTube = require('simple-youtube-api');
var youtube;

var opts;

function timestamps(time, other){
    var time = time/1000;
    var timestamp = moment.unix(time);
    if(!other || other.split(":").length == 2){
        return timestamp.format("mm:ss");
    }else{
        return timestamp.format("HH:mm:ss");
    }
}

class Musics extends EventEmitter {
    constructor(bot, options){
        super();
        if(!bot) throw "missing bot";
        this.bot = bot;
        this.options = options;
        if(!options.key) throw new Error('didn\'t have the youtube api key passed in options');
        youtube = new YouTube(options.key);
        opts = {
            part: 'snippet',
          maxResults: 10,
          key: options.key
        };
        this.options.skipRequired = options.skipRequired || 5;
        this.options.timeNewSong = options.timeNewSong || 4000;
        this.queues = {};
        this.timesOut = {};
        this.dispatchers = {};
        this.skips = {};
        this.skipAutori = {};
    }
    //verified (convert the time) :<>:
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
    
    //verified (get the guild queue) :<>:
    getQueue(guild){
        if(!guild) throw new Error("Missing guild id or guild object");
        if(typeof guild == "object") guild = guild.id;
        if(!this.queues[guild]) this.queues[guild] = [];
        return this.queues[guild];
    }
    //verified (get the volume of a guild dispacher) :<>:
    getVolume(guild){
        if(!guild) throw new Error("Missing guild id or guild object");
        if(typeof guild == 'object') guild = guild.id;
        if(!this.dispatchers[guild]){
            throw new Error('dispatcher is undefined');
        }
        return this.dispatchers[guild].volume * 50;
    }
    //verified (connect to a channel) :<>:
    connect(channel){
        var $this = this;
        return new Promise(function(resolve, reject){
            if(!channel || typeof channel != "object") return reject("Missing channel object");
            channel.join().then(function(connection){
                return resolve(connection);
            }).catch(function(err){
                return reject(err);
            });
        });
    }
    //verified (leave a channel) :<>:
    leave(channel){
        var $this = this;
        return new Promise(function(resolve, reject){
            if(!channel || typeof channel != "object") return reject("Missing channel object");
            let queue = $this.getQueue(channel.guild.id);
            for(let i = queue.length - 1; i >= 0; i--){
                queue.splice(i, 1);
            };
            channel.leave();
            if($this.timesOut[channel.id]){
                clearTimeout($this.timesOut[channel.id]);
            }
            resolve();
        })
    }
    //verified (get a queue of a guild for users) :<>:
    getQueueForUsers(guildid){
        if(!guildid) throw new Error("Missing guild id or guild object");
        if(typeof guildid == 'object') guildid = guildid.id;
        if(!this.dispatchers[guildid]) return null;
        var time = this.dispatchers[guildid].time
        var queue = this.getQueue(guildid);
        return {'queue': queue, 'timeOfPlaying': time};
    }
    //verified (play a song or a queue) :<>:
    play(msg, queue, song){
        var $this = this;
        return new Promise(function(resolve, reject){
            if(!msg || !queue) throw new Error("missing arguments ex: (msg, queue, song)");
            if($this.timesOut[msg.guild.id]){
                clearTimeout($this.timesOut[msg.guild.id]);
            }
            if(song){
                search(song, opts, function(err, results){
                    if(err) return reject(err);
                    song = (song.includes("https://" || "http://")) ? song : results[0].link;
                    ytdl.getInfo(song, function(err, infos){
                        if(err) return reject(err);
                        let stream = ytdl(song, {audioonly: true});
                        youtube.getVideo(song)
                            .catch(reject)
                             .then(logs => {
                               var duration = '';
                               for(var x of Object.keys(logs.duration)){
                                   if(logs.duration[x] != 0){
                                       duration += logs.duration[x];
                                       if(x != "seconds") duration += ":"; else duration += '';
                                   }
                               }
                            var test
                            if(queue.length === 0) test = true;
                            queue.push({"name": infos.title, "duration": duration, "requester": msg.author.username, "toplay": stream});
                            if(test){
                                resolve({'queue': queue[queue.length - 1], "first": true});
                                setTimeout(function(){
                                    $this.play(msg, queue);
                                }, $this.options.timeNewSong);
                            }else{
                                //msg.channel.sendMessage("Queued **" + infos.title + "** views: " + infos.view_count);
                                resolve({'queue': queue[queue.length - 1], "first": false});
                            }
                        });
                    })
                })
            }else if(queue.length != 0){
                //msg.channel.sendMessage("Now playing **" + queue[0].name + "**");
                $this.emit('newSong', {"msg": msg, "song": queue[0]});
                var connection = $this.bot.voiceConnections.get(msg.guild.id);
                if(!connection) throw new Error('the bot is not connected to a voiceChannel can\'t get the connection');
                const dispatcher = connection.playStream(queue[0].toplay);
                $this.dispatchers[msg.guild.id] = dispatcher;
                dispatcher.on('end', function(){
                    setTimeout(function(){
                        queue.shift();
                        if($this.skips[msg.guild.id]) delete $this.skips[msg.guild.id];
                        if($this.skipAutori[msg.guild.id]) delete $this.skipAutori[msg.guild.id];
                        $this.play(msg, queue);
                    }, $this.options.timeNewSong);
                })
                
                dispatcher.on('error', function(err){
                    msg.channel.sendMessage(err);
                })
            }else{
                //msg.channel.sendMessage("No more music in queue. If I have no request of music withen 5min I will leave the channel");
                $this.emit('queueFinished', {'msg': msg});
                if($this.options.autoLeave){
                var time = setTimeout(function(){
                    if($this.bot.voiceConnections.get(msg.guild.id)){
                   $this.bot.voiceConnections.get(msg.guild.id).channel.leave();
                    }
                }, $this.options.autoLeave);
                $this.timesOut[msg.guild.id] = time;
                }
            }
        });
    }
    //verified (get the now playing song) :<>:
    np(guild){
        if(!guild) throw new Error('missing argument ex: (guild) or (guildId)');
        if(typeof guild == 'object') guild = guild.id;
        if(!this.dispatchers[guild]) throw new Error('can\'t find dispatcher probably because the bot is not connected to a voicechannel');
        var time = this.dispatchers[guild].time
        var queue = this.getQueue(guild);
        return {'song': queue[0], 'timeOfPlaying': time};
    }
    //verified (pause the song) :<>:
    pause(guild){
        if(!guild) throw new Error('missing argument ex: (guild) or (guildId)');
        if(typeof guild == 'object') guild = guild.id;
        if(!this.dispatchers[guild]) throw new Error('can\'t find dispatcher probably because the bot is not connected to a voicechannel');
        var dispatcher = this.dispatchers[guild];
        if(dispatcher){
            dispatcher.pause();
        }
    }
    //verified (resume the song) :<>:
    resume(guild){
        if(!guild) throw new Error('missing argument ex: (guild) or (guildId)');
        if(typeof guild == 'object') guild = guild.id;
        if(!this.dispatchers[guild]) throw new Error('can\'t find dispatcher probably because the bot is not connected to a voicechannel');
        var dispatcher = this.dispatchers[guild];
        if(dispatcher){
            dispatcher.resume();
        }
    }
    //verified (skip a song) :<>:
    skip(member, guild, instanSkip){
        if(!member || !guild) throw new Error('missing arguments ex: (member, guild)');
        if(!member.voiceChannel) return;
        if(typeof guild == 'object') guild = guild.id;
        if(!this.skips[guild]) this.skips[guild] = 0;
        if(!this.dispatchers[guild]) throw new Error('can\'t find dispatcher probably because the bot is not connected to a voicechannel');
        let dispatcher = this.dispatchers[guild];
        if(!this.skipAutori[guild]) this.skipAutori[guild] = {};
        if(this.skipAutori[guild][member.id]) return this.skips[guild];
        this.skipAutori[guild][member.id] = true;
        this.skips[guild]++;
        if(this.options.skipRequired == 'auto'){
            var users = member.voiceChannel.members.array().length - 1;
            if(this.skips[guild] >= (users / 2) || instanSkip){
            if(dispatcher){
                dispatcher.end();
            }
            return {'skip': true};
        }
        }else{
        if(this.skips[guild] == this.options.skipRequired || instanSkip){
            if(dispatcher){
                dispatcher.end();
            }
            return {'skip': true};
        }
        }
        return {'skip': false, 'number': this.skips[guild], 'skipRequired': (this.options.skipRequired == 'auto') ? users / 2 : this.options.skipRequired};
    }
    //verifed (change the volume) :<>:
    changeVolume(guild, volume){
        if(!guild || !volume) throw new Error('missing arguments');
        if(typeof guild == 'object') guild = guild.id;
        if(volume > 100 || volume < 1) throw new Error('volume is too high or too low can\'t be more then 100 and lower then 1');
        if(!this.dispatchers[guild]) throw new Error('can\'t find dispatcher probably because the bot is not connected to a voicechannel');
        var dispatcher = this.dispatchers[guild];
        dispatcher.setVolume((volume / 50));
        return volume;
    }
}

module.exports = Musics;
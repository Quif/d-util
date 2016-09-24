# Musics

this is indev so if you find errors just make an issues that will really help me :)

## for discord.js 9.0.0^

to install it (not in npm)
to get the stable version: `npm i zelak312/d-util#master`<br>
to get the indev version: `npm i zelak312/d-util#indev`

---
Setup:

```js
var dutil = require('d-util');
var music = new dutil.Music(bot, options);
```
if there is a * that means thats its obligatory

*bot: your bot variable
```
options: (object)
    *key: 'your youtube api key',
    skipRequired: 8, //I chosen 8 for the example but can be what you want (skips required to skip a song)
    timeNewSong: 3000, //If you put nothing it will be 4000 (miliseconds)
    autoLeave: 120000, //If nothing the bot will saty if you put a number the bot will leave after the time (miliseconds)
```
---
# functions

getTime(timestamp)<br>
will return the time 'HH:mm:ss'
```js
var time = music.getTime(mytimestamp)
```

---
getQueue(guildId)<br>
will return the of a server
```js
var queue = music.getQueue(guildId);
```

---
getVolume(guildId)<br>
will return the volume
```js
var volume = music.getVolume(guildId);
```

---
connect(channel)<br>
will join the channel and return a Promise<br>
the Promise return the connection if no errors
```js
music.connect(channel).then(function(connection){
  console.log('connected');
}).catch(console.log);
```

---
leave(channel)<br>
will leave the channel and return a Promise<br>
the Promise return nothing if there is no errors
```js
music.connect(channel).then(function(){
  console.log('left');
}).catch(console.log);
```

---
play(msg, queue, song)<br>
msg: is the msg variable that you use<br>
queue: is the guild queue that you can get with getQueue<br>
song: is the name or the link of a youtube video<br>
return a Promise
```js
music.play(message, music.getQueue(guildId), "idiot test").then(function(anobject){
  console.log('queued ' + anobject.queue.name);
}).catch(console.log)
```

---
np(guildId)<br>
return the now playing song
```js
var song = music.np(guildId);
```

---
pause(guildId)<br>
pause the music
```js
music.pause(guildId)
```

---
resume(guildId)<br>
resume the music
```js
music.resume(guildId)
```

---
skip(member, guild, instaSkip)<br>
member: the member object of the user<br>
guild: the guild object or the guildId<br>
instaSkip: true or false (true will insta skip the video)<br>
if the song is skip it will return true if the song is not skip it will return the number of skips
```js
var number = music.skip(member, guild, false)
```

---
changeVolume(guildId, volume)<br>
guildId: the guild object or the guildId<br>
volume: the volume to set it to<br>
return the volume set
```js
var volume = music.setVolume(guildId, '50');
```

---
# events

newSong:
```js
music.on('newSong', function(songs){
    songs.msg.channel.sendMessage(`Now Playing **${songs.song.name}|[${songs.song.duration}]**|by ***${songs.song.requester}***`);
});
```

---
queueFinished:
```js
music.on('queueFinished', function(options){
   options.msg.channel.sendMessage("No more musics in queue."); 
});
```

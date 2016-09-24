class MsgsCounter {
	constructor(bot){
		this.msgs = [];
		this.bot = bot;
		var $this = this;
		bot.on('message', function(msg){
		    $this.push(msg);
		});
	}
	
	push(data) {
		this.msgs.push(data);
	}
	
	pull(index) {
		this.msgs.splice(index, 1);
	}
	
	get array(){
		return this.msgs;
	}
	
	filter(fn, Args){
		if(Args || typeof Args == "object") fn = fn.bind(Args);
		var arr = [];
		for(var x of this.msgs){
			if(fn(x)){
				arr.push(x);
			}
		}
		return arr;
	}
}

module.exports = MsgsCounter;
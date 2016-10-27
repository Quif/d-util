var util = require("util");
var SaveEval = function (){
    this.passed = false;
    
    this.eval = function(code){
        try{
            new Function(code);
            this.passed = true;
            var lol = eval(code);
            this.passed = false;
            if(typeof lol == "object"){
                lol = util.inspect(lol, {showHidden: false, depth: 1});
            }
            lol = lol + " ";
            return "**No errors** :thumbsup: ```xl\nResult: " + (lol.length >= 2000 ? "the result is too big" : lol) + "```";
        }catch(err){
            if(!this.passed){
                this.passed = false;
                return "**Found an error**```xl\n" + err + "```";
            }else{
                this.passed = false;
                return "**No errors** :thumbsup: (i'm not looking at the variables, i'm looking at the syntax errors.')";
            }
        }
    }
}
module.exports = SaveEval;

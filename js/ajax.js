

function Ajax(src){
	this.src = src;
	this.msg_cache = [];
    Ajax.request_stack = [];
}
Ajax.prototype.obj_to_post = function(obj){
    var post_str = [];
    if(obj instanceof Array){

    }
    else if (obj instanceof Object){
        for(key in obj){
            post_str.push(key.toString() + '=' + obj[key].toString());
        }
    }
    return post_str.join('&');
}
Ajax.prototype.snd_msg = function(msg, response, force_send){
    var cache = this.msg_cache;
    var wrapper;
    var req;
    // short circuit check for correct paramaters
    if(msg == '' || msg === undefined || this.src == '' || this.src === undefined){
        return undefined;
    }
    // make sure that the callback function is actually a function
    if(typeof(response) !== 'function'){
        return undefined;
    }
    // check the msg cache to see if weve already requested this
    if(force_send === undefined &&( this.msg_cache[msg] !== undefined )){
        return response(this.msg_cache[msg]);
    }
    else{
        wrapper = function(msg,txt){
            cache[msg] = txt;
            response(txt);
        }
    }
    // Create new XMLreq for Mozilla/Safari
    if (window.XMLHttpRequest) {
       req = new XMLHttpRequest();
    }
    // handle IE XMLreq
    else if (window.ActiveXObject) {
       req = new ActiveXObject("Microsoft.XMLHTTP");
    }
    req.open("POST",this.src ,true);
    req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    // Chrome says this is unsafe and complains
    //req.setRequestHeader("User-Agent","XMLRequest");
    req.onreadystatechange = function(){
            if(req.readyState == 4 && req.status==200){
                    // handle the response
                    Ajax.request_stack.splice(0,1);        
                    wrapper(msg,req.responseText);
            }
    }
    Ajax.request_stack.push(req);
    req.send(msg);
}// end snd_msg
Ajax.prototype.abort_all = function(){
    while(Ajax.request_stack.length > 0){
        Ajax.request_stack[0].abort();
        Ajax.request_stack.splice(0,1);
    }
}

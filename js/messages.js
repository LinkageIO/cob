function Message(text,seconds){
    this.message(text,seconds);
}
Message.prototype = heir(MessageCenter.prototype);

function MessageCenter(div){
    MessageCenter.panel = $('messageCenter');
    MessageCenter.default_seconds = 7;
    window.message_fade = new Object();
    MessageCenter.message_stack = document.createElement('ul');
    MessageCenter.panel.appendChild(MessageCenter.message_stack);
    MessageCenter.timeout = {};
}
MessageCenter.prototype.message = function(text, seconds){
    if(seconds == null){ seconds = MessageCenter.default_seconds; } 
    var msg_body      = document.createElement("li");
    var msg_container = new div();
    msg_container.setAttribute("class","message");
    // handle all the header stuff
    var msg_header    = new div();
    msg_header.setAttribute("class","header");
    msg_header.innerHTML = '<span>Message:</span>';
    var clear_btn = document.createElement("img");
    clear_btn.setAttribute('class','closeBtn');
    clear_btn.style.cssFloat = 'right';
    var caller = this;
    var unix_time = new Date().getTime();
    clear_btn.onclick = function(){
        clearTimeout(MessageCenter.timeout[unix_time]);
        caller.clear(msg_body,unix_time);
    }
    msg_header.appendChild(clear_btn);
    msg_container.appendChild(msg_header);
    var msg = document.createElement("div");
    msg.setAttribute('class','messageText')
    msg.innerHTML = text;
    msg_container.appendChild(msg);
    msg_body.appendChild(msg_container)
    MessageCenter.message_stack.appendChild(msg_body);
    var caller = this;
    MessageCenter.timeout[unix_time] = setTimeout(
        function(){
            caller.clear(msg_body,unix_time);
        },seconds*1000
    );
}
MessageCenter.prototype.clear = function(li,utime){
    if(MessageCenter.timeout[utime] == null)
        return;
    //remove the entry from the object
    delete MessageCenter.timeout[utime];
    var caller = this;
    li.style.opacity = 0.9;
    if(li.style.opacity < 0.9)
        return;
    var unix_time = new Date().getTime();
    window.message_fade[unix_time] = setInterval(
        function(){
            if(li.style.opacity < .15){
                clearInterval(window.message_fade[unix_time]);
                if(li != null){
                    try{
                      MessageCenter.message_stack.removeChild(li); 
                    }
                    catch(e){
                      console.log(e)
                    }
                }
            }
            else{
                li.style.opacity -= .1;
            }
        },150
    );
}
MessageCenter.prototype.clear_all = function(){
    while(MessageCenter.message_stack.children.length > 0){
        MessageCenter.message_stack.removeChild(MessageCenter.message_stack.firstChild);    
    }
    MessageCenter.timeout = {};
}

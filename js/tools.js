/*add_commas -- Rob
 * This adds commas to a number, mainly used to display 
 * map coordinates for the genome map
 * */
add_commas = function(num_str){
    num_str += ''; //force string
    var rgx = /(\d+)(\d{3})/;
    while(rgx.test(num_str)){
        num_str = num_str.replace(rgx,'$1,$2');
    }
    return num_str;
}

/* $ -- Rob
 * This makes life a lot easier
 */
function $(element){
	return document.getElementById(element);
}

/* heir -- Rob
     this assigns inheritence
*/

function heir(p){
    function f() {}
    f.prototype = p;
    return new f();
}

function div(className){
    var div = document.createElement('div');
    if(className != undefined){ div.setAttribute('class',className);}
    return div;
}
function button(title){
    var btn = document.createElement('button');
    if(title != null) btn.innerHTML = title;
    return btn;
}
function br(){
    return document.createElement("br");
}
function table(){
    return document.createElement('table');
}
function row(){
    return document.createElement('tr');
}
function Span(text,className){
    var span = document.createElement('span');
    if(text != undefined) span.innerHTML = text;
    if(className != undefined) span.setAttribute('class',className);
    return span;
}

function isEmpty(obj){
    if(obj.constructor != Object) return;
    for(var i in obj){
        if(obj.hasOwnProperty(i))
            return false;
    }
    return true;
}

function center_searchbox(div){
    if($('searchbox') != null){
        if(div == null) div = $('searchbox');
        div.style.left = (window.innerWidth/2 - div.offsetWidth/2)-150+'px';
        div.style.top  = (window.innerHeight/2 - div.offsetWidth/2)-50+'px';
    }
    if($('growingAnimation') != null){
        var div = $('growingAnimation');
        div.style.left = (window.innerWidth/2 - div.offsetWidth/2)+'px';
        div.style.top  = (window.innerHeight/2 - div.offsetHeight/2)+'px';
    }
}

function showGrow(){
    $('growing').style.visibility = 'visible';
}
function hideGrow(){
    $('growing').style.visibility = 'hidden';
}

function findPos(obj) {
	var curleft = curtop = 0;
    if (obj.offsetParent) {
	    do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
    }
	return [curleft,curtop];
}


function option_box(name,text,box_value,obj){
    var container = document.createElement("div");
    container.setAttribute("class",'bar');
    var box  = document.createElement("input");
    var tag = document.createElement("span");
    tag.setAttribute("class","info")
    tag.style.color = "white";
    tag.innerHTML = text.toString();

    box.type = "text";
    box.name = name;
    box.attribute = text;
    box.value = box_value;
    box.style.position = "relative";
    box.style.left = "70px";
    box.style.marginTop = "5px";
    box.style.border = "0";
    box.onchange = function(box){
        obj[this.name][this.attribute] = this.value;    
    }
    container.appendChild(tag);
    container.appendChild(box);
    return container;
}

window.onresize = function(e){
    if(!e) e = window.event; //IE sux
    $('cob').style.width = (window.innerWidth-$('gene_info').offsetWidth)+'px';
    $('cob').style.height = (window.innerHeight-60)+'px';
    $('gene_info').style.height = (window.innerHeight-60)+'px';
    $('cob_table').style.maxHeight = (window.innerHeight-60)+'px';
    var tabs = document.getElementsByClassName('tab');
    for(var i=0;i<tabs.length;i++){
        tabs[i].style.maxHeight = (window.innerHeight-78)+'px';
    }
    center_searchbox();
    return 1;
}

function slider(div,start,width,steps,callBack){
    this.block = div;
    this.block.className = "slider";
    this.block.style.width = width + 'px';
    this.steps = steps;
    this.start = start;
    this.end = start+steps-1;
    var cursor = document.createElement("div");
    this.cursor = cursor;
    this.cursor.className = "cursor";
    // add the offset Box
    // we start at the start
    this.current = start;

    this.drag = function(elementToDrag, event,minLeft,maxLeft,minTop,maxTop,callBack){
        var startX = event.clientX, startY = event.clientY;
        var origX = elementToDrag.offsetLeft, origY = elementToDrag.offsetTop;
        var deltaX = startX - origX, deltaY = startY - origY;
        var parent = elementToDrag.parentNode;
        if(document.addEventListener){ //Dom Level 2
            document.addEventListener("mousemove", moveHandler, true);
            document.addEventListener("mouseup", upHandler, true);
        }
        else if(document.attachEvent){ //IE5+ model
            elementToDrag.setCapture();
            elementToDrag.attachEvent("onmousemove", moveHandler);
            elementToDrag.attachEvent("onmouseup", upHandler);
            elementToDrag.attachEvent("onlosecapture", upHandler);
        }
        else{
            var oldmovehandler = document.onmousemove;
            var olduphandler = document.unmouseup;
            document.onmousemove = moveHandler;
            document.onmouseup = upHandler;
        }
        // Don't let the event propogate!! 
        if(event.stopPropagation) event.stopPropagation(); //DOM Level 2
        else event.cancelBubble = true;
        //Also prevent any default action!!
        if(event.preventDefault) event.preventDefault(); //Dom level 2
        else event.returnValue = false;
        
        function moveHandler(e) {
            if(!e) e = window.event; // IE Model
            if(e.clientX-deltaX + (elementToDrag.offsetWidth/2) + elementToDrag.parentNode.offsetLeft >= maxLeft){
                elementToDrag.style.left = maxLeft - elementToDrag.offsetWidth + "px";
                callBack('Max');
            }
            else if(e.clientX-deltaX + (elementToDrag.offsetWidth/2)- elementToDrag.parentNode.offsetLeft < 0 ){
                elementToDrag.style.left = "0px";
                callBack(0); 
            }
            else{
                elementToDrag.style.left = (e.clientX - deltaX) + "px";
                var steps = this.steps;
                callBack((parseInt((e.clientX-deltaX+(elementToDrag.offsetWidth/2)-elementToDrag.parentNode.offsetLeft))));
            }
            if(e.clientY-deltaY < maxTop && e.clientY-deltaY >minTop){
                elementToDrag.style.top = (e.clientY - deltaY) + "px";
            }
            if(e.stopPropagation) e.stopPropagation(); //Dom level 2
            else e.cancelBubble = true;                // IE
        }
        function upHandler(e) {
            //Update the graph
            if(!e) e = window.event; //IE
            if(document.removeEventListener){ // DOM model
                document.removeEventListener("mouseup", upHandler, true);
                document.removeEventListener("mousemove", moveHandler, true);
            }
            else if(document.detachEvent){
                elementToDrag.detachEvent("onlosecapture", upHandler);
                elementToDrag.detachEvent("onmouseup", upHandler);
                elementToDrag.detachEvent("onmousemove", moveHandler);
                elementToDrag.releaseCapture();
            }
            else{ // IE 4 Model
                document.onmouseup = olduphandler;
                document.onmousemove = oldmovehandler;
            }
            if(e.stopPropagation) e.stopPropagation();
            else e.cancelBubble = true;
        }
        return this.block;
    }
    // add drag so we can move the cursor
    var setValue = this.setValue;
    var drag = this.drag;
    this.cursor.onmousedown = function(e){drag(cursor,e,-20,width,0,0,callBack);}
    // Add these to the DOM
    this.block.appendChild(this.cursor);
    this.cursor.style.left = (width-this.cursor.offsetWidth) + 'px';
}

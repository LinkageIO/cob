/* GenomeBroswer Object -- Rob
    This guy is responsible for viewing the genome around some gene
    It is a pure javascript/CSS implementation having the basic functionality of
    a genome browser
*/

var slider_width = 5000;
var span = 1000000;
var bp_per_pix = span/slider_width;
/* a tick is 100 px */
var tick_width = 100;
var bp_per_tick = bp_per_pix * tick_width;


function GenomeBrowser(menu,div,width,height,genome_length){
    this.menu = menu;
    this.element = div;
    this.element.setAttribute('class',"genomeBrowser");
    var width = width;
    var height = height;
    var genome_length = genome_length;
    this.bp_span = span; 
    this.scale = this.bp_span/slider_width;
   
    this.slider = document.createElement("div");
    this.slider.setAttribute('class',"genomeSlider");
    this.element.appendChild(this.slider);
    var t = function(a){}
    var slide = this.slider;
    this.slider.onmousedown = function(e){drag(slide,e,0,(slider_width-150),0,0,t)};
}
// A genome browser extends a Graph
GenomeBrowser.prototype.get_all_loci = function(obj){
    var msg = this.menu.graph.ajax.obj_to_post({
        'action':'get_all_loci',
        'chromosome': obj.chromosome,
        'loci': obj.chromo_start,
        'range': span,
    });
    var rsp_funct = this.respond_get_all_loci;
    this.current_loci = obj.chromo_start;
    this.clicked_node = obj.id;
    this.current_nodes = {};
    for(i in a = this.menu.graph.vis.nodes()){
        this.current_nodes[a[i].data.id]=1;
    }
    var caller = this;
    this.menu.graph.ajax.snd_msg(msg,function(response){rsp_funct(response,caller)});
}

GenomeBrowser.prototype.respond_get_all_loci = function(response,caller){
    var r = response.replace(/\\/g,'');
    r = r.replace(/^\"|\"$/g,'');
    var genes;
    try{
         genes = eval('(' +r+')')
    }
    catch(e){
        throw new Error(e);
    }
    // we need to have ticks be round numbers
    var window_start = (caller.current_loci-(span/2));
    if(window_start < 0){
        window_start = 1;
    }
    var tick_start_position = ((window_start-(window_start%bp_per_tick))+bp_per_tick);
    var tick_offset = parseInt((tick_start_position-window_start)/bp_per_pix);
    for(var i = 0; i < 50; i++){
        var tick = document.createElement("div");
        tick.setAttribute("class","tick");
        tick.style.left = (tick_offset+((i*bp_per_pix/2))) + 'px';
        tick.innerHTML = add_commas(tick_start_position+i*bp_per_tick);
        caller.slider.appendChild(tick);
    }
    var sgenes = genes.sort(function(a,b){return a.start - b.start});
    var move_to;
    for(i in sgenes){
        var gdiv = document.createElement("div");
        var gene = new BrowserGene(gdiv,sgenes[i],window_start);
        caller.slider.appendChild(gene);
        var adiv = document.createElement("div");
        var annot = new BrowserAnnotation(adiv,sgenes[i],window_start);
        /* color if if is in the graph */
        if(caller.current_nodes[sgenes[i].id] == 1){
            if(caller.clicked_node == sgenes[i].id){
                gdiv.style.backgroundColor = '#88224A';
                move_to = '-' + ((sgenes[i].start-window_start)/bp_per_pix-100) + 'px'
            }
            else{
                gdiv.style.backgroundColor = '#144566';
            }
        }
        caller.slider.appendChild(annot);
    }
    caller.slider.style.left = move_to;
 
}

/*  Browser gene -- Rob
     This bad boy gives you a little control over what is exactly displayed
     in your genome browser for each gene.   
*/
function BrowserGene(div,obj,window_start){
    // obj has: common,name,start,end,forward
    var name = obj.name; var common = obj.common;
    var start = obj.start; var end = obj.end;
    var forward = obj.forward;
    div.setAttribute("class","browserGene");
    div.style.width = parseInt((end-start)/200)+'px';
    // we need to have ticks be round numbers
    div.style.left = (start-window_start)/bp_per_pix + 'px';
    var orf = start%3;
    div.style.top = (10+(orf*20)) + 'px';
    div.onmouseover = function(){
        div.nextSibling.style.visibility = 'visible';
    }
    div.onmouseout = function(){
        div.nextSibling.style.visibility = 'hidden';
    }
    /*Color the */
    return div;
}
function BrowserAnnotation(div,obj,window_start){
    // obj has: common,name,start,end,forward
    var name = obj.name; var common = obj.common;
    var start = obj.start; var end = obj.end;
    var forward = obj.forward;
    div.setAttribute("class","geneAnnotation");
    div.style.left = 20+(start-window_start)/bp_per_pix + 'px';
    var orf = start%3;
    div.style.top = '20px';
    div.innerHTML = '';
    if(obj.common){
        div.innerHTML += obj.common + '<br>';
    }
    div.innerHTML += obj.name + '<br>' + add_commas(obj.start); 
    return div;
}

/* Drag Object -- Rob Schaefer
    This takes care of all the events needed to drag elements, its a little messy and appears elsewhere
    so lookout
*/
function drag(elementToDrag, event,minLeft,maxLeft,minTop,maxTop,callBack){
        var startX = event.clientX, startY = event.clientY;
        var origX = elementToDrag.offsetLeft, origY = elementToDrag.offsetTop;
        var deltaX = startX - origX, deltaY = startY - origY;
        var veloc, time;
        var d = new Date();
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
            if(e.clientX-deltaX >= 50){
                 elementToDrag.style.left = '50px';
            }
            else if(e.clientX-deltaX <= -1*(maxLeft)){
                var newLeft = 50 + maxLeft; 
                elementToDrag.style.left = '-'+(100-maxLeft)+'px';
            }
            else{
                 elementToDrag.style.left = (e.clientX - deltaX) + "px";
            }
            callBack(e.clientX);
            if(d.getTime()%100000 == 0){
                veloc = e.clientX;
                time = d.getTime();
                callBack(d.getTime());
            }
            if(e.stopPropagation) e.stopPropagation(); //Dom level 2
            else e.cancelBubble = true;                // IE
        }
        function upHandler(e) {
            //Update the graph
            // get the velocity in pixels per second
            var delta = Math.abs(e.clientX-veloc)/(1000*(d.getTime()-time));
            callBack('v:'+Math.abs(e.clientX-veloc));
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
    }


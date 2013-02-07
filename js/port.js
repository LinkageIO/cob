function Port(start_div, graph){
    this.graph = graph;
    this.div = start_div;
    this.events = new Array();
    this.box = $('export-box');
    this.import_box = $('import-box');
    this.div.setAttribute('class','port');
    /*position the box to the middle of  the screen*/
    var window_width = document.body.offsetWidth;
    this.box.style.left = (window_width-800)/2 + 'px';
    /*Get the textarea*/
    this.textarea = $('export_text_box');
    this.import_text_area = $('import_text_area');
    this.controls = this.div.getElementsByClassName('controls')[0];
    this.import_button = $('import_button');
}
Port.prototype.show_import = function(instruction_text){
    if(this.graph.vis.swf() === undefined ){
        new Message("Sorry, there is no network! Try entering a gene in the search box!");
        return false;
    }
    this.import_box.style.left = (window.innerWidth/2)-(this.import_box.offsetWidth/2) + 'px';
    this.div.style.visibility = 'visible';
     this.escape_listen = function(e){
        if(!e) e = window.event; //IE
        code = e.keyCode;
        var caller = this;
        if(code == 27){
            graph.menu.port.hide();
        }
    }
    /*Listeners*/
    if(document.addEventListener){//DOM Level 2 Model
        document.addEventListener('keydown',this.escape_listen,false);
        document.addEventListener('keypress',this.escape_listen,false);
    }
    else if(document.attachEvent){//IE5+ Model
        document.setCapture();
        document.attachEvent('onkeydown',this.escape_listen);
        document.attachEvent('onkeypress',this.escape_listen);
    }
    else{//Who knows..
        document.onkeydown = document.onkeypress = this.escape_listen;
    }  
    $('import_instruction_text').innerHTML = instruction_text;
    this.import_box.style.visibility = 'visible';
}

Port.prototype.show = function(){
    if(this.graph.vis.swf() === undefined) {
        new Message("Sorry, I can't find anything to save. Try entering a gene in the search box!");
        return false;
    }
    this.box.style.visibility = 'visible';
    this.box.style.left = (window.innerWidth/2)-(this.box.offsetWidth/2) + 'px';
    this.textarea.innerHTML = 'Select which options below you would like to export'
    this.div.style.visibility = 'visible';
    this.escape_listen = function(e){
        if(!e) e = window.event; //IE
        code = e.keyCode;
        var caller = this;
        if(code == 27){
            graph.menu.port.hide();
        }
    }
    /*Listeners*/
    if(document.addEventListener){//DOM Level 2 Model
        document.addEventListener('keydown',this.escape_listen,false);
        document.addEventListener('keypress',this.escape_listen,false);
    }
    else if(document.attachEvent){//IE5+ Model
        document.setCapture();
        document.attachEvent('onkeydown',this.escape_listen);
        document.attachEvent('onkeypress',this.escape_listen);
    }
    else{//Who knows..
        document.onkeydown = document.onkeypress = this.escape_listen;
    }
    var format = $('port_format');
    this.show_options(format);
}
Port.prototype.hide = function(){
    if(this.graph.vis.swf() === undefined) return false;
    this.div.style.visibility = 'hidden';
    this.box.style.visibility = 'hidden';
    this.import_box.style.visibility = 'hidden';
    /*Listeners*/
    if(document.addEventListener){//DOM Level 2 Model
        document.removeEventListener('keydown',this.escape_listen,false);
        document.removeEventListener('keypress',this.escape_listen,false);
    }
    else if(document.attachEvent){//IE5+ Model
        document.detachEvent('onkeydown',this.escape_listen);
        document.detachEvent('onkeypress',this.escape_listen);
    }
    else{//Who knows..
        document.onkeydown = document.onkeypress = function(e){};
    }

}
Port.prototype.toggle_show = function(){
    if(this.div.style.visibility == 'visible'){
        this.hide();
    }
    else{
        this.show();
    }
}
Port.prototype.fill = function(){
    /*Check if there is a graph object*/
    var format = $('port_format')[$('port_format').selectedIndex].value;
    var gene_set = document.getElementsByName('port_included_genes_radio');
    var set = 'all_genes';
    for(var i=0;i<gene_set.length;i++){
        if(gene_set[i].checked)
            set = gene_set[i].value;
    }
    if(format == 'nodes' || format == 'edges'){
        if(this.graph.vis.swf() === undefined)
            return false;
        var nodes = set == 'all_genes' ? this.graph.get_all_node_ids() : this.graph.get_all_selected_node_ids();
        if(nodes.length == 0){
                new Message("There are not any highlighted genes.");
                return;
        }
        var checkboxes = this.div.getElementsByTagName('input');
        var checked = new Array();
        for(var i=0;i<checkboxes.length;i++){
            /*Make sure that we only have the checkboxes*/
            if(checkboxes[i].type !== 'checkbox' || checkboxes[i].checked === false){
            }
            else{
                checked.push(checkboxes[i].name);
            }
        }
        /*respond method for the fill*/
        var respond_fill = function(response){
            try{response = eval('('+response+')')}catch(e){throw new Error(e)}
            // make sure we aren't outside of the window height
            this.textarea.style.maxHeight = (window.innerHeight - 90 - this.controls.offsetHeight) + 'px';
            this.textarea.innerHTML = response.txt;
            this.center_windows();
        }
        var caller = this;
        var msg_str = this.graph.ajax.obj_to_post({'action':'port_fill',"type":format,"nodes":nodes,"details":checked.join(',')});
        this.graph.ajax.snd_msg(
            msg_str,
            function(response){respond_fill.apply(caller,[response])}
        );
    }
    else{
        if(this.graph.vis.swf() === undefined) return false;
        // Make a good network name
        var network_name = '';
        for( var i in graph.queried_nodes){
            network_name += graph.vis.node(i).data.label + "_"
        }
        network_name += graph.get_current_network();

        this.textarea.innerHTML = 'Select which options below you would like to export';
        var type;
        var format = $('port_format')[$('port_format').selectedIndex].value;
        if(format == 'svg') type = 'svg'
        else if (format == 'png') type = 'png'
        else if (format == 'pdf') type = 'pdf'
        else if (format == 'xgmml') type = 'xml'
        else if (format == 'graphml') type = 'xml'
        else if (format == 'sif') type = 'sif'
        this.graph.vis.exportNetwork(format,'export.php?type='+type+"&name="+network_name);
    }
}
Port.prototype.show_options = function(select_tag){
    if(this.graph.vis.swf() === undefined) return false;
    var selected_value = select_tag.options[select_tag.selectedIndex].value;
    if(selected_value == 'nodes' 
        || selected_value == 'edges'){
        this.enable_options();
    }
    else{
        this.disable_options();
    }
}
Port.prototype.disable_options = function(){
    var list = $('port_check_box_options').children;
    for(var i = 0; i < list.length; i++){
        list[i].children[0].disabled = true;
    }
}
Port.prototype.enable_options = function(){
    var list = $('port_check_box_options').children;
    for(var i = 0; i < list.length; i++){
        list[i].children[0].disabled = false;
    }
}
Port.prototype.center_windows = function(){
    this.box.style.left = (window.innerWidth/2)-(this.box.offsetWidth/2) + 'px';
    this.import_box.style.left = (window.innerWidth/2)-(this.import_box.offsetWidth/2) + 'px';
}
Port.prototype.set_import_function = function(function_reference){
    var caller = this;
    this.import_button.onclick = function(){function_reference.apply(caller)};
}
Port.prototype.loci_import = function(){
    var qtl = this.import_text_area.value.split("\n");
    for(i in qtl){
      qtl[i] = qtl[i].replace(/\s+/g,"");
      var matches = [];
      if(matches = qtl[i].match(/chr(\d+):(\d+)\.\.(\d+)/)){
        var locus_div = new graph.menu.filter_loci(matches[1],matches[2],matches[3]);
        graph.menu.locus_list.appendChild(locus_div);
      }
      else{
        var error_line = parseInt(i)+1;
        new Message(qtl[i]+" isn't a correct locus string on line "+error_line);
      }
    }
    new Message("Added "+qtl.length+" region(s)");
    this.hide();
}

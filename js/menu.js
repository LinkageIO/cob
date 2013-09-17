/* Rob
* menu object 
*/
function Info(info_text){
    var text = document.createElement("span");
    text.setAttribute('class','info');
    if(info_text){
        text.innerHTML = info_text;
    }
    else{
        text.innerHTML = '';
    }
    this.span = text;
}
Info.prototype.add_text = function(text){
    this.span.innerHTML += text;
}
Info.prototype.replace_text = function(text){
    this.span.innerHTML = text;
}
Info.prototype.add_row = function(text){
    var sp = document.createElement("span");
    sp.setAttribute("class","row");
    sp.innerHTML = text;
    this.span.appendChild(sp);
}    

function Bar(element,title_text,info_text){
    this.div = element;
    this.collapsed = false;
    this.title = document.createElement("span");
    this.collapse_button = document.createElement("a");
    this.collapse_button.setAttribute("class","collapse");
    this.collapse_button.setAttribute("title","Toggle Collapse");
    var that = this;
    this.collapse_button.onclick = function(){that.toggle_collapse.call(that)};
    this.div.appendChild(this.collapse_button);
    if(element === undefined){
        var element = document.createElement("div");   
    }
    else{
        element.setAttribute('class',"bar");
    }
    if(title_text){
        this.title.setAttribute("class",'title');
        this.title.innerHTML = title_text;
        element.appendChild(this.title);
    }
    this.info = new Info(info_text);
    element.appendChild(this.info.span);
}
Bar.prototype.add_title = function(text){
    var title = document.createElement("span");
    title.setAttribute("class","title");
    title.innerHTML = text;
}
Bar.prototype.toggle_collapse = function(){
    if(this.collapsed == false){
        this.collapse_button.setAttribute("class","collapse uncollapse")
        this.collapsed = true;
        this.div.style.height = '13px';
    }
    else{
        this.collapse_button.setAttribute("class","collapse")
        this.collapsed = false;
        this.div.style.height = '';
    }
}
/* insert -- Rob
*   Insert takes in the element in which it inserts itself into
*   It takes care of all the other elements in the bar too
*/
Bar.prototype.insert = function(element_in_DOM){
    element_in_DOM.appendChild(this.div);
    this.div.appendChild(this.info.span);
}

function Menu(obj){
    this.graph = obj.graph;
	  this.tabs = obj.tabs;
	  this.handle = obj.handle;
	  this.headers = obj.headers;
    this.full_width = 408;
    this.div = obj.div;
	  /*calculate some dimentions*/
	  this.handle_width = this.handle.offsetWidth;
	  this.tab_width = this.handle_width / this.tabs.length;
	  this.handle_orig = { 
			  'left' : this.handle.offsetLeft,
			  'top' : this.handle.offsetTop,
	  };
	  this.current_tab_ind = 1;
    this.port = undefined;
    this.collapsed = true;
    this.enrichment_loaded = false;
}
/* Declare all the inheritence mumbo jumbo */
Menu.prototype.constructor = Menu; 
 /* This will move the handle element to the correct position
  * to show the requested tab */	
Menu.prototype.show_tab = function(tab_num){
        clearInterval(window.menu_move);
		/*If we try to show a tab that isnt there, return*/
		if(tab_num > this.tabs.length || tab_num < 0){
			return;
		}
		var current_offset = -1*(this.current_tab_ind)*(this.tab_width);
		var move_offset = -1*(tab_num-1)*(this.tab_width);
        // 
		if(current_offset < move_offset){
            var handle = this.handle;
            window.menu_move = setInterval(function(){
			        if(move_offset - current_offset > 5){
				        current_offset += parseInt(.5*(move_offset-current_offset));
                    }
                    else{  
                        if(move_offset - current_offset != 0){ 
                            current_offset += 1; 
                        }
                        else{
                            clearInterval(window.menu_move);
                        }
                    }
				    handle.style.left = current_offset.toString() + 'px';
                },50);
		}
        else{
            var handle = this.handle;
            window.menu_move = setInterval(function(){
			        if(current_offset - move_offset > 5){
				        current_offset -= parseInt(.5*(current_offset-move_offset));
			        }
                    else{
                        if(current_offset - move_offset != 0){
                            current_offset -= 1;
                        }
                        else{
                            clearInterval(window.menu_move);
                        }
                    }
				    handle.style.left = current_offset.toString() + 'px';
                },50);
		}
		this.highlight_tab(tab_num);
        $('gene_info').scrollTop = 0;
}
/*add bar to tab*/
Menu.prototype.add_bar_to_tab = function(tab_num,bar){
    this.tabs[tab_num-1].appendChild(bar);
}
/* we want to highlight the current tab */
Menu.prototype.highlight_tab = function(tab_num){
		var tab_ind = tab_num-1;
        if(tab_num > this.headers.length){
            this.headers[this.current_tab_ind].setAttribute("class",'tab_normal');
        }
        if(!this.headers[tab_ind])return;
		/*Change the background colors*/
        this.headers[this.current_tab_ind].setAttribute("class",'tab_normal');
        this.headers[tab_ind].setAttribute("class",'tab_selected');
		/*Change the link color*/
		this.current_tab_ind = tab_num-1;
}
	/* This will add a info bubble to the correct tab*/
Menu.prototype.add_info_to_tab = function(tab_num,info_obj){
        var element = new Bar(document.createElement("div"),info_obj.title);
		var info = document.createElement("span");
		info.setAttribute("class",'info');
		info.innerHTML = info_obj.info;
		element.div.appendChild(info);
		this.tabs[tab_num-1].appendChild(element.div);
};
Menu.prototype.clear_tab = function (tab_num){
		/*tabs start at zero*/
		var tab = this.tabs[tab_num-1];
		while(tab.hasChildNodes()){
			tab.removeChild(tab.childNodes[0]);
		}
}
Menu.prototype.default_tab = function(tab_num,title,info){
    this.clear_tab(tab_num);
    this.add_info_to_tab(tab_num,{'title':title,'info':info});
}
Menu.prototype.add_link_to_tab = function(tab_num,info_obj){
        var element = new Bar(document.createElement("div"));
		var link = document.createElement("a");
		link.href = info_obj.href;
		link.innerHTML = info_obj.text;
        link.setAttribute("class","tab_link");
        link.setAttribute("target","_blank");
		element.div.appendChild(link);
		this.tabs[tab_num-1].appendChild(element.div);
}
Menu.prototype.add_loci_to_tab = function(tab_num,loci_info){
        var element = new Bar(document.createElement("div")
            ,"Locus:","Chr:"+loci_info.chromosome+" - BP:" + add_commas(loci_info.chromo_start));
        var gMapElement = document.createElement("div");
        this.gMap = new GenomeBrowser(this,gMapElement,350,350,2400);
        element.div.appendChild(gMapElement);
        this.gMap.get_all_loci(loci_info);
        this.tabs[tab_num-1].appendChild(element.div);
}
Menu.prototype.add_feedback_to_tab = function(tab_num,info_obj){
        var email_address = info_obj.address;
        var element = new Bar(document.createElement("div"),info_obj.title,info_obj.info);
        var text = document.createElement("textarea");
        text.style.width = '350px';
        var submit = document.createElement("button");
        submit.innerHTML = "Send!";
        submit.onclick = function(){
            if(text.value){
                graph.ajax.snd_msg("action=feedback&body="+text.value,
                    function(response){
                            var ok = document.createElement("span");
                            ok.fontSize = '24px';
                        if(response == '{"ok":"ok"}'){
                            new Message("Thanks for the feedback.");
                        }
                        else{
                            new Message("The feedback failed to submit, please try again.");
                        }
                         element.div.appendChild(ok);
                    }
                );
            }
        }
        element.div.appendChild(text);
        element.div.appendChild(submit);
        this.tabs[tab_num-1].appendChild(element.div);
}
Menu.prototype.hide = function(){
    if(this.div.offsetWidth != this.full_width)
        return;
    var new_width = this.div.offsetWidth;
    var div = this.div;
    var full_width = this.full_width;
    /* Here we are shrinking */
    if(window.menu_collapse){
        clearInterval(window.menu_collapse);
    }
    window.menu_collapse = setInterval(function(){
        if(div.offsetWidth > 10 ){
                new_width -= parseInt(.5*(div.offsetWidth))
        }
        else{
            if(div.offsetWidth != 0){
                new_width -= 1;
            }
            else{
                clearInterval(window.menu_collapse);
            }
        }
        window.onresize();
        div.style.width = new_width.toString() + 'px';
    },50);
    this.collapsed = true; 
}
Menu.prototype.show = function(){
    if(this.div.offsetWidth == this.full_width)
        return;
    var new_width = this.div.offsetWidth;
    var div = this.div;
    var full_width = this.full_width;
    /* Here we are shrinking */
    if(window.menu_collapse){
        clearInterval(window.menu_collapse);
    }
    window.menu_collapse = setInterval(function(){
        if(div.offsetWidth < full_width - 5){
                new_width += parseInt(.5*(full_width-div.offsetWidth))
        }
        else{
            if(div.offsetWidth != full_width){
                new_width += 1;
            }
            else{
                clearInterval(window.menu_collapse);
            }
        }
        div.style.width = new_width.toString() + 'px';
        window.onresize();
    },50);
    this.collapsed = false; 
}
/* collapse_menu -- Rob
 * Collapses the menu horizontally to make
 * the other space larger
 * */
Menu.prototype.toggle_collapse = function(){
    var new_width = this.div.offsetWidth;
    var div = this.div;
    var full_width = this.full_width;
    this.collapsed == true ? this.show() : this.hide();
}
/* add_visual_style_to_tab */
Menu.prototype.add_visual_style_to_tab = function(tab_num){
    
}

/* add_neighbors_to_tab -- Rob
 *  Adds a list of neighbors to a tab
 */
Menu.prototype.add_neighbors_to_tab = function(tab_num,edges,response){
    function edgeSort(a,b){
        if(a.data.weight > b.data.weight)
            return -1;
        else if(a.data.weight < b.data.weight)
            return 1;
        else    
            return 0;
    }
    edges.sort(edgeSort);
    try{
	    /*add the edges to the menu*/
	    var edge_names = new String();
        var degree = 0;
        var table = document.createElement("table");
        table.setAttribute('class','neighbor');
        var fnc = function(a,b){
            return function(){graph.highlightEdge(a,b);}
        }
	    for(var i=0; i<edges.length;i++){
            var row = document.createElement("tr");
            if(i%2 == 0){row.setAttribute('class','even')}
            else{row.setAttribute('class','odd')} 
            degree++;
		    var data = edges[i].data;
            // make sure the edge isn't the node (its ambigious)
            var target = data.target == response.id ? data.source : data.target;
            var target_name = this.graph.vis.node(target).data.label;
            data.weight = data.weight.match(/\d+\.\d\d\d/)[0];
            var name = document.createElement("td");
            name.setAttribute('class','name');
            var score = document.createElement("td");
            score.setAttribute('class','score');
            var a = response.id;
            var b = target;
            row.onmousedown = fnc(a,b);
            //row.onmouseout  = fnc(a,b);
            name.innerHTML = target_name;
            score.innerHTML = data.weight;
            row.appendChild(name);
            row.appendChild(score);
            table.appendChild(row);
	    }
        var bar = new Bar(new div(),"<span style='cursor:pointer;'onclick='graph.highlightNeighbors(\""+response.id+"\")'/>"
                                +"Neighbors("+degree+")</span><span style='float:right'>Score:</span>") 
        bar.div.appendChild(table);
        this.add_bar_to_tab(tab_num,bar.div);
        
    }
    catch(e){
        new Message("The details for the neighboring genes failed to load.");
        throw new Error(e);
    }
}
Menu.prototype.add_go_terms_to_tab = function(tab_num,response){
    if(graph.vis.swf() == undefined) return -1;
    var bar = new Bar(new div(),'Gene Ontology','');
    var container = new div("goTerm");
    if(response.go == 'none'){
        bar.info.replace_text('none');
    }
    else{
        var biological_process_header = new div("go_term_header");
        biological_process_header.appendChild(
            new Span("Biological Process","go_term_header_text")
        );
        var cellular_component_header = new div("go_term_header");
        cellular_component_header.appendChild(
            new Span("Cellular Component","go_term_header_text")
        );
        var molecular_function_header = new div("go_term_header");
        molecular_function_header.appendChild(
            new Span("Molecular Function","go_term_header_text")
        );
        for(var i=0;i<response.go.length;i++){
            var go_info = response.go[i].split('##');
            var box = new go_term_box(go_info);
            if(go_info[3] == 'Biological Process')
                biological_process_header.appendChild(box);
            else if (go_info[3] == 'Cellular Component')
                cellular_component_header.appendChild(box);
            else
                molecular_function_header.appendChild(box);
        }
        container.appendChild(biological_process_header);
        container.appendChild(cellular_component_header);
        container.appendChild(molecular_function_header);
    }
    bar.div.appendChild(container);
    bar.insert(this.tabs[tab_num-1]);
}
Menu.prototype.add_options_to_tab = function(tab_num){
    if(this.graph.vis == undefined){
        return;
    }
    var visualStyleObject = this.graph.style;
    this.styleObject = visualStyleObject;
    this.clear_tab(tab_num);
    /*Define the recursive function so we can print this stuff out*/
    function print_option(option){
    }
    var types = ['nodes','edges','global'];
    for(var i in types){
        var bar = new Bar(document.createElement("div"),(types[i].toString()+":"));
        bar.div.style.background = 'SteelBlue';
        bar.div.style.borderWidth = '3px';
        bar.div.style.borderStyle = 'solid';
        bar.div.style.borderColor = 'black';
        bar.div.style.color = 'black';
        this.tabs[tab_num-1].appendChild(bar.div);
        if (types[i] == undefined) continue;
        for(var j in visualStyleObject[types[i]]){
            if(visualStyleObject[types[i]][j] == undefined) continue;
            if(j == undefined) continue;
            if(typeof(visualStyleObject[types[i]][j]) != 'object'){
                this.tabs[tab_num-1].appendChild(new option_box(types[i],j,visualStyleObject[types[i]][j],this.styleObject));
            }
        }
    }
    /*Add a button that updates the style*/
    var update_btn = document.createElement("button");
    update_btn.innerHTML = "Update Style";
    var update_function = function(){
        try{
            this.graph.vis.visualStyle(this.styleObject);
            this.graph.vis.visualStyleBypass(this.graph.bypass);
        }
        catch(e){
            new Message('The Visual Style Data you entered is not valid, please check your input.'
                        +'<br>Valid entries can be found in the Help Tab.',10);
        }
    }
    var caller = this;
    update_btn.onclick = function(){update_function.call(caller)};
    this.tabs[tab_num-1].appendChild(update_btn);
    /*Add a Reset button*/
    var reset_btn = document.createElement("button");
    reset_btn.innerHTML = "Reset Style";
    var reset_function = function(){
        this.graph.vis.visualStyle(this.graph.style);
        this.graph.vis.visualStyleBypass(this.graph.bypass);
    }
    reset_btn.onclick = function(){reset_function.call(caller)};
    this.tabs[tab_num-1].appendChild(reset_btn);
}
Menu.prototype.add_enrichment_to_tab = function(tab_num){
    var bar = new Bar(document.createElement("div"),"GO Enrichment");
    var options = new div("go_load_options");
    options.id = 'go_load_options';
    var check_box_highlighted = document.createElement("input");
    check_box_highlighted.setAttribute('type',"checkbox");
    check_box_highlighted.setAttribute('id','go_enrichment_highlighted_only');
    check_box_highlighted.setAttribute('value','highlighted_nodes');
    var get_enrichment_btn = new button("Load Enrichment");
    var clear_enrichment_btn = new button("Clear");
    get_enrichment_btn.style.marginTop = "10px";
    bar.div.appendChild(check_box_highlighted);
    bar.div.appendChild(Span("Highlighted Genes Only"));
    bar.div.appendChild(br());
    bar.div.appendChild(get_enrichment_btn);
    bar.div.appendChild(clear_enrichment_btn);
    var GO_container = document.createElement("div");
    GO_container.setAttribute("id",'GO_term_container');
    GO_container.setAttribute("class","go_annotation_container");
    bar.div.appendChild(GO_container);
    var make_enrichment_ajax_call = function(){
        if(this.enrichment_loaded == true){
            new Message("An enrichment table is already loaded.");
            return;
        }
        var msg = "action=GO_enrichment&genes=";
        if($('go_enrichment_highlighted_only').checked){
            msg += this.graph.get_all_selected_node_ids().join(',');
        }
        else{
            msg += this.graph.get_all_node_ids().join(',');
        }
        /* Response for when the Ajax request comes back*/
        var respond_add_enrichment_to_tab = function(response){
            var rsp_obj = {};
            try{ rsp_obj = eval('('+response+')');}
            catch(e){new Message("Enrichment Analysis failed");return;}
            var loci_fnc_factory = function(ids_arr){
                var arr = ids_arr;
                return function(){
                    graph.update_loci_nodes(arr);
                    graph.update_visual_style();
                }
            }
            if(rsp_obj.annot !=  undefined){
                var total_database_genes = new div("number_block");
                total_database_genes.setAttribute("title","Total Genes with Annotations");
                total_database_genes.innerHTML = add_commas(rsp_obj.total_genes);
                $('GO_term_container').appendChild(total_database_genes); 
                var total_genes = new div("number_block");
                total_genes.setAttribute("title","Total Genes in Network")
                total_genes.innerHTML = graph.get_number_nodes();
                $('GO_term_container').appendChild(total_genes);
                rsp_obj.annot.sort(function(a,b){
                    return a.pval - b.pval;
                })
                /*Loop over the responses and build the table*/
                for(var i = 0; i < rsp_obj.annot.length; i++){
                    var container = new div("go_annotation");
                    var id = new div("go_id");
                    var link = document.createElement("a");
                    link.innerHTML = rsp_obj.annot[i].go_id;
                    link.setAttribute("href","http://amigo.geneontology.org/cgi-bin/amigo/term_details?term="+rsp_obj.annot[i].go_id);
                    link.setAttribute("target","_blank");
                    id.innerHTML = rsp_obj.annot[i].go_id;
                    container.appendChild(link);
                    //container.appendChild(id);
                    var pval = new div("go_pval");
                    pval.innerHTML = 
                            rsp_obj.annot[i].common + " / " 
                          + rsp_obj.annot[i].total + " / "
                          + rsp_obj.annot[i].pval;
                    pval.title = "# of genes in network in GO set / # of total genes in GO set / p-value";
                    container.appendChild(pval);
                    var name = new div("go_name");
                    name.innerHTML = rsp_obj.annot[i].name;
                    container.appendChild(name);
                    var desc = new div("go_desc");
                    desc.innerHTML = rsp_obj.annot[i].desc;
                    container.appendChild(desc);
                    var ids_array = rsp_obj.annot[i].common_ids.split(",");
                    var view = document.createElement("div");
                    view.setAttribute('class','go_show');
                    view.innerHTML = "<< show";
                    view.onclick = loci_fnc_factory(ids_array);
                    container.appendChild(view);
                    $('GO_term_container').appendChild(container);
                }
                this.enrichment_loaded = true;
            }
            else{
                new Message('There was no enrichment found for the current network.');
            }
        }
        var caller = this;
        this.graph.ajax.snd_msg(msg,
            function(response){respond_add_enrichment_to_tab.apply(caller,[response])}
        );
    }
    var caller = this;
    get_enrichment_btn.onclick = function(){make_enrichment_ajax_call.call(caller)};
    clear_enrichment_btn.onclick = function(){
        if($('GO_term_container')){
            while($('GO_term_container').hasChildNodes()){
                $('GO_term_container').removeChild($('GO_term_container').firstChild);
            }
            caller.enrichment_loaded = false; 
        }
    };
    //add the beautiful bar to the tab specified
    this.tabs[tab_num-1].appendChild(bar.div);
}
/* Add a inteface to which lables are visible*/
Menu.prototype.add_labels_to_tab = function(tab_num){
    var bar = new Bar(document.createElement("div"),"Change Visible Labels",'');
    var drop_down = document.createElement("select");
    drop_down.add(new Option('Default','label'),null);
    drop_down.add(new Option('GRMZ Only','GRMZ'),null);
    drop_down.add(new Option('Locus','loci'),null);
    drop_down.add(new Option('Common Only','common'),null);
    drop_down.add(new Option('Arabidopsis Orthologs','arab'),null);
    drop_down.add(new Option('Arabidopsis Short Descriptions','arab_short'),null);
    var change_labels = function(menu){
        var type = menu.options[menu.selectedIndex].value;
        this.graph.get_labels(type);
    }
    var caller = this;
    drop_down.onchange = function(){change_labels.apply(caller,[drop_down])}
    bar.div.appendChild(drop_down);
    this.tabs[tab_num-1].appendChild(bar.div);
}
Menu.prototype.add_flip_to_tab = function(tab_num){
    var bar = new Bar(document.createElement("div"),"Change Visible Interactions");
    var drop_down = document.createElement("select");
    drop_down.style.width = '80%';
    drop_down.add(new Option('-----Select From Below------',''),null);
    drop_down.add(new Option('Maize Genotypes Only','maize'),null);
    drop_down.add(new Option('Teosinte Genotypes Only','teosinte'),null);
    drop_down.add(new Option('All Genotypes','genotype'),null);
    drop_down.add(new Option('Developmental Genotypes Only','development'),null);
    var change_labels = function(menu){
        var type = menu.options[menu.selectedIndex].value;
        this.graph.get_network(type);
    }
    var caller = this;
    drop_down.onchange = function(){change_labels.apply(caller,[drop_down])}
    bar.div.appendChild(drop_down);
    this.tabs[tab_num-1].appendChild(bar.div);
}
/*a loci filter object*/
Menu.prototype.filter_loci = function(chr,start,finish){
     // there are 10 chromosomes.
    var drop_down = document.createElement("select");
    drop_down.style.minWidth = '30px';
    for(var i = 1; i <= 10; i++){
        drop_down.add(new Option(i.toString(),i.toString()),null);
    }
    // the bp ranges can be literally anything!
    var range = document.createElement("input");
    range.type = 'text';
    if(chr != undefined && start != undefined && finish != undefined){
        drop_down.selectedIndex = chr-1;
        range.value = start + '..' + finish 
    }
    range.title = "e.g. 100 .. 500";
    // make a thing so we can just throw everything away just because we 
    // arenet sure about things. just willy nilly.
    var drop_btn = document.createElement('a');
    drop_btn.setAttribute("class","loci_drop_btn");
    drop_btn.innerHTML = "X";
    var drop = function(){
        $('filter_loci').removeChild(drop_btn.parentNode);
    }
    drop_btn.onclick = drop;
    // add a button for just single show
    var show_btn = new button("Show");
    var caller = this;
    var show = function(){
        graph.menu.select_filter_loci(this);
    }
    show_btn.onclick = show;
    //put everything in the container
    var loci_bar = new div();
    loci_bar.setAttribute("class",'filter');
    loci_bar.appendChild(drop_btn); 
    loci_bar.appendChild(drop_down);
    loci_bar.appendChild(range);
    loci_bar.appendChild(show_btn);
    return loci_bar;
}

Menu.prototype.clear_loci_filter = function(){
    while(this.locus_list.hasChildNodes()){
      this.locus_list.removeChild(this.locus_list.firstChild)
    }
}

Menu.prototype.add_filter_by_locus = function(tab_num){
    // create the new bar
    var bar = new Bar(document.createElement("div"),
        'View Specific Locus'
    );
    // create a holder for all the ranges
    var locus_list = document.createElement("div");
    this.locus_list = locus_list;
    locus_list.id = 'filter_loci';
    // add a button so we can dynamically add ranges
    var add_button = new button('Add More Loci');
    // add a button to do an import
    var import_button = new button('Import Loci List');
    // this is the logic that adds the thigns necessary for the ranges?
    var caller = this;
    var add_loci = function(){
           locus_list.appendChild(caller.filter_loci());
    }
    add_button.onclick = add_loci;
    import_button.onclick = function(){
        graph.menu.port.show_import("Enter One Region per line. example: chr1:1000..2000");
        graph.menu.port.set_import_function(graph.menu.port.loci_import)
    }
    // set the standard layout
    bar.div.appendChild(add_button);
    bar.div.appendChild(import_button);
    locus_list.appendChild(this.filter_loci());
    bar.div.appendChild(locus_list);
    // now add the button that highlights the nodes
    var show_button = new button('Show All Loci');
    var caller = this;
    // set the click event to be called in the object context
    show_button.onclick = function(){
            graph.menu.select_all_filter_loci();
    };
    var clear_button = new button("Clear all Loci");
    clear_button.onclick = function(){caller.clear_loci_filter.call(caller)}
    bar.div.appendChild(show_button)
    bar.div.appendChild(clear_button)
    this.tabs[tab_num-1].appendChild(bar.div); 
}
Menu.prototype.select_filter_loci = function(btn){
        btn.parentNode.style.background = '';
        var filter = btn.parentNode;
        var chromo = filter.children[1].value;
        var start  = filter.children[2].value.split("..")[0];
        var end  = filter.children[2].value.split("..")[1];
        if(start != null && end != null){
            extracted = [chromo,start,end];
        }
        else{
            new Message("The input : '"+filter.children[2].value+"' doesn't make sense, try the form: '100..1000'");
            return;
        }
        //set up the ajax to get genes in the range
        var caller = this;
        var rsp_func = this.respond_add_filter_by_locus;
        this.graph.ajax.snd_msg(
            this.graph.ajax.obj_to_post(
                {'action':'loci_filter',
                 'loci':JSON.stringify(extracted),
                 'nodes':this.graph.get_all_node_ids(), 
                }),
                function(response){
                    found = rsp_func(eval(response),btn);
                    return found;
                }
        );
}
Menu.prototype.select_all_filter_loci = function(){
    if(this.locus_list.hasChildNodes()){
        var child = this.locus_list.firstChild;
        var all_gene_found_in_loci = new Array();
        while(child){
            found = graph.menu.select_filter_loci(child.children[3]);
            child = child.nextSibling;
            all_gene_found_in_loci = all_gene_found_in_loci.concat(found)
        }
        graph.update_loci_nodes(all_gene_found_in_loci);
        graph.update_visual_style();
    }
    else{
        new Message("There are no locus filters")
    }
}
Menu.prototype.respond_add_filter_by_locus = function(response,btn){
        try{
            var found = JSON.parse(response);
            if(found.length == 0){
                btn.parentNode.style.background = "#88224A"; 
            }
            else{
                btn.parentNode.style.background = "SteelBlue";
                graph.update_loci_nodes(found);
                graph.update_visual_style();
            }
            return found;
        }
        catch(e){
            new Message('The range didn\'t make sense to me, try the form 1:100..900');
        }
}
Menu.prototype.footer_nodes = function(size){
    $('footer_nodes').innerHTML = "Nodes: "+size;
}
Menu.prototype.footer_edges = function(size){
    $('footer_edges').innerHTML = "Edges: "+size;
}
Menu.prototype.footer_current_network = function(name){
    $('footer_current_network').innerHTML = "Current Network: "+name;
}
Menu.prototype.add_layout_to_tab = function(tab_num){
    var bar = new Bar(document.createElement("div"),"Change Network Layout");
    var drop_down = document.createElement("select");
    drop_down.add(new Option('Default','Preset'),null);
    drop_down.add(new Option('Force Directed','ForceDirected'),null);
    drop_down.add(new Option('Circle','circle'),null);
    drop_down.add(new Option('Tree','Tree'),null);
    drop_down.add(new Option('Radial','Radial'),null);
    var change_layout = function(menu){
        var type = menu.options[menu.selectedIndex].value;
        if(type=='Preset'){
            var opt = graph.layout.options;
        }
        else{
            var opt = {};
        }
        var new_layout = {
                name: type,
                options : opt,
            }
        this.graph.vis.layout(new_layout);
        this.graph.vis.update_visual_style(this.graph.style)
    }
    var caller = this;
    drop_down.onchange = function(){change_layout.apply(caller,[drop_down])}
    bar.div.appendChild(drop_down);
    this.tabs[tab_num-1].appendChild(bar.div);
}
Menu.prototype.add_arab_desc_to_tab = function(tab_num, response){
    var bar = new Bar(document.createElement("div"),"Arabidopsis Ortholog",'');
    /*if no annotations just stop here*/
    if(response.arab_name === undefined){
        bar.info.replace_text("No Arabidopsis Ortholog was found.");
    }
    else{
        var desc_container = new div();
        desc_container.setAttribute('class','arab_desc');
         function arab_title(text){
            var title_span = new Span(); 
            title_span.innerHTML = text;
            title_span.setAttribute('class','arab_title');
            return title_span;
        }
        function arab_text(text){
            var title_span = new Span();
            if(text == undefined) 
                title_span.innerHTML = 'none';
            else
                title_span.innerHTML = text;
            title_span.setAttribute('class','arab_text');
            return title_span;
        }       
        desc_container.appendChild(arab_title("Name:"));
        desc_container.appendChild(arab_text(response.arab_name));
        desc_container.appendChild(arab_title("Type:"));
        desc_container.appendChild(arab_text(response.type_name));
        desc_container.appendChild(arab_title("Short Description:"));
        desc_container.appendChild(arab_text(response.short_desc));
        desc_container.appendChild(arab_title("Curator Description:"));
        desc_container.appendChild(arab_text(response.curator_desc));
        desc_container.appendChild(arab_title("Computational Description:"));
        if(response.comp_desc != undefined){
            var cmp_desc = response.comp_desc.split(';');
            for(var i=0;i<cmp_desc.length;i++){
                desc_container.appendChild(arab_text(cmp_desc[i]));
            }
        }
        bar.div.appendChild(desc_container);
    }
    bar.insert(this.tabs[tab_num-1]); 
}
Menu.prototype.show_about = function(){
    if(this.collapsed){
        this.toggle_collapse();
        this.show_tab(6);
    }
    else if(this.current_tab_ind+1 != 6){
        this.show_tab(6);
    }
    else{
        this.show_tab(1);
        this.toggle_collapse();
    }
}
// This gets called when you go a requery and you need to reset
// some of the global variables and perform cleanups and such
Menu.prototype.reset = function(){
    this.enrichment_loaded = false;
    // remove the returned gene list
    if($('gene_list_summary')){
        var gene_list_div = $('gene_list_summary');
        gene_list_div.parentNode.removeChild(gene_list_div);
    }
}
Menu.prototype.add_edge_filter_to_tab = function(tab_num){
    var bar = new  Bar(new div(),"Filter by Edge Weight",'');
    bar.insert(this.tabs[tab_num-1]);
    var slide = new div();
    bar.div.appendChild(slide);
    var filter_number = new div("offsetBox");
    var filter_value = new Span("10","numbers");
    filter_value.id = "edge_filter_value";
    filter_number.appendChild(filter_value);
    slide.appendChild(filter_number); 
    slider(slide,0,288,10,
        function(val){
                var block_size = (275/7);
                if(val == 'Max'){
                    $('edge_filter_value').innerHTML = "10";
                }
                else{
                    $('edge_filter_value').innerHTML = parseInt(val/block_size)+3;
                }
        }
    );
}
// This adds a gene list summary to the menu
Menu.prototype.add_gene_list_to_tab = function(tab_num){
    var bar = new Bar(new div(),"Gene List<span style='float:right'>Degree</span>",'');
    // is there already a gene list?
    bar.insert(this.tabs[tab_num-1]);
    // Set the bar Id
    bar.div.setAttribute("id","gene_list_summary");
    // grab the node labels
    var node_labels = graph.get_node_labels();
    var table = document.createElement("table");
    // Need a closure here so we get a seperate function for each node
    var highlight_node = function(id){
        return function(){graph.highlightNode(id);}
    }
    table.setAttribute('class','neighbor');
    for(var i = 0; i < node_labels.length; i++){
        var row = document.createElement("tr");
        if(i%2 == 0){row.setAttribute('class','even')}
        else{row.setAttribute('class','odd')}
        var name = document.createElement("td");
        name.setAttribute("class","name");
        name.innerHTML = node_labels[i].label;
        name.onclick = highlight_node(node_labels[i].id);
        var degree = document.createElement("td");
        degree.setAttribute("class","score");
        degree.innerHTML = node_labels[i].degree;
        row.appendChild(name);
        row.appendChild(degree);
        table.appendChild(row);
    }
    bar.div.appendChild(table);
}

Menu.prototype.toggle_table = function(){
    if(graph.vis.swf()==undefined){
        new Message("You need to enter a query first!");
        return;
    }
    this.graph.table.toggle_visibility();
}

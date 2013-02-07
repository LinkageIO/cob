////////////////////////////////////////
//////		Cytoscape	///////
///////////////////////////////////////
/* Set options for cytoscape object */
options = {
	    // where you have the Cytoscape Web SWF
	    swfPath: "cytoscape_web/CytoscapeWeb",
	    // where you have the Flash installer SWF
	    flashInstallerPath: "./cytoscape_web/playerProductInstall",
	    flashAlternateContent:"Flash is necessary to use this applet",
};

    /* Constructor  */
function Graph(){
	/* Global cytoscape object */
	/* The graph object gets a ajax object! */
    this.vis = new org.cytoscapeweb.Visualization("cytoscapeweb",options);
    this.vis["customToolTip"] = function(data){
        var tooltipString = '';
        if(data.GRMZ != undefined) tooltipString += data.GRMZ;
        if(data.common != '') tooltipString += '<br>'+data.common;
        if(data.loci != undefined) tooltipString += '<br>'+data.loci;
        if(data.arab != undefined) tooltipString += '<br>'+data.arab;
        if(data.arab_short != undefined) tooltipString += '<br>'+ data.arab_short;
        return tooltipString;
    }
    this.vis["customEdgeOpacity"] = function(data){
        return (data.weight / 10 );   
    }
	/* Ititialize the object */
	/* Set style for object default visible network is maize */ 
    this.edgeMapper = {
        attrName: "type",
        entries : [
            { attrValue: "main", value: 0.9 },
            { attrValue: "flip", value: 0.0  },
        ]
    };
    this.bypass = {nodes:{}, edges:{}};
    this.queried_style = {
	    color: "#88224A",
        borderColor: "#000000",
    };
    this.details_style = {
        borderColor: "#09BA00",
        borderWidth: 4,
    };
    this.detailed_query = {
        borderColor: "#09BA00",
        borderWidth: 4,
	    color: "#88224A",
    };
    this.loci_style = {
        borderColor: "#4682B4",
        borderWidth: 5,
        opacity: 1.0,
    }
    this.loci_query = {
        borderColor: "#4682B4",
        borderWidth: 5,
        color: "#88224A",
        opacity: 1.0,
    }
    // just the regular style
	this.style = {
		 global: {
		     backgroundColor: "#FFFFFF",
		     tooltipDelay: 500
		 },
		 nodes: {
			size: 36,
		    shape: "ELLIPSE",
		    color: "#144566",
            opacity: 0.8,
		    borderColor: "#000000",
            borderWidth: 1,
			labelFontColor: "#000000",
            labelFontSize: 11,
			labelHorizontalAnchor: 'right',
			labelVerticalAnchor: 'bottom',
            tooltipText: {customMapper : {functionName : "customToolTip"}},
            selectionGlowStrength: 0,
            selectionColor: "#000000",
		 },
		 edges: {
		    color: "#45483F",
            curvature : 0,
            style: "SOLID",
		    width : 2,
		    tooltipText: "${weight}",
            //opacity : .15,
            opacity : {customMapper : {functionName: "customEdgeOpacity"}},
            selectionGlowStrength: 32,
            selectionOpacity: 1, 
		  }
	};
    /*Store the default layout options*/
    this.layout = {
        name : "Preset",
        options: {
            fitToScreen : true,
            points : [],
        }
    }
    this.layout_old = {
        name : "ForceDirected",
        options :{
            drag : 0.2,
            gravity: 200,
            tension : 0.005,
            maxDistance : 5000, 
            iteration : 600,
            maxTime : 10000,
            restLength : 3000,
        }
    }
    /*Store various labels in*/
    this.labels = [];
    this.detailed_node = '';
    this.queried_nodes = {};
    this.detailed_same_as_queried = 0;
    this.loci_nodes = {};
    this.loci_same_as_queried = 0;
    // We want a table view also
    this.table = new Table($("cob_table"))
} // end constructor

/* Graph Prototypes */
Graph.prototype.ajax = new Ajax('cytoweb.php');
Graph.prototype.get_nodes = function(){
    if(this.vis.swf() === undefined) return false;
    var t = this.vis.nodes();
    return t;
}
Graph.prototype.update_detailed_node = function(id){
    /*Logic for removing the old node*/
    if(this.detailed_node != ''){
        if(this.queried_nodes[this.detailed_node] == 1){
            this.bypass['nodes'][this.detailed_node] = this.queried_style;
        }
        else{
            delete this.bypass['nodes'][this.detailed_node];
        }
    }
    /*Logic for setting the new node*/
    if(this.queried_nodes[id] == 1){
        // these guys are chenging the 
        this.bypass['nodes'][id]=this.detailed_query;
    }
    else{
        this.bypass['nodes'][id]=this.details_style;
    }
    this.detailed_node = id;
}
Graph.prototype.update_loci_nodes = function(id_array){
    if(isEmpty(this.loci_nodes) == false){
        for(var key in this.loci_nodes){
            if(this.loci_nodes.hasOwnProperty(key)){
                if(this.queried_nodes[key] == 1){
                    this.bypass['nodes'][key] = this.queried_style;
                }
                else{
                    delete this.bypass['nodes'][key];
                }
            }
        }
    }
    for(var i=0;i<id_array.length;i++){
        if(this.queried_nodes[id_array[i]]==1){
            this.bypass['nodes'][id_array[i]]=this.loci_query;
        }
        else{
            this.bypass['nodes'][id_array[i]]=this.loci_style;
        }
        this.loci_nodes[id_array[i]] = 1;
    }
}
/*quickly refresh the visual style*/
Graph.prototype.update_visual_style = function(new_obj){
    if(this.vis === undefined) return false;
    try{
        this.vis.visualStyle(new_obj !== undefined ? new_obj : this.style);
    }
    catch(e){
        new Message('The image could not be updated.');
        throw new Error(e);
    }
    // make sure we redraw the queried nodes
    this.vis.visualStyleBypass(this.bypass);
}
Graph.prototype.find_node_degree = function(node){
    if(this.vis.swf() === undefined) return false;
    return 1;
	var neighbors = graph.vis.firstNeighbors([node.data.id]);
	var edges = neighbors.edges;
	return edges.length;
}	
Graph.prototype.initialize_cytoscape = function(ret_ajax){
    try{
        var ret_ajax = eval('('+ret_ajax+')');
        window.a = ret_ajax;
    }
    catch(e){
        hideGrow();
        new Message('A Critical Error Occured.');
        throw new Error(e);
    }
    if(ret_ajax.action == 'error'){
        if(ret_ajax.err_msg == 'no edge matches'){
            hideGrow();
            new Message('Sorry! There were no matches for the gene(s) you entered in out Database.');
            return;
        }
    }
    else 
    var nm  = ret_ajax.nm;
	// this is function that utilized the ready portion of the network
	// This also shows how to add context menus to a node 
	this.vis.ready(function(){
		/*There is a funky scope issue where we need access to
	  	the specific graph object*/
		graph.vis.addContextMenuItem("Remove","nodes",
			function(evt){
				graph.vis.removeNode(evt.target);
			}
		);		// Grab the query nodes 		
		var q_nodes = ret_ajax.query_names;
		// remove leading and trailing delims
		q_nodes = q_nodes.replace(/^#|#$/g,'');
		var q_nodes_list = q_nodes.split(/##/);
        /*This will keep the query nodes whenever we update style*/
		for(node in q_nodes_list){
			var n = q_nodes_list[node];
			graph.bypass['nodes'][n] = graph.queried_style;
            graph.queried_nodes[n] = 1;
		}
        // resolve the queries that weren't in the database
        if(ret_ajax.no_id != undefined){
            var no_id = ret_ajax.no_id;
            no_id = no_id.replace(/^#|#$/g,'');
            var no_id_list = no_id.split(/##/);
		    if(no_id_list.length > 0){
                new Message("The gene(s) "+no_id_list.join(", ")+' were not found in our Database.',20);
            }
        }
        if(ret_ajax.total > 65){
        new Message("There were a total of  "+ ret_ajax.total 
                    + ' coexpressed genes found, only top '+
                    + graph.vis.nodes().length+" genes are show, see table for full list");
        }
        // ready is a callback for the vis object
        $('gene_info').scrollTop = 0;
        // Put the number of nodes in the footer
        graph.menu.show();
		graph.vis.visualStyleBypass(graph.bypass);
        try{
            graph.table.import_network(nm);
            graph.menu.footer_nodes(graph.vis.nodes().length);
            graph.menu.footer_edges(graph.vis.edges().length);
            graph.menu.footer_current_network(ret_ajax.source);
            graph.current_network = ret_ajax.source;
            graph.menu.clear_tab(3);
            graph.menu.add_labels_to_tab(3);
            graph.menu.add_filter_by_locus(3);
            graph.menu.add_enrichment_to_tab(3);
            graph.menu.add_flip_to_tab(3);
            graph.menu.add_layout_to_tab(3);
            graph.menu.add_gene_list_to_tab(1);
        }catch(e){
            new Message(e)
        }
	});
	// This is just playing around with listeners
    var graph = this;
	this.vis.addListener("click","nodes",function(evt){
		var node = evt.target;
		graph.get_node_details(node);
	});
    /*Add the points for the layout*/
    this.layout.options.points = ret_ajax.coor;
	/*Finally draw the network*/
	this.vis.draw({ network: nm, visualStyle: this.style, nodeTooltipsEnabled: true, edgeTooltipsEnabled: true, layout : this.layout});
    hideGrow();
    if($('cytoscapeweb').children.length == 0){
        new Message("Sorry! It doesn't look like Flash is installed on your system. Flash is needed to run COB. It can be obtained <a href='http://www.adobe.com/support/flash/downloads.html'>Here</a>");
    }
    /*Set which ones are the flip and main network*/

}// End initialize_cytoscape

/************************
* This is a dispatch table that executes functions below from messages we recieve from
*	the ajax object 
**************************/
Graph.prototype.respond = function(response){
	/* Eval the response and error out if it doesnt work */
	var res_str;
	try{
		res_str = eval('('+response+')');
		/*another dispatch table*/
		this[res_str.action](res_str);	
	}
	catch(e){
		/* something bad happened */
		throw new Error(alert('A response came back but didnt make sense '+e));
	}
}
Graph.prototype.get_current_network = function(){
    if(this.vis === undefined) return false;
    return this.current_network;
}
/* seed -- Rob
 *  Start a network
 * */
Graph.prototype.seed = function(alt_query,alt_source){
    this.bypass.nodes = {};
	// Close the autocomplete div
	$("autocomplete").style.visibility = 'hidden';
	// Calculate which radio button is clicked
	source = document.getElementById('database_source');
	var results_source = alt_source == null ? source.options[source.selectedIndex].value : alt_source;
	/* Get the comman seperated list */
	var query = alt_query == null ? document.getElementById('query_genes').value : alt_query;
	// Get the new Graph object
	var msg_string = new String();
    var neighborhood_size = $('offsetNumber').innerHTML == 'Max' ? 65 : $('offsetNumber').innerHTML;
	msg_string = graph.ajax.obj_to_post({
						'results_source':results_source.toString(),
						'action':'seed',
						'q_list':query.toString(),
                        'neighborhood_size' : neighborhood_size,
						});
    var caller = this;
	/* Send the request for the seed and then res = functionpond with appropriate function */
    showGrow();
    /* Reset the menu so we can load fresh data  */
    this.menu.reset();
    graph.ajax.abort_all();
	graph.ajax.snd_msg(msg_string,
	    function(response){caller.initialize_cytoscape.apply(caller,[response])}
    );
}
Graph.prototype.seed_selected = function(){
    if(this.vis.swf() === undefined) return false;
    var node_elements = this.vis.selected('nodes');
    if(node_elements.length == 0){
        new Message("No genes are selected.");
    }
    else{
        for(var i=0;i<node_elements.length;i++){
            node_elements[i] = node_elements[i].data.GRMZ;
        }
        $('query_genes').value = node_elements.join(',');
        this.seed(node_elements);
    }
}
/*We want all the nodes in the graph as an array of strings*/
Graph.prototype.get_all_node_ids = function(){
    if(this.vis.swf() === undefined) return false;
    var nodes = [];
    for(i in a=this.vis.nodes()){
        nodes[i] = a[i].data.id;
    }
    return nodes;
}
Graph.prototype.get_all_selected_node_ids = function(){
    if(this.vis.swf() === undefined) return false;
    var nodes = [];
    for(var i in a=this.vis.selected('nodes')){
        nodes[i] = a[i].data.id;
    }
    return nodes;
}
Graph.prototype.get_all_node_GRMZ = function(){
    if(this.vis.swf() === undefined) return false;
    var nodes = [];
    for(i in a=this.vis.nodes()){
        nodes[i] = a[i].data.GRMZ;
    }
    console.log(nodes.join(","))
    return nodes;
}
Graph.prototype.get_all_selected_node_GRMZ = function(){
    if(this.vis.swf() === undefined) return false;
    var nodes = [];
    for(var i in a=this.vis.selected('nodes')){
        nodes[i] = a[i].data.GRMZ;
    }
    console.log(nodes.join(","))
    return nodes;
}
/* get_node_details -- Rob
 *  This retrieves the details for a node from the database
 * */
Graph.prototype.get_node_details = function(node){
    if(this.vis.swf() === undefined) return false;
	var msg_str = this.ajax.obj_to_post({
		'action' : 'get_node_details',
		'node'   : node.data.id,
        'source' : this.get_current_network(), 
	});
    var caller = this;
    var respond_get_node_details = function(response){
        try{response = eval("("+response+")")}catch(e){throw new Error(e);}
        // clear all the edge and details data
        if(!this.menu) return;
        this.menu.clear_tab(2);
        this.menu.show_tab(2);
        this.highlightedEdges = [];
        /*Make a special highlight for the detailed node*/
        this.update_detailed_node(response.id);
        this.update_visual_style();
        /*Create the appropriate name text*/
        var name = response.common ? response.name + " - " + response.common
                                   : response.name + " - (no common name)";
        name += "<br>Genome Degree - " + response.degree;
        this.menu.add_info_to_tab(2,{'title':'Gene:','info': name});
        if(response.chromosome){
            this.menu.add_loci_to_tab(2,response);
        }
        var neighbors = this.vis.firstNeighbors([response.id]);
        var edges = neighbors.edges;
        this.menu.add_neighbors_to_tab(2,edges,response);
        this.menu.add_go_terms_to_tab(2,response);
        this.menu.add_arab_desc_to_tab(2,response);
        this.menu.add_link_to_tab(2,{'href':"http://www.maizegdb.org/search/search.php?term="+response.name,
                  'text':'Outlink to Maize GDB'
         });
    }
	this.ajax.snd_msg(msg_str, function(response){respond_get_node_details.apply(caller,[response])});
}
/* unhighlightEdge -- Rob
 * Unhighlights an edge if it is highlighted 
 * */
Graph.prototype.unhighlightEdge = function(source,target){
    if(this.vis.swf() === undefined) return false;
    var obj = this.edgeHighlighted(source,target);
    if(obj){
        delete this.highlightedEdges[target+','+source];
        delete this.highlightedEdges[source+','+target];
        this.vis.deselect("edges",[obj.id]);    
    }
}
/* highlightEdge -- Rob
 * highlights an edge as well as highlights a tag element
 * It also works as a toggle function
 * */
Graph.prototype.highlightEdge = function(source,target){
    /*This will make it 'toggle'*/
    if(this.edgeHighlighted(source,target)){
        this.unhighlightEdge(source,target)
        return;
    }
    this.highlightedEdges[target+','+source]={};
    var source_node = this.vis.node(source);
    var edges = this.vis.firstNeighbors([source_node]).edges;
    for(i in edges){
        if(edges[i].data.target == target 
         ||edges[i].data.source == target){
            this.vis.select([edges[i]]);
            this.highlightedEdges[target+','+source]['id'] = edges[i].data.id; 
        }
    }
}
/* edgeHighlighted -- Rob
 * returns false if the edge is not highlighted
 * otherwise it returns the tag element that is highlighted
 * */
Graph.prototype.edgeHighlighted = function(source,target){
    if(this.highlightedEdges[source+','+target]!=undefined){
        return this.highlightdEdges[source+','+target];
    }
    else if(this.highlightedEdges[target+','+source]!=undefined){
        return this.highlightedEdges[target+','+source];
    }
    else{
        return false;
    }
}

/* highlightNeighbors -- Rob
 * Highlights all the edges of a node
 */
Graph.prototype.highlightNeighbors = function(source){
    this.vis.deselect("edges");
    var source_node = this.vis.node(source);
    var edges = this.vis.firstNeighbors([source_node]).edges;
    this.vis.select(edges)
}
// Retrieve a different set of labels for the 
// nodes in the network
Graph.prototype.get_labels = function(type){
    var nodes = this.get_all_node_ids();
    var msg_str = this.ajax.obj_to_post({
        'action' : 'get_labels',
        'type'   : type,
        'nodes' : nodes.toString(),
    });
    var caller = this;
    /* Define the rather long response function */
    var respond_get_labels = function(res_str,new_label_type){
        var response;
        try{response = eval('('+res_str+')')}
        catch(e){throw new Error('Could not retrieve loci')}
        var updated_nodes = this.vis.nodes();
        if(new_label_type == 'loci'){   
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;
                if(response[iter_id] == undefined) continue;
                updated_nodes[i].data.label  = 'Chr: '+response[iter_id].chr + " : "; 
                updated_nodes[i].data.label += add_commas(response[iter_id].s); 
                updated_nodes[i].data.label += '..'+add_commas(response[iter_id].e);
                updated_nodes[i].data.loci = "Chr"+response[iter_id].chr
                                            +":"+add_commas(response[iter_id].s)
                                            +".."+add_commas(response[iter_id].e);
            }
        }
        else if(new_label_type == 'GRMZ'){
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;  
                updated_nodes[i].data.label = updated_nodes[i].data.GRMZ;
            } 
        }
        else if(new_label_type == 'label'){
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;  
                updated_nodes[i].data.label = updated_nodes[i].data['default'];
            } 
        }
        else if(new_label_type == 'common'){
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;  
                updated_nodes[i].data.label = updated_nodes[i].data.common;
            } 
        }
        else if(new_label_type == 'arab'){
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;  
                if(response[iter_id] === undefined){
                    updated_nodes[i].data.label = "No Ortholog Found";
                    updated_nodes[i].data.arab = "No Arabidopsis Ortholog";
                }
                else{
                    if(response[iter_id].n === null){
                        updated_nodes[i].data.label = 'Blank Ortholog';
                        updated_nodes[i].data.arab = "No Arabidopsis Ortholog";
                    }
                    else{
                        updated_nodes[i].data.label = response[iter_id].n;
                        updated_nodes[i].data.arab
                            = "Arabidopsis Ortholog: " + response[iter_id].n;
                    }
                }
            } 
        }
        else if(new_label_type == 'arab_short'){
            for(var i in updated_nodes){
                var iter_id = updated_nodes[i].data.id;  
                if(response[iter_id] === undefined){
                    updated_nodes[i].data.label = "No Ortholog Found";
                    updated_nodes[i].data.arab_short = "No Arabidopsis Short Description";
                }
                else{
                    if(response[iter_id].d === null){
                        updated_nodes[i].data.label = 'Otholog Exists -- No Description';
                        updated_nodes[i].data.arab_short = "No Arabidopsis Short Description";
                    }
                    else{
                        updated_nodes[i].data.label = response[iter_id].d;
                        updated_nodes[i].data.arab_short 
                            = "Arabidopsis Short Description: " + response[iter_id].d;
                    }
                }
            } 
        }
        this.vis.updateData(updated_nodes);
        hideGrow();
    }
    showGrow();
    this.ajax.snd_msg(msg_str, 
        function(response){
            respond_get_labels.apply(caller,[response,type])
        }
    );
}
/*Get edges for a certain network*/
Graph.prototype.get_network = function(type){
    var respond_get_network = function(response){
        try{response = eval('('+response+')')}catch(e){throw new Error(e);}
        graph.vis.removeElements("edges");
        for(var i=0;i<response.length;i++){
            var edge = response[i];
            var data = {
                'source' : edge[0],
                'target' : edge[1],
                'weight' : edge[2],
            };
            var edge = this.vis.addEdge(data, false);
        }
        this.update_visual_style();
        this.menu.footer_edges(this.vis.edges().length);
        this.menu.footer_current_network(type);
        this.menu.footer_current_network(type);
        hideGrow();
    }
    var msg_str = this.ajax.obj_to_post({
        'action':'get_network',
        'type': type,
        'nodes' : this.get_all_node_ids().toString(),
    });
    var caller = this;
    showGrow();
    this.ajax.snd_msg(msg_str,
        function(response){
            respond_get_network.apply(caller,[response]);
        }
    );
}
Graph.prototype.highlightNodes = function(nodes){
   graph.vis.select('nodes',nodes);
}
Graph.prototype.get_number_nodes = function(){
    return this.vis.nodes().length;
}
Graph.prototype.clear_annotations = function(){
    if(this.vis.swf() === undefined){
         new Message("A network must be loaded to use this function.");
         return;
    }
    this.vis.deselect();
    this.update_loci_nodes([]);
    this.update_detailed_node();
    this.update_visual_style();
}
Graph.prototype.remove_highlighted_nodes = function(){
    if(this.vis.swf() === undefined){
        return new Message("There must be a network loaded to remove nodes");
    }
    else if (graph.vis.selected().length == 0){
        return new Message("No nodes are selected");
    }
    else{
        for(a in (b= graph.vis.selected())){
            graph.vis.removeNode(b[a])
        }
    }
}
Graph.prototype.get_node_labels = function(){
    var nodes = this.vis.nodes();
    var labels = new Array();
    for(var i = 0; i < nodes.length; i++){
        labels.push({
                "label":nodes[i].data.label,
                "degree":graph.find_node_degree(nodes[i]),
                "id" : nodes[i].data.id,
        });
    }
    return labels.sort(
        function(a,b){
            return b.degree - a.degree;
        }
    );
}
Graph.prototype.highlightNode = function(id){
     this.vis.select("nodes",[id]);
}
Graph.prototype.highlight_nodes_from_csv = function(nodes_csv){
    var nodes = nodes_csv.split(",");
    
}

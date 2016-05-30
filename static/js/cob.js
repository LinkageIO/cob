/*--------------------------------
      Table Event Listeners
---------------------------------*/
$(document).ready(function(){
// A row on the Ontology Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Save the selected row
  CurrentOntology = $('td', this).eq(0).text();
  
  // Clean up the old Term Table
  CurrentTerm = '';
  $('#TermTable').DataTable().destroy();
  $('#TermTable').addClass('hidden');
  $('#TermWait').removeClass('hidden');
  
  // Clean up the Network Table
  CurrentNetwork = '';
  $('#NetworkTable').DataTable().destroy();
  $('#NetworkTable').addClass('hidden');
  $('#NetworkWait').removeClass('hidden');
  
  // Clean up the graph
  $('#cy').addClass('hidden');
  $('#cyWait').removeClass('hidden');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the new Term Table
  tableMaker('Term');
});

// A row on the Term Table is selected
$('#TermTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  CurrentTerm = $('td',this).eq(0).text();
  
  // Clean up the graph
  $('#cy').addClass('hidden');
  $('#cyWait').removeClass('hidden');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the network table
  tableMaker('Network');
});

// A row on the Network Table is selected
$('#NetworkTable tbody').on('click','tr',function(){
    // Highlight the current line
    CurrentNetwork = $('td',this).eq(0).text();

    // Unhide the graph
    $('#cyWait').addClass('hidden');
    $('#cy').removeClass('hidden');
    
    // Get Netwrok Data and build graph after the wait dialog is up
    $("#cytoWait").one('shown.bs.modal', function(){
      $.getJSON($SCRIPT_ROOT + 'COB/' + CurrentNetwork + '/' + CurrentOntology + '/' + CurrentTerm).done(function(data){
        console.log('Recieved Data');
        cyDataCache = data;
        buildGraph();
      });
    });
    $("#cytoWait").modal('show');
  });
});

/*--------------------------------
     Parameter Event Listener
---------------------------------*/
// Update Graph with new params
$('#updateButton').click(function (){
    // If there isn't a graph, it can't be updated
    if(cy == null){return;}
    
    // Otherwise pull up the wait dialog and run the algrithm
    $("#cytoWait").one('shown.bs.modal', function(){buildGraph();});
    $("#cytoWait").modal('show');
    return;
});

/*--------------------------------
         Table Constructor
---------------------------------*/
function tableMaker(section){
// Function to me make the table out of the analysis database
  // Keep the user updated on progress
  $('#'+section+'Wait').addClass("hidden");
  
  // Find the address for each table, this will be deprecated after server improvements
  if(section == 'Ontology'){
    var address = $SCRIPT_ROOT + 'available_datasets/GWAS';}
  else if(section == 'Term'){
    var address = $SCRIPT_ROOT + 'Ontology/Terms/' + CurrentOntology;}
  else if(section == 'Network'){
    var address = $SCRIPT_ROOT + 'available_datasets/Expr';}

  // Make sure the table is visible
  $('#'+section+'Table').removeClass("hidden");
  
  // Clean up the old table
  $('#'+section+'Table').DataTable().destroy();
  
  // Uses DataTables to build a pretty table
  $('#'+section+'Table').DataTable(
      {
      "ajax": address,
      "bAutoWidth": false, 
      "bPaginate": false,
      "bJQueryUI": false,
      "scrollCollapse": true,
      "dom": '<"'+section+'Title">ft',
      "order": [[0,'asc']],
      "processing" : true,
      "scrollY": ($(window).height()/4)-50,
      "select": true,
      "searching": true,
    });
  $("div."+section+"Title").html(section);
  return;
}

/*--------------------------------
         Graph Constructor
---------------------------------*/
function buildGraph(){
  // Check to see if there is an exitant graph
  if(cy != null){cy.destroy();}
  
  // Hide the gene table
  $('#GeneTable').addClass("hidden");
  
  // Run the layout
  initCytoscape(cyDataCache);
  
  // Switch to Gene Data Tab
  $('#navTabs a[href="#genes"]').tab('show');
  
  // Hide the wait dialog
  $("#cytoWait").modal('hide');
  
  // Run the gene table builder
  buildGeneTable(cy.nodes().filter('[type = "gene"]'));
  
  // Set up the tap listeners
  setTapListeners();
}

/*--------------------------------
      Cytoscape Constructor
---------------------------------*/
function initCytoscape(data){
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),
    
    // Interaction Options
    boxSelectionEnabled: true,
    autounselectify: false,
    
    // Rendering Options
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.5,
    
    layout: {
      name: 'polywas',
      minNodeDegree: parseInt(document.forms["graphParams"]["nodeCutoff"].value), 
      minEdgeScore: parseFloat(document.forms["graphParams"]["edgeCutoff"].value),
      nodeHeight: 10,
      geneOffset: 10,
    },
    style: [
        {selector: '[type = "chrom"]',
         css: {
           'z-index': '2',
           'background-color': 'DarkSlateGrey',
           'content': 'data(id)',
           'color': 'white',
           'text-valign': 'center',
           'text-halign': 'center',
           'text-background-color': 'DarkSlateGrey',
           'text-background-opacity': '1',
           'text-background-shape': 'roundrectangle',
           'font-size': '10',
         }},
       {selector: '[type = "snpG"]',
        css: {
          'z-index': '1',
          'shape': 'circle',
          'height': '10',
          'width': '10',
          'background-color': 'DimGrey',
        }},
       {selector: '[type = "gene"]',
         style: {
           'background-color': 'DarkMagenta',
           'shape': 'circle',
           'height': '10',
           'width': '10',
         }},
       {selector: 'edge',
         css: {
           'curve-style': 'unbundled-bezier',
           'width': '1',
           'opacity': '0.5',
           'line-color': 'grey'
         }},
       {selector: '.neighbors',
         css: {
           'background-color': 'orange',
       }},
       {selector: '.highlighted',
         css: {
           'background-color': 'red',
         }},
       {selector: '.highlightedEdge',
         css: {
           'line-color': 'gold',
           'width': '2',
           'opacity': '1',
         }},
     ],
   elements: {
     nodes: data.nodes,
     edges: data.edges,
  }});
}

/*--------------------------------
      Gene Table Constructor
---------------------------------*/
function buildGeneTable(nodes){
  // Format the node data for the DataTable
  var geneData = [];
  nodes.forEach(function(currentValue, index, array){
    geneData.push(currentValue.data());
  });
  
  // Make sure the table is visible
  $('#GeneTable').removeClass("hidden");
  
  // Clean up the old table
  $('#GeneTable').DataTable().destroy();
  
  // Uses DataTables to build a pretty table
  $('#GeneTable').DataTable(
      {
      "data": geneData,
      "paging": true,
      "paginate": true,
      "scrollCollapse": true,
      "dom": '<"GeneTitle">frtip',
      "order": [[0,'asc']],
      "rowId": 'id',
      "scrollXInner": "100%",
      "scrollX": "100%",
      "scrollY": $(window).height()-300,
      "select": true,
      "scroller": true,
      "searching": true,
      "columns": [
        {data: 'id'},
        {data: 'chrom'},
        {data: 'start'},
        {data: 'end'},
        {data: 'snp'},
        {data: 'ldegree'},
        {data: 'gdegree'},
        {data: 'locality'},
        {data: 'num_intervening'},
        {data: 'rank_intervening'},
        {data: 'num_siblings'},
        //{data: 'parent_num_iterations'},
        //{data: 'parent_avg_effect_size'},
      ]
    });
  $("div.GeneTitle").html('Gene Data');
  
  return;
}

/*--------------------------------
      Listener Constructor
---------------------------------*/
function setTapListeners(){
  // Set up the node tap listener
  cy.nodes().filter('[type = "gene"]').on('tap', function(evt){
    nodeSelect(evt.cyTarget.data('id'), evt['originalEvent']['ctrlKey']);
  });
  
  // Set up the table tap listener
  $('#GeneTable tbody').on('click','tr', function(evt){
    nodeSelect($('td', this).eq(0).text(), evt['ctrlKey']);
  });
}

/*--------------------------------
      Node Selection Algorithm
---------------------------------*/
function nodeSelect(gene_id, ctrlKey){
  // Get the node object and whether it is currently highlighted 
  var gene_node = cy.nodes().filter('[id = "'+gene_id+'"]');
  var isHigh = gene_node.hasClass('highlighted');
  
  // Run all the graph mods as a batch
  cy.batch(function(){
    // Deselect all neighbors and edges
    cy.nodes().filter('.neighbors').toggleClass('neighbors', false);
    cy.edges().filter('.highlightedEdge').toggleClass('highlightedEdge', false);
    
    // If the control key wasn't pressed, deselect all nodes
    if(!ctrlKey){
      cy.nodes().filter('.highlighted').toggleClass('highlighted', false);
      $('#GeneTable').DataTable().rows('.selected').deselect();
    }
    
    // If the control key is pressed, and it is higlighted just deselect this node
    if(isHigh && ctrlKey){
      gene_node.toggleClass('highlighted', false);
      $('#GeneTable').DataTable().row('#'+gene_id).deselect();
    }
    
    // If it wasn't highlighted previously, select it
    if(!isHigh){
      gene_node.toggleClass('highlighted', true);
      $('#GeneTable').DataTable().row('#'+gene_id).select().scrollTo();
    }
    
    // Reselect all necessary edges and neighbors
    cy.nodes().filter('.highlighted').neighborhood().toggleClass('neighbors', true);
    cy.nodes().filter('.highlighted').connectedEdges().toggleClass('highlightedEdge', true);
  });
  return;
}
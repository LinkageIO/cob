/*--------------------------------
      Table Event Listeners
---------------------------------*/
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
  $('#cyTitle').html('Please select one option in each table to build a graph.');
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
  $('#cyTitle').html('Please select one option in each table to build a graph.');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the network table
  tableMaker('Network');
});

// A row on the Network Table is selected
$('#NetworkTable tbody').on('click','tr',function(){
    // Highlight the current line
    CurrentNetwork = $('td',this).eq(0).text();

    // Unhide the graph
    $('#cy').removeClass('hidden');
    
    // Get the new Graph
    newGraph();
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

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Listener for log spacing toggle
$('#logSpacingButton').click(function(){logSpacingVal = !(logSpacingVal);});

// Listener for update button
$('#updateButton').click(function(){
  if(cy == null){return;}
  if(lastWindow == document.forms["graphOpts"]["windowSize"].value && lastFlank == document.forms["graphOpts"]["flankLimit"].value){updateGraph();}
  else{newGraph();}
});

// Listener for pressing enter in parameter fields
$("#graphOpts").keypress(function(evt){
  if((cy == null) || (evt.which !== 13)){return;}
  evt.preventDefault();
  if(lastWindow == document.forms["graphOpts"]["windowSize"].value && lastFlank == document.forms["graphOpts"]["flankLimit"].value){updateGraph();}
  else{newGraph();}
});

// Clear all selected items
$('#clearSelectionButton').click(function(){
  if(cy == null){return;}
  cy.nodes().filter('.highlighted, .neighbors').toggleClass('highlighted', false).toggleClass('neighbors', false);
  cy.edges().filter('.highlightedEdge').toggleClass('highlightedEdge', false);
  $('#GeneTable').DataTable().rows('*').deselect();
  $('#SubnetTable').DataTable().clear().draw();
});

/*------------------------------------------
      Build Orchestration Functions
------------------------------------------*/
// Get data and build the new graph
function newGraph(){
  // Update the values
  lastWindow = document.forms["graphOpts"]["windowSize"].value;
  lastFlank = document.forms["graphOpts"]["flankLimit"].value;
  
  // Get the data and set everything up
  $("#cyWait").one('shown.bs.modal', function(){
    $.getJSON($SCRIPT_ROOT + 'COB/' + CurrentNetwork + '/' + CurrentOntology + '/' + CurrentTerm + '/' + lastWindow + '/' + lastFlank).done(function(data){
      console.log('Recieved Data');
      // Set up a run the builder function
      if(cy != null){cy.destroy();}
      initCytoscape(data);
      
      cy.style().selector('[type = "snpG"], [type = "gene"]').style({
        'width': document.forms["graphOpts"]["nodeSize"].value,
        'height': document.forms["graphOpts"]["nodeSize"].value,
      }).selector('.pop').style({
        'width': (parseInt(document.forms["graphOpts"]["nodeSize"].value)*1.5).toString(),
        'height': (parseInt(document.forms["graphOpts"]["nodeSize"].value)*1.5).toString(),
      }).update();
      
      // Do DOM Manipulations
      $('#navTabs a[href="#GeneTab"]').tab('show');
      $("#cyWait").modal('hide');
      
      // Run the gene table builder
      updateTable('Gene',cy.nodes().filter('[type = "gene"]:visible'));
      
      // Set the snp group qtips
      setSnpgQtips();
      
      // Set Bread Crumb
      $("#cyTitle").html(CurrentOntology+' > '+CurrentTerm+' > '+CurrentNetwork);
    });
  });
  $("#cyWait").modal('show');
}

// Update Graph with new Opts
function updateGraph(){
  // Otherwise pull up the wait dialog and run the algrithm
  $("#cyWait").one('shown.bs.modal', function(){
    
    // Run the layout
    cy.layout({
      name: 'polywas',
      minNodeDegree: parseInt(document.forms["graphOpts"]["nodeCutoff"].value), 
      minEdgeScore: parseFloat(document.forms["graphOpts"]["edgeCutoff"].value),
      nodeHeight: parseInt(document.forms["graphOpts"]["nodeSize"].value),
      geneOffset: parseInt(document.forms["graphOpts"]["nodeSize"].value),
      logSpacing: logSpacingVal,
      snpLevels: parseInt(document.forms["graphOpts"]["snpLevels"].value),
    });
    
    cy.style().selector('[type = "snpG"], [type = "gene"]').style({
      'width': document.forms["graphOpts"]["nodeSize"].value,
      'height': document.forms["graphOpts"]["nodeSize"].value,
    }).selector('.pop').style({
      'width': (parseInt(document.forms["graphOpts"]["nodeSize"].value)*1.5).toString(),
      'height': (parseInt(document.forms["graphOpts"]["nodeSize"].value)*1.5).toString(),
    }).update();
    
    // Do DOM manipulations
    $('#navTabs a[href="#GeneTab"]').tab('show');
    
    // Run the gene table builder
    updateTable('Gene',cy.nodes().filter('[type = "gene"]:visible'));
    
    // Set the snp group qtips
    setSnpgQtips();
    
    // Close the wait dialog
    $("#cyWait").modal('hide');
  });
  $("#cyWait").modal('show');
  return;
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
    pixelRatio: 1,
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.5,
    
    layout: {
      name: 'polywas',
      minNodeDegree: parseInt(document.forms["graphOpts"]["nodeCutoff"].value), 
      minEdgeScore: parseFloat(document.forms["graphOpts"]["edgeCutoff"].value),
      nodeHeight: parseInt(document.forms["graphOpts"]["nodeSize"].value),
      geneOffset: parseInt(document.forms["graphOpts"]["nodeSize"].value),
      logSpacing: logSpacingVal,
      snpLevels: parseInt(document.forms["graphOpts"]["snpLevels"].value),
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
       {selector: '[type = "snpG"], [type = "gene"]',
        css: {
          'z-index': '1',
          'shape': 'circle',
          'background-color': 'DimGrey',
        }},
       {selector: '.snp0',
         style: {
           'background-color': 'DarkOrchid',
         }},
       {selector: '.snp1',
         style: {
           'background-color': 'MediumSeaGreen',
         }},
       {selector: '.snp2',
         style: {
           'background-color': '#337ab7',
         }},
       {selector: '.snp3',
         style: {
           'background-color': 'Tan',
         }},
       {selector: 'edge',
         css: {
           'curve-style': 'haystack',
           'width': '1',
           'opacity': '0.5',
           'line-color': 'grey'
         }},
       {selector: '.neighbors',
         css: {
           'background-color': 'rgb(255,100,0)',
       }},
       {selector: '.highlighted',
         css: {
           'background-color': 'Red',
         }},
       {selector: '.highlightedEdge',
         css: {
           'line-color': 'rgb(255,200,0)',
           'width': '2',
           'opacity': '1',
           'z-index': '3',
         }},
       {selector: '.pop',
         css: {
           'background-color': 'Yellow',
           'z-index': '4',
         }},
     ],
   elements: {
     nodes: data.nodes,
     edges: data.edges,
  }});
  
  var genes = cy.nodes().filter('[type = "gene"]');
  
  // Set up the gene node tap listener
  genes.on('tap', function(evt){
    // Only scroll to the gene if it isn't highlighted already
    if(!(evt.cyTarget.hasClass('highlighted'))){
      $('#GeneTable').DataTable().row('#'+evt.cyTarget.data('id')).scrollTo();
    }
    
    // Run the selection algorithm
    nodeSelect(evt.cyTarget.data('id'));
  });
  
  // Set the gene qTip listeners (only needs to be done once per full graph redo)
  genes.qtip({
    content: function(){
      var data = this.data();
      return 'ID: '+data['id'].toString()+'<br>'+
      'Local Degree: '+data['ldegree'].toString()+'<br>'+
      'SNP: '+data['snp'].toString()+'<br>'+
      'Position: '+data['start'].toString()+'-'+data['end'].toString();
    },
    position: {my: 'bottom center', at: 'top center'},
    style: {
      classes: 'qtip-dark qtip-rounded qtip-shadow',
      tip: {width: 10, height: 5},
    },
    show: {event: 'mouseover'},
    hide: {event: 'mouseout'},
  });
}

/*------------------------------------
    SNP Group Listener Constructor
------------------------------------*/
function setSnpgQtips(){
  // Set the SNP Group qTip listner
  cy.nodes().filter('[type = "snpG"]').qtip({
    content: function(){
      var res = 'SNPs in Group:<br>'; var snps = this.data('snps');
      $(snps).each(function(i){res += (this.toString() + '<br>');});
      return res;
    },
    position: {my: 'bottom center', at: 'top center'},
    style: {
      classes: 'qtip-light qtip-rounded qtip-shadow',
      tip: {width: 10, height: 5},
    },
    show: {event: 'mouseover'},
    hide: {event: 'mouseout'},
  });
}

/*--------------------------------
      Node Selection Algorithm
---------------------------------*/
function nodeSelect(gene_id){
  // Get the node object and whether it is currently highlighted 
  var gene_node = cy.nodes().filter('[id = "'+gene_id+'"]');
  var genes = null;
  var isHigh = gene_node.hasClass('highlighted');
  
  
  // Run all the graph mods as a batch
  cy.batch(function(){
    // Deselect all neighbors and edges
    cy.nodes().filter('.neighbors').toggleClass('neighbors', false);
    cy.edges().filter('.highlightedEdge').toggleClass('highlightedEdge', false);
    
    // If it's highlighted, unselect it
    if(isHigh){
      gene_node.toggleClass('highlighted', false);
      $('#GeneTable').DataTable().row('#'+gene_id).deselect();
    }
    
    // Otherwise just add it to the list
    else{
      gene_node.toggleClass('highlighted', true);
      $('#GeneTable').DataTable().row('#'+gene_id).select();
    }
    
    // Reselect all necessary edges and neighbors
    genes = cy.nodes().filter('.highlighted');
    genes.neighborhood().toggleClass('neighbors', true);
    genes.connectedEdges().toggleClass('highlightedEdge', true);
  });
    
  // Update the subnetwork Table
  updateTable('Subnet',cy.nodes().filter('.highlighted, .neighbors'));
  
  // Select the highlighted ones
  genes.forEach(function(currentValue, index, array){
    $('#SubnetTable').DataTable().row('#'+currentValue.data('id')).select();
  });
}

/*--------------------------------
      Gene Table Constructors
---------------------------------*/
function updateTable(tableName, nodes){
  // Save original tab
  var ogTab = $('.active [role="tab"]').attr('href');
  
  // Switch to needed tab, needed for column scaling
  $('#navTabs a[href="#'+tableName+'Tab"]').tab('show');
  
  // Format the node data for the DataTable
  var geneData = [];
  var geneDict = null;
  nodes.forEach(function(currentValue, index, array){
    geneDict = currentValue.data();
    geneDict['window_size'] = lastWindow;
    geneDict['flank_limit'] = lastFlank;
    geneData.push(geneDict);
  });
  
  // Clear old data and add new
  $('#'+tableName+'Table').DataTable().rows('*').clear();
  $('#'+tableName+'Table').DataTable().rows.add(geneData).draw();
  
  // Return to original tab
  $('#navTabs a[href="'+ogTab+'"]').tab('show');
}

function buildGeneTable(){
  // Uses DataTables to build a pretty table
  $('#GeneTable').DataTable({
      "data": [],
      "deferRender": true,
      "dom": '<"GeneTitle">frtipB',
      "order": [[3,'asc'],[5,'asc']],
      "paging": true,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scroller": {displayBuffer: 75},
      "scrollXInner": "100%",
      "scrollX": "100%",
      "scrollY": ($(window).height()-275),
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [{
        "extend": 'csv',
        "filename": 'genenetwork',
      }],
      "columns": [
        {data: 'id', title:'ID'},
        {data: 'ldegree', title:'Local Degree'},
        {data: 'gdegree', title:'Global Degree'},
        {data: 'chrom', title:'Chrom'},
        {data: 'snp', title:'SNP'},
        {data: 'start', title:'Start'},
        {data: 'end', title:'End'},
        {data: 'num_intervening', title:'Num Intervening'},
        {data: 'rank_intervening', title:'Rank Intervening'},
        {data: 'num_siblings', title:'Num Siblings'},
        {data: 'window_size', title:'Window Size', visible: false},
        {data: 'flank_limit', title:'Flank Limit', visible: false},
        //{data: 'parent_num_iterations', title: 'Num Parent Interactions'},
        //{data: 'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
      ]
    });
  $("div.GeneTitle").html('Gene Data');
  
  // Set Listeners
  $('#GeneTable tbody').on('click','tr', function(evt){nodeSelect(this['id']);});
  //$('#GeneTable tbody').on('mouseover','tr', function(evt){
  //  cy.nodes().filter('[id = "'+this['id']+'"]').flashClass('pop',750);
  //});
}

function buildSubnetTable(){
  // Uses DataTables to build a pretty table
  $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtipB',
      "order": [[3,'asc'],[5,'asc']],
      "paging": false,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scrollX": "100%",
      "scrollY": $(window).height()-275,
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [{
        "extend": 'csv',
        "filename": 'subnetwork',
      }],
      "columns": [
        {data: 'id', title:'ID'},
        {data: 'ldegree', title:'Local Degree'},
        {data: 'gdegree', title:'Global Degree'},
        {data: 'chrom', title:'Chrom'},
        {data: 'snp', title:'SNP'},
        {data: 'start', title:'Start'},
        {data: 'end', title:'End'},
        {data: 'num_intervening', title:'Num Intervening'},
        {data: 'rank_intervening', title:'Rank Intervening'},
        {data: 'num_siblings', title:'Num Siblings'},
        {data: 'window_size', title:'Window Size', visible: false},
        {data: 'flank_limit', title:'Flank Limit', visible: false},
        //{data: 'parent_num_iterations', title: 'Num Parent Interactions'},
        //{data: 'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
      ]
    });
  $("div.SubnetTitle").html('Subnet Data');
  
  // Set Listeners
  $('#SubnetTable tbody').on('click','tr', function(evt){nodeSelect(this['id']);});
  $('#SubnetTable tbody').on('mouseover','tr', function(evt){
    cy.nodes().filter('[id = "'+this['id']+'"]').flashClass('pop',750);
  });
}
/*--------------------------------
      Table Event Listeners
---------------------------------*/
// A row on the Ontology Table is selected
$('#NetworkTable tbody').on('click','tr', function(){
  // Save the selected row
  CurrentNetwork = $('td', this).eq(0).text();
  
  // Clean up the graph
  if(cy != null){cy.destroy();cy = null;}
  updateHUD();
  
  // Prep the Ontology Table
  CurrentOntology = '';
  $('#OntologyWait').addClass("hidden");
  $('#Ontology').removeClass("hidden");
  
  // Clean up the Term Table
  CurrentTerm = '';
  $('#Term').addClass('hidden');
  $('#TermWait').removeClass('hidden');
  
  // Fetch and build the next table
  buildOntologyTable();
});

// A row on the Term Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  CurrentOntology = $('td',this).eq(0).text();
  
  // Clean up the graph
  if(cy != null){cy.destroy();cy = null;}
  updateHUD();
  
  // Prep the Term Table
  CurrentTerm = '';
  $('#TermWait').addClass("hidden");
  $('#Term').removeClass("hidden");
  
  // Fetch and build the network table
  buildTermTable(CurrentOntology);
});

// A row on the Network Table is selected
$('#TermTable tbody').on('click','tr',function(){
    // Highlight the current line
    CurrentTerm = $('td',this).eq(0).text();
    
    // Get the new Graph
    loadGraph('new','polywas');
});

$("#TermGenesButton").click(function(){
  // Build the graph
  //loadGraph('new','force');
});

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Listener for log spacing toggle
$('#logSpacingButton').click(function(){logSpacingVal = !(logSpacingVal);});

// Listener for update button
$('#updateButton').click(function(){
  if(cy == null){return;}
  if(lastWindow == document.forms["graphOpts"]["windowSize"].value && lastFlank == document.forms["graphOpts"]["flankLimit"].value){loadGraph('update','polywas');}
  else{loadGraph('new','polywas');}
});

// Listener for pressing enter in parameter fields
$("#graphOpts").keypress(function(evt){
  if((cy == null) || (evt.which !== 13)){return;}
  evt.preventDefault();
  if(lastWindow == document.forms["graphOpts"]["windowSize"].value && lastFlank == document.forms["graphOpts"]["flankLimit"].value){loadGraph('update','polywas');}
  else{loadGraph('new','polywas');}
});

// Clear all selected items
$('#clearSelectionButton').click(function(){
  if(cy == null){return;}
  cy.nodes('.highlighted').toggleClass('highlighted', false)
  cy.nodes('.neighbors').toggleClass('neighbors', false);
  cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);
  $('#GeneTable').DataTable().rows('*').deselect();
  $('#SubnetTable').DataTable().clear().draw();
  $('#navTabs a[href="#GeneTab"]').tab('show');
});

$('#TermTabs a[href="#TermTableTab"]').on('show.bs.tab', function(){
  $('#windowSize').prop('readonly', false);
  $('#flankLimit').prop('readonly', false);
});

$('#TermTabs a[href="#TermGenesTab"]').on('show.bs.tab', function(){
  $('#windowSize').prop('readonly', true);
  $('#flankLimit').prop('readonly', true);
});

/*---------------------------------------
      Load the Graph and Tables
---------------------------------------*/
// Get data and build the new graph
function loadGraph(op, layout){
  $("#cyWait").one('shown.bs.modal', function(){
    // Make a promise to do the graph
    var pinkySwear = new Promise(function(resolve,reject){
      if(op === 'new'){
        if(layout === 'polywas'){newPoly(resolve,reject);}
        else{newForce(resolve,reject);}}
      else{
        if(layout === 'polywas'){updatePoly(resolve,reject);}
        else{updateForce(resolve,reject);}}
    });
    
    pinkySwear.then(function(result){
      // Update the Table and such
      $('#navTabs a[href="#GeneTab"]').tab('show');
      updateGraphTable('Gene',cy.nodes('[type = "gene"]:visible'));
      updateHUD();
      
      $("#cyWait").modal('hide');
    },function(err){console.log(err);});
  });
  $("#cyWait").modal('show');
}

/*--------------------------------
      Gene Selection Algorithm
---------------------------------*/
function geneSelect(gene_id){
  // Get the node object and whether it is currently highlighted 
  var gene_node = cy.nodes('[id = "'+gene_id+'"]');
  var genes = null;
  var edges = null;
  var isHigh = gene_node.hasClass('highlighted');
  
  // Run all the graph mods as a batch
  cy.batch(function(){
    // Deselect all neighbors and edges
    cy.nodes('.neighbors').toggleClass('neighbors', false);
    cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);
    
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
    genes = cy.nodes('.highlighted');
    edges = genes.connectedEdges(':visible').toggleClass('highlightedEdge', true);
    edges.connectedNodes().toggleClass('neighbors', true);
  });
    
  // Update the subnetwork Table
  updateGraphTable('Subnet',cy.nodes('.highlighted, .neighbors'));
  
  // Select the highlighted ones
  genes.forEach(function(cur, idx, arr){
    $('#SubnetTable').DataTable().row('#'+cur.data('id')).select();
  });
}

/*--------------------------------
       HUD Update Algorithm
---------------------------------*/
// Function to update the HUD at the bottom of the graph
function updateHUD(){
  if(cy == null){
    $('#cyTitle').html('Please select one option in each table to build a graph.');
  }
  else{
    $("#cyTitle").html(cy.nodes(':visible[type="gene"]').size()+' genes | '
      + cy.edges(':visible').size()+' interactions<br>'
      + CurrentNetwork+' > '+CurrentOntology+' > '+CurrentTerm
      +' > '+lastWindow+'/'+lastFlank);
  }
}

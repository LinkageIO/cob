/*--------------------------------
      Table Event Listeners
---------------------------------*/
// A row on the Ontology Table is selected
$('#NetworkTable tbody').on('click','tr', function(){
  // Save the selected row
  lastNetwork = $('td', this).eq(0).text();

  // Clean up the graph
  if(cy != null){cy.destroy();cy = null;}
  updateHUD();

  // Prep the Ontology Table
  lastOntology = '';
  $('#GeneSelectWait').addClass("hidden");
  $('#GeneSelect').removeClass("hidden");

  // Clean up the Term Table
  lastTerm = '';
  $('#Term').addClass('hidden');
  $('#TermWait').removeClass('hidden');

  // Fetch and build the next table
  buildOntologyTable();
});

// A row on the Term Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  lastOntology = $('td',this).eq(0).text();

  // Clean up the graph
  if(cy != null){cy.destroy();cy = null;}
  updateHUD();

  // Prep the Term Table
  lastTerm = '';
  $('#TermWait').addClass("hidden");
  $('#Term').removeClass("hidden");

  // Fetch and build the network table
  buildTermTable(lastOntology);
});

// A row on the Network Table is selected
$('#TermTable tbody').on('click','tr',function(){
    // Highlight the last line
    lastTerm = $('td',this).eq(0).text();

    // Get the new Graph
    loadGraph('new','polywas');
});

$("#TermGenesButton").click(function(){
  if($('#geneList').val().length > 1){loadGraph('new','force');}
  else{window.alert('You need to enter at least one gene.');}
});

$('#GeneSelectTabs a[href="#TermTableTab"]').on('show.bs.tab', function(){
  $('#polyOpts').removeClass('hidden');
  $('#forceOpts').addClass('hidden');
});

$('#GeneSelectTabs a[href="#TermGenesTab"]').on('show.bs.tab', function(){
  $('#forceOpts').removeClass('hidden');
  $('#polyOpts').addClass('hidden');
});

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Listener for log spacing toggle
$('#logSpacingButton').click(function(){logSpacing = !(logSpacing);});

// Listener for update button
$('#updateButton').click(function(){
  updateGraph();
});

// Listener for pressing enter in parameter fields
$("#polyOpts, #forceOpts").keypress(function(evt){
  if(evt.which !== 13){return;}
  evt.preventDefault();
  updateGraph();
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

/*---------------------------------------
      Load the Graph and Tables
---------------------------------------*/
function checkOpts(layout){
    var badFields = [];

    if(layout === 'polywas'){
        // Pull all of the options into numbers
        var windowSize = parseInt(document.forms["polyOpts"]["windowSize"].value);
        var flankLimit = parseInt(document.forms["polyOpts"]["flankLimit"].value);
        var nodeCutoff = parseInt(document.forms["polyOpts"]["nodeCutoff"].value);
        var edgeCutoff = parseFloat(document.forms["polyOpts"]["edgeCutoff"].value);
        var polyNodeSize = parseInt(document.forms["polyOpts"]["polyNodeSize"].value);
        var snpLevels = parseInt(document.forms["polyOpts"]["snpLevels"].value);

        // Check each for snity and record if it's bad
        if(!((windowSize >= 0)&&(windowSize <= 1000000))){badFields.push('windowSize');}
        if(!((flankLimit >= 0)&&(flankLimit <= 20))){badFields.push('flankLimit');}
        if(!((nodeCutoff >= 0)&&(nodeCutoff <= 20))){badFields.push('nodeCutoff');}
        if(!((edgeCutoff >= 3.0)&&(edgeCutoff <= 20.0))){badFields.push('edgeCutoff');}
        if(!((polyNodeSize >= 5)&&(polyNodeSize <= 50))){badFields.push('polyNodeSize');}
        if(!((snpLevels >= 1)&&(snpLevels <= 5))){badFields.push('snpLevels');}
    }
    else{
        // Pull all of the options into numbers
        var maxNeighbors = parseInt(document.forms["forceOpts"]["maxNeighbors"].value);
        var sigEdgeScore = parseFloat(document.forms["forceOpts"]["sigEdgeScore"].value);
        var forceNodeSize = parseInt(document.forms["forceOpts"]["forceNodeSize"].value);

        // Check each for snity and record if it's bad
        if(!(maxNeighbors >= -1)){badFields.push('maxNeighbors');}
        if(!((sigEdgeScore >= 0.0)&&(sigEdgeScore <= 20.0))){badFields.push('sigEdgeScore');}
        if(!((forceNodeSize >= 5)&&(forceNodeSize <= 50))){badFields.push('forceNodeSize');}
    }
    return badFields;
}

function updateGraph(){
  if(cy == null){return;}
  if(isPoly){
    if(lastWindowSize === document.forms["polyOpts"]["windowSize"].value &&
      lastFlankLimit === document.forms["polyOpts"]["flankLimit"].value && isPoly){
      loadGraph('update','polywas');
    }
    else{loadGraph('new','polywas');}
  }
  else{
    if(lastSigEdgeScore === document.forms["forceOpts"]["sigEdgeScore"].value &&
      lastMaxNeighbors === document.forms["forceOpts"]["maxNeighbors"].value && !(isPoly)){
      loadGraph('update','force');
    }
    else{loadGraph('new','force');}
  }
}

// Get data and build the new graph
function loadGraph(op, layout){
    $('.alert').addClass('hidden')
    var badFields = checkOpts(layout);
    if(badFields.length > 0){
        badFields.forEach(function(cur, idx, arr){$('#'+cur+'Error').removeClass('hidden');});
        $('#navTabs a[href="#OptsTab"]').tab('show');
        return;
    }

    $("#cyWait").one('shown.bs.modal', function(){
        // Update the persistent variables
        lastWindowSize = document.forms["polyOpts"]["windowSize"].value;
        lastFlankLimit = document.forms["polyOpts"]["flankLimit"].value;
        lastSigEdgeScore = document.forms["forceOpts"]["sigEdgeScore"].value;
        lastMaxNeighbors = document.forms["forceOpts"]["maxNeighbors"].value;

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
            buildGeneTables();
            updateGraphTable('Gene',cy.nodes('[type = "gene"]:visible'));
            updateHUD();
            $("#cyWait").modal('hide');
        },function(err){$("#cyWait").modal('hide');window.alert(err);});
    });
    $("#cyWait").modal('show');
}

/*--------------------------------
     Gene Selection Function
---------------------------------*/
function geneSelect(gene_id){
  // Get the node object and whether it is lastly highlighted
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
       HUD Update Function
---------------------------------*/
function updateHUD(){
  if(cy == null){
    $('#cyTitle').html('Please select one option in each table to build a graph.');
  }
  else{
    var msg = cy.nodes(':visible[type="gene"]').size()+' genes | '
      + cy.edges(':visible').size()+' interactions<br>' + lastNetwork + ' > ';
    if(isPoly){
      msg = msg + lastOntology+' > '+lastTerm +' > '+lastWindowSize+'/'+lastFlankLimit;
    }
    else{msg = msg + 'Custom Network';}
    $("#cyTitle").html(msg);
  }
}

/*--------------------------------
     Node Size Update Function
---------------------------------*/
function updateNodeSize(diameter){
  cy.style().selector('[type = "snpG"], [type = "gene"]').style({
    'width': (diameter).toString(),
    'height': (diameter).toString(),
  }).selector('.pop').style({
    'width': (diameter*1.5).toString(),
    'height': (diameter*1.5).toString(),
  }).update();
}

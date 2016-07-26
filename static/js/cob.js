/*-----------------------------------------------
      Gene Selection Tables Event Listeners
-----------------------------------------------*/
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
  
  // Set up the text completion engine for the gene list
  setupTextComplete(lastNetwork, '#geneList')
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

/*----------------------------------------------
     Gene Selection Button Event Listeners
----------------------------------------------*/
// Build graph button is clicked
$("#TermGenesButton").click(function(){
  if($('#geneList').val().length > 1){loadGraph('new','force');}
  else{window.alert('You need to enter at least one gene.');}
});

// Term Table Tab is selected (default position)
$('#GeneSelectTabs a[href="#TermTableTab"]').on('show.bs.tab', function(){
  $('#polyOpts').removeClass('hidden');
  $('#forceOpts').addClass('hidden');
});

// Term Genes Tab is selected 
$('#GeneSelectTabs a[href="#TermGenesTab"]').on('show.bs.tab', function(){
  $('#forceOpts').removeClass('hidden');
  $('#polyOpts').addClass('hidden');
});

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Toggle for Log Spacing in Polywas is pressed
$('#logSpacingButton').click(function(){logSpacing = !(logSpacing);});

// Update Button on Options Tab is pressed 
$('#updateButton').click(function(){
  updateGraph();
});

// Enter is pressed in an option field
$("#polyOpts, #forceOpts").keypress(function(evt){
  if(evt.which !== 13){return;}
  evt.preventDefault();
  updateGraph();
});

// CLear Selection Button is pressed
$('#clearSelectionButton').click(function(){
  if(cy == null){return;}
  
  // Remove the classes that highlight nodes
  cy.nodes('.highlighted').toggleClass('highlighted', false)
  cy.nodes('.neighbor').toggleClass('neighbor', false);
  cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);
  
  // Unhighlight the gene table
  $('#GeneTable').DataTable().rows('*').deselect();
  
  // Clear the subnetwork table
  $('#SubnetTable').DataTable().clear().draw();
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
        if(!((maxNeighbors >= 0)&&(maxNeighbors <= 150))){badFields.push('maxNeighbors');}
        if(!((sigEdgeScore >= 0.0)&&(sigEdgeScore <= 20.0))){badFields.push('sigEdgeScore');}
        if(!((forceNodeSize >= 5)&&(forceNodeSize <= 50))){badFields.push('forceNodeSize');}
    }
    return badFields;
}

function updateGraph(){
  if(cy == null){return;}
  // If it's a polwas graph
  if(isPoly){
    // If these options are the same, no need to do full reload
    if(lastWindowSize === document.forms["polyOpts"]["windowSize"].value &&
      lastFlankLimit === document.forms["polyOpts"]["flankLimit"].value && isPoly){
      loadGraph('update','polywas');
    }
    // Otherwise we have to just blow it up and start over
    else{loadGraph('new','polywas');}
  }
  // If it's a force graph
  else{
    // If these options are the same, no need to do full reload
    if(lastSigEdgeScore === document.forms["forceOpts"]["sigEdgeScore"].value &&
      lastMaxNeighbors === document.forms["forceOpts"]["maxNeighbors"].value && !(isPoly)){
      loadGraph('update','force');
    }
    // Otherwise we have to just blow it up and start over
    else{loadGraph('new','force');}
  }
}

// Get data and build the new graph
function loadGraph(op,layout,nodes,edges){
    // Check all of the relevant options and prompt if any have bad inputs
    $('.alert').addClass('hidden');
    var badFields = checkOpts(layout);
    if(badFields.length > 0){
        badFields.forEach(function(cur, idx, arr){$('#'+cur+'Error').removeClass('hidden');});
        $('#navTabs a[href="#OptsTab"]').tab('show');
        return;
    }
    
    // After the wait dialog is open, load the graph
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
            else{newForce(resolve,reject,nodes,edges);}}
          else{
            if(layout === 'polywas'){updatePoly(resolve,reject);}
            else{updateForce(resolve,reject);}}
        });

        pinkySwear.then(function(result){
            // Update the table and such
            $('#navTabs a[href="#GeneTab"]').tab('show');
            buildGeneTables();
            updateGraphTable('Gene', result);
            updateHUD();
            $('#cyWait').modal('hide');
            
            // Trigger event graph loaded custom event
            jQuery('body').trigger(graphLoadedEvent);
        },function(err){$('#cyWait').modal('hide');window.alert(err);});
    });
    $('#cyWait').modal('show');
}

/*--------------------------------
     Gene Selection Function
---------------------------------*/
function geneSelect(geneID){
  // Get the node object if it exists
  var geneNode = cy.getElementById(geneID);
  
  // If the node doesn't exist
  if(geneNode.length < 1){
    var ind = geneNodes.findIndex(function(cur,idx,arr){
      return cur['data']['id'] === geneID;});
    
    // Save the highlighted genes
    var high = {'new': geneID};
    high['other'] = [];
    cy.nodes('.highlighted').forEach(function(cur,idx,arr){
      high['other'].push(cur.data('id'));
    });
    
    // Rehighlight nodes after the graph is loaded 
    jQuery('body').one('graphLoaded', high, function(evt){
      // Highlight each gene that was selected prior to addition
      cy.startBatch();
      evt.data.other.forEach(function(cur,idx,arr){
        cy.getElementById(cur).toggleClass('highlighted', true);
        $('#GeneTable').DataTable().row('#'+cur).select();
      });
      cy.endBatch();
      
      // Run the selection algorithm on the new kid to highlight neighbors and edges
      geneSelect(geneID);
    });
    
    // Reload the graph with new gene
    geneNodes[ind]['data']['render'] = 'x';
    loadGraph('new', 'force', geneNodes);
  }
  
  // If we have one matching gene
  else if(geneNode.length === 1){
    // Find out if the relevant node is highlighted
    var isHigh = geneNode.hasClass('highlighted');

    // Deselect all neighbors and edges
    cy.startBatch();
    cy.nodes('.neighbor').toggleClass('neighbor', false);
    cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);

    // If it's highlighted, unselect it
    if(isHigh){
      geneNode.toggleClass('highlighted', false);
      $('#GeneTable').DataTable().row('#'+geneID).deselect();
    }

    // Otherwise just add it to the list
    else{
      geneNode.toggleClass('highlighted', true);
      $('#GeneTable').DataTable().row('#'+geneID).select();
    }

    // Reselect all necessary edges and neighbors
    var genes = cy.nodes('.highlighted');
    var edges = genes.connectedEdges(':visible').toggleClass('highlightedEdge', true);
    edges.connectedNodes().not('.highlighted').toggleClass('neighbor', true);
    cy.endBatch();

    // Update the subnetwork table
    updateGraphTable('Subnet',cy.nodes('.highlighted, .neighbor'));

    // Add the the genes to the subnet table
    genes.forEach(function(cur, idx, arr){
      $('#SubnetTable').DataTable().row('#'+cur.data('id')).select();
    });
  }
}

/*--------------------------------
       HUD Update Function
---------------------------------*/
function updateHUD(){
  var msg = '';
  // If there is no graph, throw up the help message
  if(cy == null){
    msg += 'Please follow the instructions in the left pane to build a graph.';
  }
  
  // Otherwise, build the message
  else{
    // Add the gene count, edge count, and network name
    msg += cy.nodes(':visible[type="gene"]').size() + ' genes | '
    msg += cy.edges(':visible').size() + ' interactions<br>' 
    msg += lastNetwork + ' > ';
    
    // If it's a polywas graph, add term details
    if(isPoly){
      msg += lastOntology + ' > '
      msg += lastTerm +' > '
      msg += lastWindowSize + '/' + lastFlankLimit;
    }
    
    // Otherwise just call it a custom network
    else{msg += 'Custom Network';}
  }
  
  // Post the message to the proper box
  $("#cyTitle").html(msg);
}

/*--------------------------------
     Node Size Update Function
---------------------------------*/
function updateNodeSize(diameter){
  cy.startBatch();
  cy.style().selector('[type = "snpG"], [type = "gene"]').style({
    'width': (diameter).toString(),
    'height': (diameter).toString(),
  }).selector('.pop').style({
    'width': (diameter*1.5).toString(),
    'height': (diameter*1.5).toString(),
  }).update();
  cy.endBatch();
}

/*--------------------------------
     Text Completion Function
---------------------------------*/
function setupTextComplete(network, selector){
  // AJAX request to get the data
  $.ajax({
    url: ($SCRIPT_ROOT + 'available_genes/' + network),
    success: function(data){
      // Destoy the old one and make a new completion engine
      $(selector).textcomplete('destroy');
      $(selector).textcomplete([{
        // Regex to say when to check for completion
        match: /(^|\b)(\w{2,})$/,
        
        // Search algorithm for gene completion
        search: function(term, callback){
          callback($.map(data.geneIDs, function(word){
            return word.toLowerCase().indexOf(term.toLowerCase()) === 0 ? word : null;
          }));
        },
        
        // When selected, add the gene, plus a comma to separate
        replace: function(word){return word + ', ';}
       }],
       {
         // Set some options
         maxCount: 15,
         noResultsMessage: 'No gene IDs or aliases found.',
       }
     );
    }
  });
  return;
}

/*------------------------------------------
      Set Listeners for Genes in Graph
------------------------------------------*/
function setGeneListeners(){
  // Get all the genes
  var genes = cy.nodes('[type = "gene"]');
  
  // Set listener for clicking
  genes.on('tap', function(evt){
    // Only scroll to the gene if it isn't highlighted already
    if(!(evt.cyTarget.hasClass('highlighted'))){
      $('#GeneTable').DataTable().row('#'+evt.cyTarget.data('id')).scrollTo();}

    // Run the selection algorithm
    geneSelect(evt.cyTarget.data('id'));
  });
  
  // Setup qtips
  genes.qtip({
    content: function(){
      var data = this.data();
      res = 'ID: '+data['id'].toString()+'<br>';
      if(data['alias'].length > 0){res += 'Alias(es): '+data['alias'].toString()+'<br>';}
      res += 'Local Degree: '+data['cur_ldegree'].toString()+'<br>';
      if(data['snp'] != 'N/A'){res += 'SNP: '+data['snp'].toString()+'<br>';}
      res += 'Position: '+data['start'].toString()+'-'+data['end'].toString();
      return res;
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
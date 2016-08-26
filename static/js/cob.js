/*-----------------------------------------------
      Gene Selection Tables Event Listeners
-----------------------------------------------*/
// A row on the Ontology Table is selected
$('#NetworkTable tbody').on('click','tr', function(){
  // Save the selected row
  curNetwork = $('td', this).eq(0).text();

  // Clean up the graph
  if(cy !== null){cy.destroy();cy = null;}
  updateHUD();

  // Prep the Ontology Table
  curOntology = '';
  $('#GeneSelectWait').addClass("hidden");
  $('#GeneSelect').removeClass("hidden");

  // Clean up the Term Table
  curTerm = '';
  $('#Term').addClass('hidden');
  $('#TermWait').removeClass('hidden');
  
  // Fetch and build the next table
  buildOntologyTable();
  
  // Set up the text completion engine for the gene list
  setupTextComplete(curNetwork, '#geneList');
});

// A row on the Term Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  curOntology = $('td',this).eq(0).text();

  // Clean up the graph
  if(cy !== null){cy.destroy();cy = null;}
  updateHUD();

  // Prep the Term Table
  curTerm = '';
  $('#TermWait').addClass("hidden");
  $('#Term').removeClass("hidden");

  // Fetch and build the network table
  buildTermTable(curOntology);
});

// A row on the Network Table is selected
$('#TermTable tbody').on('click','tr',function(){
    // Highlight the last line
    curTerm = $('td',this).eq(0).text();

    // Get the new Graph
    loadGraph(true,true,true);
});

/*----------------------------------------------
     Gene Selection Button Event Listeners
----------------------------------------------*/
// Build graph button is clicked
$("#TermGenesButton").click(function(){
  if($('#geneList').val().length > 1){loadGraph(true,false,false);}
  else{window.alert('You need to enter at least one gene.');}
});

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Toggle for Log Spacing in Polywas is pressed
$('#logSpacingButton').click(function(){
  logSpacing = !(logSpacing);
});

// Reset all the options on the options tab
$('#resetOptsButton').click(function(){
  $('.alert').addClass('hidden');
  restoreDefaults();
});

// Update Button on Options Tab is pressed 
$('#reEnrichButton').click(function(){
  updateEnrichment();
});

// Update Button on Options Tab is pressed 
$('#reGraphButton').click(function(){
  updateGraph();
});

// Enter is pressed in an option field
$("#opts").keypress(function(evt){
  if(evt.which !== 13){return;}
  evt.preventDefault();
  if(['pCutoff','minTerm','maxTerm'].indexOf(evt.target.id) > -1){updateEnrichment();}
  else{updateGraph();}
});

// Last graph button is pressed
$('#backButton').click(function(){
  restoreGraph();
});

// Save PNG Button is pressed
$('#pngButton').click(function(){
  if(cy === null){return;}
  var jpg = cy.jpg({bg:'white',scale:2});
  var link = document.createElement('img');
  link.className = 'hidden';
  link.setAttribute('src',jpg);
  link.setAttribute('download','graph.jpg');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Toggle Layout button is pressed
$('#toggleLayoutButton').click(function(){
  if(cy === null){return;}
  
  // Save the selected genes
  $('#GeneTable').DataTable().rows('.selected').ids(true).each(function(cur){
    curSel.push(cur);
  });
  
  // Find the edge data objects from the current graph
  var edgeList = [];
  cy.edges(':visible').forEach(function(cur, idx, arr){
    var dataDict = cur.data();
    edgeList.push({'data':dataDict});
  });
  
  // Update the graph with the new layout
  loadGraph(true,(!isPoly()),undefined,geneDict,edgeList);
});

// Clear Selection Button is pressed
$('#clearSelectionButton').click(function(){
  if(cy === null){return;}
  
  // Remove the classes that highlight nodes
  cy.nodes('.highlighted').toggleClass('highlighted', false)
  cy.nodes('.neighbor').toggleClass('neighbor', false);
  cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);
  
  // Unhighlight the gene table
  $('#GeneTable').DataTable().rows().deselect();
  
  // Clear the subnetwork table
  $('#SubnetTable').DataTable().clear().draw();
});

// Redraw the Subnet Table when shown
$('#navTabs a[href="#SubnetTab"]').on('shown.bs.tab', function(){
  if($.fn.DataTable.isDataTable('#SubnetTable')){
    $('#SubnetTable').DataTable().draw();
  }
});

/*---------------------------------------
      Load the Graph and Tables
---------------------------------------*/
// Function to determine whether or not this is a polywas graph currently
function isPoly(){return cy.options().layout.name === 'polywas';}

// Front to update the enrichment results with parameters
function updateEnrichment(){
  if(enrichGenes !== null){enrich(enrichGenes,isGO);}
}

// Front to figure out how to update the graph
function updateGraph(){
  var newGraph = true;
  var poly = null;
  var term = null;
  if(cy === null){
    var termTable = $('#GeneSelectTabs .active [role = "tab"]').attr('href') === '#TermTableTab'
    if(termTable && (curNetwork==='' || curOntology==='' || curTerm==='')){return;}
    else if(termTable){poly = true; term = true;}
    else{poly = false; term = false;}
  }
  else{
    newGraph = optsChange(['nodeCutoff','edgeCutoff',
      'visNeighbors','windowSize','flankLimit']);
    poly = isPoly(); term = isTerm;
  }
  loadGraph(newGraph,poly,term);
}

// Get data and build the new graph
function loadGraph(newGraph,poly,term,nodes,edges){
    // Check all of the relevant options and prompt if any have bad inputs
    $('.alert').addClass('hidden');
    var badFields = checkOpts();
    if(badFields.length > 0){
      errorOpts(badFields);
      return;
    }
    
    // If we are only updating the graph, save the selected genes
    if(!(newGraph)){
      $('#GeneTable').DataTable().rows('.selected').ids(true).each(function(cur){
        curSel.push(cur);
      });
    }
    
    // After the wait dialog is open, load the graph
    $("#cyWait").one('shown.bs.modal', function(){
        // Update the persistent variables
        updateOpts();
        
        // Make a promise to do the graph
        var pinkySwear = new Promise(function(resolve,reject){
          if(newGraph && (nodes === undefined || edges === undefined)){
            if(term){termNet(resolve,reject,poly);}
            else{customNet(resolve,reject,poly);}}
          else{modCyto(resolve,reject,newGraph,poly,nodes,edges);}
        });

        pinkySwear.then(function(result){
            cy.startBatch();
            // Update Node Degrees
            Object.keys(geneDict).forEach(function(cur,idx,arr){
              if(geneDict[cur]['data']['render'] === 'x'){
                geneDict[cur]['data']['cur_ldegree'] = cy.getElementById(cur).degree();}
              else{geneDict[cur]['data']['cur_ldegree'] = 0;}
            });
            cy.endBatch();
            
            // Update the table and such
            $('#cyWait').modal('hide');
            $('#navTabs a[href="#GeneTab"]').tab('show');
            buildGeneTables();
            updateHUD();
            
            // Show the back button if necessary
            if(pastGeneDicts.length > 0){$('#backButton').removeClass('hidden');}
            else{$('#backButton').addClass('hidden');}
            
            // If there were any genes saved to select reselect them
            if(curSel.length >= 0){
              // Make sure they have hashtags leading
              curSel.forEach(function(cur,idx,arr){
                if(cur.charAt(0) !== '#'){arr[idx] = '#'+cur;}
              });
              
              // Selecthem in the table and trigger the gene select function
              $('#GeneTable').DataTable().rows(curSel).select();
              curSel = [];
              geneSelect();
            }
        },function(err){$('#cyWait').modal('hide');window.alert(err);});
    });
    $('#cyWait').modal('show');
}

/*--------------------------------
     Gene Selection Function
---------------------------------*/
function geneSelect(){
  // Get references to the DataTables APIs
  var geneTbl = $('#GeneTable').DataTable();
  var subTbl = $('#SubnetTable').DataTable();
  
  // Find all the genes that should be highlighted, and should be added
  var genes = [];
  var toAdd = [];
  geneTbl.rows('.selected').ids().each(function(cur){
    var ele = cy.getElementById(cur);
    if(ele.length < 1){toAdd.push(cur);}
    else{genes.push(cy.getElementById(cur));}
  });
  
  // If there are any genes to add, trigger that now
  if(toAdd.length > 0){addGenes(toAdd);}
  
  // Do the necessary selection transaction
  else{
    cy.startBatch();
    
    // Deselect all neighbors and edges
    cy.nodes('.highlighted').removeClass('highlighted');
    cy.nodes('.neighbor').removeClass('neighbor');
    cy.edges('.highlightedEdge').removeClass('highlightedEdge');
    
    // Highlight all the things that need it
    genes = cy.collection(genes).addClass('highlighted');
    var edges = genes.connectedEdges(':visible').addClass('highlightedEdge');
    edges.connectedNodes().not('.highlighted').addClass('neighbor');

    // Find genes need to build the subnetwork table
    var geneSet = new Set();
    var geneSel = [];
    cy.nodes('.highlighted, .neighbor').forEach(function(cur,idx,arr){geneSet.add(cur.id());});
    genes.forEach(function(cur, idx, arr){geneSel.push('#'+cur.id());});
    
    // Update the subnetwork table
    updateSubnetTable(geneSet, geneSel);
    
    cy.endBatch();
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
    msg += curNetwork + ' > ';
    
    // If it's a polywas graph, add term details
    if(isTerm){
      msg += curOntology + ' > '
      msg += curTerm +' > '
      msg += curOpts['windowSize'] + '/' + curOpts['flankLimit'];
    }
    
    // Otherwise just call it a custom network
    else{msg += 'Custom Network';}
  }
  
  // Post the message to the proper box
  $("#cyTitle").html(msg);
}

/*--------------------------------
     Setup Text Completion
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

/* -----------------------------------
           Handle Options
----------------------------------- */
// Restore all options to default value
function restoreDefaults(){
  Object.keys(optVals).forEach(function(cur,idx,arr){
    $('#'+cur).val(optVals[cur]['default']);
  });
}

// Update the values in the lastOps dict
function updateOpts(){curOpts = getCurOpts();}

// Returns dictionary containing current option values
function getCurOpts(){
  var vals = {};
  Object.keys(optVals).forEach(function(cur,idx,arr){
    vals[cur] = document.forms["opts"][cur].value;
  });
  return vals;
}

// Detect what options have changed
function optsChange(opts){
  var result = false;
  var curOp = getCurOpts();
  opts.forEach(function(cur,idx,arr){
    if(curOp[cur] !== curOpts[cur]){result = true;}
  });
  return result;
}

// Shows user what options are unacceptable
function errorOpts(opts){
  opts.forEach(function(cur, idx, arr){
    $('#'+cur+'Error').removeClass('hidden');
    $('#'+cur+'Error').html(optVals[cur]['title']+' must be between '+optVals[cur]['min']+' and '+optVals[cur]['max']);
  });
  $('#navTabs a[href="#OptsTab"]').tab('show');
}

// Validate the parameter values
function checkOpts(){
    var val = null;
    var badFields = [];
    
    // Fetch all of the current values
    Object.keys(optVals).forEach(function(cur,idx,arr){
      // Get the numerical interpretation of the value
      if((cur === 'edgeCutoff')||(cur === 'pCutoff')){
        val = parseFloat(document.forms["opts"][cur].value);}
      else{val = parseInt(document.forms["opts"][cur].value);}
      
      // Check and save name if out of bounds
      if(!((val >= optVals[cur]['min'])&&(val <= optVals[cur]['max']))){
        badFields.push(cur);}
    });
    
    // Return the problemeatic ones
    return badFields;
}

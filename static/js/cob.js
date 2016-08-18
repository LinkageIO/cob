/*-----------------------------------------------
      Gene Selection Tables Event Listeners
-----------------------------------------------*/
// A row on the Ontology Table is selected
$('#NetworkTable tbody').on('click','tr', function(){
  // Save the selected row
  lastNetwork = $('td', this).eq(0).text();

  // Clean up the graph
  if(cy !== null){cy.destroy();cy = null;}
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
  setupTextComplete(lastNetwork, '#geneList');
});

// A row on the Term Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  lastOntology = $('td',this).eq(0).text();

  // Clean up the graph
  if(cy !== null){cy.destroy();cy = null;}
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
  
  // Save the highlighted gene names
  var high = [];
  cy.nodes('.highlighted').forEach(function(cur, idx, arr){
    high.push(cur.id());
  });
  
  // Reselect the nodes after the graph update
  $(window).one('graphLoaded', {'high':high}, function(evt){
    var high = [];
    evt.data.high.forEach(function(cur,idx,arr){high.push(cy.getElementById(cur))});
    high = cy.collection(high);
    geneSelect(high);
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


$('#navTabs a[href="#GeneTab"]').on('shown.bs.tab', function(){
  if($.fn.DataTable.isDataTable('#GeneTable')){
    $('#GeneTable').DataTable().draw();
  }
});

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
    if(termTable && (lastNetwork==='' || lastOntology==='' || lastTerm==='')){return;}
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
    
    // After the wait dialog is open, load the graph
    $("#cyWait").one('shown.bs.modal', function(){
        // Update the persistent variables
        updateOpts();
        
        // Make a promise to do the graph
        var pinkySwear = new Promise(function(resolve,reject){
          if(newGraph && (nodes === undefined || edges === undefined)){
            if(term){getTermNet(resolve,reject,poly);}
            else{getCustomNet(resolve,reject,poly);}}
          else if(newGraph){
            if(poly){newPoly(resolve,reject,nodes,edges);}
            else{newForce(resolve,reject,nodes,edges);}}
          else{
            if(poly){updatePoly(resolve,reject);}
            else{updateForce(resolve,reject);}}
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
            
            // Trigger event graph loaded custom event
            $(window).trigger(graphLoadedEvent);
        },function(err){$('#cyWait').modal('hide');window.alert(err);});
    });
    $('#cyWait').modal('show');
}

/*--------------------------------
     Gene Selection Function
---------------------------------*/
function geneSelect(geneEles){
  cy.startBatch();
  
  var geneTbl = $('#GeneTable').DataTable();
  var subTbl = $('#SubnetTable').DataTable();
  if(geneEles.length === 1 && geneEles.hasClass('highlighted')){
    // If it's highlighted and alone, unselect it
    geneEles.removeClass('highlighted');
  }
  // Reconcile selection in graph and table
  else{
    // Otherwise select all of them!
    geneEles.forEach(function(cur, idx, arr){
      cur.addClass('highlighted');
    });
  }
  
  // Deselect all neighbors and edges
  var oldNei = cy.nodes('.neighbor').removeClass('neighbor');
  cy.edges('.highlightedEdge').removeClass('highlightedEdge');
  
  
  // Reselect all necessary edges and neighbors
  var genes = cy.nodes('.highlighted');
  var edges = genes.connectedEdges(':visible').addClass('highlightedEdge');
  var newNei = edges.connectedNodes().not('.highlighted').addClass('neighbor');

  // Find all the genes that need are marked in some way
  var geneSet = new Set();
  cy.nodes('.highlighted, .neighbor').forEach(function(cur,idx,arr){geneSet.add(cur.id());});
  
  // Update the subnetwork table
  updateSubnetTable(geneSet);
  
  // Add the the genes to the subnet table
  rowArr = []
  genes.forEach(function(cur, idx, arr){rowArr.push('#'+cur.id());});
  subTbl.rows('.selected').deselect();
  subTbl.rows(rowArr).select();
  
  cy.endBatch();
}

/*------------------------------------------
            Add gene to graph
------------------------------------------*/
function addGene(newGene){
  // Update the new gene
  geneDict[newGene]['data']['render'] = 'x';
  geneDict[newGene]['data']['origin'] = 'query';
  $('#geneList').append('\n'+ newGene +', ');
  
  // Make a list of all the genes for the purposes of the query
  var geneList = ''
  Object.keys(geneDict).forEach(function(cur,idx,arr){
    if(geneDict[cur]['data']['render'] === 'x'){
      geneList += cur + ', ';
    }
  });
  
  // Run the selection algorithm when graph is updated
  $(window).one('graphLoaded', {'new': newGene}, function(evt){
    var node = cy.getElementById(evt.data.new);
    geneSelect(cy.nodes('.highlighted'));
    setGeneListeners(node);
    geneSelect(node);
  });
  
  // Run the server query to get the new edges
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_connections'),
    data: {
      network: lastNetwork,
      edgeCutoff: lastOpts['edgeCutoff'],
      geneList: geneList,
      newGene: newGene,
    },
    type: 'POST',
    success: function(data){
      var node = cy.add(geneDict[newGene]);
      cy.add(data.edges);
      updateGraph();
    }
  });
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
    if(isTerm){
      msg += lastOntology + ' > '
      msg += lastTerm +' > '
      msg += lastOpts['windowSize'] + '/' + lastOpts['flankLimit'];
    }
    
    // Otherwise just call it a custom network
    else{msg += 'Custom Network';}
  }
  
  // Post the message to the proper box
  $("#cyTitle").html(msg);
}

// Method to get values until obj.values() is in safari and edge
function getValues(obj, onlyRender){
  var vals = [];
  var val = null;
  Object.keys(obj).forEach(function(cur,idx,arr){
    val = obj[cur];
    if(!onlyRender || (val['data']['render'] === 'x')){vals.push(val);}
  });
  return vals;
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
    'width': (diameter*2).toString(),
    'height': (diameter*2).toString(),
  });
  if(!(isPoly())){
    cy.style().selector('[origin = "query"]').style({
      'width': (diameter*1.5).toString(),
      'height': (diameter*1.5).toString(),
    });
  }
  cy.style().update();
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
function setGeneListeners(genes){
  // Get all the genes
  if(genes === undefined){genes = cy.nodes('[type = "gene"]');}
  
  // Set listener for clicking
  genes.on('tap', function(evt){
    if(evt.originalEvent.ctrlKey){
      window.open('http://www.maizegdb.org/gene_center/gene/'+evt.cyTarget.id());
    }
    else{
      if(evt.cyTarget.hasClass('highlighted')){
        $('#GeneTable').DataTable().row('#'+evt.cyTarget.id()).deselect();
      }
      else{
        $('#GeneTable').DataTable().row('#'+evt.cyTarget.id()).scrollTo().select();
      }
    }
  });
  
  // Setup qtips
  genes.qtip({
    content: function(){
      var data = this.data();
      res = 'ID: '+data['id'].toString()+'<br>';
      if(data['alias'].length > 0){res += 'Alias(es): '+data['alias'].toString()+'<br>';}
      res += 'Local Degree: '+data['cur_ldegree'].toString()+'<br>';
      if(isTerm){res += 'SNP: '+data['snp'].toString()+'<br>';}
      res += 'Position: '+data['start'].toString()+'-'+data['end'].toString();
      return res;
    },
    position: {my: 'bottom center', at: 'top center'},
    style: {
      classes: 'qtip-dark qtip-rounded qtip-shadow',
      tip: {width: 10, height: 5},
    },
    show: {event: 'mouseover'},
    hide: {event: 'mouseout unfocus', distance:20},
  });
}

/*---------------------------------------
      Build Subnet Graph Function
---------------------------------------*/
function makeSubnet(){
  var nodeDict = {};
  var edgeList = [];
  var dataDict = null;
  
  // Clear the genelist box for the new main genes
  $('#geneList').html('');
  
  // Find the main gene objects from the current graph
  cy.nodes('.highlighted').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'query';
    $('#geneList').append(dataDict['id']+', ');
    nodeDict[dataDict['id']] = {'group':'nodes', 'data':dataDict};
  });
  
  // Find the neighbor gene object from the current graph
  cy.nodes('.neighbor').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'neighbor';
    nodeDict[dataDict['id']] = {'group':'nodes', 'data':dataDict};
  });
  
  // Find the edge data objects from the current graph
  cy.edges('.highlightedEdge').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    edgeList.push({'group':'edges', 'data':dataDict});
  });
  
  // Make sure there are genes to work with
  if(nodeDict.length === 0){
    window.alert('There must be genes highlighted to graph the subnetwork');
    return;
  }
  
  // Save the new gene object list
  pastGeneDicts.push(geneDict);
  pastPoly.push(isPoly());
  pastQuery.push($('#geneList').val());
  geneDict = nodeDict;
  
  // Switch to the gene list tab, also triggers option page to shift
  $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
  
  // Load the new graph using the found nodes and edges
  loadGraph(true,false,undefined,nodeDict,edgeList);
  return;
}

// Go back from subnet to previous graph
function restoreGraph(){
  if(pastGeneDicts.length < 1){return;}
  // Restore the most recent set of gene nodes
  geneDict = pastGeneDicts.pop();
  poly = pastPoly.pop();
  $('#geneList').html(pastQuery.pop());
  
  // Make a list of all the genes for the purposes of the query
  var geneList = ''
  getValues(geneDict,true).forEach(function(cur,idx,arr){geneList+=cur['data']['id']+', ';});
  
  // Run the server query to get the edges for this set
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_connections'),
    data: {
      network: lastNetwork,
      edgeCutoff: lastOpts['edgeCutoff'],
      geneList: geneList,
      newGene: 'N/A',
    },
    type: 'POST',
    success: function(data){
      loadGraph(true,poly,undefined,geneDict,data.edges);
    }
  });
}

/* -----------------------------------
           Handle Options
----------------------------------- */
function restoreDefaults(){
  Object.keys(optVals).forEach(function(cur,idx,arr){
    $('#'+cur).val(optVals[cur]['default']);
  });
}

// Update the values in the lastOps dict
function updateOpts(){lastOpts = curOpts();}

function curOpts(){
  var vals = {};
  Object.keys(optVals).forEach(function(cur,idx,arr){
    vals[cur] = document.forms["opts"][cur].value;
  });
  return vals;
}

function optsChange(opts){
  var result = false;
  var curOp = curOpts();
  opts.forEach(function(cur,idx,arr){
    if(curOp[cur] !== lastOpts[cur]){result = true;}
  });
  return result;
}

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

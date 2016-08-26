// Handle pulling the two diffent types of data

// Pull the nodes for a specific term
function termNet(resolve, reject, poly){
  $.ajax({
    url: ($SCRIPT_ROOT + 'term_network'),
    data: {
      network: curNetwork,
      ontology: curOntology,
      term: curTerm,
      nodeCutoff: curOpts['nodeCutoff'],
      edgeCutoff: curOpts['edgeCutoff'],
      windowSize: curOpts['windowSize'],
      flankLimit: curOpts['flankLimit'],
    },
    type: 'POST',
    statusCode: {400: function(){reject('Getting the term network went wrong somehow.');}},
    success: function(data){
        geneDict = data.nodes;
      isTerm = true;
      
      // Clean the data trackers
      pastGeneDicts = [];
      pastPoly = [];
      pastQuery = [];
      
      // Send back the nodes and edges
      modCyto(resolve,reject,true,poly,data.nodes,data.edges);
    }
  });
}

// Pull the nodes for a custom defined set of genes
function customNet(resolve, reject, poly){
  $.ajax({
    url: ($SCRIPT_ROOT + 'custom_network'),
    data: {
      network: curNetwork,
      nodeCutoff: curOpts['nodeCutoff'],
      edgeCutoff: curOpts['edgeCutoff'],
      maxNeighbors: curOpts['visNeighbors'],
      geneList: $('#geneList').val(),
    },
    type: 'POST',
    statusCode: {400: function(){reject('No input genes were present in the network.');}},
    success: function(data){
      geneDict = data.nodes;
      isTerm = false;
      
      // If there we're any rejected genes, alert the user
      if(data.rejected.length > 0){
        window.alert('The following gene(s) were not found in the designated network:\n\n\n'+data.rejected.toString()+'\n\n');}
      
      // Clean the data trackers
      pastGeneDicts = [];
      pastPoly = [];
      pastQuery = [];
      
      // Send back the nodes and edges
      modCyto(resolve,reject,true,poly,data.nodes,data.edges);
    }
  });
}

/*------------------------------------------
          Add Known gene to graph
------------------------------------------*/
function addGenes(newGenes){
  // Update the new genes
  var newGenesData = [];
  newGenes.forEach(function(cur,idx,arr){
    geneDict[cur]['data']['render'] = 'x';
    geneDict[cur]['data']['origin'] = 'query';
    newGenesData.push(geneDict[cur]);
    $('#geneList').append('\n'+ cur +', ');
  });
  
  // Make a list of all the genes for the purposes of the query
  var allGenes = Object.keys(geneDict).filter(cur => geneDict[cur]['data']['render'] === 'x');
  
  // Run the server query to get the new edges
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_connections'),
    data: {
      network: curNetwork,
      edgeCutoff: curOpts['edgeCutoff'],
      allGenes: allGenes.toString(),
      newGenes: newGenes.toString(),
    },
    type: 'POST',
    success: function(data){
      cy.add(newGenesData);
      cy.add(data.edges);
      updateGraph();
    }
  });
}

/*---------------------------------------
      Build Subnet Graph Function
---------------------------------------*/
function makeSubnet(){
  var nodeDict = {};
  var edgeList = [];
  var dataDict = null;
  
  // Save the new gene object list
  pastGeneDicts.push(jQuery.extend(true, {}, geneDict));
  pastPoly.push(isPoly());
  pastQuery.push($('#geneList').val());
  
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
  
  // Save the new set of nodes to gene dict
  geneDict = nodeDict;
  
  // Switch to the gene list tab, also triggers option page to shift
  $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
  
  // Load the new graph using the found nodes and edges
  loadGraph(true,false,undefined,nodeDict,edgeList);
  return;
}

/*------------------------------------------
      Restore Previous Graph Function
------------------------------------------*/
function restoreGraph(){
  // If there is no saved graph states, there is nothing to go back to
  if(pastGeneDicts.length < 1){return;}
  
  // Save the current queries to highlight in old graph
  curSel = Object.keys(geneDict).filter(cur => geneDict[cur]['data']['origin'] === 'query');
  
  // Restore the most recent set of gene nodes, find graph style
  geneDict = pastGeneDicts.pop();
  $('#geneList').html(pastQuery.pop());
  
  // Make a list of all the genes for the purposes of the query
  var allGenes = Object.keys(geneDict).filter(cur => geneDict[cur]['data']['render'] === 'x');
  
  // Run the server query to get the edges for this set
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_connections'),
    data: {
      newGenes: '',
      allGenes: allGenes.toString(),
      network: curNetwork,
      edgeCutoff: curOpts['edgeCutoff'],
    },
    type: 'POST',
    success: function(data){
      loadGraph(true,pastPoly.pop(),undefined,geneDict,data.edges);
    }
  });
}
/*----------------------------------
        Retrieve Gene Data
-----------------------------------*/
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
      fdrCutoff: fdrFilter ? curOpts['fdrCutoff'] : 'None',
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
          Add Known Gene to Graph
------------------------------------------*/
function addGenes(newGenes){
  // Set the add gene mutex
  noAdd = true;
  
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
      noAdd = false;
    }
  });
}

// Handle pulling the two diffent types of data

// Pull the nodes for a specific term
function getTermNet(resolve, reject, poly){
  $.ajax({
    url: ($SCRIPT_ROOT + 'term_network'),
    data: {
      network: lastNetwork,
      ontology: lastOntology,
      term: lastTerm,
      windowSize: lastWindowSize,
      flankLimit: lastFlankLimit,
      edgeCutoff: lastEdgeCutoff,
      nodeCutoff: lastNodeCutoff,
    },
    type: 'POST',
    statusCode: {400: function(){reject('Getting the term network went wrong somehow.');}},
    success: function(data){
      if(poly){newPoly(resolve,reject,data.nodes,data.edges);}
      else{newForce(resolve,reject,data.nodes,data.edges);}
    }
  });
}

// Pull the nodes for a custom defined set of genes
function getCustomNet(resolve, reject, poly){
  $.ajax({
    url: ($SCRIPT_ROOT + 'custom_network'),
    data: {
      network: lastNetwork,
      edgeCutoff: lastEdgeCutoff,
      nodeCutoff: lastNodeCutoff,
      maxNeighbors: lastVisNeighbors,
      geneList: $('#geneList').val(),
    },
    type: 'POST',
    statusCode: {400: function(){reject('No input genes were present in the network.');}},
    success: function(data){
      // If there we're any rejected genes, alert the user
      if(data.rejected.length > 0){
        window.alert('The following gene(s) were not found in the designated network:\n\n\n'+data.rejected.toString()+'\n\n');}
      
      // Send back the nodes and edges
      if(poly){newPoly(resolve,reject,data.nodes,data.edges);}
      else{newForce(resolve,reject,data.nodes,data.edges);}
    }
  });
}

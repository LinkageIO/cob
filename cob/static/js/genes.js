/*----------------------------------
        Retrieve Gene Data
-----------------------------------*/
// Pull the nodes for a specific term
function termNet(resolve, reject, poly) {
  $.ajax({
    url: SCRIPT_ROOT + 'term_network',
    data: {
      network: curNetwork,
      ontology: curOntology,
      term: curTerm,
      nodeCutoff: curOpts['nodeCutoff'],
      edgeCutoff: curOpts['edgeCutoff'],
      windowSize: curOpts['windowSize'],
      flankLimit: curOpts['flankLimit'],
      fdrCutoff: fdrFilter ? curOpts['fdrCutoff'] : 'None',
      hpo: getOpt('hpo'),
      overlapSNPs: getOpt('overlapSNPs'),
      overlapMethod: getOpt('overlapMethod'),
    },
    type: 'POST',
    statusCode: {
      400: function() {
        reject(
          'Getting the term network went wrong somehow. Try refreshing and starting again.',
        );
      },
      500: function() {
        reject(
          'Getting the term network went wrong somehow. Try refreshing and starting again.',
        );
      },
    },
    success: function(data) {
      geneDict = data.nodes;

      // Set some statuses
      isTerm = true;
      hasGO = data.hasGO;
      hasGWS = data.hasGWS;

      // Clean the data trackers
      pastGeneDicts = [];
      pastPoly = [];
      pastQuery = [];

      // Send back the nodes and edges
      modCyto(resolve, reject, true, poly, data.nodes, data.edges);
    },
  });
}

// Pull the nodes for a custom defined set of genes
function customNet(resolve, reject, poly) {
  // Fail safe to pull neighbors if actually needed
  if (getOpt('visNeighbors') > 0) {
    hasNeighbors = true;
  }

  // Run the request!
  $.ajax({
    url: SCRIPT_ROOT + 'custom_network',
    data: {
      network: curNetwork,
      hasNeighbors: hasNeighbors,
      nodeCutoff: curOpts['nodeCutoff'],
      edgeCutoff: curOpts['edgeCutoff'],
      visNeighbors: hasNeighbors ? curOpts['visNeighbors'] : 'None',
      geneList: $('#geneList').val(),
    },
    type: 'POST',
    statusCode: {
      400: function() {
        reject(
          'Getting the term network went wrong somehow. Try refreshing and starting again.',
        );
      },
      500: function() {
        reject(
          'Getting the term network went wrong somehow. Try refreshing and starting again.',
        );
      },
    },
    success: function(data) {
      geneDict = data.nodes;

      // Set some statuses
      isTerm = false;
      hasGO = data.hasGO;
      hasGWS = data.hasGWS;

      // If there we're any rejected genes, alert the user
      if (data.rejected.length > 0) {
        window.alert(
          'The following gene(s) were not found in the designated network:\n\n\n' +
            data.rejected.toString() +
            '\n\n',
        );
      }

      // Clean the data trackers
      pastGeneDicts = [];
      pastPoly = [];
      pastQuery = [];

      // Send back the nodes and edges
      modCyto(resolve, reject, true, poly, data.nodes, data.edges);
    },
  });
}

/*------------------------------------------
          Add/Remove Genes on Graph
------------------------------------------*/
function addGenes(newGenes) {
  // Set the add gene mutex
  noAdd = true;

  // Update the new genes
  var newGenesData = [];
  newGenes.forEach(function(cur, idx, arr) {
    geneDict[cur]['data']['render'] = true;
    geneDict[cur]['data']['origin'] = 'query';
    newGenesData.push(geneDict[cur]);
    $('#geneList').append('\n' + cur + ', ');
  });

  // Make a list of all the genes for the purposes of the query
  var allGenes = Object.keys(geneDict).filter(
    (cur) => geneDict[cur]['data']['render'],
  );

  // Run the server query to get the new edges
  $.ajax({
    url: SCRIPT_ROOT + 'gene_connections',
    data: {
      network: curNetwork,
      edgeCutoff: curOpts['edgeCutoff'],
      allGenes: allGenes.toString(),
      newGenes: newGenes.toString(),
    },
    type: 'POST',
    success: function(data) {
      cy.add(newGenesData);
      cy.add(data.edges);
      noAdd = false;
      updateGraph();
    },
  });
}

function removeGenes(genes) {
  cy.startBatch();
  genes.forEach(function(cur, idx, arr) {
    geneDict[cur]['data']['render'] = false;
    $('#geneList').append('\n' + cur + ', ');
    cy.remove('#' + cur);
  });
  cy.endBatch();
  updateGraph();
}

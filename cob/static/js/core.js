/*---------------------------------------
      Build the Graph and Tables
---------------------------------------*/
// Get data and build the new graph
function loadGraph(newGraph, poly, term, nodes, edges) {
  // Check all of the relevant options and prompt if any have bad inputs
  $('.alert').addClass('hidden');
  var badFields = checkOpts();
  if (badFields.length > 0) {
    errorOpts(badFields);
    return;
  }

  // If we are only updating the graph, save the selected genes
  if (!newGraph) {
    curSel = $('#GeneTable')
      .DataTable()
      .rows('.selected')
      .ids(true);
  }

  // After the wait dialog is open, load the graph
  $('#cyWait').one('shown.bs.modal', function() {
    // Update the persistent variables
    updateOpts();

    // Reset the FDR flag
    fdrFlag = false;

    // Make a promise to do the graph
    var pinkySwear = new Promise(function(resolve, reject) {
      if (newGraph && (nodes === undefined || edges === undefined)) {
        if (term) {
          termNet(resolve, reject, poly);
        } else {
          customNet(resolve, reject, poly);
        }
      } else {
        modCyto(resolve, reject, newGraph, poly, nodes, edges);
      }
    });

    pinkySwear.then(
      function(result) {
        cy.startBatch();
        // Update Node Degrees
        Object.keys(geneDict).forEach(function(cur, idx, arr) {
          if (geneDict[cur]['data']['render']) {
            geneDict[cur]['data']['cur_ldegree'] = cy
              .getElementById(cur)
              .degree();
          } else {
            geneDict[cur]['data']['cur_ldegree'] = 0;
          }
        });
        cy.endBatch();

        // Update the table and such
        $('#cyWait').modal('hide');
        $('#navTabs a[href="#GeneTab"]').tab('show');
        buildGeneTables();
        updateHUD();

        // Show the back button if necessary
        if (pastGeneDicts.length > 0) {
          $('#backButton').removeClass('hidden');
        } else {
          $('#backButton').addClass('hidden');
        }

        // If there were any genes saved to select reselect them
        if (curSel.length > 0) {
          // Selecthem in the table and trigger the gene select function
          $('#GeneTable')
            .DataTable()
            .rows(curSel)
            .select();
        }
      },
      function(err) {
        $('#cyWait').modal('hide');
        updateHUD();
        setTimeout(function() {
          window.alert(err);
        }, 200);
      },
    );
  });
  $('#cyWait').modal('show');
}

// Front to figure out how to update the graph most efficiently
function updateGraph() {
  var newGraph = true;
  var poly = null;
  var term = null;

  // If there isn't already a graph, try to decipher desired path
  if (cy === null) {
    var termTable =
      $('#GeneSelectTabs .active [role = "tab"]').attr('href') ===
      '#TermTableTab';
    if (
      termTable &&
      (curNetwork === '' || curOntology === '' || curTerm === '')
    ) {
      return;
    } else if (termTable) {
      poly = true;
      term = true;
    } else {
      poly = false;
      term = false;
    }
  } else {
    // If there is one see how full of a reload is necessary
    newGraph =
      fdrFlag ||
      optsChange([
        'nodeCutoff',
        'edgeCutoff',
        'visNeighbors',
        'windowSize',
        'flankLimit',
        'fdrCutoff',
        'hpo',
        'overlapSNPs',
        'overlapMethod',
      ]);
    poly = isPoly();
    term = isTerm;
  }
  loadGraph(newGraph, poly, term);
}

/*--------------------------------
     Gene Selection Function
---------------------------------*/
function geneSelect() {
  // Get references to the DataTables APIs
  var geneTbl = $('#GeneTable').DataTable();
  var subTbl = $('#SubnetTable').DataTable();

  // Find all the genes that should be highlighted, and should be added
  var genes = [];
  var toAdd = [];
  geneTbl
    .rows('.selected')
    .ids()
    .each(function(cur) {
      var ele = cy.getElementById(cur);
      if (ele.length < 1) {
        toAdd.push(cur);
      } else {
        genes.push(cy.getElementById(cur));
      }
    });

  // If there are any genes to add, trigger that now
  if (toAdd.length > 0) {
    addGenes(toAdd);
  } else {
    // Do the necessary selection transaction
    cy.startBatch();

    // Deselect all neighbors and edges
    cy.nodes('.highlighted').removeClass('highlighted');
    cy.nodes('.neighbor').removeClass('neighbor');
    cy.edges('.highlightedEdge').removeClass('highlightedEdge');

    // Highlight all the things that need it
    genes = cy.collection(genes).addClass('highlighted');
    var edges = genes.connectedEdges(':visible').addClass('highlightedEdge');
    edges
      .connectedNodes()
      .not('.highlighted')
      .addClass('neighbor');

    // Find genes need to build the subnetwork table
    var geneSet = new Set();
    var geneSel = [];
    cy.nodes('.highlighted, .neighbor').forEach(function(cur, idx, arr) {
      geneSet.add(cur.id());
    });
    genes.forEach(function(cur, idx, arr) {
      geneSel.push('#' + cur.id());
    });

    // Update the subnetwork table
    updateSubnetTable(geneSet, geneSel);

    cy.endBatch();
  }
}

/*---------------------------------------
      Build Subnet Graph Function
---------------------------------------*/
function makeSubnet() {
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
  cy.nodes('.highlighted').forEach(function(cur, idx, arr) {
    dataDict = cur.data();
    dataDict['origin'] = 'query';
    $('#geneList').append(dataDict['id'] + ', ');
    nodeDict[dataDict['id']] = {group: 'nodes', data: dataDict};
  });

  // Find the neighbor gene object from the current graph
  cy.nodes('.neighbor').forEach(function(cur, idx, arr) {
    dataDict = cur.data();
    dataDict['origin'] = 'neighbor';
    nodeDict[dataDict['id']] = {group: 'nodes', data: dataDict};
  });

  // Find the edge data objects from the current graph
  cy.edges('.highlightedEdge').forEach(function(cur, idx, arr) {
    dataDict = cur.data();
    edgeList.push({group: 'edges', data: dataDict});
  });

  // Make sure there are genes to work with
  if (nodeDict.length === 0) {
    window.alert('There must be genes highlighted to graph the subnetwork');
    return;
  }

  // Save the new set of nodes to gene dict
  geneDict = nodeDict;

  // Switch to the gene list tab, also triggers option page to shift
  $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');

  // Load the new graph using the found nodes and edges
  loadGraph(true, false, undefined, nodeDict, edgeList);
  return;
}

/*------------------------------------------
      Restore Previous Graph Function
------------------------------------------*/
function restoreGraph() {
  // If there is no saved graph states, there is nothing to go back to
  if (pastGeneDicts.length < 1) {
    return;
  }

  // Save the current queries to highlight in old graph
  curSel = Object.keys(geneDict).filter(
    (cur) => geneDict[cur]['data']['origin'] === 'query',
  );

  // Restore the most recent set of gene nodes, find graph style
  geneDict = pastGeneDicts.pop();
  $('#geneList').html(pastQuery.pop());

  // Make a list of all the genes for the purposes of the query
  var allGenes = Object.keys(geneDict).filter(
    (cur) => geneDict[cur]['data']['render'],
  );

  // Run the server query to get the edges for this set
  $.ajax({
    url: SCRIPT_ROOT + 'gene_connections',
    data: {
      newGenes: '',
      allGenes: allGenes.toString(),
      network: curNetwork,
      edgeCutoff: curOpts['edgeCutoff'],
    },
    type: 'POST',
    success: function(data) {
      loadGraph(true, pastPoly.pop(), undefined, geneDict, data.edges);
    },
  });
}

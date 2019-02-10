/*----------------------------------
    Selection Table Constructors
-----------------------------------*/
// Build a Fresh Network Table
function buildNetworkTable() {
  destroyTable('Network', false);
  $('#NetworkTable').DataTable({
    ajax: SCRIPT_ROOT + 'available_networks',
    columns: [
      {data: 'name', name: 'name', title: 'Network'},
      {data: 'refgen', name: 'refgen', title: 'RefGen'},
      {data: 'desc', name: 'desc', title: 'Description'},
    ],
    dom: '<"NetworkTitle">ft',
    order: [[0, 'asc']],
    paginate: false,
    scrollCollapse: true,
    scrollY: '10vh',
    select: true,
    searching: true,
  });
  $('div.NetworkTitle').html('Network');
  $('#NetworkTable tbody').on('click', 'tr', networkListner);
  return;
}

// Build a Fresh Ontology Table
function buildOntologyTable(network) {
  destroyTable('Ontology', false);
  $('#OntologyTable').DataTable({
    ajax: SCRIPT_ROOT + 'available_ontologies/' + network,
    columns: [
      {data: 'name', name: 'name', title: 'Ontology'},
      {data: 'refgen', name: 'refgen', title: 'RefGen'},
      {data: 'desc', name: 'desc', title: 'Description'},
    ],
    dom: '<"OntologyTitle">ft',
    initComplete: function(settings, json) {
      if (json.data.length < 1) {
        $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
      }
    },
    language: {
      emptyTable:
        'No ontologies available for this network. Please enter query genes in the "Custom Gene List" Tab.',
    },
    order: [[0, 'asc']],
    paginate: false,
    scrollCollapse: true,
    scrollY: '10vh',
    select: true,
    searching: true,
  });
  $('div.OntologyTitle').html('Ontology');
  $('#OntologyTable tbody').on('click', 'tr', ontologyListener);
  return;
}

// Build a Fresh Term Table
function buildTermTable(network, ontology) {
  destroyTable('Term', false);
  $('#TermTable').DataTable({
    ajax: SCRIPT_ROOT + 'available_terms/' + network + '/' + ontology,
    columns: [
      {data: 'name', name: 'name', title: 'Name'},
      {data: 'desc', name: 'desc', title: 'Desc'},
      {data: 'snps', name: 'snps', title: 'SNPs'},
      {data: 'genes', name: 'genes', title: 'Genes'},
    ],
    dom: '<"TermTitle">frtip',
    initComplete: function(settings, json) {
      if (json.data.length < 1) {
        $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
      }
    },
    language: {
      emptyTable:
        'No terms available for this ontology. Please enter query genes in the "Custom Gene List" Tab.',
    },
    order: [[0, 'asc']],
    paginate: false,
    scrollCollapse: true,
    scrollY: '23vh',
    select: true,
    searching: true,
  });
  $('div.TermTitle').html('Terms');
  $('#TermTable tbody').on('click', 'tr', termListener);
  return;
}

// Restore the term select tab to original
function resetOntology() {
  if ($.fn.DataTable.isDataTable('#OntologyTable')) {
    $('#OntologyTable')
      .DataTable()
      .rows()
      .deselect();
  }
  destroyTable('Term', true);
}

/*--------------------------------
      Gene Table Constructors
---------------------------------*/
function buildGeneTables() {
  // Derive Export Filename
  var name = curNetwork + '.';
  if (isTerm) {
    name += curTerm;
  } else {
    name += 'Custom';
  }

  // Settings for the tables!
  var tableOpts = {
    deferRender: false,
    order: [[4, 'asc'], [5, 'dec']],
    paging: true,
    paginate: false,
    rowId: 'id',
    scrollCollapse: true,
    scroller: {displayBuffer: 1500},
    scrollX: '100%',
    scrollY:
      $(window).height() -
      $('#cobHead').height() -
      $('#navTabs').height() -
      120,
    searching: true,
    select: {
      style: 'multi+shift',
      selector: 'td:not(td:nth-child(1), td:nth-child(2))',
    },
    buttons: [
      {extend: 'csv', filename: name, titleAttr: csvTitle},
      {text: 'Graph Subnet', action: makeSubnet, titleAttr: gsTitle},
      {text: 'GO', action: gont, enabled: hasGO, titleAttr: goTitle},
      {
        text: 'GWS',
        action: gws,
        titleAttr: gwsTitle,
        available: function(dt, config) {
          return hasGWS;
        },
      },
    ],
    columns: [
      {
        name: 'rendered',
        title: 'Vis',
        orderable: false,
        data: function(row) {
          if (row.render) {
            return (
              '<a href="javascript:delGene(\'' +
              row.id +
              '\')"><span class="glyphicon glyphicon-ok"></span></a>'
            );
          } else {
            return (
              '<a href="javascript:selGene(\'' +
              row.id +
              '\')"><span class="glyphicon glyphicon-plus"></span></a>'
            );
          }
        },
      },
      {
        name: 'info',
        title: 'Ref',
        orderable: false,
        data: function(row) {
          return (
            '<a href="javascript:geneRef(\'' +
            row.id +
            '\')"><span class="glyphicon glyphicon-new-window"></span></a>'
          );
        },
        visible: refLinks[curNetwork] !== undefined,
      },
      {data: 'id', name: 'id', title: 'ID'},
      {data: 'alias', name: 'alias', title: 'Alias'},
      {data: 'fdr', name: 'fdr', title: 'FDR'},
      {data: 'cur_ldegree', name: 'cur_ldegree', title: 'Current Degree'},
      {data: 'ldegree', name: 'ldegree', title: 'Term Degree'},
      {data: 'gdegree', name: 'gdegree', title: 'Global Degree'},
      {data: 'chrom', name: 'chrom', title: 'Chrom'},
      {data: 'snp', name: 'snp', title: 'SNP'},
      {data: 'start', name: 'start', title: 'Start'},
      {data: 'end', name: 'end', title: 'End'},
      {
        data: 'numIntervening',
        name: 'numIntervening',
        title: 'Num Intervening',
      },
      {
        data: 'rankIntervening',
        name: 'rankIntervening',
        title: 'Rank Intervening',
      },
      {data: 'numSiblings', name: 'numSiblings', title: 'Num Siblings'},
      {
        data: 'windowSize',
        name: 'windowSize',
        title: 'Window Size',
        visible: false,
      },
      {
        data: 'flankLimit',
        name: 'flankLimit',
        title: 'Flank Limit',
        visible: false,
      },
      {data: 'annotations', name: 'annotations', title: 'Annotations'},
      //{data: 'parentNumIterations', name:'parentNumIterations', title: 'Num Parent Interactions'},
      //{data: 'parentAvgEffectSize', name:'parentAvgEffectSize', title: 'Avg Parent Effect Size'},
    ],
  };

  // Deep copy the options to prevent interference
  var geneOpts = $.extend(true, {}, tableOpts);
  var subOpts = $.extend(true, {}, tableOpts);

  /*--------------------------------
              Prep Work
  ---------------------------------*/
  // Destroy the old tables if present
  destroyTable('Gene', false);
  destroyTable('Subnet', false);

  // Set button information messages
  var csvTitle = 'Export all genes in this table to a CSV file';
  var gsTitle =
    'Build a new graph that includes only the currently selected genes and their neighbors, but you will be able to return to the current graph from the new graph';
  var gwsTitle =
    'Run a GeneWordSearch enrichment analysis on the genes in this table';
  if (hasGO) {
    var goTitle =
      'Run a GO term enrichment analysis on the genes in this table';
  } else {
    var goTitle =
      'GO enrichment not available for this organism, please contact site admin if needed.';
  }

  /*--------------------------------
       Setup The Gene Table
  ---------------------------------*/
  // Get gene data
  var geneData = [];
  Object.keys(geneDict).forEach(function(cur, idx, arr) {
    geneData.push(geneDict[cur]['data']);
  });

  // Build the table
  geneOpts.data = geneData;
  geneOpts.dom = '<"GeneTitle">frtpB';
  var gene_table = $('#GeneTable').DataTable(geneOpts);

  // Make certain columns invisible if there will be no useful data
  gene_table
    .columns([
      'snp:name',
      'fdr:name',
      'numIntervening:name',
      'rankIntervening:name',
      'numSiblings:name',
    ])
    .visible(isTerm);

  // Set the inline titles on the tables
  $('div.GeneTitle').html(
    'Gene Data <span id="GeneTableInfo" title="This table contains information for all of the genes matched by your query. The ones that are rendered in the graph are denoted by an \'X\' in the first column. The remaining are genes that matched the query, but were discluded due to the parameters set in the options tab. They can be added to the graph by simply clicking them. To see just the genes that are selected and their neighbors, go to the \'Subnetwork\' tab." class="table-glyph glyphicon glyphicon-info-sign"></span>',
  );

  /*--------------------------------
       Setup The Subnet Table
  ---------------------------------*/
  // Build the table
  subOpts.data = [];
  subOpts.dom = '<"SubnetTitle">frtpB';
  var sub_table = $('#SubnetTable').DataTable(subOpts);

  // Set the inline titles on the tables
  $('div.SubnetTitle').html(
    'Subnet Data <span id="SubnetTableInfo" title="This table contains information  for all of the selected genes and their first neighbors. This is the same data that is contained in the main gene table, forpurposes of making navigating an interesting subnetwork easier." class="table-glyph glyphicon glyphicon-info-sign"></span>',
  );

  // Make certain columns invisible if there will be no useful data
  sub_table.columns(['rendered:name']).visible(false);
  sub_table
    .columns([
      'snp:name',
      'fdr:name',
      'numIntervening:name',
      'rankIntervening:name',
      'numSiblings:name',
    ])
    .visible(isTerm);

  /*----------------------------------
       Setup The Table Listeners
  -----------------------------------*/
  // Set the info in the titles
  infoTips('#GeneTableInfo, #SubnetTableInfo');

  // Set up qtips on table buttons
  infoTips(gene_table.buttons(0, null).nodes(), 'bottom center', 'top center');
  infoTips(sub_table.buttons(0, null).nodes(), 'bottom center', 'top center');

  // Set listener for pop effect of subnetwork table
  $('#SubnetTable tbody').on('mouseover', 'tr', function(evt) {
    if (this['id'].length > 0) {
      window.clearTimeout(popTimerID);
      popTimerID = window.setTimeout(
        function(id) {
          cy.getElementById(id).flashClass('pop', 750);
        },
        10,
        this['id'],
      );
    }
  });

  // Prevent selection on gene table if noAdd flag
  $('#GeneTable')
    .DataTable()
    .on('user-select', function(evt) {
      // If we are in the process of adding a gene, kill this request
      if (noAdd) {
        evt.preventDefault();
        window.alert(
          "We're currently processing a previous add gene request, if you would like to add more than one at a time, please use the shift select method.",
        );
      }
    });

  // Handling a select on the gene table
  $('#GeneTable')
    .DataTable()
    .on('select deselect', function(evt) {
      geneSelect();
    });

  // Mirroring a select on the gene table
  $('#SubnetTable')
    .DataTable()
    .on('user-select', function(evt, dt, type, cell, ogEvent) {
      // Prevent changes on this table
      evt.preventDefault();

      // If already adding something kill it
      if (noAdd) {
        window.alert(
          "We're currently processing a previous add gene request, if you would like to add more than one at a time, please use the shift select method.",
        );
        return;
      }

      // Select the genes on the main table
      var tbl = $('#SubnetTable').DataTable();
      if ($(tbl.row(cell.index().row).node()).hasClass('selected')) {
        $('#GeneTable')
          .DataTable()
          .row('#' + tbl.row(cell.index().row).id())
          .deselect();
      } else {
        $('#GeneTable')
          .DataTable()
          .row('#' + tbl.row(cell.index().row).id())
          .select();
      }
    });
}

/*---------------------------------------
         Table Helper Functions
---------------------------------------*/
// Helper funtion to add gene to graph with plus
function selGene(id) {
  $('#GeneTable')
    .DataTable()
    .row('#' + id)
    .select();
  geneSelect();
}

// Helper function to remove gene from graph with check
function delGene(id) {
  $('#GeneTable')
    .DataTable()
    .row('#' + id)
    .deselect();
  removeGenes([id]);
}

// Run GWS enrichment on table
function gws(e, dt, node, config) {
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList, false);
}

// Run GO enrichment on table
function gont(e, dt, node, cofig) {
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList, true);
}

/*---------------------------------------
           Table Cleanup
---------------------------------------*/
function destroyTable(table, hide) {
  // Deconstruct the table if they exist
  var tableID = '#' + table + 'Table';
  if ($.fn.DataTable.isDataTable(tableID)) {
    $(tableID)
      .DataTable()
      .destroy();
    $(tableID)
      .off()
      .empty();
  }

  // Show the wait messages
  if (table === 'Ontology') {
    tableID = '#GeneSelect';
  }
  var waitID = tableID + 'Wait';

  $(tableID).toggleClass('hidden', hide);
  $(waitID).toggleClass('hidden', !hide);
}

/*-------------------------------
      Subnet Table Updater
-------------------------------*/
function updateSubnetTable(newGenes, newGenesSel) {
  // Get the table api ref
  var tbl = $('#SubnetTable').DataTable();

  // Find the genes we must add and remove
  var oldGenes = new Set();
  tbl
    .rows()
    .ids()
    .each(function(cur) {
      oldGenes.add(cur);
    });
  var toAdd = [...newGenes].filter((cur) => !oldGenes.has(cur));
  var toSub = [...oldGenes].filter((cur) => !newGenes.has(cur));

  // Get the data in the proper formats for adding and removing
  toAdd.forEach(function(cur, idx, arr) {
    arr[idx] = geneDict[cur]['data'];
  });
  toSub.forEach(function(cur, idx, arr) {
    arr[idx] = '#' + cur;
  });

  // Clear old data and add new
  if (toSub.length > 0) {
    tbl.rows(toSub).remove();
  }
  tbl.rows.add(toAdd).draw();

  // Update the selections
  tbl.rows('.selected').deselect();
  tbl.rows(newGenesSel).select();
}

/*--------------------------------
  Listeners for Selection Tables
---------------------------------*/
function networkListner() {
  // Save the selected row
  curNetwork = $('td', this)
    .eq(0)
    .text();

  // Clear obsolete graph
  clearResults();

  // Clean up tables
  curOntology = '';
  curTerm = '';
  destroyTable('Term', true);

  // Fetch and build the next table
  buildOntologyTable(curNetwork);

  // Set up the text completion engine for the gene list
  setupTextComplete(curNetwork, '#geneList');
}

function ontologyListener() {
  if (
    $('#OntologyTable')
      .DataTable()
      .rows()
      .count() < 1
  ) {
    return;
  }

  // Highlight the relevant row
  curOntology = $('td', this)
    .eq(0)
    .text();

  // Clear obsolete graph
  clearResults();

  // Prep the Term Table
  curTerm = '';

  // Fetch and build the network table
  buildTermTable(curNetwork, curOntology);
}

function termListener() {
  // Highlight the last line
  curTerm = $('td', this)
    .eq(0)
    .text();

  // Get the new Graph
  loadGraph(true, true, true);
}

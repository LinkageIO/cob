/* ------------------------------
      General State Variables
------------------------------ */
// Shortcuts to current graph parameters
var curNetwork = '';
var curOntology = '';
var curTerm = '';
var curOpts = {};
var curBinOpts = {};

// Shortcut to current cytoscape object
var cy = null;

// Save of all node objects returned for qucker graph manipulation
var geneDict = null;

// Returns whether or not the current graph uses the Polywas layout
var isPoly = function() {
  return cy.options().layout.name === 'polywas';
};

// Saves whether data is a term or a custom network
var isTerm = false;

// Saves whether data includes neighbors or not
var hasNeighbors = true;

// Holder for the timer id of the subnet pop effect
var popTimerID = 1;

// Track genes that are selected for persistence
var curSel = [];

// Track whether an addGenes request is already in process
var noAdd = false;

// Places to hold needed information to revert from subnet graphs
var pastGeneDicts = [];
var pastPoly = [];
var pastQuery = [];

/* ----------------------------
      Enrichment Variables
---------------------------- */
// Store availability of enrinchment options
var hasGO = false;
var hasGWS = false;

// List of genes that were queried for enrichment, Used for parameter updating
var enrichGenes = null;

// Saves whether there is currently a GO request pending
var noGO = false;

// Saves whether enrichment is GO or GWS
var isGO = true;

/* ----------------------------
      Option Variables
---------------------------- */
// FDR state variables, flag is to indicate need to reload
var fdrFilterDefault = true;
var fdrFilter = fdrFilterDefault;
var fdrFlag = false;

// Dictionary to contain metadata for all of the parameters
var optVals = {};
var binOptVals = {};

// Dictionary to contain any gene reference links
var refLinks = {};

/*-----------------------------------------------
              Initialization
-----------------------------------------------*/
$.ajax({
  url: SCRIPT_ROOT + 'defaults',
  type: 'GET',
  success: function(data) {
    // Set the options
    optVals = data.opts;
    binOptVals = data.binOpts;

    // Reset FDR state variables
    fdrFilterDefault = data.fdrFilter;
    fdrFilter = fdrFilterDefault;

    // Set the refLinks
    refLinks = data.refLinks;

    // Set the options
    restoreDefaults();
    updateOpts();
  },
});
// Setup the info tips
infoTips($('.opt-glyph'));

// Setup the Heads Up Display
updateHUD();

// Make sure the table is visible
$('#NetworkWait').addClass('hidden');
$('#Network').removeClass('hidden');

// Build some tables!
buildNetworkTable();

// Handle hidding the break when the columns aren't stacked
$(window).ready(function() {
  $('#colBreak').toggleClass('hidden', window.innerWidth >= 992);
});

$(window).resize(function() {
  $('#colBreak').toggleClass('hidden', window.innerWidth >= 992);
});

/*----------------------------------------------
     Gene Selection Button Event Listeners
----------------------------------------------*/
// Build graph button is clicked
$('#wNeighborsButton,#woNeighborsButton').click(function(evt) {
  // Take care of whether or not neighbors are wanted
  hasNeighbors = evt.target.id === 'wNeighborsButton';
  if (hasNeighbors && getOpt('visNeighbors') < 1) {
    setOpt('visNeighbors');
  } else if (!hasNeighbors) {
    setOpt('visNeighbors', 0);
  }

  if ($('#geneList').val().length > 1) {
    // Clear tables
    resetOntology();
    curOntology = '';
    curTerm = '';
    $('#TermTable').addClass('hidden');
    $('#TermWait').removeClass('hidden');

    updateFDR();
    loadGraph(true, false, false);
  } else {
    window.alert('You need to enter at least one gene.');
  }
});

/*------------------------------------------
     Parameter Update Event Listeners
------------------------------------------*/
// Do things when FDR enabled or diabled
$('#fdrButton').click(function() {
  fdrFilter = !fdrFilter;
  fdrFlag = true;
  if (fdrFilter) {
    $('.fdr-toggle').removeAttr('disabled');
    $('[hasfdr]')
      .removeClass('btn-default')
      .addClass('btn-success');
    $('[nofdr]')
      .removeClass('btn-default')
      .addClass('btn-warning');
  } else {
    $('.fdr-toggle').attr('disabled', 'disabled');
    $('[hasfdr]')
      .removeClass('btn-success')
      .addClass('btn-default');
    $('[nofdr]')
      .removeClass('btn-warning')
      .addClass('btn-default');
  }
});

// Options for HPO Observers
var obvConfig = {
  attributes: true,
  childList: true,
  characterData: true,
  attributeFilter: ['class'],
};

// Function to handle syncing HPO buttons and toggling the fields
function syncHPO(check, target) {
  // Set the target to match the calling button
  if (check !== $('#' + target).hasClass('active')) {
    $('#' + target).button('toggle');
  }

  // Turn the rest of the window size & flank limit fields on or off
  if (!check) {
    $('.hpo-toggle').removeAttr('disabled');
  } else {
    $('.hpo-toggle').attr('disabled', 'disabled');
  }
}

// Observers to handle when the HPO buttons change
new MutationObserver(function(ms) {
  ms.forEach(function(m) {
    syncHPO($(m.target).hasClass('active'), 'hpo1');
  });
}).observe(document.getElementById('hpo'), obvConfig);
new MutationObserver(function(ms) {
  ms.forEach(function(m) {
    syncHPO($(m.target).hasClass('active'), 'hpo');
  });
}).observe(document.getElementById('hpo1'), obvConfig);

// Reset all the options on the options tab
$('#resetOptsButton').click(function() {
  $('.alert').addClass('hidden');
  restoreDefaults();
});

// Update Button on Options Tab is pressed
$('#reEnrichButton').click(function() {
  if (enrichGenes !== null) {
    enrich(enrichGenes, isGO);
  }
});

// Update Button on Options Tab is pressed
$('#reGraphButton').click(function() {
  updateGraph();
});

// Enter is pressed in an option field
$('#opts').keypress(function(evt) {
  if (evt.which !== 13) {
    return;
  }

  evt.preventDefault();
  if (['pCutoff', 'minTerm', 'maxTerm'].indexOf(evt.target.id) > -1) {
    if (enrichGenes !== null) {
      enrich(enrichGenes, isGO);
    }
  } else {
    updateGraph();
  }
});

/*----------------------------------
        Table Tab Listeners
-----------------------------------*/
// Redraw the Subnet Table when shown
$('#navTabs a[href="#SubnetTab"]').on('shown.bs.tab', function() {
  if ($.fn.DataTable.isDataTable('#SubnetTable')) {
    $('#SubnetTable')
      .DataTable()
      .draw();
  }
});

/*--------------------------------------
        Graph Button Listeners
--------------------------------------*/
// Last graph button is pressed
$('#backButton').click(function() {
  restoreGraph();
});

// Toggle Layout button is pressed
$('#toggleLayoutButton').click(function() {
  if (cy === null) {
    return;
  }

  // Save the selected genes
  $('#GeneTable')
    .DataTable()
    .rows('.selected')
    .ids(true)
    .each(function(cur) {
      curSel.push(cur);
    });

  // Find the edge data objects from the current graph
  var edgeList = [];
  cy.edges(':visible').forEach(function(cur, idx, arr) {
    var dataDict = cur.data();
    edgeList.push({data: dataDict});
  });

  // Update the graph with the new layout
  loadGraph(true, !isPoly(), undefined, geneDict, edgeList);
});

// Clear Selection Button is pressed
$('#clearSelectionButton').click(function() {
  if (cy === null) {
    return;
  }

  // Remove the classes that highlight nodes
  cy.nodes('.highlighted').toggleClass('highlighted', false);
  cy.nodes('.neighbor').toggleClass('neighbor', false);
  cy.edges('.highlightedEdge').toggleClass('highlightedEdge', false);

  // Unhighlight the gene table
  $('#GeneTable')
    .DataTable()
    .rows()
    .deselect();

  // Clear the subnetwork table
  $('#SubnetTable')
    .DataTable()
    .clear()
    .draw();
});

/*--------------------------------------
        Export Button Listeners
--------------------------------------*/
// PNG Button is pressed
$('#pngButton').click(function() {
  if (cy === null) {
    return;
  }
  var png = cy.png({bg: 'white', scale: 3});

  // Derive Filename
  var name = curNetwork + '.';
  if (isTerm) {
    name += curTerm;
  } else {
    name += 'Custom';
  }

  // Run the Download
  download(png, name + '.png', 'image/png');
});

// GraphML Button is pressed
$('#graphMLButton').click(function() {
  if (cy === null) {
    return;
  }

  // Get the graph
  var txt = cy.graphml();

  // Do some modifications to file
  doc = $.parseXML(txt);

  // Remove uncessary elements and attributes
  $(doc)
    .find('[id^="SNPG"], node:contains("chrom")')
    .remove();
  $(doc)
    .find('data')
    .removeAttr('type');

  // Find the attribute types for nodes and edges
  var nodeAttrs = new Set();
  var edgeAttrs = new Set();
  $(doc)
    .find('node>data')
    .each(function(idx, cur) {
      nodeAttrs.add($(cur).attr('key'));
    });
  $(doc)
    .find('edge>data')
    .each(function(idx, cur) {
      edgeAttrs.add($(cur).attr('key'));
    });

  // Function to find the key string
  function setKey(key, parent) {
    // Figure out the type of the key
    var type = 'string';
    var val = $(doc)
      .find('data[key="' + key + '"]')
      .first()
      .text();
    if (!isNaN(val) && val.length > 0) {
      if (Number.isInteger(+val)) {
        type = 'int';
      } else {
        type = 'double';
      }
    }

    // Build the XML line
    var line =
      '<key id="' +
      key +
      '" for="' +
      parent +
      '" attr.name="' +
      key +
      '" attr.type="' +
      type +
      '"/>';

    // Add it to the graph
    $(doc)
      .find('graph')
      .before(line);
  }

  // Add eaach of the keys to the header
  nodeAttrs.forEach(function(cur) {
    setKey(cur, 'node');
  });
  edgeAttrs.forEach(function(cur) {
    setKey(cur, 'edge');
  });

  // Re-Serialize the graph
  txt = new XMLSerializer().serializeToString(doc);

  // Derive Filename
  var name = curNetwork + '.';
  if (isTerm) {
    name += curTerm;
  } else {
    name += 'Custom';
  }

  // Run the Download
  download(txt, name + '.graphml', 'application/xml');
});

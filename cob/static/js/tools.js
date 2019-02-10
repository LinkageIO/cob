/*--------------------------------
     Send out reference link
---------------------------------*/
function geneRef(id) {
  var link = refLinks[curNetwork];
  link = link.replace('{id}', id);
  link = link.replace('.WM82.A2.V1', '');
  window.open(link);
}

/*--------------------------------
    Reset all Graphs and Tables
---------------------------------*/
function clearResults() {
  if (cy !== null) {
    cy.destroy();
    cy = null;
    destroyTable('Gene', true);
    destroyTable('Subnet', true);
    destroyTable('Enrichment', true);
  }
  updateHUD();
  updateFDR();
}

/*--------------------------------
    Information Tooltip Setup
---------------------------------*/
// Function to set up consistent information qtips on a given jQuery selector
function infoTips(nodes, my, at) {
  // Set the default qTip poistion if not defined
  if (my === undefined) {
    my = 'center left';
  }
  if (at === undefined) {
    at = 'center right';
  }

  // Build the qTips!
  $(nodes).qtip({
    content: {attr: 'title'},
    position: {
      my: my,
      at: at,
      viewport: true,
    },
    style: {classes: 'qtip-bootstrap'},
    show: {event: 'mouseover', solo: true},
    hide: {event: 'mouseout unfocus'},
  });
}

/*--------------------------------
      Setup Text Completion
---------------------------------*/
function setupTextComplete(network, selector) {
  // AJAX request to get the data
  $.ajax({
    url: SCRIPT_ROOT + 'available_genes/' + network,
    success: function(data) {
      // Build a sample query
      var query = '';
      for (var i = 0; i < 5; i++) {
        query +=
          data.geneIDs[Math.floor(Math.random() * (data.geneIDs.length - 1))] +
          ', ';
      }
      $('#geneList').html(query);

      // Destoy the old one and make a new completion engine
      $(selector).textcomplete('destroy');
      $(selector).textcomplete(
        [
          {
            // Regex to say when to check for completion
            match: /(^|\b)(\w{2,})$/,

            // Search algorithm for gene completion
            search: function(term, callback) {
              callback(
                $.map(data.geneIDs, function(word) {
                  return word.toLowerCase().indexOf(term.toLowerCase()) === 0
                    ? word
                    : null;
                }),
              );
            },

            // When selected, add the gene, plus a comma to separate
            replace: function(word) {
              return word + ', ';
            },
          },
        ],
        {
          // Set some options
          maxCount: 15,
          noResultsMessage: 'No gene IDs or aliases found.',
        },
      );
    },
  });
  return;
}

/*--------------------------------
        HUD Update Updater
---------------------------------*/
function updateHUD() {
  var msg = '';
  // If there is no graph, throw up the help message
  if (cy === null) {
    msg += 'Please follow the instructions in the left pane to build a graph.';
  } else {
    // Otherwise, build the message
    // Add the gene count, edge count, and network name
    msg += cy.nodes(':visible[type="gene"]').size() + ' genes | ';
    msg += cy.edges(':visible').size() + ' interactions<br>';
    msg += curNetwork + ' > ';

    // If it's a polywas graph, add term details
    if (isTerm) {
      msg += curOntology + ' > ' + curTerm + ' > ';

      // Label it appropriately depending on whether HPO is selected or not
      if (getOpt('hpo')) {
        msg += 'HPO Genes';
      } else {
        msg += curOpts['windowSize'] + '/' + curOpts['flankLimit'];
      }
    } else {
      // Otherwise just call it a custom network
      msg += 'Custom Network';
    }
  }

  // Post the message to the proper box
  $('#cyTitle').html(msg);
}

/*-------------------------------
       FDR Infrastructure
-------------------------------*/
function updateFDR() {
  // Git rid of old options
  $('.windowSizeOpt,.flankLimitOpt').empty();

  // If there is not a network and ontology, show the help message, exit
  if (curNetwork === '' || curOntology === '') {
    enableFDR(false, 'Select a network and an ontology to see FDR options');
    return;
  }

  // Get the available options from the server
  $.ajax({
    url: SCRIPT_ROOT + 'fdr_options/' + curNetwork + '/' + curOntology,
    success: function(data) {
      // Do the thing if there are any results
      if (
        data.windowSize.length > 0 &&
        data.flankLimit.length > 0 &&
        data.overlapMethod.length > 0
      ) {
        // Add attribute to indicate FDR availability
        var strong = $('#strongest').parent();
        var effect = $('#effective').parent();
        if (data.overlapSNPs.indexOf('strongest') >= 0) {
          strong.attr('hasFDR', 'hasFDR');
        } else {
          strong.attr('noFDR', 'noFDR');
        }
        if (data.overlapSNPs.indexOf('effective') >= 0) {
          effect.attr('hasFDR', 'hasFDR');
        } else {
          effect.attr('noFDR', 'noFDR');
        }

        // Enable it all
        enableFDR(true);

        // Add each window size to the list
        data.windowSize
          .sort(function(a, b) {
            return a - b;
          })
          .forEach(function(cur, idx, arr) {
            $('#windowSizeList').append(
              '<li class="windowSizeOpt"><a>' + cur + '</a></li>',
            );
          });

        // Add each flank limit to the list
        data.flankLimit
          .sort(function(a, b) {
            return a - b;
          })
          .forEach(function(cur, idx, arr) {
            $('#flankLimitList').append(
              '<li class="flankLimitOpt"><a>' + cur + '</a></li>',
            );
          });

        // Set the method selector according to what is availible
        var den = $('#density')
          .parent()
          .removeAttr('disabled');
        var loc = $('#locality')
          .parent()
          .removeAttr('disabled');
        if (data.overlapMethod.length === 1) {
          setOpt('overlapMethod', data.overlapMethod[0]);
          if (data.overlapMethod[0] === 'density') {
            loc.attr('disabled', 'disabled');
          } else {
            den.attr('disabled', 'disabled');
          }
        }

        // Listeners to change value of windowSize and flankLimit when option selected
        $('.windowSizeOpt > a').click(function() {
          $('#windowSize').val($(this).html());
        });
        $('.flankLimitOpt > a').click(function() {
          $('#flankLimit').val($(this).html());
        });
      } else {
        // If there are none available, say so!
        enableFDR(false, 'No FDR available for this term');
        $('[hasfdr]').removeAttr('hasFDR');
        $('[nofdr]').removeAttr('noFDR');
      }
    },
  });
}

function enableFDR(enable, msg) {
  // If we want to turn on FDR selection
  if (enable) {
    // Get rid of the help message
    $('#fdrRow').qtip('destroy', true);
    $('#fdrRow').removeProp('title');

    // Set the state of the FDR button to the state (fdrFilter flag)
    if (fdrFilter) {
      $('#fdrButton,.fdr-toggle').removeAttr('disabled');
    } else {
      $('#fdrButton').removeAttr('disabled');
    }

    // Set the overlapping SNP colors
    $('[hasfdr]')
      .removeClass('btn-default')
      .addClass('btn-success');
    $('[nofdr]')
      .removeClass('btn-default')
      .addClass('btn-warning');

    // Make the button look right
    $('#fdrButton').toggleClass('active', fdrFilter);
  } else {
    // If we want to turn off FDR selection
    // Disable all elements associated with FDR selction
    $('#fdrButton,.fdr-toggle').attr('disabled', 'disabled');

    // Remove the overlapping SNP colors
    $('[hasfdr]')
      .removeClass('btn-success')
      .addClass('btn-default');
    $('[nofdr]')
      .removeClass('btn-warning')
      .addClass('btn-default');

    // Put the help message up
    $('#fdrRow').prop('title', msg);
    infoTips('#fdrRow');
  }
}

/*------------------------------------
        Options Infrastructure
------------------------------------*/
// Get specific opt value
function getOpt(opt) {
  var val = null;
  // Get the numerical interpretation of the value
  if (opt in optVals) {
    if (optVals[opt]['int']) {
      val = parseInt(document.forms['opts'][opt].value);
    } else {
      val = parseFloat(document.forms['opts'][opt].value);
    }
  } else {
    ele = $('#' + opt);
    if (binOptVals[opt]['isBool']) {
      val = ele.hasClass('active');
    } else {
      val = ele
        .children('.active')
        .children()
        .attr('id');
    }
  }
  return val;
}

// Set specific opt value
function setOpt(opt, val) {
  if (opt in optVals) {
    // If no value provided, just use the default
    if (val === undefined) {
      val = optVals[opt]['default'];
    }
    // Set it
    $('#' + opt).val(val);
  } else {
    if (val === undefined) {
      val = binOptVals[opt]['default'];
    }
    if (binOptVals[opt]['isBool']) {
      $('#' + opt).toggleClass('active', val);
    } else {
      var eles = $('#' + opt)
        .children('.active')
        .removeClass('active')
        .children()
        .prop('checked', false);
      $('#' + val)
        .prop('checked', true)
        .parent()
        .addClass('active');
    }
    if (opt === 'hpo') {
      if (val) {
        $('.hpo-toggle').attr('disabled', 'disabled');
      } else {
        $('.hpo-toggle').removeAttr('disabled');
      }
    }
  }
}

// Restore all options to default value
function restoreDefaults() {
  Object.keys(optVals).forEach(function(cur) {
    setOpt(cur);
  });
  Object.keys(binOptVals).forEach(function(cur) {
    setOpt(cur);
  });

  // FDR Special Case
  fdrFilter = fdrFilterDefault;
  updateFDR();
}

// Update the values in the lastOps dict
function updateOpts() {
  curOpts = getCurOpts();
  curBinOpts = getCurBinOpts();
}

// Returns dictionary containing current option values
function getCurOpts() {
  var vals = {};
  Object.keys(optVals).forEach(function(cur) {
    vals[cur] = document.forms['opts'][cur].value;
  });
  return vals;
}

// Returns dictionary containing current binary option values
function getCurBinOpts() {
  var vals = {};
  var ele = null;
  Object.keys(binOptVals).forEach(function(cur) {
    ele = $('#' + cur);
    if (binOptVals[cur]['isBool']) {
      vals[cur] = ele.hasClass('active');
    } else {
      vals[cur] = ele
        .children('.active')
        .children()
        .attr('id');
    }
  });
  return vals;
}

// Detect what options have changed
function optsChange(opts) {
  var res = false;
  var curOp = getCurOpts();
  opts.forEach(function(cur) {
    if (cur in curOp) {
      if (curOp[cur] !== curOpts[cur]) {
        res = true;
      }
    }
  });
  curOp = getCurBinOpts();
  opts.forEach(function(cur) {
    if (cur in curOp) {
      if (curOp[cur] !== curBinOpts[cur]) {
        res = true;
      }
    }
  });
  return res;
}

// Shows user what options are unacceptable
function errorOpts(opts) {
  opts.forEach(function(cur, idx, arr) {
    $('#' + cur + 'Error').removeClass('hidden');
    $('#' + cur + 'Error').html(
      optVals[cur]['title'] +
        ' must be between ' +
        optVals[cur]['min'] +
        ' and ' +
        optVals[cur]['max'],
    );
  });
  $('#navTabs a[href="#OptsTab"]').tab('show');
}

// Validate the parameter values
function checkOpts() {
  var val = null;
  var badFields = [];

  // Fetch all of the current values
  Object.keys(optVals).forEach(function(cur, idx, arr) {
    // Get the numerical interpretation of the value
    var val = getOpt(cur);

    // Check and save name if out of bounds
    if (!(val >= optVals[cur]['min'] && val <= optVals[cur]['max'])) {
      badFields.push(cur);
    }
  });

  // Return the problemeatic ones
  return badFields;
}

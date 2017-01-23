// Clear all computed results and start over
function clearResults(){
  if(cy !== null){
    cy.destroy();
    cy = null;
    destroyTable('Gene',true);
    destroyTable('Subnet',true);
    destroyTable('Enrichment',true);
  }
  updateHUD();
  updateFDR();
}

/*--------------------------------
    Information Tooltip Setup 
---------------------------------*/
// Function to set up consistent information qtips on a given jQuery selector
function infoTips(nodes, my, at){
  // Set the default qTip poistion if not defined
  if(my === undefined){my = 'center left';}
  if(at === undefined){at = 'center right';}
  
  // Build the qTips!
  $(nodes).qtip({
    content:{attr: 'title'},
    position: {my: my, at: at},
    style: {classes: 'qtip-bootstrap'},
    show: {event: 'mouseover', solo: true},
    hide: {event: 'mouseout unfocus'},
  });
}

/*--------------------------------
      Setup Text Completion
---------------------------------*/
function setupTextComplete(network, selector){
  // AJAX request to get the data
  $.ajax({
    url: ($SCRIPT_ROOT + 'available_genes/' + network),
    success: function(data){
      // Build a sample query
      var query = '';
      for(var i=0; i<5; i++){query += data.geneIDs[Math.floor(Math.random() * (data.geneIDs.length-1))] + ', ';}
      $('#geneList').html(query);
      
      // Destoy the old one and make a new completion engine
      $(selector).textcomplete('destroy');
      $(selector).textcomplete([{
        // Regex to say when to check for completion
        match: /(^|\b)(\w{2,})$/,
        
        // Search algorithm for gene completion
        search: function(term, callback){
          callback($.map(data.geneIDs, function(word){
            return word.toLowerCase().indexOf(term.toLowerCase()) === 0 ? word : null;
        }));},
        
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

/*--------------------------------
        HUD Update Updater
---------------------------------*/
function updateHUD(){
  var msg = '';
  // If there is no graph, throw up the help message
  if(cy === null){
    msg += 'Please follow the instructions in the left pane to build a graph.';}
  
  // Otherwise, build the message
  else{
    // Add the gene count, edge count, and network name
    msg += cy.nodes(':visible[type="gene"]').size() + ' genes | '
    msg += cy.edges(':visible').size() + ' interactions<br>' 
    msg += curNetwork + ' > ';
    
    // If it's a polywas graph, add term details
    if(isTerm){
      msg += curOntology + ' > ' + curTerm +' > '
      msg += curOpts['windowSize'] + '/' + curOpts['flankLimit'];}
    
    // Otherwise just call it a custom network
    else{msg += 'Custom Network';}
  }
  
  // Post the message to the proper box
  $("#cyTitle").html(msg);
}

/*-------------------------------
       FDR Infrastructure
-------------------------------*/
function updateFDR(){
  // Git rid of old options
  $('.windowSizeOpt,.flankLimitOpt').empty();
  
  // If there is not a network and ontology, show the help message, exit
  if((curNetwork === '')||(curOntology === '')){
    enableFDR(false,'Select a network and an ontology to see FDR options');
    return;
  }
  
  // Get the available options from the server
  $.ajax({
    url: ($SCRIPT_ROOT + 'fdr_options/'+curNetwork+'/'+curOntology),
    success: function(data){
      // Do the thing if there are any results
      if((data.windowSize.length) > 0 && (data.flankLimit.length > 0)){
        enableFDR(true);
        
        // Add each window size to the list
        data.windowSize.sort(function(a,b){return a-b;}).forEach(function(cur,idx,arr){
          $('#windowSizeList').append('<li class="windowSizeOpt"><a>'+cur+'</a></li>');
        });
        
        // Add each flank limit to the list
        data.flankLimit.sort(function(a,b){return a-b;}).forEach(function(cur,idx,arr){
          $('#flankLimitList').append('<li class="flankLimitOpt"><a>'+cur+'</a></li>');
        });
        
        // Listeners to change value of windowSize and flankLimit when option selected
        $('.windowSizeOpt > a').click(function(){$('#windowSize').val($(this).html());});
        $('.flankLimitOpt > a').click(function(){$('#flankLimit').val($(this).html());});
      }
      
      // If there are none available, say so! 
      else{enableFDR(false,'No FDR available for this term');}
    }
  });
}

function enableFDR(enable,msg){
  // If we want to turn on FDR selection
  if(enable){
    // Get rid of the help message
    $('#fdrRow').qtip('destroy',true);
    $('#fdrRow').removeProp('title');
    
    // Set the state of the FDR button to the state (fdrFilter flag)
    if(fdrFilter){$('#fdrButton,.fdr-toggle').removeAttr('disabled');}
    else{$('#fdrButton').removeAttr('disabled');}
    
    // Make the button look right
    $('#fdrButton').toggleClass('active',fdrFilter);
  }
  // If we want to turn off FDR selection
  else{
    // Disable all elements associated with FDR selction
    $('#fdrButton,.fdr-toggle').attr('disabled','disabled');
    
    // Put the help message up
    $('#fdrRow').prop('title',msg);
    infoTips('#fdrRow');
  }
}

/*------------------------------------
        Options Infrastructure
------------------------------------*/
// Restore all options to default value
function restoreDefaults(){
  Object.keys(optVals).forEach(function(cur,idx,arr){
    $('#'+cur).val(optVals[cur]['default']);
  });
  
  // FDR Special Case
  fdrFilter = fdrFilterDefault;
  updateFDR();
  
  // Log Spacing and Vis Enrich
  logSpacing = logSpacingDefault;
  visEnrich = visEnrichDefault;
  $('#logSpacingButton').toggleClass('active',logSpacing);
  $('#visEnrichButton').toggleClass('active',visEnrich);
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
  var res = false;
  var curOp = getCurOpts();
  opts.forEach(function(cur,idx,arr){
    if(curOp[cur] !== curOpts[cur]){res = true;}
  });
  return res;
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
      if(cur['int']){val = parseInt(document.forms["opts"][cur].value);}
      else{val = parseFloat(document.forms["opts"][cur].value);}
      
      // Check and save name if out of bounds
      if(!((val >= optVals[cur]['min'])&&(val <= optVals[cur]['max']))){
        badFields.push(cur);}
    });
    
    // Return the problemeatic ones
    return badFields;
}
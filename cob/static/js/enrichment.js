/*-------------------------------------------
      Build Enrichment Table Function
-------------------------------------------*/
function enrich(geneList,GOnt){
  // Make sure a GO request isn't already pending
  if(noGO){
    window.alert('You may only run one enrichment query at a time.');
    return;}
  
  // Make sure there are at least some genes
  if(geneList.length === 0){
    window.alert('There must be genes in the table to query GeneWordSearch.');
    return;
  }
  
  // Save the genes to run if the opts are bad
  enrichGenes = geneList;
  
  // Check all of the relevant options and prompt if any have bad inputs
  $('.alert').addClass('hidden');
  var badFields = checkOpts();
  if(badFields.length > 0){
    errorOpts(badFields);
    return;
  }
  
  // Prep work for request
  updateOpts();
  noGO = true;
  isGO = GOnt;
  
  // Destroy old table if there
  if($.fn.DataTable.isDataTable('#EnrichmentTable')){
    $('#EnrichmentTable').DataTable().destroy();
    $('#EnrichmentTable').off().empty();
  }
  
  // Nav to tab
  $('#navTabs a[href="#EnrichmentTab"]').tab('show');
  $('#EnrichmentWait').addClass('hidden');
  $('#EnrichmentProg').removeClass('hidden');
  
  // Set the variables if we are doing GO
  if(GOnt){
    var address = 'go_enrichment';
    var title = 'GO Enrichment';
    var desc = 'This table contains all of the significant results obtained by running a GO term enrichment analysis on the given set of genes. These results can be tweaked by the parameters in the \'Options\' tab.';
    var cols = [
      {'data':'id', 'name':'id', 'title':'ID'},
      {'data':'name', 'name':'name', 'title':'Name'},
      {'data':'desc', 'name':'desc', 'title':'Description'},
    ];
  }
  
  // Set the variables for Gene Word Search
  else{
    var address = 'gene_word_search';
    var title = 'GeneWordSearch';
    var desc = 'This table contains all of the significant results after running a GeneWordSearch query on the given set of genes. These results are based on functional annotations that are associated with the same reference genome as the current network.';
    var cols = [
      {'data':'word', 'name':'word', 'title':'Word'},
      {'data':'pval', 'name':'pval', 'title':'P Val'},
      {'data':'corpval', 'name':'corpval', 'title':'Corr P'},
      {'data':'length', 'name':'length', 'title':'Length'},
      {'data':'totwords', 'name':'totwords', 'title':'Total Words'},
      {'data':'overlap', 'name':'overlap', 'title':'Overlap'},
    ];
  }
  // Run the request to get results
  geneList = geneList.reduce(function(pre,cur){return pre + ', ' + cur;});

  $.ajax({
    url: ($SCRIPT_ROOT + address),
    data: {
      network: curNetwork,
      geneList: geneList,
      pCutoff: curOpts['pCutoff'],
      minTerm: curOpts['minTerm'],
      maxTerm: curOpts['maxTerm'],
    },
    type: 'POST',
    statusCode:{
      405: function(){
        $('#EnrichmentProg').addClass('hidden');
        noGO = false;
        window.alert('This function is not availible with this organism, if needed, please contact the site admin.');
        return;
      },
      400: function(){
        $('#EnrichmentProg').addClass('hidden');
        noGO = false;
        window.alert('There were no significant enrichment results for this query.');
        return;
      }
    },
    success: function(data){
      noGO = false;
      
      // Parse the data appropriately
      if(GOnt){
        data = JSON.parse(data);
        var rows = [];
        Object.keys(data).forEach(function(cur,idx,arr){rows.push(data[cur]);});
      }
      else{
        var rows = JSON.parse(data.result);
      }
      
      // Nav to tab
      $('#EnrichmentProg').addClass('hidden');
      $('#navTabs a[href="#EnrichmentTab"]').tab('show');
      
      // Build new table from data
      $('#EnrichmentTable').DataTable({
        "data": rows,
        "dom": '<"EnrichmentTitle">frtipB',
        "order": [[1,'asc']],
        "paging": false,
        "paginate": false,
        "rowId": 'id',
        "scrollCollapse": true,
        "scrollX": "100%",
        "scrollY": $(window).height()-325,
        "searching": true,
        "buttons": [
          {extend:'csv', filename:address, titleAttr:'Export the results in this table to a CSV file'},
        ],
        "columns": cols
      });
      $("div.EnrichmentTitle").html(title+' '+'<span id="EnrichmentTableInfo" title="'+desc+'" class="table-glyph glyphicon glyphicon-info-sign"></span>');
      
      infoTips('#EnrichmentTableInfo');
    }
  });
}

function destroyEnrichment(){
    if($.fn.DataTable.isDataTable('#EnrichmentTable')){
        $('#EnrichmentTable').DataTable().destroy();
        $('#EnrichmentTable').off().empty();
    }
    $('#EnrichmentWait').removeClass('hidden');
}
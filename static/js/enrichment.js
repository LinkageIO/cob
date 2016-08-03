// Things having to do with the enrichment tables
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
  $('#EnrichmentWait').removeClass('hidden');
  
  // Set the variables if we are doing GO
  if(GOnt){
    var address = 'go_enrichment';
    var title = 'GO Enrichment';
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
      network: lastNetwork,
      geneList: geneList,
      pCutoff: lastOpts['pCutoff'],
      minTerm: lastOpts['minTerm'],
      maxTerm: lastOpts['maxTerm'],
    },
    type: 'POST',
    statusCode:{
      405: function(){
        $('#EnrichmentWait').addClass('hidden');
        noGO = false;
        window.alert('There is function is not availible with this organism, if needed, please contact the site admin.');
        return;
      },
      400: function(){
        $('#EnrichmentWait').addClass('hidden');
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
      $('#EnrichmentWait').addClass('hidden');
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
          {"extend": 'csv',"filename": address},
        ],
        "columns": cols
      });
      $("div.EnrichmentTitle").html(title);
    }
  });
}

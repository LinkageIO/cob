// Things having to do with the enrichment tables

/*-------------------------------------------
      Build GeneWordSearch Table Function
-------------------------------------------*/
function gws(e,dt,node,config){
  // Destroy old table if there
  if($.fn.DataTable.isDataTable('#EnrichmentTable')){
    $('#EnrichmentTable').DataTable().destroy();
    $('#EnrichmentTable').off().empty();
  }
  
  // Build the gene query list
  var geneList = dt.rows().ids();
  if(geneList.length === 0){
    window.alert('There must be genes in the table to query GeneWordSearch.');
    return;
  }
  geneList = geneList.reduce(function(pre,cur){return pre + ', ' + cur;});
  $('#EnrichmentWait').removeClass('hidden');
  
  // Run the request to get results
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_word_search'),
    data: {
      network: lastNetwork,
      probCutoff: 0.05,
      geneList: geneList,
    },
    type: 'POST',
    statusCode: {
      460: function(){
        window.alert('There are no functional annotations associated with this organism');
        return;
      },
      461: function(){
        window.alert('There were no significant GeneWordSearch results for this query.');
        return;
      }
    },
    success: function(data){
      // Nav to tab
      $('#EnrichmentWait').addClass('hidden');
      $('#navTabs a[href="#EnrichmentTab"]').tab('show');
      
      // Build new table from data
      $('#EnrichmentTable').DataTable({
        "data": JSON.parse(data.result),
        "dom": '<"EnrichmentTitle">frtipB',
        "order": [[2,'asc']],
        "paging": false,
        "paginate": false,
        "rowId": 'id',
        "scrollCollapse": true,
        "scrollX": "100%",
        "scrollY": $(window).height()-325,
        "searching": true,
        "buttons": [
          {"extend": 'csv',"filename": 'gws_result'},
        ],
        "columns": [
          {'data':'word', 'name':'word', 'title':'Word'},
          {'data':'pval', 'name':'pval', 'title':'P Val'},
          {'data':'corpval', 'name':'corpval', 'title':'Corr P'},
          {'data':'length', 'name':'length', 'title':'Length'},
          {'data':'totwords', 'name':'totwords', 'title':'Total Words'},
          {'data':'overlap', 'name':'overlap', 'title':'Overlap'},
        ]
      });
      $("div.EnrichmentTitle").html('GeneWordSearch');
    }
  });
}

/*-------------------------------------------
      Build GO Enrichment Table Function
-------------------------------------------*/
function gont(e,dt,node,config){
  // Destroy old table if there
  if($.fn.DataTable.isDataTable('#EnrichmentTable')){
    $('#EnrichmentTable').DataTable().destroy();
    $('#EnrichmentTable').off().empty();
  }
  
  // Nav to tab
  $('#navTabs a[href="#EnrichmentTab"]').tab('show');
  $('#EnrichmentWait').removeClass('hidden');
  
  // Build the gene query list
  var geneList = dt.rows().ids();
  if(geneList.length === 0){
    window.alert('There must be genes in the table to query GeneWordSearch.');
    return;
  }
  geneList = geneList.reduce(function(pre,cur){return pre + ', ' + cur;});
  
  // Run the request to get results
  $.ajax({
    url: ($SCRIPT_ROOT + 'go_enrichment'),
    data: {
      network: lastNetwork,
      probCutoff: 0.05,
      geneList: geneList,
      minTerm: 5,
      maxTerm: 300,
    },
    type: 'POST',
    statusCode:{
      460: function(){
        window.alert('There is no GO ontology associated with this organism');
        return;
      },
      461: function(){
        window.alert('There were no significant GO enrichment results for this query.');
        return;
      }
    },
    success: function(data){
      data = JSON.parse(data);
      rows = []
      Object.keys(data).forEach(function(cur,idx,arr){rows.push(data[cur]);});
      console.log(rows);
      
      // Nav to tab
      $('#EnrichmentWait').addClass('hidden');
      $('#navTabs a[href="#EnrichmentTab"]').tab('show');
      
      // Build new table from data
      $('#EnrichmentTable').DataTable({
        "data": rows,
        "dom": '<"EnrichmentTitle">frtipB',
        "order": [[0,'asc']],
        "paging": false,
        "paginate": false,
        "rowId": 'id',
        "scrollCollapse": true,
        "scrollX": "100%",
        "scrollY": $(window).height()-325,
        "searching": true,
        "buttons": [
          {"extend": 'csv',"filename": 'gws_result'},
        ],
        "columns": [
          {'data':'id', 'name':'id', 'title':'ID'},
          {'data':'name', 'name':'name', 'title':'Name'},
          {'data':'desc', 'name':'desc', 'title':'Description'},
        ]
      });
      $("div.EnrichmentTitle").html('GO Enrichment');
    }
  });
}
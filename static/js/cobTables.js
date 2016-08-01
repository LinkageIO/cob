/*----------------------------------
    Selection Table Constructors
-----------------------------------*/
// Build a Fresh Network Table
function buildNetworkTable(){
  $('#NetworkTable').DataTable().destroy();
  $('#NetworkTable').DataTable({
      "ajax": ($SCRIPT_ROOT + 'available_datasets/Expr'),
      "bAutoWidth": false,
      "bPaginate": false,
      "bJQueryUI": false,
      "scrollCollapse": true,
      "dom": '<"NetworkTitle">ft',
      "order": [[0,'asc']],
      "scrollY": ($(window).height()/5),
      "select": true,
      "searching": true,
    });
  $("div.NetworkTitle").html('Network');
  return;
}

// Build a Fresh Ontology Table
function buildOntologyTable(){
  $('#OntologyTable').DataTable().destroy();
  $('#OntologyTable').DataTable({
      "ajax": ($SCRIPT_ROOT + 'available_datasets/GWAS'),
      "bAutoWidth": false,
      "bPaginate": false,
      "bJQueryUI": false,
      "scrollCollapse": true,
      "dom": '<"OntologyTitle">ft',
      "order": [[0,'asc']],
      "scrollY": ($(window).height()/5),
      "select": true,
      "searching": true,
    });
  $("div.OntologyTitle").html('Ontology');
  return;
}

// Build a Fresh Term Table
function buildTermTable(ontology){
  $('#TermTable').DataTable().destroy();
  $('#TermTable').DataTable({
      "ajax": ($SCRIPT_ROOT + 'terms/' + ontology),
      "bAutoWidth": false,
      "bPaginate": false,
      "bJQueryUI": false,
      "scrollCollapse": true,
      "dom": '<"TermTitle">frtip',
      "order": [[0,'asc']],
      "scrollY": ($(window).height()/3),
      "select": true,
      "searching": true,
    });
  $("div.TermTitle").html('Terms');
  return;
}

/*--------------------------------
      Gene Table Constructors
---------------------------------*/
function buildGeneTables(){
  // Enumerated column data!
  var cols = [
    {data: 'render', name:'rendered', title:'Vis'},
    {data: 'id', name:'id', title:'ID'},
    {data: 'alias', name:'alias', title:'Alias'},
    {data: 'fdr', name:'fdr', title:'FDR'},
    {data: 'cur_ldegree', name:'ldegree', title:'Local Degree'},
    {data: 'gdegree', name:'gdegree', title:'Global Degree'},
    {data: 'chrom', name:'chrom', title:'Chrom'},
    {data: 'snp', name:'snp', title:'SNP'},
    {data: 'start', name:'start', title:'Start'},
    {data: 'end', name:'end', title:'End'},
    {data: 'annotations', name:'annotations', title:'Annotations'},
    {data: 'num_intervening', name:'num_intervening', title:'Num Intervening'},
    {data: 'rank_intervening', name:'rank_intervening', title:'Rank Intervening'},
    {data: 'num_siblings', name:'num_siblings', title:'Num Siblings'},
    {data: 'window_size', name:'window_size', title:'Window Size', visible: false},
    {data: 'flank_limit', name:'flank_limit', title:'Flank Limit', visible: false},
    //{data: 'parent_num_iterations', name:'parent_num_iterations', title: 'Num Parent Interactions'},
    //{data: 'parent_avg_effect_size', name:'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
  ];
  
  // Destroy the old tables, remove columns, remove listeners
  if($.fn.DataTable.isDataTable('#GeneTable')){
    $('#GeneTable').DataTable().destroy();
    $('#GeneTable').off().empty();
  }
  if($.fn.DataTable.isDataTable('#SubnetTable')){
    $('#SubnetTable').DataTable().destroy();
    $('#SubnetTable').off().empty();
  }

  // Set up the main gene table
  var gene_table = $('#GeneTable').DataTable({
      "data": [],
      "deferRender": false,
      "dom": '<"GeneTitle">frtpB',
      "order": [[0,'dec'],[6,'asc'],[8,'asc']],
      "paging": true,
      "paginate": true,
      "rowId": 'id',
      "scrollCollapse": true,
      "scroller": {displayBuffer: 1000},
      "scrollX": "100%",
      "scrollY": ($(window).height()-275),
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [
        {"extend": 'csv',"filename": 'genenetwork'},
        {"text": 'Graph Subnet', "action": makeSubnet},
        {"text": 'GWS', "action": gws},
        {"text": 'GO', "action": gont},
      ],
      "columns": cols,
    });
  
  // Set up the subnetwork gene table
  var sub_table = $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtpB',
      "paging": false,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scrollX": "100%",
      "scrollY": $(window).height()-275,
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [
        {"extend": 'csv',"filename": 'subnetwork'},
        {"text": 'Graph Subnet', "action": makeSubnet},
        {"text": 'GWS', "action": gws},
        {"text": 'GO', "action": gont},
      ],
      "columns": cols,
    });
  
  // Set the inline titles on the tables
  $("div.GeneTitle").html('Gene Data');
  $("div.SubnetTitle").html('Subnet Data');
  
  // Hide the columns we don't need in the respective tables
  gene_table.columns('annotations:name').visible(false);
  sub_table.columns('ldegree:name, gdegree:name, start:name, end:name, num_intervening:name, rank_intervening:name, num_siblings:name, snp:name, rendered:name').visible(false);

  // Set listeners for selection
  $('#GeneTable tbody').on('click','tr', function(evt){
    var ele = cy.getElementById(this['id']);
    if(ele.length === 1){geneSelect(ele);}
    else{addGene(this['id']);}
  });
  $('#SubnetTable tbody').on('click','tr', function(evt){
    var ele = cy.getElementById(this['id']);
    if(ele.length === 1){geneSelect(ele);}
    else{addGene(this['id']);}
  });
  
  // Set listener for pop effect of subnetwork table
  $('#SubnetTable tbody').on('mouseover','tr', function(evt){
    if(this['id'].length > 0){
      window.clearTimeout(popTimerID);
      popTimerID = window.setTimeout(function(id){
          cy.getElementById(id).flashClass('pop',750);
      }, 10, this['id']);
    }
  });
}

/*---------------------------------------
      Gene and Subnet Table Updater
---------------------------------------*/
function updateGraphTable(tableName, genes){
  // Save original tab name
  var oldTab = $('.active [role="tab"]').attr('href');

  // Switch to needed tab, needed for column scaling
  $('#navTabs a[href="#'+tableName+'Tab"]').tab('show');

  // Format the node data for the DataTable
  var geneData = [];
  var geneDict = null;
  var hasFDR = false;
  var hasNumInter = false;
  var hasRankInter = false;
  var hasNumSiblings = false; 
  
  // For each element, add the variables we need
  cy.startBatch();
  genes.forEach(function(cur, idx, arr){
    if('cy' in cur){
      cur.data('cur_ldegree', cur.connectedEdges(':visible').length);
      geneDict = cur.data();
    }
    else{
      var node = cy.getElementById(cur['data']['id']);
      if(node.length > 0){
        cur['data']['cur_ldegree'] = node.degree();
        cur['data']['render'] = 'x';
      }
      else{
        cur['data']['cur_ldegree'] = 0;
        cur['data']['render'] = ' ';
      }
      geneDict = cur['data'];
    }
    geneDict['window_size'] = lastWindowSize;
    geneDict['flank_limit'] = lastFlankLimit;
    if(geneDict['fdr'] !== 'nan'){hasFDR = true;}
    if(geneDict['num_intervening'] > -1){hasNumInter = true;}
    if(geneDict['rank_intervening'] > 2.0){hasRankInter = true;}
    if(geneDict['num_siblings'] > 2){hasNumSiblings = true;}
    if(!(isTerm() && geneDict['ldegree'] <= lastNodeCutoff)){geneData.push(geneDict);}
  });
  cy.endBatch();

  // Clear old data and add new
  var tbl = $('#'+tableName+'Table').DataTable();
  tbl.clear().rows.add(geneData).draw();
  tbl.columns('fdr:name').visible(hasFDR);
  tbl.columns('num_intervening:name').visible(hasNumInter);
  tbl.columns('rank_intervening:name').visible(hasRankInter);
  tbl.columns('num_siblings:name').visible(hasNumSiblings);
  
  // Return to original tab
  $('#navTabs a[href="'+oldTab+'"]').tab('show');
}

/*---------------------------------------
      Build Subnet Graph Function
---------------------------------------*/
function makeSubnet(e,dt,node,config){
  var nodeList = [];
  var edgeList = [];
  var dataDict = null;
  
  // Clear the genelist box for the new main genes
  $('#geneList').html('');
  
  // Find the main gene objects from the current graph
  cy.nodes('.highlighted').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'query';
    $('#geneList').append(dataDict['id']+', ');
    nodeList.push({'data':dataDict});
  });
  
  // Find the neighbor gene object from the current graph
  cy.nodes('.neighbor').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'neighbor';
    nodeList.push({'data':dataDict});
  });
  
  // Find the edge data objects from the current graph
  cy.edges('.highlightedEdge').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    edgeList.push({'data':dataDict});
  });
  
  // Make sure there are genes to work with
  if(nodeList.length === 0){
    window.alert('There must be genes highlighted to graph the subnetwork');
    return;
  }
  
  // Save the new gene object list
  geneNodes = nodeList;
  
  // Switch to the gene list tab, also triggers option page to shift
  $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
  
  // Load the new graph using the found nodes and edges
  loadGraph(true,false,undefined,nodeList,edgeList);
  return;
}

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
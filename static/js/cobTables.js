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
      Column Definitions
---------------------------------*/
// Column definitions for polywas graphs
function polyColumns(){
  return [
    {data: 'render', name:'rendered', title:'Vis'},
    {data: 'id', name:'id', title:'ID'},
    {data: 'alias', name:'alias', title:'Alias'},
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
}

// Column definitions for force graphs
function forceColumns(){
  return [
    {data: 'render', name:'rendered', title:'Vis'},
    {data: 'id', name:'id', title:'ID'},
    {data: 'alias', name:'alias', title:'Alias'},
    {data: 'cur_ldegree', name:'ldegree', title:'Local Degree'},
    {data: 'gdegree', name:'gdegree', title:'Global Degree'},
    {data: 'chrom', name:'chrom', title:'Chrom'},
    {data: 'start', name:'start', title:'Start'},
    {data: 'end', name:'end', title:'End'},
    {data: 'annotations', name:'annotations', title:'Annotations'},
  ];
}

/*--------------------------------
      Gene Table Constructors
---------------------------------*/
function buildGeneTables(){
  // Decide which set of columns we should use
  if(isPoly){var cols = polyColumns();}
  else{var cols = forceColumns();}

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
      "order": [[0,'dec'],[5,'asc'],[6,'dec']],
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
  $('#GeneTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
  $('#SubnetTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
  
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
  
  // For each element, add the variables we need
  genes.forEach(function(cur, idx, arr){
    if('cy' in cur){geneDict = cur.data();}
    else{geneDict = cur['data'];}
    geneDict['window_size'] = lastWindowSize;
    geneDict['flank_limit'] = lastFlankLimit;
    geneData.push(geneDict);
  });

  // Clear old data and add new
  $('#'+tableName+'Table').DataTable().clear().rows.add(geneData).draw();

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
  loadGraph('new','force', nodeList, edgeList);
  return;
}

/*-------------------------------------------
      Build GeneWordSearch Table Function
-------------------------------------------*/
function gws(e,dt,node,config){
  // Destroy old table if there
  if($.fn.DataTable.isDataTable('#GWSTable')){
    $('#GWSTable').DataTable().destroy();
    $('#GWSTable').off().empty();
  }
  
  // Build the gene query list
  var geneList = dt.rows().ids();
  if(geneList.length === 0){
    window.alert('There must be genes in the table to query GeneWordSearch.');
    return;
  }
  geneList = geneList.reduce(function(pre,cur){return pre + ', ' + cur;});
  
  // Run the request to get results
  $.ajax({
    url: ($SCRIPT_ROOT + 'gene_word_search'),
    data: {
      network: lastNetwork,
      probCutoff: 0.05,
      geneList: geneList,
    },
    type: 'POST',
    statusCode: {400: function(){
      window.alert('There were no significant GeneWordSearch results for this query.');
      return;
    }},
    success: function(data){
      // Nav to tab
      $('#navTabs a[href="#GWSTab"]').tab('show');
      
      // Build new table from data
      $('#GWSTable').DataTable({
        "data": JSON.parse(data.result),
        "dom": '<"GWSTitle">frtipB',
        "order": [[2,'asc']],
        "paging": false,
        "paginate": false,
        "rowId": 'id',
        "scrollCollapse": true,
        "scrollX": "100%",
        "scrollY": $(window).height()-275,
        "searching": true,
        "buttons": [
          {"extend": 'csv',"filename": 'gws_result'},
        ],
        "columns": [
          {'data':'word', 'name':'word', 'title':'Word'},
          {'data':'pval', 'name':'pval', 'title':'P Val'},
          {'data':'corpval', 'name':'corpval', 'title':'Corrected P'},
          {'data':'length', 'name':'length', 'title':'Length'},
          {'data':'totwords', 'name':'totwords', 'title':'Total Words'},
          {'data':'overlap', 'name':'overlap', 'title':'Overlap'},
        ]
      });
      $("div.GWSTitle").html('GeneWordSearch Results');
    }
  });
}
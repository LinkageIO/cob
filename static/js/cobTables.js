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
// Holds definition of columns for both tables
function polyColumns(){
  return [
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

function forceColumns(){
  return [
    {data: 'id', name:'id', title:'ID'},
    {data: 'alias', name:'alias', title:'Alias'},
    //{data: 'rendered', name:'rendered', title:'Rendered'},
    {data: 'cur_ldegree', name:'ldegree', title:'Local Degree'},
    {data: 'gdegree', name:'gdegree', title:'Global Degree'},
    {data: 'chrom', name:'chrom', title:'Chrom'},
    {data: 'start', name:'start', title:'Start'},
    {data: 'end', name:'end', title:'End'},
    {data: 'annotations', name:'annotations', title:'Annotations'},
  ];
}

// Initially build the Gene Table
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
      "order": [[4,'asc'],[6,'asc']],
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
      ],
      "columns": cols,
    });
  $("div.GeneTitle").html('Gene Data');
  gene_table.columns('annotations:name').visible(false);

  // Set up the subnetwork gene table
  var sub_table = $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtpB',
      "order": [[2,'asc'],[0,'asc']],
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
      ],
      "columns": cols,
    });
  $("div.SubnetTitle").html('Subnet Data');
  sub_table.columns('ldegree:name, gdegree:name, start:name, end:name, num_intervening:name, rank_intervening:name, num_siblings:name, snp:name, rendered:name').visible(false);

  // Set Listeners
  $('#GeneTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
  $('#SubnetTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
  $('#SubnetTable tbody').on('mouseover','tr', function(evt){
    if(this['id'].length > 0){
      window.clearTimeout(popTimerID);
      popTimerID = window.setTimeout(function(id){
          cy.nodes('[id = "'+id+'"]').flashClass('pop',750);
      }, 10, this['id']);
    }
  });
}

/*------------------------------------
      Gene and Subnet Table Updater
------------------------------------*/
function updateGraphTable(tableName, nodes){
  // Save original tab
  var oldTab = $('.active [role="tab"]').attr('href');

  // Switch to needed tab, needed for column scaling
  $('#navTabs a[href="#'+tableName+'Tab"]').tab('show');

  // Format the node data for the DataTable
  var geneData = [];
  var geneDict = null;

  nodes.forEach(function(cur, idx, arr){
    geneDict = cur.data();
    geneDict['window_size'] = lastWindowSize;
    geneDict['flank_limit'] = lastFlankLimit;
    geneData.push(geneDict);
  });

  // Clear old data and add new
  $('#'+tableName+'Table').DataTable().clear().rows.add(geneData).draw();

  // Return to original tab
  $('#navTabs a[href="'+oldTab+'"]').tab('show');
}

function makeSubnet(e,dt,node,config){
  var nodeList = [];
  var edgeList = [];
  var dataDict = null;
  $('#geneList').html('');
  cy.nodes('.highlighted').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'query';
    $('#geneList').append(dataDict['id']+', ');
    nodeList.push({'data':dataDict});
  });
  cy.nodes('.neighbor').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    dataDict['origin'] = 'neighbor';
    nodeList.push({'data':dataDict});
  });
  cy.edges('.highlightedEdge').forEach(function(cur, idx, arr){
    dataDict = cur.data();
    edgeList.push({'data':dataDict});
  });
  loadGraph('new','force',{'nodes':nodeList,'edges':edgeList});
  $('#GeneSelectTabs a[href="#TermGenesTab"]').tab('show');
  return;
}
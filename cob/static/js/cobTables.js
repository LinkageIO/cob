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
      "order": [[0,'dec'],[3,'asc'],[4,'dec']],
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
      "order": [[0,'dec'],[3,'asc'],[4,'asc']],
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
  sub_table.columns('rendered:name').visible(false);

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
      Run Enrichment Functions
---------------------------------------*/
function gws(e,dt,node,config){
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList,false);
}

function gont(e,dt,node,cofig){
  // Build the gene query list
  var geneList = dt.rows().ids();
  enrich(geneList,true);
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
    geneDict['window_size'] = lastOpts['windowSize'];
    geneDict['flank_limit'] = lastOpts['flankLimit'];
    if(geneDict['fdr'] !== 'nan'){hasFDR = true;}
    if(geneDict['num_intervening'] > -1){hasNumInter = true;}
    if(geneDict['rank_intervening'] > 2.0){hasRankInter = true;}
    if(geneDict['num_siblings'] > 2){hasNumSiblings = true;}
    if(!(isTerm() && isPoly() && (geneDict['ldegree'] <= lastOpts['nodeCutoff']))){
      geneData.push(geneDict);}
  });
  cy.endBatch();

  // Clear old data and add new
  var tbl = $('#'+tableName+'Table').DataTable();
  tbl.clear().rows.add(geneData).draw();
  tbl.columns('fdr:name').visible(hasFDR);
  tbl.columns('snp:name').visible(isTerm());
  tbl.columns('num_intervening:name').visible(hasNumInter);
  tbl.columns('rank_intervening:name').visible(hasRankInter);
  tbl.columns('num_siblings:name').visible(hasNumSiblings);
  
  // Return to original tab
  $('#navTabs a[href="'+oldTab+'"]').tab('show');
}

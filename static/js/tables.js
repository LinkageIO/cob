/*----------------------------------
        Table Tab Listeners
-----------------------------------*/
// Redraw the Subnet Table when shown
$('#navTabs a[href="#SubnetTab"]').on('shown.bs.tab', function(){
  if($.fn.DataTable.isDataTable('#SubnetTable')){
    $('#SubnetTable').DataTable().draw();
  }
});

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
  // Enumerated column information!
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
    {data: 'num_intervening', name:'num_intervening', title:'Num Intervening'},
    {data: 'rank_intervening', name:'rank_intervening', title:'Rank Intervening'},
    {data: 'num_siblings', name:'num_siblings', title:'Num Siblings'},
    {data: 'window_size', name:'window_size', title:'Window Size', visible: false},
    {data: 'flank_limit', name:'flank_limit', title:'Flank Limit', visible: false},
    {data: 'annotations', name:'annotations', title:'Annotations'},
    //{data: 'parent_num_iterations', name:'parent_num_iterations', title: 'Num Parent Interactions'},
    //{data: 'parent_avg_effect_size', name:'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
  ];
  
  /*--------------------------------
       Set up the gene table
  ---------------------------------*/
  // Get gene table data
  var geneData = [];
  Object.keys(geneDict).forEach(function(cur,idx,arr){geneData.push(geneDict[cur]['data']);});
  
  // Destroy the old tables, remove columns, remove listeners
  if($.fn.DataTable.isDataTable('#GeneTable')){
    $('#GeneTable').DataTable().destroy();
    $('#GeneTable').off().empty();
  }
  
  // Set up the main gene table
  var gene_table = $('#GeneTable').DataTable({
      "data": geneData,
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
      "select": {"style": 'multi+shift'},
      "buttons": [
        {"extend": 'csv',"filename": 'genenetwork'},
        {"text": 'Graph Subnet', "action": makeSubnet},
        {"text": 'GWS', "action": gws},
        {"text": 'GO', "action": gont},
      ],
      "columns": cols,
    });
  
  // Set the inline titles on the tables
  $("div.GeneTitle").html('Gene Data');
  
  // Make certain columns invisible if there will be no useful data
  gene_table.columns('snp:name, fdr:name, num_intervening:name, rank_intervening:name, num_siblings:name').visible(isTerm);
  
  /*--------------------------------
       Set up the subnet table
  ---------------------------------*/
  // Destroy the old one if needed
  if($.fn.DataTable.isDataTable('#SubnetTable')){
    $('#SubnetTable').DataTable().destroy();
    $('#SubnetTable').off().empty();
  }
  
  // Set up the subnetwork gene table
  var sub_table = $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtpB',
      "order": [[0,'dec'],[3,'asc'],[4,'dec']],
      "paging": false,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scrollX": "100%",
      "scrollY": $(window).height()-275,
      "searching": true,
      "select": {"style": 'multi+shift'},
      "buttons": [
        {"extend": 'csv',"filename": 'subnetwork'},
        {"text": 'Graph Subnet', "action": makeSubnet},
        {"text": 'GWS', "action": gws},
        {"text": 'GO', "action": gont},
      ],
      "columns": cols,
    });
  
  // Set the inline titles on the tables
  $("div.SubnetTitle").html('Subnet Data');
  
  // Make certain columns invisible if there will be no useful data
  sub_table.columns('rendered:name').visible(false);
  sub_table.columns('snp:name, fdr:name, num_intervening:name, rank_intervening:name, num_siblings:name').visible(isTerm);
  
  // Set listener for pop effect of subnetwork table
  $('#SubnetTable tbody').on('mouseover','tr', function(evt){
    if(this['id'].length > 0){
      window.clearTimeout(popTimerID);
      popTimerID = window.setTimeout(function(id){
          cy.getElementById(id).flashClass('pop',750);
      }, 10, this['id']);
    }
  });
  
  // Need to redo selection system
  $('#GeneTable tbody').on('click','tr', function(evt){
    if(evt.ctrlKey){
      window.open('http://www.maizegdb.org/gene_center/gene/'+this['id']);
      $('#GeneTable').DataTable().row(this['id']).deselect();
    }
    else{geneSelect();}
  });
  
  // Need to redo selection system
  $('#SubnetTable tbody').on('click','tr', function(evt){
    if(evt.ctrlKey){
      window.open('http://www.maizegdb.org/gene_center/gene/'+this['id']);
      $('#SubnetTable').DataTable().row(this['id']).deselect();
    }
    else{geneSelect();}
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
function updateSubnetTable(newGenes, newGenesSel){
  // Get the table api ref
  var tbl = $('#SubnetTable').DataTable();
  
  // Find the genes we must add and remove
  var oldGenes = new Set();
  tbl.rows().ids().each(function(cur){oldGenes.add(cur)});
  var toAdd = [...newGenes].filter(cur => !oldGenes.has(cur));
  var toSub = [...oldGenes].filter(cur => !newGenes.has(cur));
  
  // Get the data in the proper formats for adding and removing
  toAdd.forEach(function(cur,idx,arr){arr[idx] = geneDict[cur]['data'];});
  toSub.forEach(function(cur,idx,arr){arr[idx] = '#'+cur;});
  
  // Clear old data and add new
  if(toSub.length > 0){tbl.rows(toSub).remove();}
  tbl.rows.add(toAdd).draw();
  
  // Update the selections
  tbl.rows('.selected').deselect();
  tbl.rows(newGenesSel).select();
}

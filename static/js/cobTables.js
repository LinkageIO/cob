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
// Initially build the Gene Table
function buildGeneTable(){
  $('#GeneTable').DataTable({
      "data": [],
      "deferRender": false,
      "dom": '<"GeneTitle">frtipB',
      "order": [[3,'asc'],[5,'asc']],
      "paging": true,
      "paginate": true,
      "rowId": 'id',
      "scrollCollapse": true,
      "scroller": {displayBuffer: 1000},
      "scrollXInner": "100%",
      "scrollX": "100%",
      "scrollY": ($(window).height()-275),
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [{"extend": 'csv',"filename": 'genenetwork',}],
      "columns": [
        {data: 'id', title:'ID'},
        {data: 'alias', title:'Alias'},
        {data: 'cur_ldegree', title:'Local Degree'},
        {data: 'gdegree', title:'Global Degree'},
        {data: 'chrom', title:'Chrom'},
        {data: 'snp', title:'SNP'},
        {data: 'start', title:'Start'},
        {data: 'end', title:'End'},
        {data: 'num_intervening', title:'Num Intervening'},
        {data: 'rank_intervening', title:'Rank Intervening'},
        {data: 'num_siblings', title:'Num Siblings'},
        {data: 'window_size', title:'Window Size', visible: false},
        {data: 'flank_limit', title:'Flank Limit', visible: false},
        //{data: 'parent_num_iterations', title: 'Num Parent Interactions'},
        //{data: 'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
    ]});
  $("div.GeneTitle").html('Gene Data');
  
  // Set Listeners
  $('#GeneTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
}

// Initially build the subnetwork table
function buildSubnetTable(){
  $('#SubnetTable').DataTable({
      "data": [],
      "dom": '<"SubnetTitle">frtipB',
      "order": [[3,'asc'],[5,'asc']],
      "paging": false,
      "paginate": false,
      "rowId": 'id',
      "scrollCollapse": true,
      "scrollX": "100%",
      "scrollY": $(window).height()-275,
      "searching": true,
      "select": {"style": 'api'},
      "buttons": [{"extend": 'csv',"filename": 'subnetwork',}],
      "columns": [
        {data: 'id', title:'ID'},
        {data: 'alias', title:'Alias'},
        {data: 'cur_ldegree', title:'Local Degree'},
        {data: 'gdegree', title:'Global Degree'},
        {data: 'chrom', title:'Chrom'},
        {data: 'snp', title:'SNP'},
        {data: 'start', title:'Start'},
        {data: 'end', title:'End'},
        {data: 'num_intervening', title:'Num Intervening'},
        {data: 'rank_intervening', title:'Rank Intervening'},
        {data: 'num_siblings', title:'Num Siblings'},
        {data: 'window_size', title:'Window Size', visible: false},
        {data: 'flank_limit', title:'Flank Limit', visible: false},
        //{data: 'parent_num_iterations', title: 'Num Parent Interactions'},
        //{data: 'parent_avg_effect_size', title: 'Avg Parent Effect Size'},
    ]});
  $("div.SubnetTitle").html('Subnet Data');
  
  // Set Listeners
  $('#SubnetTable tbody').on('click','tr', function(evt){geneSelect(this['id']);});
  $('#SubnetTable tbody').on('mouseover','tr', popGene);
}

// Make the gene pop, but only if its not cancelled by a subsequent one
function popGene(evt){
  window.clearTimeout(popTimerID);
  popTimerID = window.setTimeout(function(id){
      cy.nodes('[id = "'+id+'"]').flashClass('pop',750);
  }, 10, this['id']);
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
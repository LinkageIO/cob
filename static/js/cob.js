/*--------------------------------
         Event Listeners
---------------------------------*/
$(document).ready(function(){
// A row on the Ontology Table is selected
$('#OntologyTable tbody').on('click','tr', function(){
  // Save the selected row
  CurrentOntology = $('td', this).eq(0).text();
  
  // Clean up the old Term Table
  CurrentTerm = '';
  $('#TermTable').addClass('hidden');
  $('#TermWait').removeClass('hidden');
  $('#TermTable').DataTable().clear();
  
  // Clean up the Network Table
  CurrentNetwork = '';
  $('#NetworkTable').addClass('hidden');
  $('#NetworkTable').DataTable().clear();
  
  // Clean up the graph
  $('#cy').addClass('hidden');
  $('#cyWait').removeClass('hidden');
  if(cy != null){cy.destroy();}
  
  // Fetch and build the new Term Table
  tableMaker('Term');
});

// A row on the Term Table is selected
$('#TermTable tbody').on('click','tr', function(){
  // Highlight the relevant row
  CurrentTerm = $('td',this).eq(0).text();
  
  // Fetch and build the network table
  tableMaker('Network');
});

// A row on the Network Table is selected
$('#NetworkTable tbody').on('click','tr',function(){
  $('#cyWait').addClass('hidden');
  $('#cy').removeClass('hidden');
    CurrentNetwork = $('td',this).eq(0).text();
    $.getJSON($SCRIPT_ROOT + 'COB/' + CurrentNetwork + '/' + CurrentOntology + '/' + CurrentTerm).done(function(data){
            console.log('Recieved Data from Server, sening to cytoscape.');
            buildGraph(data);
        })
        .fail(function(data){
            console.log("Something went wrong with the data.")
        })
})});

/*--------------------------------
         Table Constructor
---------------------------------*/
function tableMaker(section){
// Function to me make the table out of the analysis database
  // Keep the user updated on progress
  $('#'+section+'Wait').addClass("hidden");
  
  // Find the address for each table, this will be deprecated after server improvements
  if(section == 'Ontology'){
    var address = $SCRIPT_ROOT + 'available_datasets/GWAS';}
  else if(section == 'Term'){
    var address = $SCRIPT_ROOT + 'Ontology/Terms/' + CurrentOntology;}
  else if(section == 'Network'){
    var address = $SCRIPT_ROOT + 'available_datasets/Expr';}

  // Make sure the table is visible
  $('#'+section+'Table').removeClass("hidden");
  
  // Clean up the old table
  $('#'+section+'Table').DataTable().destroy();
  
  // Uses DataTables to build a pretty table
  $('#'+section+'Table').DataTable(
      {
      "ajax": address,
      "order": [[0,'asc']],
      "processing" : true,
      "autoWidth": true, 
      "bPaginate": false,
      "bJQueryUI": false,
      "bScrollCollapse": true,
      "bAutoWidth": true,
      "sScrollXInner": "100%",
      "sScrollX": '100%',
      "sScrollY": $('#cob').innerHeight()/3,
      "select": true,
      "searching": true,
      "stripe": true,
    });
  return;
}

function buildGraph(data){
  cy = window.cy = cytoscape({
    container: $('#cy'),
    boxSelectionEnabled: false,
    autounselectify: true,
    
    layout: {
      name: 'polywas',
    },
    style: [
       {
         selector: '[type = "gene"]',
         style: {
           'content': 'data(id)',
           'color': 'black',
           'text-valign': 'center',
           'text-halign': 'center',
           'background-color': '#62c',
           'shape': 'circle',
         }
       },
       {
        selector: '[type = "locus"]',
        css: {
          'background-color': 'black',
          'content': 'data(id)',
          'color': 'white',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-background-color': 'black',
          'text-background-opacity': '1',
          'text-background-shape': 'roundrectangle',
        }
      },
       {
         selector: 'edge',
         css: {
           'curve-style': 'unbundled-bezier',
           'width': 3,
           'opacity': 0.5,
           'line-color': 'black'
         }
       }
     ],
   elements: {
     nodes: data.nodes,
     edges: data.edges,
  }});
}
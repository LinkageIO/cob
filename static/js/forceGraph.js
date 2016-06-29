// Promise function to build a new force directed graph
var newForce = function(resolve, reject){
  // Get the data and on completion, build the graph
  $.ajax({
    url: ($SCRIPT_ROOT + 'custom_network'),
    data: {
      network: lastNetwork,
      sigEdgeScore: lastSigEdgeScore,
      maxNeighbors: lastMaxNeighbors,
      geneList: $('#geneList').val(),
    },
    type: 'POST',
    statusCode: {400: function(){reject('No input genes were present in the network.');}},
    success: function(data){
      // Kill the old graph and build the new one
      if(cy != null){cy.destroy();cy = null;}
      isPoly = false;
      initForceCyto(data);
      var genes = cy.nodes();

      cy.startBatch();
      // Update the styles of the nodes for the new sizes
      updateNodeSize(parseInt(document.forms["forceOpts"]["forceNodeSize"].value));

      // Save the degree for the graph
      genes.forEach(function(cur, idx, arr){cur.data('cur_ldegree', cur.degree());});
      cy.endBatch();

      // Set up the gene node tap listener
      genes.on('tap', function(evt){
        // Only scroll to the gene if it isn't highlighted already
        if(!(evt.cyTarget.hasClass('highlighted'))){
          $('#GeneTable').DataTable().row('#'+evt.cyTarget.data('id')).scrollTo();}

        // Run the selection algorithm
        geneSelect(evt.cyTarget.data('id'));
      });

      // Set the gene qTip listeners (only needs to be done once per full graph redo)
      genes.qtip({
        content: function(){
          var data = this.data();
          res = 'ID: '+data['id'].toString()+'<br>';
          if(data['alias'].length > 0){
            res += 'Alias(es): '+data['alias'].toString()+'<br>';}
          res += 'Local Degree: '+data['cur_ldegree'].toString()+'<br>';
          res += 'Position: '+data['start'].toString()+'-'+data['end'].toString();
          return res;
        },
        position: {my: 'bottom center', at: 'top center'},
        style: {
          classes: 'qtip-dark qtip-rounded qtip-shadow',
          tip: {width: 10, height: 5},
        },
        show: {event: 'mouseover'},
        hide: {event: 'mouseout'},
      });

      if(data.rejected.length > 0){
        window.alert('The following gene(s) were not found in the designated network:\n\n\n'+data.rejected.toString()+'\n\n');
      }

      if(cy !== null){resolve();}
      else{reject('Force graph build failed');}
    }});
}

var updateForce = function(resolve, reject){
  // Run the layout
  cy.layout(getForceLayoutOpts());

  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(document.forms["forceOpts"]["forceNodeSize"].value));

  if(cy !== null){resolve();}
  else{reject('Force graph update failed');}
}

// Function to return an object for the layout options
function getForceLayoutOpts(){
  return {
    name: 'cose',
    animate: false,
    nodeOverlap: 50,
    componentSpacing: 35,
    nodeRepulsion: function(node){return 100000;},
  }
}

// Function to initialize the graph with force layout
function initForceCyto(data){
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),

    // Rendering Options
    pixelRatio: 1,
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.5,

    layout: getForceLayoutOpts(),

    style: [
       {selector: '[origin = "query"]',
        css: {
          'z-index': '2',
          'shape': 'circle',
          'background-color': 'DarkOrchid',
        }},
        {selector: '[origin = "neighbor"]',
         css: {
           'z-index': '1',
           'shape': 'circle',
           'background-color': 'MediumSeaGreen',
         }},
       {selector: 'edge',
         css: {
           'curve-style': 'haystack',
           'width': '1',
           'opacity': '0.5',
           'line-color': 'grey'
         }},
       {selector: '.neighbors',
         css: {
           'background-color': '#ff6400',
       }},
       {selector: '.highlighted',
         css: {
           'background-color': 'Red',
         }},
       {selector: '.highlightedEdge',
         css: {
           'line-color': '#ffc800',
           'width': '2',
           'opacity': '1',
           'z-index': '3',
         }},
       {selector: '.pop',
         css: {
           'background-color': 'Yellow',
           'z-index': '4',
         }},
     ],
   elements: {
     nodes: data.nodes,
     edges: data.edges,
  }});
}

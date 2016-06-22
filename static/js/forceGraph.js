var newForce = function(resolve, reject){
  $.ajax({
    url: ($SCRIPT_ROOT + 'custom_network'),
    data: {network: CurrentNetwork, sigEdge: '3', genes: $('#TermGenes').val()},
    type: 'POST',
    success: function(data){
      console.log(data);
      // Kill the old graph and build the new one
      if(cy != null){cy.destroy();cy = null;}
      initForceCyto(data);
      var genes = cy.nodes();
      
      // Save the degree for the graph
      cy.startBatch();
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
          return 'ID: '+data['id'].toString()+'<br>'+
          'Local Degree: '+data['cur_ldegree'].toString()+'<br>'+
          'Position: '+data['start'].toString()+'-'+data['end'].toString();
        },
        position: {my: 'bottom center', at: 'top center'},
        style: {
          classes: 'qtip-dark qtip-rounded qtip-shadow',
          tip: {width: 10, height: 5},
        },
        show: {event: 'mouseover'},
        hide: {event: 'mouseout'},
      });
      
      if(cy !== null){resolve();}
      else{reject('Polywas graph build failed');}
    }});
}

var updateForce = function(resolve, reject){
  resolve();
}

function initForceCyto(data){
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),
    
    // Interaction Options
    //boxSelectionEnabled: true,
    //autounselectify: false,
    
    // Rendering Options
    pixelRatio: 1,
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.5,
    
    layout: {
      name: 'cose',
      animate: false,
    },
    
    style: [
       {selector: '[origin = "query"]',
        css: {
          'z-index': '2',
          'shape': 'circle',
          'width': '20',
          'height': '20',
          'background-color': 'DarkOrchid',
        }},
        {selector: '[origin = "neighbor"]',
         css: {
           'z-index': '1',
           'shape': 'circle',
           'width': '20',
           'height': '20',
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
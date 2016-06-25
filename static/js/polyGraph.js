// Promise function to build a new polywas graph
var newPoly = function(resolve, reject){
  // Get the data and build the graph
  $.ajax({
    url: ($SCRIPT_ROOT + 'term_network'),
    data: {
      network: lastNetwork,
      ontology: lastOntology,
      term: lastTerm,
      windowSize: lastWindowSize,
      flankLimit: lastFlankLimit,
    },
    type: 'POST',
    success: function(data){
      if(cy != null){cy.destroy();cy = null;}
      isPoly = true;
      initPolyCyto(data);
      
      // Update the styles of the nodes for the new sizes
      updateNodeSize(parseInt(document.forms["polyOpts"]["polyNodeSize"].value));
      
      // Set the snp group qtips
      var genes = cy.nodes('[type = "gene"]');
      
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
          'SNP: '+data['snp'].toString()+'<br>'+
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
      
      // Set the SNPG qtips
      setSNPGqtips();
      
      if(cy !== null){resolve();}
      else{reject('Polywas graph build failed');}
    }
  });
}

// Promise function to update the polywas graph
var updatePoly = function(resolve, reject){
  // Run the layout
  cy.layout(getPolyLayoutOpts());
  
  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(document.forms["polyOpts"]["polyNodeSize"].value));
  
  // Set the SNPG qtips
  setSNPGqtips();
  
  if(cy !== null){resolve();}
  else{reject('Polywas graph update failed');}
}

// Function to set up the SNPG qtips after any change
function setSNPGqtips(){
  // Set the SNP Group qTip listner
  cy.nodes('[type = "snpG"]').qtip({
    content: function(){
      var res = 'SNPs in Group:<br>'; var snps = this.data('snps');
      $(snps).each(function(i){res += (this.toString() + '<br>');});
      return res;
    },
    position: {my: 'bottom center', at: 'top center'},
    style: {
      classes: 'qtip-light qtip-rounded qtip-shadow',
      tip: {width: 10, height: 5},
    },
    show: {event: 'mouseover'},
    hide: {event: 'mouseout'},
  });
}

// Function to return an object for the layout options
function getPolyLayoutOpts(){
  return {
    name: 'polywas',
    minNodeDegree: parseInt(document.forms["polyOpts"]["nodeCutoff"].value), 
    minEdgeScore: parseFloat(document.forms["polyOpts"]["edgeCutoff"].value),
    nodeHeight: parseInt(document.forms["polyOpts"]["polyNodeSize"].value),
    geneOffset: parseInt(document.forms["polyOpts"]["polyNodeSize"].value),
    logSpacing: logSpacing,
    snpLevels: parseInt(document.forms["polyOpts"]["snpLevels"].value),
  }
}

// Function to initialize the graph with polywas layout
function initPolyCyto(data){
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),
    
    // Interaction Options
    boxSelectionEnabled: true,
    autounselectify: false,
    
    // Rendering Options
    pixelRatio: 1,
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.5,
    
    layout: getPolyLayoutOpts(),
    style: [
        {selector: '[type = "chrom"]',
         css: {
           'z-index': '2',
           'background-color': 'DarkSlateGrey',
           'content': 'data(id)',
           'color': 'white',
           'text-valign': 'center',
           'text-halign': 'center',
           'text-background-color': 'DarkSlateGrey',
           'text-background-opacity': '1',
           'text-background-shape': 'roundrectangle',
           'font-size': '10',
         }},
       {selector: '[type = "snpG"], [type = "gene"]',
        css: {
          'z-index': '1',
          'shape': 'circle',
          'background-color': 'DimGrey',
        }},
       {selector: '.snp0',
         style: {
           'background-color': 'DarkOrchid',
         }},
       {selector: '.snp1',
         style: {
           'background-color': 'MediumSeaGreen',
         }},
       {selector: '.snp2',
         style: {
           'background-color': '#337ab7',
         }},
       {selector: '.snp3',
         style: {
           'background-color': 'Tan',
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
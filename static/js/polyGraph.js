// Promise function to build a new polywas graph 
function newPoly(resolve, reject, nodes, edges){
  // Destroy the old graph if there is one
  if(cy != null){cy.destroy();cy = null;}
  
  // Save the nodes, Init the graph
  geneNodes = nodes;
  initPolyCyto(nodes.filter(function(cur,idx,arr){
    return (cur['data']['render'] === 'x');
  }),edges);
  
  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(lastOpts["nodeSize"]));
  
  // Set up the graph event listeners
  setGeneListeners();
  setSNPGqtips();
  
  // Check for a graph and resolve
  if(cy !== null){resolve();}
  else{reject('Polywas graph build failed');}
}

// Promise function to update the polywas graph
function updatePoly(resolve, reject){
  // Run the layout
  cy.layout(getPolyLayoutOpts());
  
  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(lastOpts["nodeSize"]));
  
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
    hide: {event: 'mouseout unfocus', distance:20},
  });
}

// Function to return an object for the layout options
function getPolyLayoutOpts(){
  return {
    name: 'polywas',
    nodeHeight: parseInt(lastOpts["nodeSize"]),
    geneOffset: parseInt(lastOpts["nodeSize"]),
    logSpacing: logSpacing,
    snpLevels: parseInt(lastOpts["snpLevels"]),
  }
}

// Function to initialize the graph with polywas layout
function initPolyCyto(nodes,edges){
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
       {selector: '.neighbor',
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
     nodes: nodes,
     edges: edges,
  }});
}
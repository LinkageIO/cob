// Promise function to build a new force directed graph 
function newForce(resolve,reject,nodes,edges){
  // Destroy the old graph if there is one
  if(cy != null){cy.destroy();cy = null;}
  
  // Save the nodes, Init the graph
  geneNodes = nodes;
  initForceCyto(nodes.filter(function(cur,idx,arr){
    return (cur['data']['render'] === 'x');
  }),edges);
  
  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(lastOpts["nodeSize"]));

  // Save the degree for the graph
  setGeneListeners();
  
  // Check for a graph and resolve
  if(cy !== null){resolve();}
  else{reject('Force graph build failed');}
}

// Promise function handle updating exiisting force graph
function updateForce(resolve, reject){
  // Run the layout
  cy.layout(getForceLayoutOpts());

  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(lastOpts["nodeSize"]));
  
  // Check for a graph and resolve
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
    nodeRepulsion: function(node){return 50000;},
  }
}

// Function to initialize the graph with force layout
function initForceCyto(nodes, edges){
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),

    // Rendering Options
    pixelRatio: 1,
    hideEdgesOnViewport: false,
    textureOnViewport: true,
    wheelSensitivity: 0.25,

    layout: getForceLayoutOpts(),

    style: [
      {selector: '[type = "gene"]',
       css: {
         'z-index': '1',
         'shape': 'circle',
         'background-color': '#337ab7',
       }},
       {selector: '[origin = "query"]',
        css: {
          'z-index': '3',
          'background-color': 'DarkOrchid',
        }},
        {selector: '[origin = "neighbor"]',
         css: {
           'z-index': '2',
           'background-color': 'MediumSeaGreen',
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

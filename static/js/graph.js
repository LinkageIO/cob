/*-------------------------------------
     General Modify Graph Function
-------------------------------------*/
function modCyto(resolve, reject, newGraph, poly, nodes, edges){
  if(newGraph){
    // Destroy the old graph if there is one
    if(cy !== null){cy.destroy();cy = null;}
    
    // Get a list of the nodes to render
    var renNodes = [];
    Object.keys(nodes).forEach(function(cur,idx,arr){
      if(nodes[cur]['data']['render'] === 'x'){renNodes.push(nodes[cur]);}
    });
  
    // Init the graph
    initCyto(renNodes, edges, poly);
  }
  else{
    // Run the proper layout
    if(poly){cy.layout(getPolyLayoutOpts());}
    else{cy.layout(getForceLayoutOpts());}
  }
  
  // Update the styles of the nodes for the new sizes
  updateNodeSize(parseInt(curOpts["nodeSize"]));
  
  // Set up the graph event listeners
  setGeneListeners();
  if(poly){setSNPGqtips();}
  
  // Check for a graph and resolve
  if(cy !== null){resolve();}
  else{reject('Graph modification failed failed');}
}

/*------------------------------------------
          Options for Each Layout
------------------------------------------*/
// Function to return an object for the layout options
function getPolyLayoutOpts(){
  return {
    name: 'polywas',
    nodeDiameter: parseInt(curOpts["nodeSize"]),
    logSpacing: logSpacing,
    snpLevels: parseInt(curOpts["snpLevels"]),
  };
}
// Function to return an object for the layout options
function getForceLayoutOpts(){
  return {
    name: 'cose',
    animate: false,
  };
}

/*------------------------------------------
          Init Cytoscape.js Fresh
------------------------------------------*/
function initCyto(nodes,edges,poly){
  // Get the proper layout options
  if(poly){var opts = getPolyLayoutOpts();}
  else{var opts = getForceLayoutOpts();}
  
  // Initialize Cytoscape
  cy = window.cy = cytoscape({
    container: $('#cy'),

    // Rendering Options
    pixelRatio: 2.0,
    motionBlur: true,
    wheelSensitivity: 0.25,
    textureOnViewport: true,
    hideEdgesOnViewport: false,
    layout: opts,
    style: [
        {selector: '[type = "chrom"]',
         css: {
           'z-index': '2',
           'background-color': 'DarkSlateGrey',
           'content': 'data(id)',
           'color': 'white',
           'text-background-color': 'DarkSlateGrey',
           'text-background-opacity': '1',
           'text-background-shape': 'roundrectangle',
           'text-valign': 'center',
           'text-halign': 'center',
           'font-size': '12',
         }},
       {selector: '[type = "snpG"]',
        css: {
          'z-index': '1',
          'shape': 'circle',
          'background-color': 'DimGrey',
        }},
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
       {selector: '.snp4',
         style: {
           'background-color': 'LightGrey',
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

/*--------------------------------
     Node Size Update Function
---------------------------------*/
function updateNodeSize(diameter){
  cy.startBatch();
  cy.style().selector('[type = "snpG"], [type = "gene"]').style({
    'width': (diameter).toString(),
    'height': (diameter).toString(),
  }).selector('.pop').style({
    'width': (diameter*2).toString(),
    'height': (diameter*2).toString(),
  });
  if(!(isPoly())){
    cy.style().selector('[origin = "query"]').style({
      'width': (diameter*1.5).toString(),
      'height': (diameter*1.5).toString(),
    });
  }
  cy.style().update();
  cy.endBatch();
}

/*------------------------------------------
           Graph Listeners Setup
------------------------------------------*/
function setGeneListeners(genes){
  // Get all the genes
  if(genes === undefined){genes = cy.nodes('[type = "gene"]');}
  
  // Remove all event listeners
  genes.off('tap');
  try{genes.qtip('destroy');}
  catch(err){}
  
  // Set listener for clicking
  genes.on('tap', function(evt){
    if(evt.originalEvent.ctrlKey || evt.originalEvent.metaKey){
      window.open('http://www.maizegdb.org/gene_center/gene/'+evt.cyTarget.id());
    }
    else{
      // If we are in the process of adding a gene, kill this request
      if(noAdd){
        window.alert('We\'re currently processing a previous add gene request, if you would like to add more than one at a time, please use the shift select method.'); 
        return;
      }
      
      // Otherwise go ahead and update everything
      if(evt.cyTarget.hasClass('highlighted')){
        $('#GeneTable').DataTable().row('#'+evt.cyTarget.id()).deselect();
      }
      else{
        $('#GeneTable').DataTable().row('#'+evt.cyTarget.id()).scrollTo().select();
      }
      geneSelect();
    }
  });
  
  // Setup qtips
  genes.qtip({
    content: function(){
      var data = this.data();
      res = 'ID: '+data['id'].toString()+'<br>';
      if(data['alias'].length > 0){res += 'Alias(es): '+data['alias'].toString()+'<br>';}
      res += 'Local Degree: '+data['cur_ldegree'].toString()+'<br>';
      if(isTerm){res += 'SNP: '+data['snp'].toString()+'<br>';}
      res += 'Position: '+data['start'].toString()+'-'+data['end'].toString();
      return res;
    },
    position: {my: 'bottom center', at: 'top center'},
    style: {
      classes: 'qtip-dark qtip-rounded qtip-shadow',
      tip: {width: 10, height: 5},
    },
    show: {event: 'mouseover', solo: true},
    hide: {event: 'mouseout unfocus', distance: 15, inactive: 2000},
  });
}

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
    show: {event: 'mouseover', solo: true},
    hide: {event: 'mouseout unfocus', distance: 15, inactive: 2000},
  });
}

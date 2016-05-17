;(function(){ 'use strict';
var register = function(cytoscape){
  if(!cytoscape){return;} // Can't Register if Cytoscape is Unspecified

  var isString = function(o){ return typeof o === typeof ''; };
  var isNumber = function(o){ return typeof o === typeof 0; };
  var isObject = function(o){ return o != null && typeof o === typeof {}; };

  // Default Layout Options
  var defaults = {
    padding: 100, // padding around the layout
    boundingBox: undefined, // constrain layout bounds; {x1, y1, x2, y2} or {x1, y1, w, h}
    chromPadding: 5, //Ammount of padding at the end of the chrom lines (in degrees)
    useChromosomes: false,
    nodeHeight: 20,
    ready: function(){}, // on layoutready
    stop: function(){} // on layoutstop
  };

  // Constructor
  // Options : Object Containing Layout Options
  function PolywasLayout( options ){
    var opts = this.options = {};
    for( var i in defaults ){ opts[i] = defaults[i]; }
    for( var i in options ){ opts[i] = options[i]; }
  }

  // Runs the Layout
  PolywasLayout.prototype.run = function(){
    // Making some convinience aliases
    var layout = this;
    var options = this.options;
    var cy = options.cy; // The whole environment
    var eles = options.eles; // elements to consider in the layout
    var chromPad = (options.chromPadding*Math.PI)/180; // Padding in radians around chromuences

    // Finding and splitting up the different element types
    var nodes = eles.nodes();
    var chrom = nodes.filter('[type = "chrom"]').sort(options.sort);
    var snps = nodes.filter('[type = "snp"]').sort(options.sort);
    var genes = nodes.filter('[type = "gene"]').sort(options.sort);
    var coex = eles.edges();

    // Find the Bounding Box and the Center
    var bb = options.boundingBox || cy.extent();
    if(bb.x2 === undefined){bb.x2 = bb.x1 + bb.w;}
    if(bb.w === undefined){bb.w = bb.x2 - bb.x1;}
    if(bb.y2 === undefined){bb.y2 = bb.y1 + bb.h;}
    if(bb.h === undefined){bb.h = bb.y2 - bb.y1;}
    var center = {x:(bb.x1+bb.x2)/2, y:(bb.y1+bb.y2)/2};

    // Set up the circle in which to place the chromuences
    var circum = 2*Math.PI;
    var radius = (Math.min(bb.h, bb.w)/2)-options.padding;
    
    // Find how many radians each chrom gets
    var chromCount = chrom.length;
    var dtheta = circum/chromCount;

    // Start the actual laying out
    layout.trigger('layoutstart');

    // ========================
    // Position the Chromosomes
    // ========================
    // Error if there are less than two chrom
    try{if(chromCount < 2){
      throw "chrom layout doeesn't make sense with less than 2 chrom.\nPlease add more chrom and try again.";}}
    catch(err){window.alert(err);}

    // Find the and set the position of the chrom
    chrom.layoutPositions(this, options, (function(i, ele){
      // Find the angle of the ends of the chrom line
      var radA = ((i-1)*dtheta)+(chromPad/2);
      var radB = ((i)*dtheta)-(chromPad/2);

      // Use trig to find the actual coordinates of the points
      var ax = Math.round((radius * Math.cos(radA)) + center.x);
      var ay = Math.round((radius * Math.sin(radA)) + center.y);
      var bx = Math.round((radius * Math.cos(radB)) + center.x);
      var by = Math.round((radius * Math.sin(radB)) + center.y);

      // Find the midpoint of the line (where it will actually be positioned
      var mx = Math.round((ax+bx)/2);
      var my = Math.round((ay+by)/2);

      // Find the two relevant measures of line length, pixels and base pairs
      var chromLen = ele.data('end')-ele.data('start');
      var pxLen = Math.sqrt((ax-bx)*(ax-bx) + (ay-by)*(ay-by));
      var BPperPX = chromLen/pxLen;
      console.log(BPperPX);

      // Add some information in the node concerning it's position
      ele.data({
        pxStart: {x:ax, y:ay}, // The starting pixel
        pxEnd: {x:bx, y:by}, // THe ending pixel
        mid: {x:mx, y:my}, // The middle pixel
        delta: {x:((bx-ax)/chromLen), y:((by-ay)/chromLen)}, // Pixels per basepair
        len: pxLen, // Total length in pixels
        BPperPX: BPperPX, // Basepair per pixel
        theta: (radA+radB)/2, // Radian of midpoint from center
        radius: radius,
        center: center,
      });
      return ele.data('mid');
    }));

    // =====================
    // Make Chromosome Lines
    // =====================
    cy.style().selector('[type = "chrom"]').style({
      'shape': 'polygon',
      'width': function(ele){return ele.data('len');},
      'height': function(ele){return ele.data('len');},
      'shape-polygon-points': function(ele){
          var theta = (ele.data('theta')-(Math.PI/2));
          // Calls helper function (at bottom) for getting the polygon points
          return getLinePolygon(theta);
      },
    }).update();
    chrom.lock();

    // ================
    // Combine the snps
    // ================
    // Extract the data from the SNPS
    var snpData = []
    snps.forEach(function(currentValue, index, array){
        var id = currentValue.data('id');
        var chrom = currentValue.data('chrom');
        var start = parseInt(currentValue.data('start'));
        var end =  parseInt(currentValue.data('end'))
        snpData.push({id: id, chrom: chrom, start: start, end: end, pos: ((start + end)/2)});
    });
    
    // Sort that data by chromasome and position
    snpData.sort(function(a,b){
        if(a.chrom < b.chrom){return -1;}
        else if(a.chrom > b.chrom){return 1;}
        else{
            if(a.pos < b.pos){return -1;}
            else if(a.pos > b.pos){return 1;}
            else{return 0;}
    }});
    
    // Make new nodes from these
    var snpNodes = [];
    var curNode = null;
    var lastPos = null;
    var lastChrom = null;
    var totDist = 0;
    var min = null;
    var max = null;
    snpData.forEach(function(currentValue, index, array){
        totDist = totDist + (currentValue.pos - lastPos);
        var parent = chrom.filter(('[id = "'+currentValue.chrom+'"]'));
        // Need to start a new node
        if((currentValue.chrom !== lastChrom) || (totDist >= (options.nodeHeight*parent.data('BPperPX')))){
            // Set the final values and push the last node
            if(curNode !== null){
                curNode.data.start = min;
                curNode.data.end = max;
                snpNodes.push(curNode);}
            // Set the new intial values
            min = currentValue.start;
            max = currentValue.end;
            lastPos = currentValue.pos;
            lastChrom = currentValue.chrom;
            totDist = 0;
            curNode = {group: 'nodes', data:{
                id: index,
                type: 'snp',
                chrom: lastChrom,
                start: min,
                end: max,
                snps: [currentValue.id]}};
        }
        else{
            if(curNode.data.start < min){min = curNode.data.start;}
            if(curNode.data.end > max){max = curNode.data.end;}
            lastPos = currentValue.pos;
            lastChrom = currentValue.chrom;
            curNode.data.snps.push(currentValue.id);
        }
    });
    curNode.data.start = min;
    curNode.data.end = max;
    snpNodes.push(curNode);
    console.log(snpNodes);
    cy.remove(snps);
    snps = cy.add(snpNodes);
    
    // =================
    // Position the snps
    // =================
    var orphanSnps = [];
    snps.layoutPositions(this, options, (function(i, ele){
      // Find information about the parent
      var parent = chrom.filter(('[id = "'+ele.data('chrom')+'"]'));
      // Put orphan snps in the middle of the graph
      if(parent.length !== 1){
        orphanSnps[orphanSnps.length] = ele.data('id');
        return {x:center.x, y:center.y};
      }
      var parPos = parent.data('pxStart');
      var delta = parent.data('delta');

      // Find the start and end position of snps
      var start = ele.data('start');
      var end = ele.data('end');
      
      // Find the position of the snps based on all the data
      return {
        x: ((((start*delta.x)+(end*delta.x))/2)+parPos.x),
        y: ((((start*delta.y)+(end*delta.y))/2)+parPos.y),
      };
    }));

    // Throw up an alert if there are orphan snps
    try{if(orphanSnps.length > 0){
      throw "You have snps with either more or less than one parent chrom, they are in the middle of the graph, please fix this for correct formatting. The affected genes are:\n";}}
    catch(err){
      var snpStr = '';
      for(var i=0; i < orphanSnps.length; i++){
        snpStr += orphanSnps[i] + '\n';}
      window.alert(err + snpStr);
    }

    // Trigger layoutready when each node has had its position set at least once
    layout.one('layoutready', options.ready);
    layout.trigger('layoutready');

    // Trigger layoutstop when the layout stops (e.g. finishes)
    layout.one('layoutstop', options.stop);
    layout.trigger('layoutstop');

    return this; // chaining
  };

  // Called on Continuous Layouts to Stop Them Before They Finish
  PolywasLayout.prototype.stop = function(){return this;};

  // Actually Register the layout!
  cytoscape('layout', 'polywas', PolywasLayout);
};

// Expose as a Commonjs Module
if( typeof module !== 'undefined' && module.exports ){module.exports = register;}

// Expose as an AMD/Requirejs Module
if( typeof define !== 'undefined' && define.amd ){
  define('cytoscape-polywas', function(){return register;});}

// Expose to Global Cytoscape (i.e. window.cytoscape)
if( typeof cytoscape !== 'undefined' ){register(cytoscape);}})();

// Helper function that, given theta, returns the polygon points for a line oriented
// in that direction in relation to the origin (0,0) of the unit circle
var getLinePolygon = function(theta, radWidth){
  var radWidth = radWidth || 0.05;
  var ax = Math.cos(theta+(radWidth/2)); var ay = Math.sin(theta+(radWidth/2));
  var bx = Math.cos(theta-(radWidth/2)); var by = Math.sin(theta-(radWidth/2));
  var cx = -ax; var cy = -ay;
  var dx = -bx; var dy = -by;
  var res = ax.toString() + ' ' + ay.toString() + ' '
    + bx.toString() + ' ' + by.toString() + ', '
    + bx.toString() + ' ' + by.toString() + ' '
    + cx.toString() + ' ' + cy.toString() + ', '
    + cx.toString() + ' ' + cy.toString() + ' '
    + dx.toString() + ' ' + dy.toString() + ', '
    + dx.toString() + ' ' + dy.toString() + ' '
    + ax.toString() + ' ' + ay.toString();
  return res;
};

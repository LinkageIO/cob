function Graph(params){
    defaults = {
        'div':$('<div>'),
    }    
    this.params = $.extend(true,defaults,params)
    this.selected = []
    // set default filters
    this.edge_filter = 3 // edge score
    this.node_filter = 1 // degree
    this.cy = cytoscape(this.cytoscape_options)
    
    this.params.div
    .append($('<img>',{class:'snapshot'}))
    .append($('<div>',{class:'cy'}))
    .append($('<ul>',{class:'graph_controls'})
        .append($('<li>')
            .append($('<button>Fit</button>',{})
                .on({'click':function(){
                    cob.graph.cy.fit()
                }})
            )
            .append($('<button>Cola Layout</button>',{})
                .on({'click':function(){
                    var params = {
                        name: 'cola',
                        animate: false, // whether to show the layout as it's running
                        refresh: 1, // number of ticks per frame; higher is faster but more jerky
                        maxSimulationTime: 4000, // max length in ms to run the layout
                        ungrabifyWhileSimulating: true, // so you can't drag nodes during layout
                        fit: false, // on every layout reposition of nodes, fit the viewport
                        padding: 30, // padding around the simulation
                        boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
                        
                        // layout event callbacks
                        ready: function(){console.log('Cola ready.')}, // on layoutready
                        stop: function(){console.log('Cola stop.')}, // on layoutstop
                        
                        // positioning options
                        randomize: false, // use random node positions at beginning of layout
                        avoidOverlap: true, // if true, prevents overlap of node bounding boxes
                        handleDisconnected: true, // if true, avoids disconnected components from overlapping
                        nodeSpacing: function( node ){ return 10; }, // extra spacing around nodes
                        flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
                        alignment: undefined, // relative alignment constraints on nodes, e.g. function( node ){ return { x: 0, y: 1 } }
                        
                        // different methods of specifying edge length
                        // each can be a constant numerical value or a function like `function( edge ){ return 2; }`
                        edgeLength: undefined, // sets edge length directly in simulation
                        edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
                        edgeJaccardLength: undefined, // jaccard edge length in simulation
                        
                        // iterations of cola algorithm; uses default values on undefined
                        unconstrIter: undefined, // unconstrained initial layout iterations
                        userConstIter: undefined, // initial layout iterations with user-specified constraints
                        allConstIter: undefined, // initial layout iterations with all constraints including non-overlap

                        // infinite layout options
                        infinite: false // overrides all other options for a forces-all-the-time mode
                    };
                    layout = cob.graph.cy.makeLayout(params);
                    layout.run();
                    //cob.graph.cy.center()
                }})
            )
            .append($('<button>Snapshot</button>',{})
                .on({'click':function(){
                        $('#cob .graph .snapshop').style.zIndex='100'
                }})
        )
        .append($('<li>')
            .append('<span>').html('Edge Filter')
                .append($('<input>',{'value':3})
                    .on({'change':function(){
                        cob.graph.edge_filter = this.value
                        cob.graph.filter()
                    }})
                )
        )
        .append($('<li>')
            .append('<span>').html('Degree Filter')
                .append($('<input>',{'value':1})
                    .on({'change':function(){
                        cob.graph.node_filter = this.value
                        cob.graph.filter()
                    }})
                )
        )

        )
    )

    this.cytoscape_options = {
        container : this.params.div.find('.cy')[0],    
        // General Options 
        minZoom: 1e-50,
        maxZoom: 1e50,
        zoomingEnabled: true,
        userZoomingEnabled: true,
        panningEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        selectionType: 'single',
        touchTapThreshold: 8,
        desktopTapThreshold: 4,
        autolock: false,
        autoungrabify: false,
        autounselectify: false,

        // rendering options:
        headless: false,
        styleEnabled: true,
        hideEdgesOnViewport: false,
        hideLabelsOnViewport: false,
        textureOnViewport: false,
        motionBlur: false,
        motionBlurOpacity: 0.2,
        wheelSensitivity: 1,
        pixelRatio: 1,
        initrender: function(evt){ /* ... */ },
        renderer: { /* ... */ },
        // Style
        style: cytoscape.stylesheet()
            .selector('node')
            .css({
                'background-color': '#144566',
                'border-width': 1,
                'border-color': '#000',
                'height' : 'mapData(locality,0,1,10,20)',
                'width'  : 'mapData(locality,0,1,10,20)',
                'content': 'data(id)',
                'text-halign': 'right',
                'font-size' : '12pt',
                'min-zoomed-font-size': 1
            })
            .selector('.snp').css({
                'width' : 20,
                'height' : 20,
                'background-color':'#E0E0E0',
                'text-halign':'center'
            })
            .selector(':selected')
            .css({
                'border-width': 7,
                'border-color': '#09BA00'
            })
            .selector('.neighbors')
            .css({
                'border-width': 7,
                'border-color': '#BA0900'
            })
            .selector('.highlighted')
            .css({
                'border-width': 7,
                'border-color': '#0900BA'
            })
            .selector('edge')
            .css({
                'opacity': '0.50',
                'width': 'mapData(score, 3, 7, 1, 20)',
                'curve-style': 'haystack' // fast edges!
            }),
        // Layout Algorithm
        layout: { 
              name: 'concentric',
              fit: true, // whether to fit the viewport to the graph
              padding: 10, // the padding on fit
              startAngle: 3/2 * Math.PI, // where nodes start in radians
              sweep: undefined, // how many radians should be between the first and last node (defaults to full circle)
              clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
              equidistant: true, // whether levels have an equal radial distance betwen them, may cause bounding box overflow
              minNodeSpacing: 10, // min spacing between outside of nodes (used for radius adjustment)
              boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
              avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
              height: 100, // height of layout area (overrides container height)
              width: 100, // width of layout area (overrides container width)
              concentric: function(node){ // returns numeric value for each node, placing higher nodes in levels towards the centre
                return node.degree();
              },
              levelWidth: function(nodes){ // the variation of concentric values in each level
                return nodes.maxDegree() / 4;
              },
              animate: false, // whether to transition the node positions
              animationDuration: 500, // duration of animation in ms if enabled
              animationEasing: undefined, // easing of animation if enabled
              ready: function(){console.log('Concentric layout ready.')}, // callback on layoutready
              stop: function(){console.log('Concentric layout stop.')} // callback on layoutstop
        },
        ready : function(){
            console.log('Cytoscape Web, ready to rock!')
        }
    }
    // filter values need to be stored in the graph object because
    // interface programming sucks.
    this.filter = function(){
        try{
            this.rem_edges.restore() 
            this.rem_nodes.restore()
            this.rem_con_edges.restore()
        }
        catch(e){
            if(e instanceof TypeError){}
        }
        // Get the edges under the filter
        this.rem_edges = this.cy.collection('edge[score <  '+this.edge_filter+']').remove()
        var nodes = this.cy.collection('node[[degree < '+this.node_filter+']]')
        this.rem_con_edges = nodes.connectedEdges().remove()
        this.rem_nodes = nodes.remove()
    }

    this.load = function(json){
        /* Loads a JSON object into a cytoscape thingie and then makes it */     
        this.cy = cytoscape(
            $.extend({},cob.graph.cytoscape_options,{'elements':json})
        )
    }

}
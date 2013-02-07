

function HeatMap(){

}

HeatMap.prototpe.get_data(node_ids){
    // node ids is an array of graph nodes
    
}

HeatMap.prototype.render_heatmap = function(data){
    /* Convert from tabular format to array of objects. */
    var cols = data.shift();
    data = data.map(function(d) pv.dict(cols, function() d[this.index]));
    cols.shift();
    /* The color scale uses noniles per dimension. */
    var fill = pv.dict(cols, function(f) pv.Scale.quantile()
        .quantiles(9)
        .domain(data.map(function(d) d[f]))
        .range("#dee", "steelblue"));
    
    /* The cell dimensions. */
    var w = 24, h = 13;
    
    var vis = new pv.Panel()
        .width(cols.length * w)
        .height(data.length * h)
        .top(30.5)
        .left(100.5)
        .right(.5)
        .bottom(.5);
    
    vis.add(pv.Panel)
        .data(cols)
        .left(function() this.index * w)
        .width(w)
        .add(pv.Panel)
        .data(data)
        .top(function() this.index * h)
        .height(h)
        .strokeStyle("white")
        .lineWidth(1)
        .fillStyle(function(d, f) fill[f](d[f]))
        .title(function(d, f) d.Name + "'s " + f + ": " + d[f]);
    
    vis.add(pv.Label)
        .data(cols)
        .left(function() this.index * w + w / 2)
        .top(0)
        .textAngle(-Math.PI / 2)
        .textBaseline("middle");
    
    vis.add(pv.Label)
        .data(data)
        .left(0)
        .top(function() this.index * h + h / 2)
        .textAlign("right")
        .textBaseline("middle")
        .text(function(d) d.Name);
    
    return vis.render();
}

function Table(div){
    this.div = div;
    this.table = document.createElement("table");
    this.table.innerHTML = "<tbody></tbody>";
    this.table.header = this.table.createTHead().insertRow(0);
    this.table.body   = this.table.tBodies[0];
    this.div.appendChild(this.table);
}

Table.prototype.show = function(){
    this.div.style.height = "100%";
    this.div.style.visibility = 'visible';
    $('cytoscapeweb').style.height="0%";
}
Table.prototype.hide=function(){
    this.div.style.height="0%";
    this.div.style.visibility="hidden";
    $('cytoscapeweb').style.height="100%";
}
Table.prototype.show_half = function(){
    this.div.style.height="50%";
    $('cytoscapeweb').style.height="50%";
    this.div.style.visibility="visible";
}
Table.prototype.toggle_visibility = function(){
    if(this.div.style.height == "0%" || this.div.style.height==""){
        this.show();
    } 
    else if(this.div.style.height == "100%"){
        this.show_half();
    }
    else if(this.div.style.height == '50%'){
        this.hide();
    }
    else{
        this.hide();
    }
}
Table.prototype.add_column = function(columnModel){
    // skip if tbl is not set in NetworkModel
    if(columnModel.tbl == undefined)
        return 0
    // add a column to the end
    var header = this.table.header.insertCell(-1);
    // insert the header information
    header.innerHTML = columnModel.tbl;
    // preserve the schema information
    header.schema = columnModel.name;
}
Table.prototype.add_row = function(rowModel){
    var row = this.table.tBodies[0].insertRow(-1);
    if(this.table.tBodies[0].rows.length%2==0){
        row.setAttribute("class","even")
    }
    else{
        row.setAttribute("class","odd")
    }
    // set up click events on table row
    row.onclick = Table.show_row_details;
    var header_values = this.table.header.cells;
    for(var i = 0; i < header_values.length; i++){
        var cell = row.insertCell(-1)
        if(rowModel[header_values[i].schema] == undefined){
            cell.innerHTML = "--";
        }
        else{
            cell.innerHTML = rowModel[header_values[i].schema];
        }
    } 
}
Table.prototype.import_network = function(networkModel){
    var cols = networkModel.dataSchema.nodes;
    for(var i=0; i<cols.length; i++){
        this.add_column(cols[i]);
    }
    var nodes = networkModel.data["all_nodes"];
    nodes.sort(function(a,b){return (b.render == 'yes' ? 1:0) - (a. render=='yes'?1:0)})
    for(var i=0; i<nodes.length; i++){
        this.add_row(nodes[i])
    }
}
Table.prototype.clear_rows = function(){
    this.table.body.innerHTML = '';
}
Table.prototype.clear_table = function(){
    this.div.innerHTML='';
    this.table = document.createElement("table");
    this.table.innerHTML = "<tbody></tbody>";
    this.table.header = this.table.createTHead().insertRow(0);
    this.table.body   = this.table.tBodies[0];
    this.div.appendChild(this.table);
}

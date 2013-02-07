
/*Contructor for the box term box that gets used in the gene_details menu*/
var go_term_box = function(go_info){
    this.container = new div("go_term_box");
    this.header = new div("go_term_header_info");
    this.header.appendChild(new Span(go_info[0]+":",'go_title'));
    var name = new div("go_text");
    name.innerHTML = go_info[1];
    this.container.appendChild(this.header);
    this.container.appendChild(name);
    // add the collapsed information
    this.collapsed = new div("go_term_collapsed_info"); 
    this.collapsed.appendChild(new Span("Desc:",'go_title_content'));
    this.collapsed.appendChild(new Span(go_info[2],'go_text_content'));
    
    this.collapsed.appendChild(new Span("Space:",'go_title_content'));
    this.collapsed.appendChild(new Span(go_info[3],'go_text_content'));
    this.container.appendChild(this.collapsed);
    this.show_toggle = new div("show_toggle");
    this.show_toggle.innerHTML = "more >>";
    var caller = this;
    this.show_toggle.onclick = function(){
        caller.toggle_details.apply(caller);
    }
    this.container.appendChild(this.show_toggle);
    return this.container;
}
go_term_box.prototype.toggle_details = function(){
    if(this.collapsed.offsetHeight == '0'){
        this.collapsed.style.height = 'auto';
        this.show_toggle.innerHTML = "<< less";
    }
    else{
        this.collapsed.style.height = '0px';
        this.show_toggle.innerHTML = "more >>";
    }
}


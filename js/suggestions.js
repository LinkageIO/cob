/***
   The suggestion is an class that suggests the gene names based on user input and what is available  
    in the database. It uses Ajax to pass the arguments to the server and back

***/
/***THIS IS FOR THE MAIN PAGE SUGGESTION BOX ***/
function searchBoxSuggest(inputbox, suggestbox){
    this.input = inputbox;
    this.suggest = suggestbox;
    this.submit = this.input.nextElementSibling;
    this.collapsed = true;
    this.highlighted = 'Genotype';
    // This is the index of the highlighted result gained
    // through the down and up arrow 
    this.highlighted_result_index = undefined;
    /*attach events to the input box*/  
    var caller = this; 
    /*Register all the events for the suggestion box*/
    if(document.addEventListener){
        this.input.addEventListener("keyup", function(e){caller.check.apply(caller,[e])}, true);
        this.input.addEventListener("mouseup",
            function(e){
                caller.check.apply(caller,[e]);
                e.stopPropagation();
            },true
        );
        this.suggest.addEventListener("mouseup",
            function(e){
                caller.suggest.focus();
                caller.highlight_suggestion.apply(caller,[e]);
                e.stopPropagation()
            },true
        );
        this.submit.addEventListener("mouseup", function(e){caller.submit.apply(caller,[])}, true);
        this.suggest.addEventListener("keypress" , function(e){caller.highlight_suggestion.apply(caller,[e])},false);
    }
    else if (document.attachEvent){
        this.input.attachEvent("onkeyup", function(e){caller.check.apply(caller,[e])});
        this.input.attachEvent("onmousedown", function(e){caller.check.apply(caller,[e])});
        this.suggest.attachEvent("onmouseup",function(e){e.stopPropagation()});
        this.submit.addEventListener("onmouseup", function(e){caller.submit.apply(caller,[])});
        this.suggest.attachEvent("onkeypress",function(e){caller.highlight_suggestion.apply(caller,[e])});
    }
    else{}


    this.submit = function(){
        this.hide();
        if(this.input.value != ''){
            graph.seed(this.input.value,this.highlighted);
        }
        else{
            new Message('Try entering a gene in the searchbox!');
        }
        $('query_genes').value = this.input.value;
        // Send an index of the select menu to show what source was queried
        var db_source_map = {'Maize':4,'Teosinte':5,'Genotype':1,'Developmental':2};
        $('database_source').selectedIndex = db_source_map[this.highlighted];
    }

    this.check = function(e) {
        if(e.keyCode == 13) {
            this.submit();
            return; // dont process the enter key
        }
        // If the key is the down arrow, transfer
        // control to the suggestion div.
        else if(e.keyCode == 40){
                this.suggest.focus();
            return this.highlight_suggestion();
        }
        var value = this.input.value;
        value = value.replace(/\s+/g, '');
	    (value == '') ?  this.show() : this.show();
        var msg_str = graph.ajax.obj_to_post({
                'action' : 'searchBoxSuggest',
                'query'  : value,
        });
        var respond_check = function(response){
            try{response = eval('('+response+')')}catch(e){throw new Error(e)}
            /*Clear the old stuff*/
            var old_genes = this.suggest.children;
            while(this.suggest.children.length != 0){
                this.suggest.removeChild(this.suggest.firstChild);
                // reset the highlighted index to 
                this.highlighted_result_index = undefined;
            }
            var genes = response.gene_options.split(',');
            for(var i=0;i<genes.length;i++){
                this.add_result({'gene':genes[i],'score':''});
            }
        }
        var caller = this;
        graph.ajax.snd_msg(
            msg_str,
            function(response){respond_check.apply(caller,[response])}
        );
    }
    this.toggle_show = function(){
        this.collapsed ? this.show() : this.hide();
    }
    this.show = function(){
        if(this.collapsed == false ) return;
        // left and top
        var div = this.suggest;
        this.collapsed = false;
        this.suggest.style.visibility = 'visible';
        var offsets = findPos(div);
        var max_height = (window.innerHeight - offsets[1] - 90);
        var new_height = 0;
        // dont step on your toes
        if(window.suggest_collapse){
            clearInterval(window.suggest_collapse);
        }
        window.suggest_collapse = setInterval(function(){
            if(div.offsetHeight < max_height - 5){
                new_height += parseInt(.5*(max_height-div.offsetHeight));
            }
            else{
                if(div.offsetHeight != max_height) new_height += 1;
                else clearInterval(window.suggest_collapse);
            } 
            div.style.height = new_height.toString() + 'px';
            caller.suggest.scrollTop = 0;
        },50);
        var caller = this;
        if(document.addEventListener){
             // grab the event on the bubbling stage
             document.addEventListener('mouseup',function(e){caller.hide.apply(caller,[])},false);
        }
        else if(document.attachEvent){
             document.attachEvent("onmouseup",function(e){caller.hide.apply(caller,[])});
        }
        else{}
        // Need to do this after we add everything
    }
    this.hide = function(){
        // left and top
        var div = this.suggest;
        this.collapsed = true;
        var offsets = findPos(div);
        var min_height = 0;
        var new_height = div.offsetHeight;
        // dont step on your toes
        if(window.suggest_collapse){
            clearInterval(window.suggest_collapse);
        }
        window.suggest_collapse = setInterval(function(){
            if(div.offsetHeight > 5){
                new_height -= parseInt(.5*(div.offsetHeight));
            }
            else{
                if(div.offsetHeight > 1) new_height -= 1;
                else {
                    div.style.visibility = 'hidden';
                    clearInterval(window.suggest_collapse);
                }
            } 
            div.style.height = new_height.toString() + 'px';
        },50);
        var caller = this;
        if(document.removeEventListener){
             document.removeEventListener('mousedown',function(e){caller.hide.apply(caller,[])},true);
        }
        else if(document.detachEvent){
             document.detachEvent("onmousedown",function(e){caller.hide.apply(caller,[])});
        }
        else{}
    }
    this.highlight = function(name){
        this.highlighted = name;
        var cursor = $('searchBoxHighlight');
        var new_left = 23;
        var new_width = 106;
        var current_left = cursor.offsetLeft;
        if(this.highlighted == 'Maize'){new_left = 197; new_width=59;} 
        else if(this.highlighted == 'Teosinte'){new_left = 260;new_width=59;} 
        else if(this.highlighted == 'Genotype'){new_left = 23;new_width=75;} 
        else if(this.highlighted == 'Developmental'){new_left = 101; new_width=96;}
        //animate
        if(window.searchBoxHighlight){clearInterval(window.searchBoxHighlight);} 
        if(new_left > current_left){
        window.searchBoxHighlight = setInterval(function(){
            if(new_left-current_left > 3 ){
                    current_left += parseInt(.5*(new_left-current_left))
            }
            else{
                if(new_left-current_left != 0){
                    current_left += 1;
                }
                else{
                    clearInterval(window.searchBoxHighlight);
                }
            }
            cursor.style.left = current_left.toString() + 'px';
            cursor.style.width = new_width.toString() + 'px';
        },50);
        }
        /* Here we are growing */
        else{
            window.searchBoxHighlight = setInterval(function(){
                if(current_left - new_left > 3 ){
                        current_left -= parseInt(.5*(current_left-new_left))
                }
                else{
                    if(current_left-new_left != 0){
                        current_left -= 1;
                    }
                    else{
                        clearInterval(window.searchBoxHighlight);
                    }
                }
                cursor.style.left = current_left.toString() + 'px';
                cursor.style.width = new_width.toString() + 'px';
            },50);
        }
    }
    this.add_result = function(obj){
        var result = new suggestionDiv(obj.gene,obj.score);
        this.suggest.appendChild(result);
    }

    function suggestionDiv(gene_name, gene_scores){
        var container = document.createElement("div");
        container.setAttribute('class','searchboxResult');
        var name = document.createElement("span");
        var scores = document.createElement("span");
        name.innerHTML = gene_name;
        scores.innerHTML = gene_scores;
        container.appendChild(name);
        container.appendChild(scores);
        container.addEventListener("mousedown",
                    function(event){
                        var query = $('searchboxInput');
                        if(query.value.match(/,/)){
                            query.value = query.value.replace(/,[^,]*$/,  "," + gene_name + ',');
                        }
                        else{
                            query.value = gene_name + ',';
                        }
                        event.stopPropagation();
                    },true);
         return container;
    }
    this.highlight_suggestion = function(e){
        if(this.highlighted_result_index == undefined){
            this.suggest.children[0].setAttribute("class", 'searchboxResult highlighted');
            this.highlighted_result_index = 0;
        }
        else{
            //check if keycode was a down
            if(e.keyCode == 40){
                // check if we are at teh end
                if(this.highlighted_result_index < this.suggest.children.length -1){
                    this.suggest.children[this.highlighted_result_index].setAttribute(
                        'class', 'searchboxResult'
                    );
                    this.highlighted_result_index++;
                    this.suggest.children[this.highlighted_result_index].setAttribute(
                        "class", 'searchboxResult highlighted'
                    );
                    this.suggest.scrollTop += 22;
                }
            }
            // check if the keycode was an up
            else if(e.keyCode == 38){
                // check if we are at teh end
                if(this.highlighted_result_index > 0){
                    this.suggest.children[this.highlighted_result_index].setAttribute(
                        'class', 'searchboxResult'
                    );
                    this.highlighted_result_index--;
                    this.suggest.children[this.highlighted_result_index].setAttribute(
                        "class", 'searchboxResult highlighted'
                    );
                    this.suggest.scrollTop -= 22;
                }
                else{
                    this.input.focus();
                }
            }
            // If it is an enter, add it to the query box
            else if(e.keyCode == 13){
                // This is bound to break......
                var gene = this.suggest.children[this.highlighted_result_index].children[0].innerHTML;
                var query = $('searchboxInput');
                if(query.value.match(/,/)){
                    query.value = query.value.replace(/,[^,]*$/, ","+gene+',');
                }
                else{
                    query.value = gene + ','
                }
                e.stopPropagation();
            }
        }
        if(e)
        e.stopPropagation();
    }
}


/*
 *  This is the suggestion mechanism for the secondary query box 
 *
 */
function Suggest(input,list){

    this.input = input;
    this.list = list;

   /*register the keycode events for the autocomplete div*/
    this.suggestionHandle = function(e){
        var t = this.replaceValue;
        if(e.keyCode == 13){
            var list = $('autocomplete');
            suggestion.replaceValue(list.options[list.selectedIndex].value);
            $('query_genes').focus();
        }
    } 
    
    this.showSuggestions = function(){
        var caller = this;
        this.input.style.visibility = 'visible';
        if(document.addEventListener){
             document.addEventListener('mouseup',function(e){caller.hideSuggestions.apply(caller,[])},false);
             this.input.addEventListener("keyup",this.suggestionHandle,true);
        }
        else if(document.attachEvent){
             document.attachEvent("onmouseup",function(e){caller.hideSuggestions.apply(caller,[])});
             this.input.attachEvent("onkeyup",this.suggestionHandle);
        }
        else{}
    }
    this.hideSuggestions = function(){
        this.input.style.visibility = 'hidden';
        if(document.removeEventListener){
             document.removeEventListener('mouseup',function(e){caller.hideSuggestions.apply(caller,[])},false);
             this.input.removeEventListener("keyup",this.suggestionHandle,true);
        }
        else if(document.detachEvent){
             document.detachEvent("onmouseup",function(e){caller.hideSuggestions.apply(caller,[])});
        }
        else{}

    }

    this.addCheck = function(value,event){
        /* If we hit enter we want to submit the form*/
	    /*	the cache(dictionary) is full, so add to the begin and dump from the end*/
	    if(value.match(/[^,]+$/) != '' &&  value.match(/[^,]+$/) != $('autocomplete').options[0].value){
	        this.showSuggestions();
        }
	    else{
		    this.hideSuggestions();
	    }
	    if(event.keyCode == 13){
		    $('query_submit').click();
		    return;
	    }
        if(event.keyCode == 40){
            $('autocomplete').focus();
        }
	    var temp = value;
	    /*Grab only after the last comma*/
	    if(temp.match(/,([^,]+$)/)){
		    var str = RegExp.$1.toString();
		    str = str.replace(/\s+/g,'');
		    if(str != ""){
			    temp = str;
		    }
	    }
	    this.display_suggestions(temp);
    }

    this.display_suggestions = function(value){
        var output = "";
        var msg_string = graph.ajax.obj_to_post({
                            'action':'gene_suggest',
                            'request' : value.toString()
                            });
        /* Send the request for the seed and then respond with appropriate function */
        replaceValue_a = this.replaceValue;
        graph.ajax.snd_msg(msg_string,
            function(answer){
                var results = eval('(' + answer + ')');
                var gene_options = results['gene_options'];
                if(gene_options === undefined){
                    return;
                }
                else{
                    /*clear the autocomplete*/
                    var sel = document.getElementById('autocomplete');
                    if(sel.hasChildNodes()){
                        while(sel.childNodes.length >= 1){
                            sel.removeChild(sel.firstChild);
                        }
                    }
                    gene_options = gene_options.split(',');
                    for(gene in gene_options){
                        var opt = sel.options;
                        var sgene = new Option(gene_options[gene],gene_options[gene]);
                        sgene.addEventListener("mousedown",
                                    function(event){
                                        replaceValue_a(this.value);
                                        event.stopPropagation();
                                    },
                                    true);
                        opt[opt.length] = sgene;
                    }
                    sel.addEventListener("mouseup",
                        function(event){
                            event.stopPropagation();
                        },
                    true);
                }
            }
        );
    }
    this.replaceValue = function(complete_text){
        var query = $('query_genes');
        if(query.value.match(/,/)){
            query.value = query.value.replace(/,[^,]*$/,  "," + complete_text + ',');
        }
        else{
            query.value = complete_text + ',';
        }
    }
}//End class



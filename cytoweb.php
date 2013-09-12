<?php

/** TODO
	==> Hook events up to ajax calls and callbacks
	==> split double common names in database up into
		single names with many to one relationship
	==> check cross browser compatibility
*/



/*
	This is the main control loop for the program
	each function will know if further inception is needed
	must go deeeeper.....
*/

function custom_error_handler($errno, $errstr,$errfile,$errline){
	echo "BIG ERROR\n";
	echo "$errno:$errstr:on line $errline\n";
	exit;
}

set_error_handler("custom_error_handler");


error_reporting(E_ALL ^ E_NOTICE);

$c = new cytoweb();
/* Execute the request using the dispatch table */
$c->take_action();
/*This should be the only place in the program you see 'echo'*/
echo $c->return_request();


/* cytoweb class*/

class cytoweb{
	// The hash we add to and will return
	var $JSON_out = array();
	var $ok_query;

	/*Just set up the database connection*/
	/* THIS CODE GETS EXECUTED EVERYTIME WE CREATE A NEW OBJECT*/
	function cytoweb(){
		$this->dbase = chop(file_get_contents("./sensitive/db_dbase.txt"));
		$this->host = chop(file_get_contents("./sensitive/db_host.txt"));
		$this->usr = chop(file_get_contents("./sensitive/db_user.txt"));
		$this->pwd = chop(file_get_contents("./sensitive/db_password.txt"));
		$this->con = mysql_connect($this->host,$this->usr,$this->pwd);
		if (!$this->con){
		    die('Could not connect: ' . mysql_error());
		}
		if(!mysql_select_db($this->dbase, $this->con)){
			die( "Could not select $this->dbase");
		}
	}
	/* -- Rob
	This function is a private inside query function that makes it easy
	  to make a database call, also protects against SQL injection.... I think*/
	private function _make_query($query, $params=false){
			if ($params) {
					foreach ($params as &$v) {
							$v = mysql_real_escape_string($v);
					}
					$query = str_replace("%","%%",$query);
					$sql_query = vsprintf( str_replace("?","%s",$query), $params );
					$this->ok_query = mysql_query($sql_query, $this->con);
			}
			else {
					$this->ok_query = mysql_query($query, $this->con);
			}
			return $this->ok_query;
	}
    /*  -- Rob 
        this guy executes a function on each row of a query    
    */
    private function _do_row($fnct){
        if(!$this->ok_query){
            $this->_error('database failure');
        }
        else{
            while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                $fnct($row);
            }
        }
    }
    /* -- Rob 
    This executes a dispatch table on the post variable 'action'*/
    public function take_action(){
		try{
		    $action = $_POST['action'];
	        $this->$action($_POST);
		}
		catch(Exception $e){
		    $this->_error('failed to take action');	
		}
	}
	/*-- Rob */
	private function _error($msg){
        $this->JSON_out = array();
		    $this->add_json('action','error');
		    $this->add_json('err_msg',$msg);
        echo $this->return_request();
        exit;
	}

    /* -- Rob 
        Send a message for feeback to an email address    
    */
    public function feedback($hash){
        $body = $hash['body'];
        $header = "From: schaefer";
        $to = 'schae234+maizenet@gmail.com';
        $subject = "COB Feeback";
        $dealt = mail($to,$subject,$body,$header);
        if($dealt){$this->add_json('ok','ok');}
    } 
	/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/
	/*!!!!!!! ALL FUNCTION ARE RESPONSIBLE FOR SANITATION!!!!!!!*/
	/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/
	/* -- Rob
	This function simply returns the JSON object we built up*/
	public function return_request(){
		return json_encode($this->JSON_out);	
	}
	/* -- Rob
	This gets the gene id from either the common or GRMZ name */
	private function _get_gene_id($name){
		$this->_make_query("SELECT common_id FROM mzn_gene_common WHERE common_name = '?'", array($name));
		if(mysql_num_rows($this->ok_query) == 0){
			/*try a non common name*/
			$this->_make_query("SELECT gene_id FROM mzn_gene_name WHERE gene_name = '?'",array($name));
			if(mysql_num_rows($this->ok_query) == 0){
				return false;
			}
			else{
				$row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
				return $row['gene_id'];
			}
		}
		else{
			$row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
			return $row['common_id'];
		}
	}
	/* -- Rob
	This gets the GRMZ name from the id if it exists*/
	private function _get_name_from_id($id){
		$this->_make_query("SELECT gene_name FROM mzn_gene_name WHERE gene_id = ?", array($id));
		$row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
		return $row['gene_name'];
	}
	/* -- Rob
	Gets a common name from a gene id if it exists*/
	private function _get_common_from_id($id){
		$this->_make_query("SELECT gene_name FROM mzn_gene_common WHERE common_id = ?", array($id));
		$row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
		return $row['common_name'];
	}
    /* -- Rob
        Return a set of all nodes with coordinates
    */
    public function atlas($hash){
     	$this->add_json('xml',
           '<graphml><key id="label" for="all" attr.name="label" attr.type="string"/>
            <key id="common" for="node" attr.name="common" attr.type="string" />
            <key id="default" for="node" attr.name="default" attr.type="string" />
            <key id="GRMZ" for="node" attr.name="GRMZ" attr.type="string" />
            <key id="loci" for="node" attr.name="loci" attr.type="string" />
            <key id="arab" for="node" attr.name="arab" attr.type="string" />
            <key id="arab_short" for="node" attr.name="arab_short" attr.type="string" />
		    <key id="weight" for="edge" attr.name="weight" attr.type="number"/>
		    <graph edgedefault="undirected">'
        );
       $this->_make_query("SELECT name.gene_id, gene_name, common_name, x, y FROM mzn_gene_name name
                          LEFT OUTER JOIN mzn_gene_common ON common_id = name.gene_id
                          LEFT OUTER JOIN mzn_gene_coordinates on mzn_gene_coordinates.gene_id = name.gene_id
                          WHERE ? IS NOT NULL", array("x"));
       while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            $label = $row['common_name'] == '' ? $row['gene_name'] : $row['common_name'];
	        $this->add_json('xml',"<node id='{$row['gene_id']}'>"
               ."<data key='label'>{$label}</data>"
               ."<data key='default'>{$label}</data>"
               ."<data key='common'>{$row['common_name']}</data>"
               ."<data key='GRMZ'>{$row['gene_name']}</data>"
               ."</node>");
            $this->add_json_array(
                array(
                    "id"=> $row['gene_id'],
                    "x" => $row['x'],
                    "y" => $row['y']),'coor'
            );
		}
        $this->add_json('xml',"</graph></graphml>");
        $this->add_json('action',"respond_atlas");
        return true;
    }

	/* -- Rob
	This monster is responsible for taking a set of nodes and returning the xml required to
	build the initial graph*/
	public function seed($hash){
		/*Check for sanity*/
		$query = $hash['q_list'];
		$source = $hash['results_source'];
        $neighborhood_size = $hash['neighborhood_size'] > 65 ? 65 : $hash['neighborhood_size'];
        /* Begin the graph we are going to send back */
        $network_model = array(
            "dataSchema" => array(
                    "nodes" => array(
                            array("name" => "GRMZ", "type" => "string", "tbl"=>"Gramene ID"),
                            array("name" => "id", "type" => "string"),
                            array("name" => "common", "type" => "string","defValue"=>"none","tbl"=>"Common Name"),
                            array("name" => "label","type" => "string"),
                            array("name" => "default", "type" => "string"),
                            array("name" => "loci", "type" => "string","tbl"=>"Locus"),
                            array("name" => "arab", "type" => "string","tbl"=>"Arab Blast"),
                            array("name" => "arab_short", "type" => "string"),
                            array("name" => "render", "type" => "string", "tbl" => "Rendered"),
                        ),
                    "edges" => array(
                            array("name" => "weight", "type" => "string"),
                        ),
                ),
            "data" => array(
                    "nodes" => array(),
                    "all_nodes" => array(),
                    "edges" => array(),
                ),
        );
        /*Choose the correct database to query, let client know which was queried */
		$database = $this->get_database($source);
        $this->add_json('source',$source);
		/*remove the white space and leading/trailing commas, split on commas*/
		$query = preg_replace('/\s+/','',$query);
		$query = preg_replace('/^,|,$/','',$query);
		$query_list = preg_split('/,/',$query);
		/* Loop through the queries and populate a UNIQUE list */
        $query_set = array();
		foreach($query_list as $query_index){
            /*skip empty string*/
            if($query_index == '') continue;
            /*See if the query is a locus range*/
            if(preg_match('/^chr(\d):(\d+)\.\.(\d+)+/',$query_index,$matches) > 0){
                $qtl_gene_ids = $this->get_genes_in_region($matches[0],$matches[1],$matches[2]);
                foreach($qtl_gene_ids as $id){
                    array_push($query_set,$id);
                } 
            }
            else{  /*We have just a regular query*/
                   /*Grab the id for the gene*/
                $id = $this->_get_gene_id($query_index);
                if($id == false) {
                    $this->add_json('no_id',"#".$query_index."#");
                    continue;
                }
                // dont search for ones that we've already seen
                if(!in_array($id,$query_set)){
                    array_push($query_set,$id);
                } 
            }
		}
        if(count($query_set) == 0){
            $this->_error("Your query was absent from the database");
        }
        // scoring neighbors contains which neighbors of the queries are the most connected
        $scoring_neighbors = array();
        /*Compute the seen genes*/
        foreach($query_set as $id){
            // add the query ids so we can color them differently
            $this->add_json('query_names',"#".$id."#");
            // grab neighboring genes and accumulate scores
            $neighborhood = $this->get_gene_neighbors($id,$database);
            // each element has a name and a score
            foreach($neighborhood as $element){
                $neighbor = $element['name']; 
                $score    = $element['score'];
                if(!isset($scoring_neighbors[$neighbor])){
                    $scoring_neighbors[$neighbor] = array(
                        'name' => $neighbor,
                        'score' => $score,
                    );
                }
                else
                    $scoring_neighbors[$neighbor]['score']+= $score;
            }
        }
		function cmp_by_scores($x, $y){
			if($x['score'] == $y['score'])
				return 0;
			elseif($x['score'] < $y['score'])
				return 1;
			else
				return -1;
		}
        // get the ids that have the highest matches
		usort($scoring_neighbors, "cmp_by_scores");
        // sometimes you are more clever than yourself....
		function get_name($a){ return $a['name'];}
		$all_neighbors = array_map('get_name',$scoring_neighbors);
        $this->add_json('total',count($scoring_neighbors));
		$top_neighbors = array_slice($all_neighbors,0,$neighborhood_size);
        /* Query Nodes are ALWAYS included in the top matches*/
		foreach($query_list as $query_index){
            $id = $this->_get_gene_id($query_index);
            if($id != false){
			    array_push($top_neighbors,$id);
                array_push($all_neighbors,$id);
            }
		}
        // Get all the gene info for the queries and the neighbors
        $this->_make_query('SELECT name.gene_id, gene_name, common_name, x, y, chromosome, chromo_start, chromo_end,
                            arab_name
                            FROM mzn_gene_name name
                            LEFT OUTER JOIN mzn_gene_common ON common_id = name.gene_id
                            LEFT OUTER JOIN mzn_gene_coordinates on mzn_gene_coordinates.gene_id = name.gene_id
                            LEFT OUTER JOIN mzn_gene_loci on mzn_gene_loci.gene_id = name.gene_id
                            LEFT OUTER JOIN mzn_arab_orthologs ON mzn_arab_orthologs.gene_id = name.gene_id
                            LEFT OUTER JOIN mzn_arab_gene ON mzn_arab_orthologs.arab_id = mzn_arab_gene.arab_id
                            WHERE name.gene_id IN (?)', array(implode(',',$all_neighbors))
        );
		while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            $label = $row['common_name'] == '' ? $row['gene_name'] : $row['common_name'];
            // check to see if this is a top gene and we need to render it
            if(in_array($row["gene_id"],$top_neighbors)){
                array_push($network_model["data"]["nodes"],
                    array(
                        "id" => $row["gene_id"],
                        "label" => $label,
                        "default" => $label,
                        "common" => $row['common_name'],
                        "GRMZ" => $row['gene_name'],
                        "loci" => $row["chromosome"].":".$row["chromo_start"]."..".$row["chromo_end"],
                        "arab" => $row["arab_name"],
                        "render" => "yes",
                    )
                );
                array_push($network_model["data"]["all_nodes"],
                    array(
                        "id" => $row["gene_id"],
                        "label" => $label,
                        "default" => $label,
                        "common" => $row['common_name'],
                        "GRMZ" => $row['gene_name'],
                        "loci" => $row["chromosome"].":".$row["chromo_start"]."..".$row["chromo_end"],
                        "arab" => $row["arab_name"],
                        "render" => "yes",
                    )
                );
            }
            else{
                array_push($network_model["data"]["all_nodes"],
                    array(
                        "id" => $row["gene_id"],
                        "label" => $label,
                        "default" => $label,
                        "common" => $row['common_name'],
                        "GRMZ" => $row['gene_name'],
                        "loci" => $row["chromosome"].":".$row["chromo_start"]."..".$row["chromo_end"],
                        "arab" => $row["arab_name"],
                        "render" => "no",
                    )
                );
            }
            $this->add_json_array(
                array(
                    "id"=> $row['gene_id'],
                    "x" => $row['x'],
                    "y" => $row['y']),'coor'
            );
		}
		// Now we ALL want the interactions of the top 50 matches
        // EDGES!!!!!!!!!!!!! 
		// This is the algorithm that we talked about in chads office
        $top_m = implode(',',$top_neighbors);
		$this->_make_query('SELECT score, gene_a, gene_b 
						    FROM ?
							WHERE (gene_a IN (?) AND gene_b IN (?))',
							 array($database,$top_m,$top_m)
						);
        // Make a list of seen nodes and edges
		while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            array_push($network_model["data"]["edges"],
                array(
                    "source" => $row['gene_a'],
                    "target" => $row['gene_b'],
                    "weight" => $row['score']
                )
            );
		}
        $this->add_json('nm', $network_model);
		/* Add the respond action */
		$this->add_json('action','respond_seed');
		return true;
	}
    /* -- Rob
    Find all scoring neighbors of a QTL region*/
    function get_genes_in_region($chr,$start,$end){
        $this->_make_query('SELECT gene_id FROM mzn_gene_loci WHERE chromosome = ?
                            AND chromo_start >= ? AND chromo_end <= ?',
                            array($chr,$start,$end)
        );
        // Get all the genes within the chromosome range
        $genes_in_chromosome_range = array();
        if($this->ok_query){
            while($id_row=mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                array_push($genes_in_chromosome_range,$id_row['gene_id']);
            }
        }
        return $genes_in_chromosome_range;
    }
    /* -- Rob
    Returns all the neighbors of a gene*/
    function get_gene_neighbors($gene_id,$database){
        //keep track of scoring neighbors
        $scoring_neighbors = array();
        $this->_make_query('SELECT score, gene_b FROM ?
                            WHERE gene_a = ?',array($database,$gene_id));
        while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            array_push($scoring_neighbors,array(
                'name' => $row['gene_b'],
                'score' => $row['score'])
            );
        }
        $this->_make_query('SELECT score, gene_a FROM ?
                            WHERE gene_b = ?',array($database,$gene_id));
        while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            array_push($scoring_neighbors,array(
                'name' => $row['gene_a'],
                'score' => $row['score'])
            );
        }  
        return $scoring_neighbors; 
    }
	/* -- Rob
	Return a helpful error message*/
	function error_happened($err_msg){
		$this->add_json('action','error');
		$this->add_json('error_msg',$err_msg);
		return true;	
	}
	/* -- Rob
	this adds an item to the JSON that we are going to send back*/
	function add_json($a,$b){
		/*if there is something there, concat it*/
		if(array_key_exists($a,$this->JSON_out)){
			$this->JSON_out[$a] .= $b;
		}
		/* Just assign the value */
		else{
			$this->JSON_out[$a] = $b;
		}
	}
    /* This adds functionality to the json return function
     * You can add things to an array that will get turned into a
     * Javascript object
    */
    function add_json_array($a,$b = false){
        if($b){
            if(!isset($this->JSON_out[$b])){
                $this->JSON_out[$b] = array();
            }
            array_push($this->JSON_out[$b], $a);
        }
        else{
            array_push($this->JSON_out,$a);
        }
    }
	/*  -- Phillipe
	 For sure I will need to change this name ... not now though...
	 immitates the google feature when someone types something in ... 
	*/
	function gene_suggest($hash){
		$request = $hash['request'];
		if(preg_match("/^grmzm/i", $request) || preg_match("/^ac\d+/i", $request)){
			$this->_make_query("SELECT gene_name as g_name FROM
                                 mzn_gene_name WHERE gene_name like '?%' limit 25", array($request));
		}
		else{
			$this->_make_query("SELECT common_name as g_name FROM
                                 mzn_gene_common WHERE common_name like '?%' ORDER BY g_name", array($request));
		}
        if(!$this->ok_query){
				$this->add_json('error','database failure');
		}
        else{
		$genes = array();
		    while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
			    array_push($genes,$row['g_name']);
		    }
		    $this->add_json('gene_options',implode(',',$genes));
        }
	}
	/* -- Phillipe
	Get the loci information for a node */
	function _get_loci($query){
		//$query = $hash['gene_name'];
		//changes go here
		$this->_make_query("SELECT * from mzn_gene_loci WHERE gene_id = '?'", array($query));
		if(!$this->ok_query){
			$this->add_json('error','database failure');
		}
		while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
			$this->add_json('chromosome', $row['chromosome']);
			$this->add_json('chromo_start', $row['chromo_start']);
			$this->add_json('chromo_end', $row['chromo_end']);
			$this->add_json('forward', $row['forward']);
		}
	}
    /*-- Rob */
    private function _get_degree($id,$database){
        $total_degree = 0;
        $this->_make_query("SELECT COUNT(*) AS degree FROM ? WHERE gene_a = ?",array($database,$id));
        if(!$this->ok_query){$this->_error("Database Failure");}
        else{
            while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                $total_degree += $row['degree'];
            }
        }
        $this->_make_query("SELECT COUNT(*) AS degree FROM ? WHERE gene_b = ?",array($database,$id));
        if(!$this->ok_query){$this->_error("Database Failure");}
        else{
            while($row = mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                $total_degree += $row['degree'];
            }
        }
        $this->add_json('degree',$total_degree);
        return 1;
    }
	/*-- Rob */
	private function _get_names($id){
		$this->_make_query("SELECT gene_name, common_name FROM mzn_gene_name
                     LEFT OUTER JOIN mzn_gene_common ON gene_id = common_id
				     WHERE gene_id = ?", array($id));
		if(!$this->ok_query){
			$this->_error('database failure');
		}
		else{
				$row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
				$this->add_json('name', $row['gene_name']);
				$this->add_json('common', $row['common_name']);
		}
		return 1;
	}
    /* _get_arab_desc() -- Rob
     * This gets the arabidopsis Details Information for a node
    */
    private function _get_arab_desc($id){
        $this->_make_query("SELECT arab_name, type_name, short_desc, curator_desc, comp_desc 
            FROM mzn_arab_gene a  
            LEFT OUTER JOIN mzn_arab_gene_types type on a.type_id = type.type_id 
            LEFT OUTER JOIN mzn_arab_short_desc short ON a.short_id = short.short_id 
            LEFT OUTER JOIN mzn_arab_curator_desc cur ON a.curated_id = cur.curator_id 
            LEFT OUTER JOIN mzn_arab_comp_desc comp ON a.comp_id = comp.comp_id
            LEFT OUTER JOIN mzn_arab_orthologs ortho ON a.arab_id = ortho.arab_id 
            WHERE ortho.gene_id = ?",array($id));
        if(!$this->ok_query) {
            $this->_error('database error');
        }
        else{
            // Make sure that the query returned something
            if(mysql_num_rows($this->ok_query) != 0){
                $row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
                foreach($row as $key => $val){
                    $this->add_json($key,$val);
                }
            }
        }
        return 1;
    }
    /* _get_go
     * Even though GO is garbage, give it to them anyways...
    */
    function _get_go($id){
        $this->_make_query("SELECT term_name, term_short_desc,term_long_desc, space_desc
                            FROM mzn_gene_go_terms 
                            LEFT OUTER JOIN mzn_go_terms ON go_id = term_id
                            LEFT OUTER JOIN mzn_go_space ON space_id = term_space
                            WHERE gene_id = ? ORDER BY space_desc",array($id));
        if($this->ok_query){
            if(mysql_num_rows($this->ok_query)==0){
                $this->add_json('go','none');
            }
            else{
                while( $row = mysql_fetch_array($this->ok_query, MYSQL_NUM)){
                    $this->add_json_array(join('##',$row),"go");
                }
            }
        }
    }
    function get_database($source){
        if($source == 'Genotype'){return 'mzn_combined_pea_coef';}
        elseif($source == 'Developmental'){return 'mzn_devel_pea_coef';}
        elseif($source == 'Maize'){return 'mzn_maize_pea_coef';}
        elseif($source == 'Teosinte'){return 'mzn_teosinte_pea_coef';}
    } 
	/*  -- Rob
		We are going to need to change these so they all have IDs
	*/
	function get_node_details($hash){
   		$node_id = $hash['node'];
        $database = $this->get_database($hash['source']);
		$this->add_json('action','respond_get_node_details');
		$this->_get_names($node_id);
        $this->_get_go($node_id);
		$this->_get_loci($node_id);
        $this->_get_arab_desc($node_id);
        $this->_get_degree($node_id,$database);
        $this->add_json('id',$node_id);
	}
    /* -- Rob
        Gets all the neighboring genes from a certain loci
    */
    function get_all_loci($hash){
        $chr = $hash['chromosome'];
        $loci = $hash['loci'];
        $range = $hash['range'];
        if($loci < $range/2){
            $start = 1;
        }
        else{
            $start = (int)($loci - $range/2);
        }
        $end = (int)($loci + $range/2);
        $query = "SELECT mzn_gene_loci.gene_id as id, chromo_start as start , chromo_end as end,
                  forward, gene_name, common_name as common 
                  FROM mzn_gene_loci LEFT OUTER JOIN mzn_gene_name ON mzn_gene_name.gene_id = mzn_gene_loci.gene_id
                  LEFT OUTER JOIN mzn_gene_common ON mzn_gene_common.common_id = mzn_gene_loci.gene_id
                  WHERE chromosome = ? AND chromo_start > ? AND chromo_end < ?";
        $this->_make_query($query, array($chr,$start,$end));
		if(!$this->ok_query){
			$this->_error('database failure');
		}
		else{
            $genes = array();
			while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                $g = array("name"    => $row['gene_name'],
                               "id"      => $row['id'],
                               "common"  => $row['common'],
                               "start"   => $row['start'],
                               "end"     => $row['end'],
                               "forward" => $row['forward']
                                );
                array_push($genes,$g);
            }
            $this->JSON_out = json_encode($genes);
		}
    }
    function loci_filter($hash){
        /*We need to untaint the ranges in the loci*/
        $loci = json_decode($hash['loci']);
        $nodes = $hash['nodes'];
        $genes = array();
            $query = "SELECT gene_id as id FROM mzn_gene_loci 
                      WHERE chromosome = ? AND chromo_start > ? AND chromo_end < ?
                      AND gene_id IN ( ? )";
            $this->_make_query($query,array($loci[0],$loci[1],$loci[2],$nodes));
            if(!$this->ok_query){
                $this->_error('database failure'.mysql_error());
            }
            else{
              while($row=mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                  array_push($genes,intval($row['id']));
              }
            }
        $this->JSON_out = json_encode($genes);
    }


    private function binom($n,$k){
        if($k < 0 || $k > $n){ return 0; }
        if($k > $n-$k){$k = $n - $k;}
        $c = 1.0;
        for($i = 1; $i <= $k; $i++){
            $c = $c * ($n - ($k-$i));
            $c = floor($c / $i);
        }
        return $c;
    }
    // Based on the wikipedia definition for hypergeometric dist
    // k : # of white marbles drawn
    // n : # marbles draws w/o replacement
    // K : number of white marbles
    // N : total marbles in urn
    private function pmf_hypergeometric($k,$N,$K,$n){
        $p = ($this->binom($K,$k)*$this->binom($N-$K,$n-$k))/$this->binom($N,$n); 
        return $p;
    }
    // Function calculated P(X >= k) 
    private function cdf_hypergeometric($k,$N,$K,$n){
        $cdf = 0;
        // We want P(X>=k)
        foreach(range(0,$k-1) as $j){
            $p = $this->pmf_hypergeometric($k,$N,$K,$n);
            if(!is_nan($p)){$cdf += $p;}
        } 
        return 1-$cdf;
    } 

    private function GO_enrichment($hash){
        $total_genes = 25288; // TAKEN FROM THE DATABASE (Number of genes that have GO annotations)
        $go_term_count_in_network = array();
        $go_term_count_total = array();
        // Grab the input gene list
        $input_gene_ids       = $hash["genes"];
        $input_gene_ids_array = explode(',',$input_gene_ids);
        $input_gene_ids_count = count($input_gene_ids_array);
        // Get the unique GO terms for the input ids and their responsible gene ids
        $this->_make_query("SELECT go_id, gene_id FROM mzn_gene_go_terms
                            WHERE gene_id IN (?)",array($input_gene_ids));
        if($this->ok_query){
            while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                // data structure is a hash of arrays, the key being the go term
                // and the value being the ids that generated it.
                if(!isset($go_term_count_in_network[$row['go_id']])){
                    $go_term_count_in_network[$row['go_id']] = array();
                }
                array_push($go_term_count_in_network[$row['go_id']],$row['gene_id']);
            } 
        }
        else{
            $this->_error('database failure');
            exit;
        }
        // Get the number of times each GO term is seen total
        $this->_make_query("SELECT go_id, COUNT(gene_id) as count
                            FROM mzn_gene_go_terms
                            WHERE go_id IN (?) GROUP BY go_id",array(implode(',',array_keys($go_term_count_in_network))));
        if($this->ok_query){
            while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
                   // put the count into the go term count total array
                    $go_term_count_total[$row["go_id"]] = $row["count"];
            } 
        }
        else{
            $this->_error('database failure');
            exit;
        }
        // for each go group, get intersection of the go genes
        // Grab each index
        foreach($go_term_count_in_network as $go_term_id => $gene_id_array ){
            //continue if only one GO gene
            if(count($gene_id_array) <=  1){
                continue;
            }
            //calculate the hypergeometric function
            $pval = $this->pmf_hypergeometric(count($gene_id_array)-1, $total_genes, $go_term_count_total[$go_term_id],$input_gene_ids_count);
            $common_genes = array();
            $go_id = '';
            $go_desc = '';
            if(($pval) < .05  || 1){
                $this->_make_query("SELECT term_name, term_short_desc, term_long_desc, term_space
                            FROM mzn_go_terms WHERE term_id = ?",
                            array($go_term_id)
                );
                if($this->ok_query){
                    // get the information for the significant go terms
                    while($row = mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                        $go_id = $row['term_name'];
                        $go_desc = $row['term_long_desc'];
                        $go_short = $row['term_short_desc'];
                        $go_space = $row['term_space'];
                    }
                }
                else{$this->_error('Bad Query'); exit;}
                $this->add_json_array(
                                    array(    'pval'      => sprintf("%.5f",(1-$pval)),
                                              'common'    => count($gene_id_array),
                                              'total'     => $go_term_count_total[$go_term_id],
                                              'go_id'     => $go_id,
                                              'desc'      => $go_desc,
                                              'name'      => $go_short,
                                              'space'     => $go_space,
                                              'common_ids'=> join(',',$go_term_count_in_network[$go_term_id])
                                    ),
                                    "annot"
                 );
            }
        }
        // Add some extra information for the statistics
        $this->add_json("total_genes",$total_genes);
    }
    /* get_label_loci -- Rob
    *  This function returns the loci for each node
    */
    private function get_labels($hash){
        $nodes = $hash['nodes'];
        if($hash['type'] == 'loci'){
            $this->_make_query("SELECT gene_id, chromosome, chromo_start, chromo_end, forward FROM
                                mzn_gene_loci WHERE gene_id IN (?)",array($nodes));
            if($this->ok_query){
                while($row = mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                    $this->add_json($row['gene_id'],
                        array(
                            'id'  => $row['gene_id'],
                            'chr' => $row['chromosome'],
                            's'   => $row['chromo_start'],
                            'e'   => $row['chromo_end'],
                        )
                    );
                }
            }
            else{
                $this->_error("no results");
            }
        }elseif($hash['type'] == 'arab'){
            $this->_make_query("SELECT gene_id,arab_name
                              FROM mzn_arab_gene a
                              LEFT OUTER JOIN mzn_arab_short_desc short ON a.short_id = short.short_id
                              LEFT OUTER JOIN mzn_arab_orthologs ortho ON a.arab_id = ortho.arab_id
                              WHERE ortho.gene_id IN (?)",array($nodes));
            if($this->ok_query){
                while($row = mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                    $this->add_json($row['gene_id'],
                        array(
                            'n'   => $row['arab_name'],
                        )
                    );
                }
            }
            else{
                $this->_error("no results");
            }
        }
        elseif($hash['type'] == 'arab_short'){
            $this->_make_query("SELECT gene_id, short_desc
                              FROM mzn_arab_gene a
                              LEFT OUTER JOIN mzn_arab_short_desc short ON a.short_id = short.short_id
                              LEFT OUTER JOIN mzn_arab_orthologs ortho ON a.arab_id = ortho.arab_id
                              WHERE ortho.gene_id IN (?)",array($nodes));
            if($this->ok_query){
                while($row = mysql_fetch_array($this->ok_query,MYSQL_ASSOC)){
                    $this->add_json($row['gene_id'],
                        array(
                            'd'   => $row['short_desc'],
                        )
                    );
                }
            }
            else{
                $this->_error("no results");
            }
        }
    }
    /* port_fill
     *  This function fills a tab delimited file for the current network
     * */
    private function port_fill($hash){
        $details = explode(',',$hash['details']);
        $nodes = $hash['nodes'];
        $columns = array("gene_name");
        $joins = array();
        if(in_array('common',$details)){
            array_push($columns,"common_name");
            array_push($joins,"LEFT OUTER JOIN mzn_gene_common cmn ON grmz.gene_id = cmn.common_id ");
        }
        if(in_array('locus',$details)){
            array_push($columns,"chromosome","chromo_start","chromo_end","forward");
            array_push($joins,"LEFT OUTER JOIN mzn_gene_loci loci ON grmz.gene_id = loci.gene_id ");
        }
        if(in_array('arab',$details)){
            array_push($columns,"arab_name","type_name","short_desc","curator_desc","comp_desc");
            array_push($joins," LEFT OUTER JOIN mzn_arab_gene arab ON grmz.gene_id = arab.arab_id",
                        " LEFT OUTER JOIN mzn_arab_gene_types type ON arab.type_id = type.type_id", 
                        " LEFT OUTER JOIN mzn_arab_short_desc short ON arab.short_id = short.short_id ",
                        " LEFT OUTER JOIN mzn_arab_curator_desc cur ON arab.curated_id = cur.curator_id ",
                        " LEFT OUTER JOIN mzn_arab_comp_desc comp ON arab.comp_id = comp.comp_id");
        }
        $this->_make_query("SELECT ".join(',',$columns)." FROM mzn_gene_name grmz "
               . join(' ', $joins)
               . " WHERE grmz.gene_id IN (?)",array($nodes));
        if(!$this->ok_query){
            $this->_error('database failure');
            return;
        }
        else{
            $this->add_json('rows',mysql_num_rows($this->ok_query));
            $this->add_json('txt',join("\t",$columns));
            $this->add_json('txt',"\n");
            while($row = mysql_fetch_array($this->ok_query, MYSQL_NUM)){
                $this->add_json('txt',join("\t",$row));
                $this->add_json('txt',"\n");
            }
        }
    }
    private function get_network($hash){
        $type = $hash['type'];
        $nodes = $hash['nodes'];
        if($type == 'maize') $database = 'mzn_maize_pea_coef';
        elseif($type == 'teosinte') $database = 'mzn_teosinte_pea_coef';
        elseif($type == 'genotype') $database = 'mzn_combined_pea_coef';
        elseif($type == 'development') $database = 'mzn_devel_pea_coef';
        else $this->_error('incorrect database');
        $this->_make_query("SELECT gene_a, gene_b, score FROM ?
                            WHERE gene_a IN (?) AND gene_b IN (?) ", array($database,$nodes,$nodes));
        if(!$this->ok_query){
            $this->_error('malformed query');
            exit;
        }
        $matches = array();
        while($row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC)){
            $this->add_json_array(array($row['gene_a'],$row['gene_b'],$row['score']));
        }
        
    }
    private function _gene_occurance($gene_name){
        if(is_array($gene_name)){
            
        }
        else{
            $id = $this->_get_gene_id($gene_name);
            $this->_make_query("SELECT COUNT(*) as count  FROM mzn_maize_pea_coef
                                 WHERE gene_a IN (?) OR gene_b IN (?)",array($id,$id));
            $row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
            $this->add_json('maize',$row['count']);
            $this->_make_query("SELECT COUNT(*) as count  FROM mzn_teosinte_pea_coef
                                 WHERE gene_a IN (?) OR gene_b IN (?)",array($id,$id));
            $row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
            $this->add_json('teo',$row['count']);
            $this->_make_query("SELECT COUNT(*) as count  FROM mzn_devel_pea_coef
                                 WHERE gene_a IN (?) OR gene_b IN (?)",array($id,$id));
            $row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
            $this->add_json('devel',$row['count']);
            $this->_make_query("SELECT COUNT(*) as count  FROM mzn_combined_pea_coef
                                 WHERE gene_a IN (?) OR gene_b IN (?)",array($id,$id));
            $row = mysql_fetch_array($this->ok_query, MYSQL_ASSOC);
            $this->add_json('geno',$row['count']);
        }
    }
    private function searchBoxSuggest($hash){
        $query_string = $_POST['query'];
        $query_string = preg_replace('/\s+/','',$query_string);
        if(strpos($query_string,",")){
            $genes = explode(",",$query_string);
            $this->gene_suggest(array('request'=>end($genes)));
        }
        else{
            $this->gene_suggest(array('request'=>$query_string));
        }
    } 
    private function getRawValues($hash){
        $ids = $_POST["ids"];
    }
}//end class cytoweb

?>

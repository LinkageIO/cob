#!/usr/bin/python3
import re
import os
import sys
import json
import copy
import glob
import logging
import numpy as np
import pandas as pd
import camoco as co
from math import isinf
from itertools import chain
from genewordsearch.Classes import WordFreq
from genewordsearch.GeneWordSearch import geneWords
from genewordsearch.DBBuilder import geneWordBuilder
from genewordsearch.GeneWordSearch import geneWordSearch

# Take a huge swig from the flask
from flask import Flask, url_for, jsonify, request, send_from_directory, abort
app = Flask(__name__)

# Networks to load
network_names = ['ZmRoot']

# Folder with annotation files
scratch_folder = os.getenv('COB_ANNOTATIONS', os.path.expandvars('$HOME/.cob/'))
os.makedirs(scratch_folder, exist_ok=True)
os.environ['GWS_STORE'] = scratch_folder

# ----------------------------------------
#    Load things to memeory to prepare
# ----------------------------------------

# Generate network list based on allowed list and load them into memory
print('Preloading networks into memory...')
networks = {x:co.COB(x) for x in network_names}
network_list = {'data': [[net.name, net.description] for name,net in networks.items()]}
print('Availible Networks: ' + str(networks))

# Prefetch the gene neames for all the networks
print('Fetching gene names for networks...')
network_genes = {}
for name, net in networks.items():
    ids = list(net._expr.index.values)
    als = co.RefGen(net._global('parent_refgen')).aliases(ids)
    for k,v in als.items():
        ids += v
    network_genes[name] = list(set(ids))
print('Found gene names')

# Generate in Memory Avalible GWAS datasets list
print('Finding available GWAS datasets...')
gwas_sets = {"data" : list(co.available_datasets('GWAS')[
            ['Name','Description']].itertuples(index=False))}

# Find all of the GWAS data we have available
print('Finding GWAS Data...')
gwas_data_db = {}
for gwas in co.available_datasets('GWASData')['Name']:
    gwas_data_db[gwas] = co.GWASData(gwas) 

# Find any functional annotations we have 
print('Finding functional annotations...')
func_data_db = {}
for func in co.available_datasets('RefGenFunc')['Name']:
    print('Processing annotations for {}...'.format(func))
    func_data_db[func] = co.RefGenFunc(func)
    func_data_db[func].to_csv(os.path.join(scratch_folder,(func+'.tsv')))
    geneWordBuilder(func,[os.path.join(scratch_folder,(func+'.tsv'))],[1],['2 end'],['tab'],[True])

# Find any GO ontologies we have for the networks we have
print('Finding applicable GO Ontologies...')
GOnt_db = {}
for name in co.available_datasets('GOnt')['Name']:
    gont = co.GOnt(name)
    if gont.refgen.name not in GOnt_db:
        GOnt_db[gont.refgen.name] = gont

# Generate in memory term lists
print('Finding all available terms...')
terms = {}
for ont in gwas_sets['data']:
    terms[ont[0]] = {'data': [(term.id,term.desc,len(term.loci),
        len(co.GWAS(ont[0]).refgen.candidate_genes(term.effective_loci(window_size=50000))))
        for term in co.GWAS(ont[0]).iter_terms()]}

# Set up the logging file
handler = logging.FileHandler('COBErrors.log')
handler.setLevel(logging.INFO)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)
print('All Ready!')

#---------------------------------------------
#                 Routes
#---------------------------------------------
# Sends off the homepage
@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

# Sends off the js and such when needed
@app.route('/static/<path:path>')
def send_js(path):
    return send_from_directory('static',path)

# Route for sending the avalible datasets and networks
@app.route("/available_datasets/<path:type>")
def available_datasets(type=None,*args):
    if((type == 'GWAS') or (type == 'Ontology')):
        return jsonify(gwas_sets)
    elif((type == 'Expr') or (type == 'Network')):
        return jsonify(network_list)
    elif(type == 'All'):
        return str(co.available_datasets())
    else:
        return jsonify({"data" : list(co.available_datasets(type)[
                    ['Name','Description']].itertuples(index=False))})

# Route for sending available typeahead data
@app.route("/available_genes/<path:network>")
def available_genes(network):
    return jsonify({'geneIDs': network_genes[network]})

# Route for finding and sending the available terms
@app.route("/terms/<path:ontology>")
def ontology_terms(ontology):
    return jsonify(terms[ontology])

# Route for sending the CoEx Network Data for graphing from prebuilt term
@app.route("/term_network", methods=['POST'])
def term_network():
    # Get data from the form and derive some stuff
    cob = networks[str(request.form['network'])]
    ontology = str(request.form['ontology'])
    term = str(request.form['term'])
    windowSize = int(request.form['windowSize'])
    flankLimit = int(request.form['flankLimit'])
    edgeCutoff = float(request.form['edgeCutoff'])
    nodeCutoff = int(request.form['nodeCutoff'])
    cob.set_sig_edge_zscore(edgeCutoff)
    
    # Get the candidates
    genes = cob.refgen.candidate_genes(
        co.GWAS(ontology)[term].effective_loci(window_size=windowSize),
        flank_limit=flankLimit,
        chain=True,
        include_parent_locus=True,
        #include_parent_attrs=['numIterations', 'avgEffectSize'],
        include_num_intervening=True,
        include_rank_intervening=True,
        include_num_siblings=True)
    
    # Base of the result dict
    net = {}
    
    # If there are GWAS results, pass them in
    if ontology in gwas_data_db:
        gwas_data = gwas_data_db[ontology].get_data(cob=cob.name,
            term=term,windowSize=windowSize,flankLimit=flankLimit)
        net['nodes'] = getNodes(genes, cob, term, gwas_data=gwas_data, nodeCutoff=nodeCutoff)
    
    # Otherwise just run it without
    else:
        net['nodes'] = getNodes(genes, cob, term, nodeCutoff=nodeCutoff)
    
    # Get the edges of the nodes that will be rendered
    render_list = []
    for node in net['nodes']:
        if node['data']['render'] == 'x':
            render_list.append(node['data']['id'])
    net['edges'] = getEdges(render_list, cob)
    
    # Log Data Point to COB Log
    cob.log(term + ': Found ' +
        str(len(net['nodes'])) + ' nodes, ' +
        str(len(net['edges'])) + ' edges')
    
    # Return it as a JSON object
    return jsonify(net)

@app.route("/custom_network", methods=['POST'])
def custom_network():
    # Get data from the form
    cob = networks[str(request.form['network'])]
    maxNeighbors = int(request.form['maxNeighbors'])
    edgeCutoff = float(request.form['edgeCutoff'])
    nodeCutoff = int(request.form['nodeCutoff'])
    geneList = str(request.form['geneList'])
    cob.set_sig_edge_zscore(edgeCutoff)

    # Get the genes
    primary = set()
    neighbors = set()
    render = set()
    rejected = set(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    for name in copy.copy(rejected):
        # Find all the neighbors, sort by score
        try:
            gene = cob.refgen.from_ids(name)
        except ValueError:
            continue
        nbs = cob.neighbors(gene).reset_index().sort_values('score')
        
        # Strip everything except the gene IDs and add to the grand neighbor list
        rejected.remove(name)
        primary.add(gene.id)
        render.add(gene.id)
        new_genes = list(set(nbs.gene_a).union(set(nbs.gene_b)))
        
        # Build the set of genes that should be rendered
        nbs = nbs[:maxNeighbors]
        render = render.union(set(nbs.gene_a).union(set(nbs.gene_b)))
        
        # Remove the query gene if it's present
        if gene.id in new_genes:
            new_genes.remove(gene.id)
        
        # Add to the set of neighbor genes
        neighbors = neighbors.union(set(new_genes))
    
    # Get gene objects from IDs, but save list both lists for later
    genes_set = primary.union(neighbors)
    genes = cob.refgen.from_ids(genes_set)
    
    # Get the candidates
    genes = cob.refgen.candidate_genes(
        genes,
        window_size=0,
        flank_limit=0,
        chain=True,
        include_parent_locus=True,
        #include_parent_attrs=['numIterations', 'avgEffectSize'],
        include_num_intervening=True,
        include_rank_intervening=True,
        include_num_siblings=True)
    
    # Filter the candidates down to the provided list of genes
    genes = list(filter((lambda x: x.id in genes_set), genes))
    
    # If there are no good genes, error out
    if(len(genes) <= 0):
        abort(400)

    # Build up the objects
    net = {}
    net['nodes'] = getNodes(genes, cob, 'custom', primary=primary, render=render, nodeCutoff=nodeCutoff)
    net['rejected'] = list(rejected)
    
    # Get the edges of the nodes that will be rendered
    render_list = []
    for node in net['nodes']:
        if node['data']['render'] == 'x':
            render_list.append(node['data']['id'])
    net['edges'] = getEdges(render_list, cob)
    
    # Log Data Point to COB Log
    cob.log('Custom Term: Found ' +
        str(len(net['nodes'])) + ' nodes, ' +
        str(len(net['edges'])) + ' edges')
    
    return jsonify(net)

@app.route("/gene_connections", methods=['POST'])
def gene_connections():
    # Get data from the form
    cob = networks[str(request.form['network'])]
    sigEdgeScore = float(request.form['sigEdgeScore'])
    geneList = str(request.form['geneList'])
    newGene = str(request.form['newGene'])
    geneList = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    cob.set_sig_edge_zscore(sigEdgeScore)
    
    # Get the edges!
    edges = getEdges(geneList, cob)
    
    # Filter the ones that are not attached to the new one
    edges = list(filter(
        lambda x: ((x['data']['source'] == newGene) or (x['data']['target'] == newGene))
        ,edges))
    
    # Return it as a JSON object
    return jsonify({'edges': edges})

@app.route("/gene_word_search", methods=['POST'])
def gene_word_search():
    cob = networks[str(request.form['network'])]
    probCutoff = float(request.form['probCutoff'])
    geneList = str(request.form['geneList'])
    geneList = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    
    # Run the analysis and return the JSONified results
    if cob._global('parent_refgen') in func_data_db:
        results = geneWordSearch(geneList, cob._global('parent_refgen'), minChance=probCutoff)
    else:
        abort(405)
    if len(results[0]) == 0:
        abort(400)
    results = WordFreq.to_JSON_array(results[0])
    return jsonify(result=results)

@app.route("/go_enrichment", methods=['POST'])
def go_enrichment():
    cob = networks[str(request.form['network'])]
    probCutoff = float(request.form['probCutoff'])
    minTerm = int(request.form['minTerm'])
    maxTerm = int(request.form['maxTerm'])
    geneList = str(request.form['geneList'])
    
    # Parse the genes
    geneList = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    
    # Get the things for enrichment
    genes = cob.refgen.from_ids(geneList)
    if cob._global('parent_refgen') in GOnt_db:
        gont = GOnt_db[cob._global('parent_refgen')]
    else:
        abort(405)

    # Run the enrichment
    cob.log('Running GO Enrichment...')
    enr = gont.enrichment(genes, pval_cutoff=probCutoff, min_term_size=minTerm, max_term_size=maxTerm)
    if len(enr) == 0:
        abort(400)
    
    # Extract the results for returning
    terms = []
    for term in enr:
        terms.append({'id':term.id,'name':term.name,'desc':term.desc})
    df = pd.DataFrame(terms).drop_duplicates(subset='id')
    cob.log('Found {} enriched terms.', str(df.shape[0]))
    return jsonify(df.to_json(orient='index'))

# --------------------------------------------
#     Functions to get the nodes and edges
# --------------------------------------------
def getNodes(genes, cob, term, primary=None, render=None,
    gwas_data=pd.DataFrame(), nodeCutoff=0):
    # Cache the locality
    locality = cob.locality(genes)
    
    # Containers for the node info
    nodes = []
    parent_set = set()

    # Look for alises
    aliases = co.RefGen(cob._global('parent_refgen')).aliases([gene.id for gene in genes])
    
    # Look for annotations
    if cob._global('parent_refgen') in func_data_db:
        func_data = func_data_db[cob._global('parent_refgen')][[gene.id for gene in genes]]
    else:
        func_data = {}

    for gene in genes:
        # Catch for translating the way camoco works to the way We need for COB
        try:
            local_degree = locality.ix[gene.id]['local']
            global_degree = locality.ix[gene.id]['global']
        except KeyError as e:
            local_degree = global_degree = 0

        # Catch for bug in camoco
        try:
            num_interv = str(gene.attr['num_intervening'])
        except KeyError as e:
            #print('Num Attr fail on gene: ' + str(gene.id))
            num_interv = 'NAN'

        # Pull any aliases from our database
        alias = ''
        if gene.id in aliases:
            for a in aliases[gene.id]:
                alias += a + ' '
        
        # Fetch the FDR if we can
        fdr = np.nan
        if gene.id in gwas_data.index:
            fdr = gwas_data.loc[gene.id]['fdr']
            
        # Pull any annotations from our databases
        anote = ''
        if gene.id in func_data:
            for a in func_data[gene.id]:
                anote += a + ' '
        
        # Build the data object from our data
        node = {'group':'nodes', 'data':{
            'id': gene.id,
            'type': 'gene',
            'render': 'x',
            'term': term,
            'snp': gene.attr['parent_locus'],
            'alias': alias,
            'origin': 'N/A',
            'chrom': str(gene.chrom),
            'start': str(gene.start),
            'end': str(gene.end),
            'cur_ldegree': str(0),
            'ldegree': str(local_degree),
            'gdegree': str(global_degree),
            'fdr': str(fdr),
            'num_intervening': num_interv,
            'rank_intervening': str(gene.attr['intervening_rank']),
            'num_siblings': str(gene.attr['num_siblings']),
            #'parent_num_iterations': str(gene.attr['parent_numIterations']),
            #'parent_avg_effect_size': str(gene.attr['parent_avgEffectSize']),
            'annotations': anote,
        }}
        
        # Denote the query genes
        if primary:
            if gene.id in primary:
                node['data']['origin'] = 'query'
            else:
                node['data']['origin'] = 'neighbor'
        
        # Denote whether or not to render it if there is a list
        if render:
            if (gene.id in render) and (local_degree >= nodeCutoff):
                node['data']['render'] = 'x'
            else:
                node['data']['render'] = ' '
        else:
            if local_degree >= nodeCutoff:
                node['data']['render'] = 'x'
            else:
                node['data']['render'] = ' '
        
        # Save the node to the list
        nodes.append(node)
        
    return nodes

def getEdges(geneList, cob):
    # Find the Edges for the genes we will render
    subnet = cob.subnetwork(
        cob.refgen.from_ids(geneList),
        names_as_index=False,
        names_as_cols=True)
    
    # "Loop" to build the edge objects
    edges = [{'group':'edges', 'data':{
        'source': source,
        'target' : target,
        'weight' : str(weight)
    }} for source,target,weight,significant,distance in subnet.itertuples(index=False)]
    
    return edges

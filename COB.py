#!/usr/bin/python3
import re
import os
import gc
import sys
import json
import copy
import glob
import time
import logging
import threading
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

# Networks and Ontologies to Load
print('starting')
network_names = ['ZmRoot']
ont_names = ['ZmIonome','ZmWallace']
network_ttl = 9000
cleanup_freq = 60

# Folder with annotation files
scratch_folder = os.getenv('COB_ANNOTATIONS', os.path.expandvars('$HOME/.cob/'))
os.makedirs(scratch_folder, exist_ok=True)
os.environ['GWS_STORE'] = scratch_folder

# Max number of genes for custom queries
geneLimit = {'min':1,'max':150}

# Option Limits
optLimits = {
    'nodeCutoff': {'min':0, 'max':20},
    'edgeCutoff': {'min':1.0, 'max':20.0},
    'windowSize': {'min':0, 'max':1000000},
    'flankLimit': {'min':0, 'max':20},
    'maxNeighbors': {'min':0, 'max':150},
    'fdrCutoff': {'min':0.0, 'max':5.0},
    'pCutoff': {'min':0.0, 'max':1.0},
    'minTerm': {'min':1, 'max':99},
    'maxTerm': {'min':100, 'max':1000},
}

# ----------------------------------------
#    Load things to memeory to prepare
# ----------------------------------------
# Generate network list based on allowed list
print('Preloading networks into memory...')
networks = {x:co.COB(x) for x in network_names}
network_info = [[net.name, net._global('parent_refgen'), net.description] for name,net in networks.items()]
print('Availible Networks: ' + str(networks))

# Generate ontology list based on allowed list and load them into memory
print('Preloading GWASes into Memory...')
onts = {x:co.GWAS(x) for x in ont_names}
onts_info = {}
for m,net in networks.items():
    ref = net._global('parent_refgen')
    onts_info[net.name] = []
    for n,ont in onts.items():
        if ont.refgen.name == ref:
            onts_info[net.name].append([ont.name,ont.refgen.name,ont.description])
print('Availible GWASes: ' + str(onts_info))

# Prefetch the gene names for all the networks
print('Fetching gene names for networks...')
network_genes = {}
for name,net in networks.items():
    ids = list(net._expr.index.values)
    als = co.RefGen(net._global('parent_refgen')).aliases(ids)
    for k,v in als.items():
        ids += v
    network_genes[name] = list(set(ids))
print('Found gene names')

# Find all of the GWAS data we have available
print('Finding GWAS Data...')
gwas_data_db = {}
for gwas in co.available_datasets('GWASData')['Name']:
    gwas_data_db[gwas] = co.GWASData(gwas)

# Find the available window sizes and flank limits for each GWAS/COB combo
print('Finding GWAS Metadata...')
gwas_meta_db = {}
for ont in gwas_data_db.keys():
    gwas_meta_db[ont] = {}
    for net in gwas_data_db[ont].get_data()['COB'].unique():
        gwas_meta_db[ont][net] = {}
        gwas = gwas_data_db[ont].get_data(cob=net)
        gwas_meta_db[ont][net]['windowSize'] = []
        gwas_meta_db[ont][net]['flankLimit'] = []
        for x in gwas['WindowSize'].unique():
            gwas_meta_db[ont][net]['windowSize'].append(int(x))
        for x in gwas['FlankLimit'].unique():
            gwas_meta_db[ont][net]['flankLimit'].append(int(x))

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
for name,ont in onts.items():
    terms[name] = {'data': [(term.id,term.desc,len(term.loci),
        len(ont.refgen.candidate_genes(term.effective_loci(window_size=50000))))
        for term in ont.iter_terms()]}

#---------------------------------------------
#          Network Memory Management
#---------------------------------------------
# Build the network data structure
networks = {}
for name in network_names:
    networks[name] = {'net':None, 'mutex':False, 'lastAccess':0}

# Ensure the network is in memory
def _loadNet(network):
    # Spin lock until the mutex is opened
    while networks[network]['mutex']:
        time.sleep(0.5)
    
    # Take the mutex
    networks[network]['mutex'] = True
    
    # Load in the network if not there
    if networks[network]['net'] == None:
        networks[network]['net'] = co.COB(network)
        print('Reloaded Network: '+network)
    
    # Update the last access time 
    networks[network]['lastAccess'] = int(time.time())
    
    # Release the mutex
    networks[network]['mutex'] = False
    
    return

# Daemon to go through and dump old networks periodically
def _cleanNets():
    print('Network Cleaner Started')
    while True:
        gc.collect()
        time.sleep(cleanup_freq)
        now = int(time.time())
        for name in networks.keys():
            # Get the mutex
            while networks[name]['mutex']:
                time.sleep(0.5)
            networks[name]['mutex'] = True
            
            # Dump the network if too old
            if ((now - networks[name]['lastAccess']) > network_ttl):
                if not networks[name]['net'] == None:
                    print('Dropped Network: '+name)
                    networks[name]['net'] = None
            
            # Release the mutex
            networks[name]['mutex'] = False

# Put the cleaner in a thread
cleanThread = threading.Thread(target=_cleanNets,daemon=True)
cleanThread.start()

# Load a network at indication that it will be used in future
def warnNet(network):
    t = threading.Thread(target=_loadNet,args=(network,))
    t.start()
    return

# Frontend function to retrieve cob network
def getNet(network):
    _loadNet(network)
    return networks[network]['net']

#---------------------------------------------
#              Final Setup
#---------------------------------------------
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

# Route for sending the avalible datasets in a general fashion
@app.route("/available_datasets/<path:type>")
def available_datasets(type=None,*args):
    # Find the datasets
    if(type == None):
        datasets = co.available_datasets()
    else:
        datasets = co.available_datasets(type)
    
    # Return the results in a table friendly format
    return jsonify({"data" : list(datasets[
                ['Name','Description']].itertuples(index=False))})

# Route for sending the available networks
@app.route("/available_networks")
def available_networks():
    return jsonify({'data': network_info})

# Route for sending the available ontologies relevant to a network
@app.route("/available_ontologies/<path:network>")
def available_ontologies(network):
    warnNet(network)
    return jsonify({'data':onts_info[network]})

# Route for sending the available terms
@app.route("/available_terms/<path:network>/<path:ontology>")
def available_terms(network,ontology):
    warnNet(network)
    return jsonify(terms[ontology])

# Route for sending available gene names in the network
@app.route("/available_genes/<path:network>")
def available_genes(network):
    return jsonify({'geneIDs': network_genes[network]})

# Route for getting FDR availablity data
@app.route("/fdr_options/<path:network>/<path:ontology>")
def fdr_options(network,ontology):
    # Default to empty list
    ans = {'windowSize': [], 'flankLimit':[]}
    
    # If the combo is in the db, use that as answer
    if ontology in gwas_meta_db:
        if network in gwas_meta_db[ontology]:
            ans = gwas_meta_db[ontology][network]
    
    # Return it in JSON
    return jsonify(ans)

# Route for sending the CoEx Network Data for graphing from prebuilt term
@app.route("/term_network", methods=['POST'])
def term_network():
    # Get data from the form and derive some stuff
    cob = getNet(str(request.form['network']))
    ontology = onts[str(request.form['ontology'])]
    term = str(request.form['term'])
    nodeCutoff = safeOpts('nodeCutoff',int(request.form['nodeCutoff']))
    edgeCutoff = safeOpts('edgeCutoff',float(request.form['edgeCutoff']))
    windowSize = safeOpts('windowSize',int(request.form['windowSize']))
    flankLimit = safeOpts('flankLimit',int(request.form['flankLimit']))
    
    # Detrmine if there is a FDR cutoff or not
    try:
        float(request.form['fdrCutoff'])
    except ValueError:
        fdrCutoff = None
    else:
        fdrCutoff = safeOpts('fdrCutoff',float(request.form['fdrCutoff']))
    
    # Get the candidates
    cob.set_sig_edge_zscore(edgeCutoff)
    genes = cob.refgen.candidate_genes(
        ontology[term].effective_loci(window_size=windowSize),
        flank_limit=flankLimit,
        chain=True,
        include_parent_locus=True,
        #include_parent_attrs=['numIterations', 'avgEffectSize'],
        include_num_intervening=True,
        include_rank_intervening=True,
        include_num_siblings=True)
    # Base of the result dict
    net = {}
    
    # If there are GWAS results, and a FDR Cutoff
    if fdrCutoff and ontology.name in gwas_data_db:
        gwasData = gwas_data_db[ontology.name].get_data(cob=cob.name,
            term=term,windowSize=windowSize,flankLimit=flankLimit)
        net['nodes'] = getNodes(genes, cob, term, gwasData=gwasData,  nodeCutoff=nodeCutoff, windowSize=windowSize, flankLimit=flankLimit, fdrCutoff=fdrCutoff)
    
    # Otherwise just run it without GWAS Data
    else:
        net['nodes'] = getNodes(genes, cob, term, nodeCutoff=nodeCutoff, windowSize=windowSize, flankLimit=flankLimit)
    
    # Get the edges of the nodes that will be rendered
    render_list = []
    for node in net['nodes'].values():
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
    cob = getNet(str(request.form['network']))
    nodeCutoff = safeOpts('nodeCutoff',int(request.form['nodeCutoff']))
    edgeCutoff = safeOpts('edgeCutoff',float(request.form['edgeCutoff']))
    maxNeighbors = safeOpts('maxNeighbors',int(request.form['maxNeighbors']))
    geneList = str(request.form['geneList'])
    
    # Make sure there aren't too many genes
    geneList = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    if len(geneList) < geneLimit['min']:
        abort(400)
    elif len(geneList) > geneLimit['max']:
        geneList = geneList[:geneLimit['max']]
    
    # Set the edge score
    cob.set_sig_edge_zscore(edgeCutoff)

    # Get the genes
    primary = set()
    neighbors = set()
    render = set()
    rejected = set(geneList)
    for name in copy.copy(rejected):
        # Find all the neighbors, sort by score
        try:
            gene = cob.refgen.from_id(name)
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
    for node in net['nodes'].values():
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
    cob = getNet(str(request.form['network']))
    edgeCutoff = safeOpts('edgeCutoff',float(request.form['edgeCutoff']))
    allGenes = str(request.form['allGenes'])
    newGenes = str(request.form['newGenes'])
    allGenes = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', allGenes)))
    newGenes = set(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', newGenes)))
    
    # Set the Significant Edge Score
    cob.set_sig_edge_zscore(edgeCutoff)
    
    # Get the edges!
    edges = getEdges(allGenes, cob)
    
    # Filter the ones that are not attached to the new one
    if(len(newGenes) > 0):
        edges = list(filter(
            lambda x: ((x['data']['source'] in newGenes) or (x['data']['target'] in newGenes))
            ,edges))
    
    # Return it as a JSON object
    return jsonify({'edges': edges})

@app.route("/gene_word_search", methods=['POST'])
def gene_word_search():
    cob = getNet(str(request.form['network']))
    pCutoff = safeOpts('pCutoff',float(request.form['pCutoff']))
    geneList = str(request.form['geneList'])
    geneList = list(filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    
    # Run the analysis and return the JSONified results
    if cob._global('parent_refgen') in func_data_db:
        results = geneWordSearch(geneList, cob._global('parent_refgen'), minChance=pCutoff)
    else:
        abort(405)
    if len(results[0]) == 0:
        abort(400)
    results = WordFreq.to_JSON_array(results[0])
    return jsonify(result=results)

@app.route("/go_enrichment", methods=['POST'])
def go_enrichment():
    cob = getNet(str(request.form['network']))
    pCutoff = safeOpts('pCutoff',float(request.form['pCutoff']))
    minTerm = safeOpts('minTerm',int(request.form['minTerm']))
    maxTerm = safeOpts('maxTerm',int(request.form['maxTerm']))
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
    enr = gont.enrichment(genes, pval_cutoff=pCutoff, min_term_size=minTerm, max_term_size=maxTerm)
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
#     Function to Make Input Safe Again
# --------------------------------------------
def safeOpts(name,val):
    # Get the parameters into range
    val = min(val,optLimits[name]['max'])
    val = max(val,optLimits[name]['min'])
    return val

# --------------------------------------------
#     Functions to get the nodes and edges
# --------------------------------------------
def getNodes(genes, cob, term, primary=None, render=None, gwasData=pd.DataFrame(),
    nodeCutoff=0, windowSize=None, flankLimit=None, fdrCutoff=None):
    # Cache the locality
    locality = cob.locality(genes)
    
    # Containers for the node info
    nodes = {}
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
            ldegree = locality.ix[gene.id]['local']
            gdegree = locality.ix[gene.id]['global']
        except KeyError as e:
            ldegree = gdegree = 3

        # Catch for bug in camoco
        try:
            numInterv = str(gene.attr['num_intervening'])
        except KeyError as e:
            #print('Num Attr fail on gene: ' + str(gene.id))
            numInterv = 'nan'

        # Pull any aliases from our database
        alias = ''
        if gene.id in aliases:
            for a in aliases[gene.id]:
                alias += a + ' '
        
        # Fetch the FDR if we can
        fdr = np.nan
        if gene.id in gwasData.index:
            fdr = gwasData.loc[gene.id]['fdr']
            
        # Pull any annotations from our databases
        anote = ''
        if gene.id in func_data:
            for a in func_data[gene.id]:
                anote += a + ' '
        
        # Build the data object from our data
        node = {'group':'nodes', 'data':{
            'id': gene.id,
            'type': 'gene',
            'render': ' ',
            'term': term,
            'snp': gene.attr['parent_locus'].replace('<','[').replace('>',']'),
            'alias': alias,
            'origin': 'N/A',
            'chrom': str(gene.chrom),
            'start': str(gene.start),
            'end': str(gene.end),
            'cur_ldegree': str(0),
            'ldegree': str(ldegree),
            'gdegree': str(gdegree),
            'fdr': str(fdr),
            'windowSize': str(windowSize),
            'flankLimit': str(flankLimit),
            'numIntervening': numInterv,
            'rankIntervening': str(gene.attr['intervening_rank']),
            'numSiblings': str(gene.attr['num_siblings']),
            #'parentNumIterations': str(gene.attr['parent_numIterations']),
            #'parentAvgEffectSize': str(gene.attr['parent_avgEffectSize']),
            'annotations': anote,
        }}
        
        # Denote the query genes
        if primary:
            if gene.id in primary:
                node['data']['origin'] = 'query'
            else:
                node['data']['origin'] = 'neighbor'
        
        # Denote whether or not to render it
        if ldegree >= nodeCutoff:
            if (not fdrCutoff) or gwasData.empty or fdr <= fdrCutoff:
                if (not render) or (gene.id in render):
                    node['data']['render'] = 'x'
        
        # Save the node to the list
        nodes[gene.id] = node
        
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

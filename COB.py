#!/usr/bin/python3
import re
import sys
import json
import copy
import logging
import numpy as np
import camoco as co
from math import isinf
from itertools import chain

# Take a huge swig from the flask 
from flask import Flask, url_for, jsonify, request, send_from_directory
app = Flask(__name__)

# Networks to load
network_names = ['ZmRoot']

# Generate in Memory Avalible GWAS datasets list
gwas_sets = {"data" : list(co.available_datasets('GWAS')[
            ['Name','Description']].itertuples(index=False))}

# Generate in memory term lists
terms = {}
for ont in gwas_sets['data']:
    terms[ont[0]] = {'data': [(term.id,term.desc,len(term.loci),
        len(co.GWAS(ont[0]).refgen.candidate_genes(term.effective_loci(window_size=50000)))) 
        for term in co.GWAS(ont[0]).iter_terms()]}

# Generate network list based on allowed list and load them into memory
networks = {x:co.COB(x) for x in network_names}
network_list = {'data': [[net.name, net.description] for name,net in networks.items()]}
print('Availible Networks: ' + str(networks))

# Set up the logging file
handler = logging.FileHandler('COBErrors.log')
handler.setLevel(logging.INFO)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

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

# Route for finding and sending the available terms
@app.route("/terms/<path:ontology>")
def Ontology_Terms(ontology):
    return jsonify(terms[ontology])

# Route for sending the CoEx Network Data for graphing from prebuilt term
@app.route("/term_network", methods=['POST'])
def term_network():
    # Get data from the form
    network = str(request.form['network'])
    ontology = str(request.form['ontology'])
    term = str(request.form['term'])
    windowSize = int(request.form['windowSize'])
    flankLimit = int(request.form['flankLimit'])
    
    # Get cob and such
    cob = networks[network]
    genes = cob.refgen.candidate_genes(
        co.GWAS(ontology)[term].effective_loci(window_size=windowSize),
        flank_limit=flankLimit,
        chain=True,
        include_parent_locus=True,
        #include_parent_attrs=['numIterations', 'avgEffectSize'],
        include_num_intervening=True,
        include_rank_intervening=True,
        include_num_siblings=True)
    
    # Values needed for later computations
    locality = cob.locality(genes)
    subnet = cob.subnetwork(genes)
    subnet.reset_index(inplace=True)
    
    # Containers for the node info
    net = {}
    net['nodes'] = []
    parents = set()
    
    # Loop to build the gene nodes
    for gene in genes:
        try:
            local_degree = locality.ix[gene.id]['local']
            global_degree = locality.ix[gene.id]['global']
        except KeyError as e:
            local_degree = global_degree = 0
        
        try:
            num_interv = str(gene.attr['num_intervening'])
        except KeyError as e:
            num_interv = 'NAN'
        
        net['nodes'].append({'data':{
            'id': gene.id,
            'type': 'gene',
            'snp': gene.attr['parent_locus'],
            'chrom': str(gene.chrom),
            'start': str(gene.start),
            'end': str(gene.end),
            'ldegree': str(local_degree), 
            'gdegree': str(global_degree),
            'num_intervening': num_interv,
            'rank_intervening': str(gene.attr['intervening_rank']),
            'num_siblings': str(gene.attr['num_siblings']),
            #'parent_num_iterations': str(gene.attr['parent_numIterations']),
            #'parent_avg_effect_size': str(gene.attr['parent_avgEffectSize']),
        }})
        parents.add(gene.attr['parent_locus'])
        
    # Loop to build the SNP nodes
    for parent in parents:
        parent_attr = re.split('<|>|:|-', parent)
        net['nodes'].insert(0, {'data':{
            'id': parent,
            'type': 'snp',
            'chrom': parent_attr[2],
            'start': parent_attr[3],
            'end': parent_attr[4],
        }})

    # "Loop" to build the edge objects
    net['edges'] = [{'data':{
        'source': source,
        'target' : target,
        'weight' : weight
    }} for source,target,weight,significant,distance in subnet.itertuples(index=False)]
    
    # Return it as a JSON object
    return jsonify(net)

@app.route("/custom_network", methods=['POST'])
def custom_network():
    # Get data from the form
    network = str(request.form['network'])
    maxNeighbors = int(request.form['maxNeighbors'])
    sigEdgeScore = float(request.form['sigEdgeScore'])
    geneList = str(request.form['geneList']).upper()
    
    # Set up cob
    cob = networks[network]
    cob.set_sig_edge_zscore(sigEdgeScore)
    
    # Get the genes
    queried = set(filter((lambda x: x != ''), re.split('\r| |,|\t|\n', geneList)))
    rejected = copy.copy(queried)
    neighbors = set()
    for gene in cob.refgen.from_ids(queried):
        # Find all the neighbors, sort by score
        nbs = cob.neighbors(gene).reset_index().sort_values('score')
        
        # If we need to truncate the list, do so
        if((maxNeighbors > -1) and (len(nbs) > maxNeighbors)):
            nbs = nbs[0:(maxNeighbors-1)]
            
        # Strip everything except the gene IDs and add to the grand neighbor list
        new_genes = list(set(nbs.gene_a).union(set(nbs.gene_b)))
        rejected .remove(gene.id)
        if gene.id in new_genes:
            new_genes.remove(gene.id)
        neighbors = neighbors.union(set(new_genes))
    
    # Get gene objects from IDs, but save list both lists for later
    genes = queried.union(neighbors)
    genes = cob.refgen.from_ids(genes)
    
    # Find the candidate genes (Really just here to get extra info, it's cheap)
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
    
    # Values needed for later computations
    locality = cob.locality(genes)
    subnet = cob.subnetwork(genes)
    subnet.reset_index(inplace=True)
    
    # Containers for the node info
    net = {}
    net['nodes'] = []
    net['rejected'] = list(rejected)
    
    # Loop to build the gene nodes
    for gene in genes:
        try:
            local_degree = locality.ix[gene.id]['local']
            global_degree = locality.ix[gene.id]['global']
        except KeyError as e:
            local_degree = global_degree = 0
        
        try:
            num_interv = str(gene.attr['num_intervening'])
        except KeyError as e:
            num_interv = 'NAN'
        
        node = {'data':{
            'id': gene.id,
            'type': 'gene',
            'snp': 'N/A',
            'origin': 'neighbor',
            'chrom': str(gene.chrom),
            'start': str(gene.start),
            'end': str(gene.end),
            'ldegree': str(local_degree), 
            'gdegree': str(global_degree),
            'num_intervening': num_interv,
            'rank_intervening': str(gene.attr['intervening_rank']),
            'num_siblings': str(gene.attr['num_siblings']),
            #'parent_num_iterations': str(gene.attr['parent_numIterations']),
            #'parent_avg_effect_size': str(gene.attr['parent_avgEffectSize']),
        }}
        if gene.id in queried:
            node['data']['origin'] = 'query'
        net['nodes'].append(node)

    # "Loop" to build the edge objects
    net['edges'] = [{'data':{
        'source': source,
        'target' : target,
        'weight' : weight
    }} for source,target,weight,significant,distance in subnet.itertuples(index=False)]
    
    # Return it as a JSON object
    return jsonify(net)
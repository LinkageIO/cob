#!/usr/bin/python3
import logging
import camoco as co
import sys
import json
import re
import numpy as np

from math import isinf
from itertools import chain

# Take a huge swig from the flask 
from flask import Flask, url_for, jsonify, request, send_from_directory
app = Flask(__name__)

# Networks to load
network_names = ['ZmRoot']

# Generate in-memory RefGen Object
ZM = co.RefGen('Zm5bFGS')
print('Loaded RefGen: ' + str(ZM));

# Generate in Memory Avalible GWAS datasets list
gwas_sets = {"data" : list(co.available_datasets('GWAS')[
            ['Name','Description']].itertuples(index=False))}

# Generate in memory term lists
terms = {}
for ont in gwas_sets['data']:
    terms[ont[0]] = {'data': [(term.id,term.desc,len(term.loci),
        len(ZM.candidate_genes(term.effective_loci(window_size=50000)))) 
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
@app.route("/term_network/<network>/<ontology>/<term>/<window_size>/<flank_limit>")
def term_network(network,ontology,term,window_size,flank_limit):
    cob = networks[network]
    genes = cob.refgen.candidate_genes(
        co.GWAS(ontology)[term].effective_loci(window_size=int(window_size)),
        flank_limit=int(flank_limit),
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
    nodes = []
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
        
        nodes.append({'data':{
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
    for p in parents:
        parent_list = re.split('<|>|:|-', p)
        nodes.insert(0, {'data':{
            'id': p,
            'type': 'snp',
            'chrom': parent_list[2],
            'start': parent_list[3],
            'end': parent_list[4],
        }})

    # "Loop" to build the edge objects
    net['nodes'] = nodes
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
    net_name = str(request.form['network'])
    sig_edge = float(request.form['sigEdge'])
    gene_str = str(request.form['genes']).upper()
    max_neighbors = int(request.form['maxNeighbors'])
    
    # Set up cob
    cob = networks[net_name]
    cob.set_sig_edge_zscore(sig_edge)
    
    # Get the genes
    queried = set(filter((lambda x: x != ''), re.split('\r| |,|\t|\n', gene_str)))
    neighbors = set()
    for gene in cob.refgen.from_ids(queried):
        nbs = cob.neighbors(gene).reset_index().sort_values('score')
        if((max_neighbors > -1) and (len(nbs) > max_neighbors)):
            nbs = nbs[0:(max_neighbors-1)]
        new_genes = list(set(nbs.gene_a).union(set(nbs.gene_b)))
        print(new_genes)
        if gene.id in new_genes:
            new_genes.remove(gene.id)
        neighbors = neighbors.union(set(new_genes))
    genes = queried.union(neighbors)
    genes = cob.refgen.from_ids(genes)
    
    # Find the candidate genes
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
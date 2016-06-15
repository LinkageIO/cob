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

# Route for listing availible datasets 
@app.route("/available_datasets")
def all_available_datasets():
    return str(co.available_datasets())

# Route for sending the avalible datasets and networks
@app.route("/available_datasets/<path:type>")
def available_datasets(type=None,*args):
    if(type == 'GWAS'):
        return jsonify(gwas_sets)
    elif(type == 'Expr'):
        return jsonify(network_list)
    else:
        return jsonify({"data" : list(co.available_datasets(type)[
                    ['Name','Description']].itertuples(index=False))})

# Route for finding and sending the available terms
@app.route("/Ontology/Terms/<path:term_name>")
def Ontology_Terms(term_name):
    return jsonify(terms[term_name])

# Route for sending the CoEx Network Data for graphing
@app.route("/COB/<network_name>/<ontology>/<term>/<window_size>/<flank_limit>")
def COB_network(network_name,ontology,term,window_size,flank_limit):
    cob = networks[network_name]
    candidate_genes = cob.refgen.candidate_genes(
        co.GWAS(ontology)[term].effective_loci(window_size=int(window_size)),
        flank_limit=int(flank_limit),
        chain=True,
        include_parent_locus=True,
        #include_parent_attrs=['numIterations', 'avgEffectSize'],
        include_num_intervening=True,
        include_rank_intervening=True,
        include_num_siblings=True
    )
    return getElements(candidate_genes, cob)
    
def getElements(genes, cob):
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
        nodes.append(
            {'data':{
                'id': gene.id,
                'type': 'gene',
                'snp': gene.attr['parent_locus'],
                'chrom': gene.chrom,
                'start': gene.start,
                'end': gene.end,
                'ldegree': local_degree, 
                'gdegree': global_degree,
                'num_intervening': num_interv,
                'rank_intervening': gene.attr['intervening_rank'],
                'num_siblings': gene.attr['num_siblings'],
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
    net['edges'] = [
        {
            'data':{
                'source': source,
                'target' : target,
                'score' : score
            }
        } for source,target,score,significant,distance in subnet.itertuples(index=False)
    ]
    
    # Return it as a JSON object
    return jsonify(net)
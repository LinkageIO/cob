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
@app.route("/COB/<network_name>/<ontology>/<term>")
def COB_network(network_name,ontology,term):
    net = {}
    cob = networks[network_name]
    term = co.GWAS(ontology)[term]
    nodes = []
    parents = set()
    chroms = dict()
    effective_loci = term.effective_loci(window_size=50000)
    candidate_genes = cob.refgen.candidate_genes(
        effective_loci,
        flank_limit=2,
        chain=True,
        include_parent_locus=True
    )
    locality = cob.locality(candidate_genes)
    for gene in candidate_genes:
        try:
            local_degree = locality.ix[gene.id]['local']
            global_degree = locality.ix[gene.id]['global']
        except KeyError as e:
            local_degree = 0
        gene_locality = local_degree / global_degree
        if np.isnan(gene_locality):
            gene_locality = 0
        parent_id = str(gene.attr['parent_locus'])
        parent_list = re.split('<|>|:|-', parent_id)
        nodes.append(
            {'data':{
                'id': str(gene.id),
                'type': 'gene',
                'snp': str(gene.attr['parent_locus']),
                'chrom': parent_list[2],
                'start': str(gene.start),
                'end': str(gene.end),
                'ldegree':int(local_degree), 
                'locality':float(gene_locality),
                'gdegree':int(global_degree)
            }})
        parents.add(str(gene.attr['parent_locus']))
        if int(parent_list[2]) in chroms:
            if gene.end > chroms[int(parent_list[2])]:
                chroms[int(parent_list[2])] = gene.end
        else:
            chroms[int(parent_list[2])] = gene.end
    # Add parents first
    for p in parents:
        parent_list = re.split('<|>|:|-', p)
        parent = {
            'id': p,
            'type': 'snp',
            'chrom': parent_list[2],
            'start': parent_list[3],
            'end': parent_list[4],
        }
        nodes.insert(0,{'data':parent,'classes':'snp'})
    
    # Add chrmosomes to the nodes
    for k,v in chroms.items():
        chrom = {
          'id': str(k),
          'type': 'chrom',
          'chrom': str(k),
          'start': str(0),
          'end': str(v),
        }
        nodes.insert(0,{'data':chrom})
    
    # Now do the edges
    subnet = cob.subnetwork(candidate_genes)
    subnet.reset_index(inplace=True)
    net['nodes'] = nodes
    net['edges'] = [
        {
            'data':{
                'source': source,
                'target' : target,
                'score' : score,
                'distance' : fix_val(distance)
            }
        } for source,target,score,significant,distance in subnet.itertuples(index=False)
    ]
    return jsonify(net)

def fix_val(val):
    if isinf(val):
        return -1
    if np.isnan(val):
        # because Fuck JSON
        return "null"
    else:
        return val

'''
# Gene Stuff, being thawed
@app.route('/Annotations/<network_name>/<ontology_name>/<term_name>',
        methods=['GET','POST'])
def Annotations(network,ontology,term):
    # Retrieve SNPs from 
    cob = networks[network]
    term = co.GWAS(ontology)[term]
    effective_loci = term.effective_loci(window_size=50000)
    candidate_genes = cob.refgen.candidate_genes(
        effective_loci,
        flank_limit=2,
        chain=True,
        include_parent_locus=False
    )
    try:
        gene_annots = co.Annotation('ZMFunc')[genes]
    except ValueError as e:
        return jsonify({})
    for net in networks.values():
        gene_annots.insert(
            5,'In {}'.format(net.name),
            ['true' if gene in net else 'false' for gene in genes]
        )
    gene_annots.insert(
        5,'Term SNPs',
        ["\n".join([snp.summary() for snp in \
            sorted(term.flanking_snps(gene))]) for gene in genes]
    )
    gene_annots.insert(
        5,'Global Degree',
        [str(cob.global_degree(gene)) for gene in genes]
    )
    return jsonify({
        'data' : list(gene_annots.itertuples(index=True)),
        'header' : ['Gene'] + list(gene_annots.columns.values)
    })
'''

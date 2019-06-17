#!/usr/bin/python3

import re
import os
import gc
import sys
import json
import copy
import glob
import time
import yaml
import logging
import threading
import numpy as np
import pandas as pd
import camoco as co
from math import isinf
from itertools import chain
from flask import Flask, url_for, jsonify, request, send_from_directory, abort

print('Loading Camoco...')

# Take a huge swig from the flask
app = Flask(__name__, static_folder=None)

# Try Importing GWS
try:
    from genewordsearch.Classes import WordFreq
    from genewordsearch.GeneWordSearch import geneWords
    from genewordsearch.DBBuilder import geneWordBuilder
    from genewordsearch.GeneWordSearch import geneWordSearch
    hasGWS = True
except ImportError:
    hasGWS = False

# ----------------------------------------
#   Parse configuration from environment
# ----------------------------------------
# Get the config object
conf = yaml.safe_load(os.getenv('COB_CONF'))
dflt = conf['defaults']

# Folder with annotation files
os.makedirs(conf['scratch'], exist_ok=True)
if hasGWS:
    os.environ['GWS_STORE'] = conf['scratch']

# Folder for bundle files
static_bundle_dir = os.path.join(conf['scratch'], 'static')
os.makedirs(static_bundle_dir, exist_ok=True)

# Max number of genes for custom queries
geneLimit = {'min': 1, 'max': 150}

# Option Limits
opts = {
    'nodeCutoff': {
        'title': 'Min Node Degree',
        'default': dflt['nodeCutoff'],
        'min': 0,
        'max': 20,
        'int': True
    },
    'edgeCutoff': {
        'title': 'Min Edge Score',
        'default': dflt['edgeCutoff'],
        'min': 1.0,
        'max': 20.0,
        'int': False
    },
    'fdrCutoff': {
        'title': 'FDR Filter (Term)',
        'default': dflt['fdrCutoff'],
        'min': 0.0,
        'max': 5.0,
        'int': False
    },
    'windowSize': {
        'title': 'Window Size (Term)',
        'default': dflt['windowSize'],
        'min': 0,
        'max': 1000000,
        'int': True
    },
    'flankLimit': {
        'title': 'Flank Limit (Term)',
        'default': dflt['flankLimit'],
        'min': 0,
        'max': 20,
        'int': True
    },
    'visNeighbors': {
        'title': 'Vis Neighbors (Custom)',
        'default': dflt['visNeighbors'],
        'min': 0,
        'max': 150,
        'int': True
    },
    'nodeSize': {
        'title': 'Node Size',
        'default': dflt['nodeSize'],
        'min': 5,
        'max': 50,
        'int': True
    },
    'pCutoff': {
        'title': 'Probability Cutoff',
        'default': dflt['pCutoff'],
        'min': 0.0,
        'max': 1.0,
        'int': False
    },
    'minTerm': {
        'title': 'Min Genes (GO)',
        'default': dflt['minTerm'],
        'min': 1,
        'max': 99,
        'int': True
    },
    'maxTerm': {
        'title': 'Max Genes (GO)',
        'default': dflt['maxTerm'],
        'min': 100,
        'max': 1000,
        'int': True
    },
}

binOpts = {
    'overlapMethod': {
        'default': dflt['overlapMethod'],
        'state': dflt['overlapMethod'],
        'isBool': False
    },
    'overlapSNPs': {
        'default': dflt['overlapSNPs'],
        'state': dflt['overlapSNPs'],
        'isBool': False
    },
    'logSpacing': {
        'default': dflt['logSpacing'],
        'state': dflt['logSpacing'],
        'isBool': True
    },
    'hpo': {
        'default': dflt['hpo'],
        'state': dflt['hpo'],
        'isBool': True
    },
    'visEnrich': {
        'default': dflt['visEnrich'],
        'state': dflt['visEnrich'],
        'isBool': True
    },
}

# Enumerate the JS files
js_files = [
    'lib/jquery-3.3.1.min.js', 'lib/jquery.textcomplete-1.8.1.min.js',
    'lib/bootstrap-3.3.7.min.js', 'lib/datatables-1.10.18.min.js',
    'lib/qtip-3.0.3.min.js', 'lib/download-1.4.5.min.js',
    'lib/cytoscape-3.4.0.min.js', 'lib/cytoscape-qtip-2.7.1.js',
    'lib/cytoscape-graphml-1.0.5.js', 'core.js', 'genes.js', 'graph.js',
    'polywas-layout.js', 'enrichment.js', 'tools.js', 'tables.js', 'cob.js'
]

# Enumerate the CSS files
css_files = [
    'lib/bootstrap-3.3.7.min.css', 'lib/datatables-1.10.18.min.css',
    'lib/qtip-3.0.3.min.css', 'cob.css'
]


# Function to handle bundling the files
def bundle_files(files, type, static_bundle_dir=static_bundle_dir):
    os.makedirs(os.path.join(static_bundle_dir, type), exist_ok=True)
    with open(os.path.join(static_bundle_dir, type, 'bundle.' + type),
              'w') as bundle:
        for fn in files:
            with open(os.path.join(app.root_path, 'static', type, fn)) as fd:
                bundle.write(fd.read())
                bundle.write('\n')


# Actually bundle them
bundle_files(js_files, 'js')
bundle_files(css_files, 'css')

# ----------------------------------------
#    Load things to memeory to prepare
# ----------------------------------------
# Generate network list based on allowed list
print('Preloading networks into memory...')
if len(conf['networks']) < 1:
    conf['networks'] = list(co.Tools.available_datasets('Expr')['Name'].values)
networks = {x: co.COB(x) for x in conf['networks']}

network_info = []
refLinks = {}
for name, net in networks.items():
    network_info.append({
        'name': net.name,
        'refgen': net._global('parent_refgen'),
        'desc': net.description,
    })
    if net._global('parent_refgen') in conf['refLinks']:
        refLinks[net.name] = conf['refLinks'][net._global('parent_refgen')]
print('Availible Networks: ' + str(networks))

# Generate ontology list based on allowed list and load them into memory
print('Preloading GWASes into Memory...')
if len(conf['gwas']) < 1:
    conf['gwas'] = list(co.Tools.available_datasets('GWAS')['Name'].values)
onts = {x: co.GWAS(x) for x in conf['gwas']}
onts_info = {}
for m, net in networks.items():
    ref = net._global('parent_refgen')
    onts_info[net.name] = []
    for n, ont in onts.items():
        if ont.refgen.name == ref:
            onts_info[net.name].append({
                'name': ont.name,
                'refgen': ont.refgen.name,
                'desc': ont.description
            })
print('Availible GWASes: ' + str(onts_info))

# Prefetch the gene names for all the networks
print('Fetching gene names for networks...')
network_genes = {}
for name, net in networks.items():
    ids = list(net._expr.index.values)
    als = co.RefGen(net._global('parent_refgen')).aliases(ids)
    for k, v in als.items():
        ids += v
    network_genes[name] = list(set(ids))
print('Found gene names')

# Find all of the GWAS data we have available
print('Finding GWAS Data...')
gwas_data_db = {}
for gwas in co.Tools.available_datasets('Overlap')['Name']:
    print("Loading {}".format(gwas))
    gwas_data_db[gwas] = co.Overlap(gwas)

# Find the available window sizes and flank limits for each GWAS/COB combo
print('Finding GWAS Metadata...')
gwas_meta_db = {}
for ont in gwas_data_db.keys():
    gwas_meta_db[ont] = {}
    for net in gwas_data_db[ont].results['COB'].unique():
        gwas_meta_db[ont][net] = {}
        gwas = gwas_data_db[ont].results[gwas_data_db[ont].results['COB'] ==
                                         net]
        gwas_meta_db[ont][net]['windowSize'] = []
        gwas_meta_db[ont][net]['flankLimit'] = []
        gwas_meta_db[ont][net]['overlapSNPs'] = []
        gwas_meta_db[ont][net]['overlapMethod'] = []
        for x in gwas['WindowSize'].unique():
            gwas_meta_db[ont][net]['windowSize'].append(int(x))
        for x in gwas['FlankLimit'].unique():
            gwas_meta_db[ont][net]['flankLimit'].append(int(x))
        for x in gwas['SNP2Gene'].unique():
            gwas_meta_db[ont][net]['overlapSNPs'].append(
                str(x).strip().lower())
        for x in gwas['Method'].unique():
            gwas_meta_db[ont][net]['overlapMethod'].append(
                str(x).strip().lower())

# Find any functional annotations we have
print('Finding functional annotations...')
func_data_db = {}
for ref in co.Tools.available_datasets('RefGen')['Name']:
    refgen = co.RefGen(ref)
    if refgen.has_annotations():
        print('Processing annotations for {}...'.format(ref))
        func_data_db[ref] = refgen
        func_data_db[ref].export_annotations(
            os.path.join(conf['scratch'], (ref + '.tsv')))
        if hasGWS:
            geneWordBuilder(ref,
                            [os.path.join(conf['scratch'], (ref + '.tsv'))],
                            [1], ['2 end'], ['tab'], [True])

# Find any GO ontologies we have for the networks we have
print('Finding applicable GO Ontologies...')
GOnt_db = {}
for name in co.Tools.available_datasets('GOnt')['Name']:
    gont = co.GOnt(name)
    if gont.refgen.name not in GOnt_db:
        GOnt_db[gont.refgen.name] = gont

# Generate in memory term lists
print('Finding all available terms...')
terms = {}
for name, ont in onts.items():
    terms[name] = []
    for term in ont.iter_terms():
        terms[name].append({
            'name':
            term.id,
            'desc':
            term.desc,
            'snps':
            len(term.loci),
            'genes':
            len(
                ont.refgen.candidate_genes(
                    term.effective_loci(window_size=50000)))
        })

# ---------------------------------------------
#              Final Setup
# ---------------------------------------------
handler = logging.FileHandler(os.path.join(conf['scratch'], 'COBErrors.log'))
handler.setLevel(logging.INFO)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

print('All Ready!')
# ---------------------------------------------
#                 Routes
# ---------------------------------------------


@app.route('/')
# Sends off the homepage
def index():
    return send_from_directory('templates', 'index.html')


@app.route('/defaults')
# Sends the default values in JSON format
def defaults():
    return jsonify({
        'opts': opts,
        'fdrFilter': conf['defaults']['fdrFilter'],
        'hpo': conf['defaults']['hpo'],
        'logSpacing': conf['defaults']['logSpacing'],
        'visEnrich': conf['defaults']['visEnrich'],
        'refLinks': refLinks,
        'binOpts': binOpts,
    })


@app.route('/static/<path:path>')
# Sends off the js and such when needed
def send_static(path):
    extension = path.split('.')[-1].strip()
    if (extension == 'js'):
        if conf['dev']:
            print('Rebundling js files')
            bundle_files(js_files, 'js')
        return send_from_directory(static_bundle_dir, path)
    elif (extension == 'css'):
        if conf['dev']:
            print('Rebundling css files')
            bundle_files(css_files, 'css')
        return send_from_directory(static_bundle_dir, path)
    else:
        return send_from_directory('static', path)


@app.route("/available_datasets/<path:type>")
# Route for sending the avalible datasets in a general fashion
def available_datasets(type=None, *args):
    # Find the datasets
    if (type == None):
        datasets = co.Tools.available_datasets()
    else:
        datasets = co.Tools.available_datasets(type)

    # Return the results in a table friendly format
    return jsonify({
        "data":
        list(datasets[['Name', 'Description']].itertuples(index=False))
    })


@app.route("/available_networks")
# Route for sending the available networks
def available_networks():
    return jsonify({'data': network_info})


@app.route("/available_ontologies/<path:network>")
# Route for sending the available ontologies relevant to a network
def available_ontologies(network):
    return jsonify({'data': onts_info[network]})


@app.route("/available_terms/<path:network>/<path:ontology>")
# Route for sending the available terms
def available_terms(network, ontology):
    return jsonify({'data': terms[ontology]})


@app.route("/available_genes/<path:network>")
# Route for sending available gene names in the network
def available_genes(network):
    return jsonify({'geneIDs': network_genes[network]})


@app.route("/fdr_options/<path:network>/<path:ontology>")
# Route for getting FDR availablity data
def fdr_options(network, ontology):
    # Default to empty list
    ans = {
        'windowSize': [],
        'flankLimit': [],
        'overlapSNPs': [],
        'overlapMethod': []
    }

    # If the combo is in the db, use that as answer
    if ontology in gwas_meta_db:
        if network in gwas_meta_db[ontology]:
            ans = gwas_meta_db[ontology][network]

    # Return it in JSON
    return jsonify(ans)


@app.route("/term_network", methods=['POST'])
# Route for sending the CoEx Network Data for graphing from prebuilt term
def term_network():
    # Get data from the form and derive some stuff
    cob = networks[str(request.form['network'])]
    ontology = onts[str(request.form['ontology'])]
    term = str(request.form['term'])
    nodeCutoff = safeOpts('nodeCutoff', request.form['nodeCutoff'])
    edgeCutoff = safeOpts('edgeCutoff', request.form['edgeCutoff'])
    windowSize = safeOpts('windowSize', request.form['windowSize'])
    flankLimit = safeOpts('flankLimit', request.form['flankLimit'])
    hpo = (request.form['hpo'].lower().strip() == 'true')
    strongestSNPs = (
        request.form['overlapSNPs'].lower().strip() == 'strongest')
    overlapDensity = (
        request.form['overlapMethod'].lower().strip() == 'density')

    # Detrmine if there is a FDR cutoff or not
    try:
        float(request.form['fdrCutoff'])
    except ValueError:
        fdrCutoff = None
    else:
        fdrCutoff = safeOpts('fdrCutoff', float(request.form['fdrCutoff']))

    # Get the candidates
    cob.set_sig_edge_zscore(edgeCutoff)
    # Check to see if Genes are HPO
    if hpo:
        genes = cob.refgen[gwas_data_db[
            ontology.name].high_priority_candidates().query(
                'COB=="{}" and Ontology == "{}" and Term == "{}"'.format(
                    cob.name, ontology.name, term)).gene.unique()]
    else:
        # Get candidates based on options
        if (strongestSNPs):
            try:
                loci = ontology[term].strongest_loci(
                    window_size=windowSize,
                    attr=ontology.get_strongest_attr(),
                    lowest=ontology.get_strongest_higher())
            except KeyError:
                loci = ontology[term].effective_loci(window_size=windowSize)
        else:
            loci = ontology[term].effective_loci(window_size=windowSize)

        # Find the genes
        genes = cob.refgen.candidate_genes(
            loci,
            window_size=windowSize,
            flank_limit=flankLimit,
            chain=True,
            include_parent_locus=True,
            #include_parent_attrs=['numIterations', 'avgEffectSize'],
            include_num_intervening=True,
            include_rank_intervening=True,
            include_num_siblings=True)
    cob.log('Found {} candidate genes', len(genes))
    # Base of the result dict
    net = {}

    # If there are GWAS results, and a FDR Cutoff
    if fdrCutoff and ontology.name in gwas_data_db and not (hpo):
        cob.log('Fetching genes with FDR < {}', fdrCutoff)
        gwas_data = gwas_data_db[ontology.name].results
        gwas_data = gwas_data[gwas_data['COB'] == cob.name]
        gwas_data = gwas_data[gwas_data['Term'] == term]
        gwas_data = gwas_data[gwas_data['WindowSize'] == windowSize]
        gwas_data = gwas_data[gwas_data['FlankLimit'] == flankLimit]
        gwas_data = gwas_data[gwas_data['SNP2Gene'] == (
            'strongest' if strongestSNPs else 'effective')]
        gwas_data = gwas_data[gwas_data['Method'] == (
            'density' if overlapDensity else 'locality')]
        net['nodes'] = getNodes(
            genes,
            cob,
            term,
            gwasData=gwas_data,
            nodeCutoff=nodeCutoff,
            windowSize=windowSize,
            flankLimit=flankLimit,
            fdrCutoff=fdrCutoff)
    else:
        # Otherwise just run it without GWAS Data
        net['nodes'] = getNodes(
            genes,
            cob,
            term,
            nodeCutoff=nodeCutoff,
            windowSize=windowSize,
            flankLimit=flankLimit,
            hpo=hpo)

    # Get the edges of the nodes that will be rendered
    render_list = []
    for node in net['nodes'].values():
        if node['data']['render']:
            render_list.append(node['data']['id'])
    net['edges'] = getEdges(render_list, cob)

    # Tell what enrichment options are available
    net['hasGO'] = cob._global('parent_refgen') in GOnt_db
    net['hasGWS'] = hasGWS and (cob._global('parent_refgen') in func_data_db)

    # Log Data Point to COB Log
    cob.log(term + ': Found ' + str(len(net['nodes'])) + ' nodes, ' +
            str(len(net['edges'])) + ' edges')

    # Return it as a JSON object
    return jsonify(net)


@app.route("/custom_network", methods=['POST'])
def custom_network():
    # Get data from the form
    cob = networks[str(request.form['network'])]
    nodeCutoff = safeOpts('nodeCutoff', int(request.form['nodeCutoff']))
    edgeCutoff = safeOpts('edgeCutoff', float(request.form['edgeCutoff']))
    geneList = str(request.form['geneList'])

    # Detrmine if we want neighbors or not
    try:
        int(request.form['visNeighbors'])
    except ValueError:
        visNeighbors = None
    else:
        visNeighbors = safeOpts('visNeighbors',
                                int(request.form['visNeighbors']))

    # Make sure there aren't too many genes
    geneList = list(
        filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))
    if len(geneList) < geneLimit['min']:
        abort(400)
    elif len(geneList) > geneLimit['max']:
        geneList = geneList[:geneLimit['max']]

    # Set the edge score
    cob.set_sig_edge_zscore(edgeCutoff)

    # Get the genes
    cob.log("Getting Neighbors")
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

        # Add this gene to the requisite lists
        rejected.remove(name)
        primary.add(gene.id)
        render.add(gene.id)

        if visNeighbors is not None:
            # Get the neighbors from Camoco
            nbs = cob.neighbors(
                gene, names_as_index=False,
                names_as_cols=True).sort_values('score')

            # Strip everything except the gene IDs and add to the grand neighbor list
            new_genes = list(set(nbs['gene_a']).union(set(nbs['gene_b'])))

            # Build the set of genes that should be rendered
            nbs = nbs[:visNeighbors]
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
    if (len(genes) <= 0):
        abort(400)

    # Build up the objects
    net = {}
    net['nodes'] = getNodes(
        genes,
        cob,
        'custom',
        primary=primary,
        render=render,
        nodeCutoff=nodeCutoff)
    net['rejected'] = list(rejected)

    # Get the edges of the nodes that will be rendered
    render_list = []
    for node in net['nodes'].values():
        if node['data']['render']:
            render_list.append(node['data']['id'])
    net['edges'] = getEdges(render_list, cob)

    # Tell what enrichment options are available
    net['hasGO'] = cob._global('parent_refgen') in GOnt_db
    net['hasGWS'] = hasGWS and (cob._global('parent_refgen') in func_data_db)

    # Log Data Point to COB Log
    cob.log('Custom Term: Found ' + str(len(net['nodes'])) + ' nodes, ' +
            str(len(net['edges'])) + ' edges')

    return jsonify(net)


@app.route("/gene_connections", methods=['POST'])
def gene_connections():
    # Get data from the form
    cob = networks[str(request.form['network'])]
    edgeCutoff = safeOpts('edgeCutoff', float(request.form['edgeCutoff']))
    allGenes = str(request.form['allGenes'])
    newGenes = str(request.form['newGenes'])
    allGenes = list(
        filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', allGenes)))
    newGenes = set(
        filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', newGenes)))

    # Set the Significant Edge Score
    cob.set_sig_edge_zscore(edgeCutoff)

    # Get the edges!
    edges = getEdges(allGenes, cob)

    # Filter the ones that are not attached to the new one
    if (len(newGenes) > 0):
        edges = list(
            filter(
                lambda x: ((x['data']['source'] in newGenes) or (x['data']['target'] in newGenes)),
                edges))

    # Return it as a JSON object
    return jsonify({'edges': edges})


@app.route("/gene_word_search", methods=['POST'])
def gene_word_search():
    cob = networks[str(request.form['network'])]
    pCutoff = safeOpts('pCutoff', float(request.form['pCutoff']))
    geneList = str(request.form['geneList'])
    geneList = list(
        filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))

    # Run the analysis and return the JSONified results
    if hasGWS and (cob._global('parent_refgen') in func_data_db):
        results = geneWordSearch(
            geneList, cob._global('parent_refgen'), minChance=pCutoff)
    else:
        abort(405)
    if len(results[0]) == 0:
        abort(400)
    results = WordFreq.to_JSON_array(results[0])
    return jsonify(result=results)


@app.route("/go_enrichment", methods=['POST'])
def go_enrichment():
    cob = networks[str(request.form['network'])]
    pCutoff = safeOpts('pCutoff', float(request.form['pCutoff']))
    minTerm = safeOpts('minTerm', int(request.form['minTerm']))
    maxTerm = safeOpts('maxTerm', int(request.form['maxTerm']))
    geneList = str(request.form['geneList'])

    # Parse the genes
    geneList = list(
        filter((lambda x: x != ''), re.split('\r| |,|;|\t|\n', geneList)))

    # Get the things for enrichment
    genes = cob.refgen.from_ids(geneList)
    if cob._global('parent_refgen') in GOnt_db:
        gont = GOnt_db[cob._global('parent_refgen')]
    else:
        abort(405)

    # Run the enrichment
    cob.log('Running GO Enrichment...')
    enr = gont.enrichment(
        genes,
        pval_cutoff=pCutoff,
        min_term_size=minTerm,
        max_term_size=maxTerm)
    if len(enr) == 0:
        abort(400)

    # Extract the results for returning
    terms = []
    for term in enr:
        terms.append({
            'id': term.id,
            'pval': term.attrs['pval'],
            'name': term.name,
            'desc': term.desc
        })
    df = pd.DataFrame(terms).drop_duplicates(subset='id')
    cob.log('Found {} enriched terms.', str(df.shape[0]))
    return jsonify(df.to_json(orient='index'))


# --------------------------------------------
#     Function to Make Input Safe Again
# --------------------------------------------


def safeOpts(name, val):
    # Get the parameters into range
    val = int(val) if opts[name]['int'] else float(val)
    val = min(val, opts[name]['max'])
    val = max(val, opts[name]['min'])
    return val


# --------------------------------------------
#     Functions to get the nodes and edges
# --------------------------------------------


def getNodes(genes,
             cob,
             term,
             primary=None,
             render=None,
             gwasData=pd.DataFrame(),
             nodeCutoff=0,
             windowSize=None,
             flankLimit=None,
             fdrCutoff=None,
             hpo=False):
    # Cache the locality
    locality = cob.locality(genes)

    # Containers for the node info
    nodes = {}
    parent_set = set()

    # Look for alises
    aliases = co.RefGen(cob._global('parent_refgen')).aliases(
        [gene.id for gene in genes])

    # Look for annotations
    if cob._global('parent_refgen') in func_data_db:
        func_data = func_data_db[cob._global('parent_refgen')].get_annotations(
            [gene.id for gene in genes])
    else:
        func_data = {}

    # Pre cache a list of the contained genes
    gwasDataGenes = set()
    if not gwasData.empty:
        gwasDataGenes = set(gwasData['gene'])

    for gene in genes:
        # Catch for translating the way camoco works to the way We need for COB
        try:
            ldegree = locality.ix[gene.id]['local']
            gdegree = locality.ix[gene.id]['global']
        except KeyError as e:
            ldegree = gdegree = 'nan'

        # Catch for bug in camoco
        try:
            numInterv = str(gene.attr['num_intervening'])
            rankIntervening = str(gene.attr['intervening_rank'])
            numSiblings = str(gene.attr['num_siblings'])
        except KeyError as e:
            #print('Num Attr fail on gene: ' + str(gene.id))
            numInterv = '-'
            rankIntervening = '-'
            numSiblings = '-'

        # Pull any aliases from our database
        alias = ''
        if gene.id in aliases:
            for a in aliases[gene.id]:
                alias += a + ' '

        # Fetch the FDR if we can
        fdr = np.nan
        if gene.id in gwasDataGenes:
            fdr = gwasData[gwasData['gene'] == gene.id]['fdr'].min()

        # Pull any annotations from our databases
        anote = ''
        if gene.id in func_data:
            for a in func_data[gene.id]:
                anote += a + ' '
        # Fetch parent locus if we can
        if 'parent_locus' not in gene.attr:
            gene.attr['parent_locus'] = '[Unknown]{}:{}-{}'.format(
                gene.chrom, gene.start, gene.end)

        # Build the data object from our data
        node = {
            'group': 'nodes',
            'data': {
                'id':
                gene.id,
                'type':
                'gene',
                'render':
                False,
                'term':
                term,
                'snp':
                gene.attr['parent_locus'].replace('<', '[').replace('>', ']'),
                'alias':
                alias,
                'origin':
                'N/A',
                'chrom':
                str(gene.chrom),
                'start':
                str(gene.start),
                'end':
                str(gene.end),
                'cur_ldegree':
                str(0),
                'ldegree':
                str(ldegree),
                'gdegree':
                str(gdegree),
                'fdr':
                'HPO' if hpo else str(fdr),
                'windowSize':
                str(windowSize),
                'flankLimit':
                str(flankLimit),
                'numIntervening':
                numInterv,
                'rankIntervening':
                rankIntervening,
                'numSiblings':
                numSiblings,
                # 'parentNumIterations': str(gene.attr['parent_numIterations']),
                # 'parentAvgEffectSize': str(gene.attr['parent_avgEffectSize']),
                'annotations':
                anote,
            }
        }

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
                    node['data']['render'] = True

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
    edges = [{
        'group': 'edges',
        'data': {
            'source': source,
            'target': target,
            'weight': str(weight)
        }
    } for source, target, weight, significant, distance in subnet.itertuples(
        index=False)]
    return edges

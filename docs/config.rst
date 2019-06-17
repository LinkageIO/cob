
.. _config:


Configuration Files and Data Directories
########################################

* `/home/camoco/.camoco`

This is the storage directory for all camoco related data. This can be kept in
the container, but it will not be persistent then. It is highly recommended to
mount a directory for this.

* `/home/camoco/cob.conf`

This is the location of the cob configuration file that is used by cob by
default. This will not work by default given no data is included in this docker
image. Make sure to build your configuration based off your data and mount it
here.

* `/home/camoco/.camoco.conf`

This is the location of the camoco configuration file. By default the emable
camoco config file in this repo is used. This should work fine for most use
cases.

Configuration
-------------
A powerful configuration engine is provided to both set options for the server
and also options for the content for the website, such as default option
values. As mentioned above, these can either be provided through a standalone
YAML configuration file `example.conf <https://github.com/LinkageIO/cob/blob/master/example.conf>`_ is
included in the repo) or in a section with the same format titled `web` in the
main camoco configuration file (found at `~/.camoco.conf`). One need not
include one at all, this will just be started with the default values (seen
below). This will also trigger all available Camoco networks and GWAS datasets
to be loaded in. To prevent this, one may specify the desired datasets. The
following is an annotated version of the default settings, showing all the
potential configuration options:

Server Options
--------------

.. code:: yaml

    name: cob          # The name of this server instance, must be unique for
                       # each instance, can be overridden by '-n' flag
    port:    50000     # Port to which the server will be attached
    host:    localhost # The allowed hosts that can communicate with this server
                       # (must be 0.0.0.0 with docker or to allow external connections)
    threads: 8         # How many individual threads the sever process may use
    timeout: 500       # How long a thread maybe unresponsive before termination
    dev:     False     # Forces JS and CSS to be recompiled on every request
                       # Normally done only on server restart

Datasets
--------

.. code:: yaml

    networks:            # Camoco networks that are to be loaded in the server.
        - My_Network_1   # If this is not included, all available Camoco
        - My_Network_2   # networks will be loaded.
    gwas:                # GWAS datasets that will be loaded in the server. If
        - My_GWAS_1      # this is not included, all GWAS datasets that
                         # correspond to loaded networks will be loaded.

Default Values
--------------

.. code:: yaml

    defaults:         # This is the dictionary containing all of the defaults
                      # for the options on the web site
    logSpacing: True  # Spacing of genes in Polywas layout, log or true distance
    visEnrich: True   # Only enrich genes visible on graph or all in table
    fdrFilter: True   # Whether to use FDR to filter query results
    nodeCutoff: 1     # How many edges a node must have to be visible
    edgeCutoff: 3.0   # The cutoff for significance of edge scores
    fdrCutoff: 0.35   # If the FDR Filter is used, the cutoff for being visible
    windowSize: 50000 # Window size used in the query
    flankLimit: 2     # Flank limit used in the query
    visNeighbors: 25  # Default number of neighbors visible in custom network
    nodeSize: 10      # Size of the nodes on the graph
    pCutoff: 0.05     # P value cutoff for enrichment queries
    minTerm: 5        # Minimum number of genes a GO term must have to be included
    maxTerm: 300      # Maximum number of genes a GO term must have to be included

Reference Links
---------------
This section allows for linking directly from genes to an external website for
more information. This can be configured for each different reference genome
(RefGen) used to build the included networks. If not included, the option won't
appear. To configure this,start by writing the name of the RefGen under the
`refLinks` option, followed by a colon and a space as seen below. Then you must
go to the database you wish to use for that RefGen, and search any gene. After
finding this, copy the URL onto the line after the name of the RefGen. Finally
replace the name of the gene in the URL with the string `{id}`. This allows the
website to find where in the URL the gene name goes, and replace it with any
gene for that organism. The following example works for maize, soybean, and
medicago. Add or subtract species at will.

.. code:: yaml
    
    refLinks:
        Zm5bFGS: http://www.maizegdb.org/gene_center/gene/{id}
        Gmax_a2_V1: https://www.soybase.org/sbt/search/search_results.php?category=FeatureName&version=Glyma2.0&search_term={id}
        Mt_4.0: http://medicago.jcvi.org/cgi-bin/medicago/manatee/shared/ORF_infopage.cgi?db=mta4&user=access&password=access&identifier=locus&orf={id}



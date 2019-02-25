![COB LOGO](https://s3-us-west-2.amazonaws.com/camoco/COBLogo.png)

# COB - The Co-expression Browser

COB is a complete client/server package built to browse gene co-expression networks
created by [Camoco](https://github.com/LinkageIO/Camoco). The client is written in
javascript, and the server is written in python.

## Demo Version

For your convenience, a demonstration version of COB is available to run as a Docker image with sample data. The data and scripts used to build this image are available as a <LINK>repository<LINK> as an example. The built image is also available on <LINK>Docker Hub<LINK>.

This image can be seen running at [http://lovelace.cs.umn.edu/cob](http://lovelace.cs.umn.edu/cob). This demonstration server is provided as-is, and is not guaranteed to be maintained indefinitely. The Docker image is the preferred method to use this demo version.

## Getting Started

This package is entirely dependent on [Camoco](https://github.com/LinkageIO/Camoco).
It is is designed such that once the Camoco has been installed, COB can be
added by, inside the camoco virtual environment, running:

```
$ pip install camoco-cob
```

Once installed, COB has a convinient command line interface to manage the server.
To run it with all of the default options, no options are required, just execute
in the camoco virtual environment:

```
$ cob
```

This will start the server in the current terminal window. To see the site, navigate
to `http://localhost:50000` in your web browser once the server has finished loading.
To terminate the server, press `Ctrl+C` in the same terminal window. To run the
server in the background, add the `-d` flag to the start command. To terminate all
instances of the COB server, run `cob -k`. To define a specific server to kill,
add the `-n` flag followed by the name of the server as such:

```
$ cob -k -n my_server
```

To use a specific configuration file for server settings, the file may be defined
with the `-c` flag:

```
$ cob -c my_server.conf
```

If no configuration file is defined, COB then checks for a section `web` in the
main camoco configuration file `~/.camoco.conf`. If there are no settings in that
file, it will load with default values. The full configuration options are discussed
in the next section.

This is the full documentation for all `cob` CLI options, which can also be accessed
by executing `cob -h`:

```
usage: cob [-h] [-c USERCONF] [-d] [-k] [-l] [-n NAME]

Manage instances of the COB server.

optional arguments:
  -h, --help            show this help message and exit
  -c USERCONF, --config USERCONF
                        Provide a YAML formatted configuration file, if not
                        provided, general Camoco config file is used.
  -d, --daemon          Run gunicorn as a daemon (allows closing of this
                        terminal).
  -k, --kill            Kill running server. Use '-n' to define specific
                        server to kill otherwise all will be.
  -l, --list            Kill running server. Use '-n' to define specific
                        server to kill otherwise all will be.
  -n NAME, --name NAME  Name of server to start or kill.
```

## Configuration

A powerful configuration engine is provided to both set options for the server
and also options for the content for the website, such as default option
values. As mentioned above, these can either be provided through a standalone
YAML configuration file ([`example.conf`](https://github.com/LinkageIO/cob/blob/master/example.conf)
is included in the repo) or in a section with the same format titled `web` in
the main camoco configuration file (found at `~/.camoco.conf`). One need not
include one at all, this will just be started with the default values (seen
below). This will also trigger all available Camoco networks and GWAS datasets
to be loaded in. To prevent this, one may specify the desired datasets. The
following is an annotated version of the default settings, showing all the
potential configuration options:

### Server Options

```
name: cob                   # The name of this server instance, must be unique for
                            #      each instance, can be overridden by '-n' flag
port: 50000                 # Port to which the server will be attached
threads: 8                  # How many individual threads the sever process may use
timeout: 500                # How long a thread maybe unresponsive before termination
dev: False                  # Forces JS and CSS to be recompiled on every request
                            # Normally done only on server restart
```

### Datasets

```
networks:                   # Camoco networks that are to be loaded in the server.
  - My_Network_1            #      If this is not included, all available Camoco
  - My_Network_2            #      networks will be loaded.
gwas:                       # GWAS datasets that will be loaded in the server. If
  - My_GWAS_1               #      this is not included, all GWAS datasets that
                            #      correspond to loaded networks will be loaded.
```

### Default Values

```
defaults:                   # This is the dictionary containing all of the defaults
                            #      for the options on the web site
  logSpacing: True          # Spacing of genes in Polywas layout, log or true distance
  visEnrich: True           # Only enrich genes visible on graph or all in table
  fdrFilter: True           # Whether to use FDR to filter query results
  nodeCutoff: 1             # How many edges a node must have to be visible
  edgeCutoff: 3.0           # The cutoff for significance of edge scores
  fdrCutoff: 0.35           # If the FDR Filter is used, the cutoff for being visible
  windowSize: 50000         # Window size used in the query
  flankLimit: 2             # Flank limit used in the query
  visNeighbors: 25          # Default number of neighbors visible in custom network
  nodeSize: 10              # Size of the nodes on the graph
  pCutoff: 0.05             # P value cutoff for enrichment queries
  minTerm: 5                # Minimum number of genes a GO term must have to be included
  maxTerm: 300              # Maximum number of genes a GO term must have to be included
```

### Reference Links

This section allows for linking directly from genes to an external website for more
information. This can be configured for each different reference genome (RefGen) used
to build the included networks. If not included, the option won't appear. To configure
this,start by writing the name of the RefGen under the `refLinks` option, followed by
a colon and a space as seen below. Then you must go to the database you wish to use
for that RefGen, and search any gene. After finding this, copy the URL onto the line
after the name of the RefGen. Finally replace the name of the gene in the URL with
the string `{id}`. This allows the website to find where in the URL the gene name
goes, and replace it with any gene for that organism. The following example works for
maize, soybean, and medicago. Add or subtract species at will.

```
refLinks:
  Zm5bFGS: http://www.maizegdb.org/gene_center/gene/{id}
  Gmax_a2_V1: https://www.soybase.org/sbt/search/search_results.php?category=FeatureName&version=Glyma2.0&search_term={id}
  Mt_4.0: http://medicago.jcvi.org/cgi-bin/medicago/manatee/shared/ORF_infopage.cgi?db=mta4&user=access&password=access&identifier=locus&orf={id}
```

## Notes

If you care to make this site accessible to the web, you can add a reverse proxy
to Apache, allowing for access by using a normal URL. An example of how to do
this is provided here, but for more detailed documentation, see the
[Apache docs](https://httpd.apache.org/docs/2.4/).

```
<VirtualHost *:80>
       ProxyPass /cob http://127.0.0.1:50000
       ProxyPassReverse /cob/ http://127.0.0.1:5000
</VirtualHost *:80>
```

The equivalent can be done in NGINX using the `proxy_pass` directive.

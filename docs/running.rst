.. _running:


Running COB
###########

Once installed, COB has a convinient command line interface to manage the
server. To run it with all of the default options, no options are required,
just execute in the camoco virtual environment:

.. code::

    $ cob 

This will start the server in the current terminal window. To see the site,
navigate to `http://localhost:50000` in your web browser once the server has
finished loading. To terminate the server, press `Ctrl+C` in the same terminal
window. To run the server in the background, add the `-d` flag to the start
command. To terminate all instances of the COB server, run `cob -k`. To define
a specific server to kill, add the `-n` flag followed by the name of the server
as such:

.. code:: 

    $ cob -k -n my_server

To use a specific configuration file for server settings, the file may be
defined with the `-c` flag:

.. code::  

    $ cob -c my_server.conf


If no configuration file is defined, COB then checks for a section `web` in the
main camoco configuration file `~/.camoco.conf`. If there are no settings in
that file, it will load with default values. The full configuration options are
discussed in the next section.

This is the full documentation for all `cob` CLI options, which can also be
accessed by executing `cob -h`:

.. code::
    
    $ cob -h

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




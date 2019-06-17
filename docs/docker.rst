.. _docker:

Docker
######

For your convenience, a demonstration version of COB is available to run as a
Docker image with sample data. The data and scripts used to build this image
are available as a `repository <https://github.umn.edu/csbio/camoco-cob-maize-demo->`_  
as an example. The built image is
also available on `Docker Hub <https://hub.docker.com/r/linkageio/camoco-cob>`_
using the tag *maize-data*. Running the Docker image does not require any
special configuration since it already has all of the data built and included.
It can be run as follows:

.. code:: bash

    $ docker pull linkageio/camoco-cob
    $ docker run --name cob -p 50000:50000

This image can be seen running at
`http://lovelace.cs.umn.edu/cob <http://lovelace.cs.umn.edu/cob>`_. This
demonstration server is provided as-is, and is not guaranteed to be maintained
indefinitely. The Docker image is the preferred method to use this demo
version.


Included in this repo there is a Dockerfile which contains camoco and cob in a
container. It does not provide any data prebuilt, thus in order to use this,
three different mounts are available which are explained below. To run the
image you would want to use a command like this:

.. code:: 

    $ docker run -it --rm --name cob \
        --volume $HOME/.camoco:/home/camoco/.camoco
        --volume $HOME/cob.conf:/home/camoco/cob.conf
        --publish 50000:50000
        linkageio/camoco-cob

This will start cob based on the configuration and data provided on localhost
port 50000. When doing this, it is important that you change the `host`
configuration value in the cob config to `0.0.0.0`, If you wish to restrict
access by IP, do so using docker arguments instead. To enter the container,
just add `bash` to the end of the command, or enter a running container using
exec with `bash`.


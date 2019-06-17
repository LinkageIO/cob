
.. _deploying:

If you care to make this site accessible to the web, you can add a reverse
proxy to Apache, allowing for access by using a normal URL. An example of how
to do this is provided here, but for more detailed documentation, see the
`Apache docs <https://httpd.apache.org/docs/2.4/>`_.

.. code:: 

    <VirtualHost *:80>
        ProxyPass /cob http://127.0.0.1:50000
        ProxyPassReverse /cob/ http://127.0.0.1:50000
    </VirtualHost *:80>

The equivalent can be done in NGINX using the `proxy_pass` directive.



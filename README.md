COB - The Co-expression Browser
===============================

COB is a complete client/server package built to browse gene co-expression data.
The client is written in javascript which talks to the server (written in python)
using a RESTFUL API. 

Getting Started
---------------
To begin, you need to start the server. `COB.py` contains the server code which
is a flask app. The app can be run on its own using flask:
```
$ python COB.py
```
then navigate to http://localhost:50002

**Note:** this will not, by default, serve pages over the web. The server runs on 
port 50002 which does not normally facing the internet. 


**Note:**
In order to deploy the server to the web, you must first connect COB to whatever
web server you are running. Apache, for some reason, hates flask. Instead we 
run the flask app on a [gunicorn](http://gunicorn.org/) server. A script called
`run.sh` is included to run the gunicorn instance. Once this is running, you can
redirect HTTP traffic from apache by including the following as an Apache virtualhost

```
<VirtualHost *:80>
       ProxyPass /cob http://127.0.0.1:50002
       ProxyPassReverse /cob/ http://127.0.0.1:50002
</VirtualHost *:80>
```

Then you can visit: www.yourwebpage.com/cob


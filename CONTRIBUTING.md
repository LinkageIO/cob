# Contributing
First of all, if you are reading this .... YOU ARE AWESOME! Thank you for considering contributing to
this project!! 🎉🎉

If you have not already checked our [roadmap](https://github.com/LinkageIO/cob/issues/85), it should give you
and idea on our short and long term vision for the project. 

## COB Home Base
COB's [home base](https://github.com/LinkageIO/cob) is its github page, all of the "official" development will always 
ultimately make its way back to github. We follow a Fork/PR developement cycle for bug fixes, code changes,
and new features.

If you are new to using GitHub or want a refresher, follow this example basic workflow which will add your name to 
the [contributors.md](https://github.com/schae234/cob/blob/master/Contributors.md) list!

**Note:** this exercise is just a toy example, GitHub stats are used to officially track contributorship.

### Basic Fork/PR Workflow Mini Tutorial
1. Fork the main github repo
![](https://i.imgur.com/PU9vlD5.png)
2. Clone **your** github fork onto your computer
![](https://i.imgur.com/5UwZY86.png)
Navigate to your forked version of the repo and copy to URL to clone a local repo. Copy the code below
into your terminal to get the code onto your computer.

**Note:** make sure to update the commands to point to your own github page.

```
# Lines starting with '#' are comments!
# The $ sign indicates a shell (bash) command
# e.g.
$ whoami
```
Clone the COB repo into your current directory. This can be wherever is convenient for you on your computer.
```
# Make sure its YOUR USERNAME!
$ git clone git@github.com:schae234/cob.git
Cloning into 'cob'...
remote: Enumerating objects: 131, done.
remote: Counting objects: 100% (131/131), done.
remote: Compressing objects: 100% (86/86), done.
remote: Total 2816 (delta 62), reused 93 (delta 40), pack-reused 2685
Receiving objects: 100% (2816/2816), 57.26 MiB | 7.81 MiB/s, done.
Resolving deltas: 100% (1170/1170), done.
$ cd cob
$ ls
cob                 Contributors.md  example-camoco.conf  MANIFEST.in       setup.py
CODE_OF_CONDUCT.md  Dockerfile       example-cob.conf     README.md
CONTRIBUTING.md     docs             LICENSE.md           requirements.txt
```
3. Commit and update changes to **your** local version
```
# Add YOUR NAME! to the contributors file
$ echo "<YOUR NAME>" >> Contributors.md
# stage the changed file with git add
$ git add Contributors.md
# Commit your changes! The -m flag is a commit message that summarized changes
$ git commit -m "Rob added his name"
[master e95e939] Rob added his name
 1 file changed, 1 insertion(+), 1 deletion(-)
```
4. Push your changes to **your** github fork
```
# Push your changes (origin master is the default github branch created by your fork)
$ git push origin master
Counting objects: 3, done.
Delta compression using up to 4 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 263 bytes | 131.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:schae234/cob.git
   0bdf078..e95e939  master -> master
```
5. Open a Pull Request (PR) to get your changes back into the main COB repo.
Navigate to your GitHub page to open a PR
![](https://i.imgur.com/9VUcS4u.png)
Github will detect any changes between your repo and the main COB repo. Double check that the changes make sense:
![](https://i.imgur.com/Wp6wXZ7.png)

**Note:** You may need to resolve and differences that have been committed to the main COB repo that may have occurred during 
the time you were hacking.

## Continuous Integration
COB uses [continuous integration](https://en.wikipedia.org/wiki/Continuous_integration) (CI) to manage all of it's assets.
CI tools are great because they monitor the main github page and update resources whenever the repository is 
changed. 

For example, the code to generate the [documentation](https://linkageio-cob.readthedocs.io/en/latest/) for COB 
lives in the GitHub repository, however whenever there is a change to the repo, readthedocs.org is sent a notification
and the live documentation is automatically updated. This means that the docs and the github repor are *always insync!*. 
Somtimes changes to the repo will result in an error in a CI (perhaps an unknown bug was introduced), these should be resolved
before a PR is accepted.

## Setting up a development environment
The source code that runs COB needs to be built before it can be run and tested. This is partially since COB has several
code dependencies that are not included in the source code and need to be set up before COB will run. We use [setuptools](https://github.com/pypa/setuptools) to handle software dependencies and [pip](https://pip.pypa.io/en/stable/installing/) 
to handle package installations.

As COB was written in Python and Javascript, which dont need to be compiled, there is nice tooling to allow you to build a
development environment where you can run code changes live. This section will help you set up a developer friendly coding
environment.

### Setting up a conda python environment
COB has dependencies that require specific versions of python libraries. You can view all the dependencies in `setup.py`.
Often these dependencies will conflict with versions you have installed on your system or other python packages. One
way to avoid this is by using python virtual environments. Virtual environments allow you to install dependencies into
project specific namespaces so they do not conflict with any other installed packages. Install miniconda [here](https://docs.conda.io/en/latest/miniconda.html) and execute the following command to create a virtual env for COB.

```
$ conda create -n cob python=3.6
Collecting package metadata: done
Solving environment: done

## Package Plan ##

  environment location: /home/schae234/.conda/envs/cob

  added / updated specs:
    - python=3.6


The following packages will be downloaded:

    package                    |            build
    ---------------------------|-----------------
    ca-certificates-2019.5.15  |                0         133 KB
    certifi-2019.3.9           |           py36_0         155 KB
    libgcc-ng-9.1.0            |       hdf63c60_0         8.1 MB
    libstdcxx-ng-9.1.0         |       hdf63c60_0         4.0 MB
    openssl-1.1.1c             |       h7b6447c_1         3.8 MB
    pip-19.1.1                 |           py36_0         1.9 MB
    python-3.6.8               |       h0371630_0        34.4 MB
    setuptools-41.0.1          |           py36_0         656 KB
    sqlite-3.28.0              |       h7b6447c_0         1.9 MB
    wheel-0.33.4               |           py36_0          40 KB
    ------------------------------------------------------------
                                           Total:        55.1 MB

[ .... TRUNCATED......] 
```
Activate your virtual environment to create a project space for COB:
```
$ source activate cob
(cob) $ 
```
The `(cob)` in your prompt indicates that you are in a python virtual environment. You can also double check
everything is correct by looking at the path of your Python executable. If you are within a python environment
you should see your python binary is somewhere within your home directory (designated by a `~`).
```
(cob) $ which python
~/.conda/envs/cob/bin/python
```

### Installing dependencies and and editable COB package
If you do not have pip installed, follow the instructions [here](https://pip.pypa.io/en/stable/installing/). Pip reads 
data files in the COB repository and installs all he necessary packages to get COB working. The first thing that needs
to be installed is `numpy` which is necessary in order install COB with `pip`. Make sure you are in your python virtual environment (you should have a `(cob)` in your shell prompt!)
```
(cob) $ pip install numpy
Collecting numpy
  Downloading https://files.pythonhosted.org/packages/87/2d/e4656149cbadd3a8a0369fcd1a9c7d61cc7b87b3903b85389c70c989a696/numpy-1.16.4-cp36-cp36m-manylinux1_x86_64.whl (17.3MB)
     |████████████████████████████████| 17.3MB 27.2MB/s 
Installing collected packages: numpy
Successfully installed numpy-1.16.4
```
Now you can install COB with pip! If you have not already, clone the COB repo onto your computer:
```
# Make sure its YOUR GitHub username
$ git clone git@github.com:<USERNAME>/cob.git
```
Change into the cob source code directory
```
# ensure you are in the COB src directory
$ cd cob/
$ pwd
/home/rob/Codes/cob
$ pip install -e .
```

`Pip` reads the `setup.py` file and fetches all the appropriate packages and installs them for you (there are quite a few!)
The `-e` flag tells `pip` that you want to install COB in 
["editable mode"](https://pip.pypa.io/en/stable/reference/pip_install/#install-editable). This means that if you edit any of the 
source files, they will be automagically updated in the installed COB package! 

What is great about this is that you will have everything set up in the same way that someone who would have COB
installed would have, including links to cob scripts and executables. Prior to running the `cob` command, a `.camoco.conf` file needs to be generated as:

```
$ camoco
usage: camoco [-h] [--version] [--debug] [--interactive] [--force]
              Available Commands ...

      ___           ___           ___           ___           ___           ___      
     /  /\         /  /\         /__/\         /  /\         /  /\         /  /\     
    /  /:/        /  /::\       |  |::\       /  /::\       /  /:/        /  /::\    
   /  /:/        /  /:/\:\      |  |:|:\     /  /:/\:\     /  /:/        /  /:/\:\   
  /  /:/  ___   /  /:/~/::\   __|__|:|\:\   /  /:/  \:\   /  /:/  ___   /  /:/  \:\  
 /__/:/  /  /\ /__/:/ /:/\:\ /__/::::| \:\ /__/:/ \__\:\ /__/:/  /  /\ /__/:/ \__\:\ 
 \  \:\ /  /:/ \  \:\/:/__\/ \  \:\~~\__\/ \  \:\ /  /:/ \  \:\ /  /:/ \  \:\ /  /:/ 
  \  \:\  /:/   \  \::/       \  \:\        \  \:\  /:/   \  \:\  /:/   \  \:\  /:/  
   \  \:\/:/     \  \:\        \  \:\        \  \:\/:/     \  \:\/:/     \  \:\/:/   
    \  \::/       \  \:\        \  \:\        \  \::/       \  \::/       \  \::/    
     \__\/         \__\/         \__\/         \__\/         \__\/         \__\/ 

Camoco (Co-analysis of Molecular Components) inter-relates and co-analyzes different 
levels of genomic data. Namely it integrates genes present near and around GWAS loci
using unbiased, functional information derived from co-expression networks.

optional arguments:
  -h, --help          show this help message and exit
  --version           print the software version
  --debug             Drop into ipdb when something bad happens.
  --interactive       Initiate an ipdb session right before exiting.
  --force             Overwrite output files from previous analyses.

Camoco CLI program:
  Use --help with each command for more info

  Available Commands
    help              Prints this help message
    build-gwas        build a GWAS dataset
    build-go          Build a Gene Ontology (GO)
    build-refgen      Build a Reference Genome.
    build-cob         Build a Co-expression network.
    list (ls)         List camoco datasets.
    rm                Remove camoco dataset.
    overlap           Calculate network overlap among GWAS results. See
                      --method for details.
    health            Generate network health statistics
    snp2gene          Generate candidate genes and accompanying information
                      from GWAS SNPs
    neighbors         Generate significant gene neighbors from largest to
                      smallest Z-score

version: 0.6.3
src:/home/<USERNAME>/.conda/envs/cob/lib/python3.6/site-packages/camoco/__init__.py
Cache. Money. Corn.

```

Now you should have access to the `cob` command:

```
$ cob
Starting your server...
[2019-06-19 07:03:57 -0500] [25721] [INFO] Starting gunicorn 19.9.0
[2019-06-19 07:03:57 -0500] [25721] [INFO] Listening at: http://127.0.0.1:50000 (25721)
[2019-06-19 07:03:57 -0500] [25721] [INFO] Using worker: threads
[2019-06-19 07:03:57 -0500] [25724] [INFO] Booting worker with pid: 25724
[  ... TRUNCATED ...]

```
Pip set up the package so that the executables are pointing at the code in the `cob/` directory. Its the best of both
worlds because you can edit the source code, and all your changes get integrated into your current COB build. You can 
freely edit the source code and not have to recompile or re-install anything. Its the best of both worlds!


## Getting data into COB
COB is meant to be used as an interface to browse output from Camoco. This means that if we don't have any data
from camoco, COB is pretty useless. Luckily, we have a way to easily install some published datasets into camoco
that will make COB useable. The data lives in a separate directory so we need to set that up.

### Another git repo
```
# Move out of the `cob/` source code directory:
$ cd ..
# Clone the data repo
$ git clone https://github.com/csbio/camoco-cob-maize-demo.git
# Change into the data dir
$ cd camoco-cob-maize-demo/data/maize
```
The first script we run creates all the camoco gene co-expression networks and GWAS datasets (NOTE: make sure the cob virtual environment is active). **Warning** This step may take
10-15 minutes to run so go grab a coffee!
```
(cob) $ python MaizeBuildCommands.py
```
The second script is cool hack that imports in some camoco "overlap" results (see our roadmap for some background). 
The overlap command is very computationally intensive and even on high spec machines would take ~24 hours to run. Luckily
the data repo contains the output from the heavy lifting part of camoco and the overlap command is smart enough to 
cache these output files which acts like a cache. The result of this is that the overlap data just gets imported into
camoco and you don't need to wait around!
```
# NOTICE its a shell script!
$ sh runMaizeOverlap.sh
``` 

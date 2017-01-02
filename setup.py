#!/usr/bin/env python3

from setuptools import setup, find_packages, Extension
from pip.req import parse_requirements
from Cython.Distutils import build_ext
import os

import io
import re
import numpy

def read(*names, **kwargs):
    with io.open(
        os.path.join(os.path.dirname(__file__), *names),
        encoding=kwargs.get("encoding", "utf8")
    ) as fp:
        return fp.read()

def find_version(*file_paths):
    version_file = read(*file_paths)
    version_match = re.search(r"^__version__ = ['\"]([^'\"]*)['\"]",
                              version_file, re.M)
    if version_match:
        return version_match.group(1)
    raise RuntimeError("Unable to find version string.")

install_reqs = parse_requirements('requirements.txt',session=False)
reqs = [str(ir.req) for ir in install_reqs]
setup(
    name = 'cob',
    version = find_version('cob','__init__.py'),
    packages = find_packages(),
    scripts = [
        'cob/cli/cob'
    ],
    ext_modules = [],
    cmdclass = {'build_ext': build_ext},

    package_data = {
        '':['*.cyx']    
    },
    install_requires = reqs,	
    include_package_data=True,

    author = 'Rob Schaefer, Joe Jeffers',
    author_email = 'schae234@gmail.com',
    description = 'The Co-expression network browser',
    license = "MIT",
    url = 'https://github.com/schae234/camoco'
)

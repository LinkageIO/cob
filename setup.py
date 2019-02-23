#!/usr/bin/env python3

import os
import io
import re
import numpy
from setuptools import setup, find_packages, Extension


def read(*names, **kwargs):
    with io.open(
            os.path.join(os.path.dirname(__file__), *names),
            encoding=kwargs.get("encoding", "utf8")) as fp:
        return fp.read()


# Get the version form the init file
def find_version(*file_paths):
    version_file = read(*file_paths)
    version_match = re.search(r"^__version__ = ['\"]([^'\"]*)['\"]",
                              version_file, re.M)
    if version_match:
        return version_match.group(1)
    raise RuntimeError("Unable to find version string.")


# Add the README as the long description
root = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(root, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='camoco-cob',
    version=find_version('cob', '__init__.py'),
    packages=find_packages(),
    scripts=['cob/cli/cob'],
    ext_modules=[],
    package_data={'': ['*.cyx']},
    install_requires=['flask>=1.0.2', 'gunicorn>=19.9.0', 'camoco==0.6.2'],
    include_package_data=True,
    python_requires='>=3',
    author='Rob Schaefer, Joe Jeffers',
    author_email='schae234@gmail.com',
    description='The Co-Expression Network Browser',
    long_description=long_description,
    long_description_content_type='text/markdown',
    license="MIT",
    url='https://github.com/LinkageIO/cob')

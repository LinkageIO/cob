# Contributing
First of all, if you are reading this .... YOU ARE AWESOME! Thank you for considering contributing to
this project!! 🎉🎉🎉

If you have not already checked our [roadmap](https://github.com/LinkageIO/cob/issues/85), it should give you
and idea on our short and long term vision for the project. 

## COB Home Base
COB's [home base](https://github.com/LinkageIO/cob) is its github page, all of the "official" development will always 
ultimately make its way back to github. We follow a Fork/PR developement cycle. To contribute bug fixes, code changes,
new features, follow this example basic workflow which will add your name to the [contributors.md](https://github.com/schae234/cob/blob/master/Contributors.md) list!

### Basic Fork/PR Workflow Exercise
1. Fork the main github repo
![](https://i.imgur.com/PU9vlD5.png)
2. Clone **your** github fork onto your computer
![](https://i.imgur.com/5UwZY86.png)
Navigate to your forked version of the repo and copy to URL to clone a local repo:
```
# The $ sign indicates a shell (bash) command
# Make sure its YOUR USERNAME!
$ git clone git@github.com:schae234/cob.git
```

3. Commit and update changes to **your** local version
4. Push your changes to your github fork
5. Open a Pull Request (PR) to get your changes back into the main COB repo

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

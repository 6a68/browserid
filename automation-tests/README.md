getting started
===============

## how to run selenium tests inside the automation-tests directory against ephemeral, stage, or prod environments

We use python selenium bindings. The rest of browserid is written using node. The python setup is super easy, have no fear.

TODO: ephemeral/stage/prod toggling via config tweaks.

### Python setup

You should have python 2.7 on your system (check python --version).

We have to install a bunch of python libraries. pip fetches packages; virtualenv sandboxes them.

    easy_install pip
    pip install virtualenv

From the automated-tests directory, create a sandboxed python environment to install python dependencies (only need to do this once per clone):

    virtualenv bid_selenium 

Activate the virtualenv, install the dependencies, and then deactivate the virtualenv.

    . bid_selenium/bin/activate
    pip install -Ur requirements.txt
    deactivate

Sweet. Your environment is now ready.

### create a test user in conf/credentials.yaml

Some of the automation tests verify that existing accounts work, so create a test account, and put the info into conf/credentials.yaml.

### run the tests

Rather than activate and deactivate the virtualenv, it's easier to just invoke the virtualenv's copy of python, which is located at ```bid_selenium/bin/python2.7```.

The default pytest command line options are inside pytest.ini, so running tests locally is easy.

Use local firefox to run all tests:

    ./bid_selenium/bin/python2.7 -m pytest 

Use local Chrome (assuming you've downloaded [Chromedriver](http://code.google.com/p/selenium/wiki/ChromeDriver) to /usr/local/bin/chromedriver) to run just the tests inside the TestNewAccount class:

    ./bid_selenium/bin/python2.7 -m pytest --driver=chrome --chromepath=/usr/local/bin/chromedriver -kTestNewAccount

Use Sauce Labs (assuming you've got credentials in saucelabs.yaml) to run tests using IE 8:

    python -m pytest --platform=XP --browsername="internet explorer" --browserver=8 --saucelabs=conf/saucelabs.yaml

#### Check out your results
    
The tests create a /results directory, which contains an index.html file with test results, screenshots, and videos if you used sauce labs. In case of a failure, you'll also see the backtrace. Totally sweet.

## writing automation tests

TODO. More to come really really soon :-)

## Setting up Python in a Windows Environment

Note: this post talks about python 2.5, but you need to install 2.6 or 2.7, and not 3.x.

http://blog.sadphaeton.com/2009/01/20/python-development-windows-part-1installing-python.html
http://blog.sadphaeton.com/2009/01/20/python-development-windows-part-2-installing-easyinstallcould-be-easier.html

Alternately, think about running under cygwin instead.


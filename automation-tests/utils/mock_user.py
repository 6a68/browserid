#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time


class MockUser(dict):

    def __init__(self, domain='restmail.net'):
        self['email'] = 'testuser_%s@%s' % (repr(time.time()), domain)
        self['password'] = 'Password12345'

    # allow getting items as if they were attributes
    def __getattr__(self, attr):
        return self[attr]

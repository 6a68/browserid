/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla BrowserID.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * An abstraction which contains various pre-set deployment
 * environments and adjusts runtime configuration appropriate for
 * the current environmnet (specified via the NODE_ENV env var)..
 *
 * usage is
 *   exports.configure(app);
 */

const
substitution = require('./substitute.js'),
path = require('path');

var g_config = {
};

// get the value for a given key, this mechanism allows the rest of the
// application to reach in and set
exports.get = function(val) {
  if (val === 'env') return process.env['NODE_ENV'];
  return g_config[val];
}

// *** the various deployment configurations ***
const g_configs = { };

// production is the configuration that runs on our
// public service (browserid.org)
g_configs.production = {
  hostname: 'browserid.org',
  port: '443',
  scheme: 'https',
  use_minified_resources: true,
  log_path: '/home/browserid/var/',
  database: {
    driver: "mysql",
    user: 'browserid'
  }
};

// beta (diresworb.org) the only difference from production 
// is the hostname
g_configs.beta = JSON.parse(JSON.stringify(g_configs.production));
g_configs.beta.hostname = 'diresworb.org';

// development (dev.diresworb.org) the only difference from production 
// is, again, the hostname
g_configs.dev = JSON.parse(JSON.stringify(g_configs.production));
g_configs.dev.hostname = 'dev.diresworb.org';

// local development configuration
g_configs.local =  {
  hostname: '127.0.0.1',
  port: '10002',
  scheme: 'http',
  email_to_console: true, // don't send email, just dump verification URLs to console.
  use_minified_resources: false,
  log_path: path.join(__dirname, "..", "var", "logs"),
  database: { driver: "json" }
};

// default deployment is local
if (undefined === process.env['NODE_ENV']) {
  process.env['NODE_ENV'] = 'local';
}

g_config = g_configs[process.env['NODE_ENV']];

if (g_config === undefined) throw "unknown environment: " + exports.get('env');

function getPortForURL() {
  if (g_config['scheme'] === 'https' && g_config['port'] === '443') return "";
  if (g_config['scheme'] === 'http' && g_config['port'] === '80') return "";
  return ":" + g_config['port'];
}

g_config['URL'] = g_config['scheme'] + '://' + g_config['hostname'] + getPortForURL();

/*
 * Install middleware that will perform textual replacement on served output
 * to re-write urls as needed for this particular environment.
 *
 * Note, for a 'local' environment, no re-write is needed because this is
 * handled at a higher level.  For a 'production' env no rewrite is necc cause
 * all source files are written for that environment.
 */
exports.performSubstitution = function(app) {
  if (process.env['NODE_ENV'] !== 'production' &&
      process.env['NODE_ENV'] !== 'local') {
    app.use(substitution.substitute({
      'https://browserid.org': g_config['URL'],
      'browserid.org:443': g_config['hostname'] + ':' + g_config['port'],
      'browserid.org': g_config['hostname']
    }));
  }
};


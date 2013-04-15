/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/**
 * Takes care of loading up jwcrypto
 */

BrowserID.CryptoLoader = (function() {
  "use strict";

  var bid = BrowserID,
      mediator = bid.Mediator,
      network = bid.Network,
      RECHECK_DELAY_MS = 50;

  function loadScriptDeferred(src) {
    var onScriptLoaded = jQuery.Deferred();

    var script = document.createElement("script");
    script.setAttribute("src", src);
    script.onload = script.onreadystatechange = function() {
      var state = script.readyState;
      if (!state || /loaded|complete/.test(state)) {
        // when it's ready, resolve the deferred & unset the handler
        onScriptLoaded.resolve();
        script.onload = script.onreadystatechange = null;

      // XXX could handle script loading errors here by calling
      // onScriptLoaded.reject() instead of resolve()
    };
    document.head.appendChild(script);
    // return the deferred so listeners can wire up callbacks
    return onScriptLoaded;
  }

  var onJWCryptoLoaded;
  function requireJWCrypto(randomSeed, cb) {
    if (onJWCryptoLoaded) {
      // if the deferred exists, queue up the cb to be invoked when the deferred is resolved.
      // deferreds cache their result, so this works even if invoked after the file has loaded.
      onJWCryptoLoaded.done(cb); 
    } else {
      // the deferred doesn't exist, so create it
      onJWCryptoLoaded = $.Deferred();

      loadScriptDeferred('/production/bidbundle.js')
        .done(function() {
          var jwCrypto = window.require('./lib/jwcrypto');
          jwCrypto.addEntropy(randomSeed);
          // resolve any listeners and pass back jwCrypto to the callbacks
          onJWCryptoLoaded.resolve(jwCrypto);
      });
      // XXX could handle bidbundle load errors by adding a .fail() handler
    }
  }

  var Module = {
    /**
     * If not already done, load up JWCrypto.
     *
     * @method load
     */
    load: function(onSuccess, onFailure) {
      network.withContext(function(context) {
        requireJWCrypto(context.random_seed, onSuccess);
      }, onFailure);
    }
  };

  return Module;
}());


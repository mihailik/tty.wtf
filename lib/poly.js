if (typeof Promise === 'undefined') {
  Promise = polyfillPromise();
}

function polyfillPromise() {
  var queueCb = [];
  var queueArg = [];

  return Promise;

  function queueNext(callback, arg) {
    var set = queueCb.length;
    queueCb.push(callback);
    queueArg.push(arg);

    if (!set) {
      if (typeof setImmediate === 'function') setImmediate(drainQueue);
      else setTimeout(drainQueue, 0);
    }
  }

  function drainQueue() {
    while (true) {
      var cb = queueCb.pop();
      var arg = queueArg.pop();
      if (!cb) break;
      cb(arg);
    }
  }

  function Promise(resolver) {
    if (typeof resolver !== 'function') throw new Error('Expected function resolver: ' + typeof resolver);

    if (!(this instanceof Promise))
      return new Promise(resolver);

    var self = this;
    /** @type {'pending' | 'resolving' | 'fulfilled' | 'failed'} */
    var state = self['[[PromiseState]]'] = 'pending';
    var outcome;
    var cbOK, cbFail;

    function resolve(value) {
      if (state !== 'pending') return;

      if (value && typeof value.then === 'function') {
        self['[[PromiseState]]'] = state = 'resolving';
        value.then(
          function (value) {
            self['[[PromiseState]]'] = state = 'fulfilled';
            outcome = value;
            complete();
          },
          function (error) {
            self['[[PromiseState]]'] = state = 'failed';
            outcome = error;
            complete();
          });
      } else {
        self['[[PromiseState]]'] = state = 'fulfilled';
        outcome = value;
        complete();
      }
    }

    function reject(error) {
      if (state !== 'pending') return;
      self['[[PromiseState]]'] = state = 'failed';
      outcome = error;
      complete();
    }

    function complete() {
      var callbacks = state === 'fulfilled' ? cbOK : cbFail;
      cbOK = null;
      cbFail = null;
      if (!callbacks) return;

      for (var i = 0; callbacks && i < callbacks.length; i++) {
        queueNext(callbacks[i], outcome);
      }
    }

    function Then(callback, callbackFail) {
      if (typeof callback !== 'function') throw new Error('Expected function callback: ' + typeof callback);
      if (callbackFail != null && typeof callbackFail !== 'function') throw new Error('Expected omitted or function callbackFail: ' + typeof callbackFail);

      return new Promise(function (resolve, reject) {
        if (state === 'fulfilled') queueNext(withOK, outcome);
        if (state === 'failed') queueNext(withFail, outcome);

        (cbOK || (cbOK = [])).push(withOK);

        if (typeof callbackFail !== 'function')
          (cbFail || (cbFail = [])).push(withFail);

        function withOK(value) {
          handleSettled(value, callback);
        }

        function withFail(error) {
          handleSettled(error, callbackFail)
        }

        function handleSettled(outcome, callback) {
          try {
            outcome = callback(outcome);
            if (outcome && typeof outcome.then === 'function') {
              outcome.then(resolve, reject);
            } else {
              resolve(outcome);
            }

          } catch (error) {
            reject(error);
          }
        }
      });
    }

    function Catch(callback) {
      return Then(function (value) { return value; }, callback);
    }

    this.then = Then;
    this['catch'] = Catch;

    try {
      resolver(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }

  Promise.all = all;
  Promise.race = race;

  function all(arr) {
    return new Promise(function (resolve, reject) {
      if (!arr.length) { resolve([]); }
      var results = [];
      var toComplete = arr.length;
      for (var i = 0; i < arr.length; i++) {
        arr[i].then(
          callbackFor(i),
          fail
        );
      }

      function fail(error) {
        toComplete = 0;
        results = null;
        reject(error);
      }

      function callbackFor(i) {
        return function (value) {
          if (!toComplete) return;

          results[i] = value;
          toComplete--;
          if (!toComplete) resolve(results);
        };
      }
    });
  }

  function race(arr) {
    return new Promise(function (resolve, reject) {
      if (!arr) return resolve();
      for (var i = 0; i < arr.length; i++) {
        arr[i].then(resolve, reject);
      }
    });
  }

}
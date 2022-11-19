// @ts-check
function catchREST() {

  function getSelfScript() {
    return '// @ts-check\n' + (catchREST + '').replace(/\r\n/mg, '\n') + '\ncatchREST();\n';
  }

  /** @param {string} queryString */
  function unmangleFromQueryString(queryString) {
    var pairs = queryString.split('&');
    var result = {};
    for (var i = 0; i < pairs.length; i++) {
      var posEq = pairs[i].indexOf('=');
      var key = pairs[i].slice(0, Math.max(0, posEq));
      var value = posEq < 0 ? '' : pairs[i].slice(posEq + 1);
      switch (key.toLowerCase()) {
        case 'get':
          result.verb = 'GET';
          if (!result.url && value) result.url = value;
          continue;

        case 'post':
          result.verb = 'POST';
          if (posEq > 0) result.body = value;
          continue;

        case 'put':
          result.verb = 'PUT';
          if (posEq > 0) result.body = value;
          continue;

        case 'body':
          result.body = value;
          continue;

        case 'verb':
          result.verb = value;
          continue;
        
        case 'url':
          result.url = value;
          continue;

        default:
          if (posEq > 0) {
            if (!result.headers) result.headers = {};
            result.headers[key] = value;
          }
      }
    }

    return result;
  }

  /** @param {(text: string) => void} log @param {(describe, it) => void} tests */
  function runTests(log, tests) {
    /** @type {{name: string[], body: Function }[]} */
    var testDefinitions = [];
    /** @type {{name: string[], error?: any }[]} */
    var testResults = [];
    /** @type {string[]} */
    var currentGroup = [];

    /** @param {string} name @param {Function} body */
    function describe(name, body) {
      testDefinitions.push({ name: currentGroup.concat([name]), body: body });
    }

    /** @param {string} name @param {Function} body */
    function it(name, body) {
      testDefinitions.push({ name: currentGroup.concat([name]), body: body });
    }

    function runRemainingTests() {
      while (true) {
        var defn = testDefinitions.shift();
        if (!defn) return allTestsComplete();

        var asyncRes = runOneTestAsync(defn.name, defn.body);
        if (asyncRes) return asyncRes;
      }

      /** @param {string[]} name @param {Function} body */
      function runOneTestAsync(name, body) {
        var prevGroup = currentGroup;
        var prevTestCount = testDefinitions.length;
        currentGroup = name;
        try {
          var result = body();
          if (result && result.then === 'function') return result.then(
            function () {
              testSucceeded(name);
              runRemainingTests();
            },
            function (error) {
              testFailed(name, error);
              runRemainingTests();
            }
          );
        }
        catch (error) {
          testFailed(name, error);
          return;
        }

        testSucceeded(name);

        /** @param {string[]} name */
        function testSucceeded(name) {
          if (testDefinitions.length > prevTestCount) {
            // this was not a test, but test group
          } else {
            log(name.join(' - ') + ' OK');
            testResults.push({ name: name });
          }
          currentGroup = prevGroup;
        }

        /** @param {string[]} name @param {{ message: string; stack?: string; stackTrace?: string; }} error */
        function testFailed(name, error) {
          log(name.join(' - ') + ' FAILED ' + (
            !error.stack && !error.stackTrace ? error.message :
            (error.stack || error.stackTrace).indexOf(error.message) >= 0 ? (error.stack || error.stackTrace) :
            error.message + ' ' + (error.stack || error.stackTrace)
          ));
          testResults.push({ name: name, error: error });
          currentGroup = prevGroup;
        }
      }
    }

    function allTestsComplete() {
      if (!testResults.length) {
        log('No tests found.');
        return;
      } else if (testResults.length === 1) {
        // just printed result anyway, no need for summary of one
        return;
      }

      var succeeded = 0;
      var failed = 0;
      for (var i = 0; i < testResults.length; i++) {
        var res = testResults[i];

        //log(res.name.join(' - ') + ' ' + (!res.error ? ' OK' : ' FAILED'));

        if (res.error) failed++;
        else succeeded++;
      }

      log('Tests: ' + succeeded + ' success   ' + failed + ' failure.');
    }

    tests(describe, it);

    return runRemainingTests();
  }


  function runBrowser() {

  }

  /**
   * @param {boolean=} asModule
   * @param {boolean=} forTesting
   */
  function runNode(asModule, forTesting) {

    function runAsModule() {

    }

    function runAsServer() {

    }

    function runAsTests() {
      runTests(
        function (text) { console.log(text); },
        function (describe, it) {
          tests(describe, it);
          nodeTests(describe, it);
        }
      );
    }

    /**
     * @param {(name: string, body: Function) => void} describe
     * @param {(name: string, body: Function) => void} it
     */
    function nodeTests(describe, it) {
      describe('getSelfScript', function () {
        it('same as __filename', function () {
          var fs = require('fs');
          var selfContent = fs.readFileSync(__filename, 'utf8');
          if (selfContent !== getSelfScript()) throw new Error('Different!');
        });
      });
    }

    if (asModule) return runAsModule();
    else if (process.argv.filter(function (arg) { return arg === '--test' || arg === '/test'; }).length) return runAsTests();
    else return runAsServer();
  }

  function runWScript() {
    // TODO: look for node.js, and if it's not there pop an IE window suggesting download
    WScript.Echo('Catch REST is not capable to run in WSH mode. Install node.js and run Catch REST inside of it.');
  }

  /**
   * @param {(name: string, body: Function) => void} describe
   * @param {(name: string, body: Function) => void} it
   */
  function tests(describe, it) {
    describe('unmangleFromQueryString', function () {
      var data = {
        '': {},
        'post=none': { verb: 'POST', body: 'none' },
        'put=none': { verb: 'PUT', body: 'none' },
        'url=some': { url: 'some' }
      };
      for (var queryString in data) {
        setTest(queryString, data[queryString]);
      }

      function setTest(queryString, data) {
        var expected = JSON.stringify(data);
        it(JSON.stringify(queryString) + ' --> ' + expected, function () {
          var actual = JSON.stringify(unmangleFromQueryString(queryString));
          if (actual !== expected) throw new Error('mismatch:\n' + actual + ' instead of expected\n' + expected);
        });
      }
    });
  }

  function detectEnvironmentAndStart() {

    switch (detectEnvironment()) {
      case 'browser': return runBrowser();
      case 'node-script': return runNode(false /* asModule */);
      case 'node-module': return runNode(true /* asModule */);
      case 'wscript': return runWScript();
    }

    throw new Error('Running in an unsupported environment.');

    function detectEnvironment() {
      if (typeof window !== 'undefined' && window && typeof window.alert === 'function'
        && typeof document !== 'undefined' && document && typeof document.createElement === 'function')
        return 'browser';
      
      // TODO: detect worker in browser

      if (typeof process !== 'undefined' && process && process.argv && typeof process.argv.length === 'number'
        && typeof require === 'function' && typeof require.resolve === 'function'
        && typeof module !== 'undefined' && module)
        if ((process.mainModule || require.main) === module)
          return 'node-script';
        else
          return 'node-module';
      
      if (typeof WScript !== 'undefined' && WScript && !!WScript.ScriptFullName) return 'wscript';

      // TODO: detect apple script inside shell?
    }
  }


  detectEnvironmentAndStart();
}
catchREST();

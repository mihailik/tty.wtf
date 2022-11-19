// @ts-check
function startCatchREST() {

  var unicodeTitle = 'Catch REST ' + String.fromCharCode(55356) + String.fromCharCode(57209);
  var disableTypeScript = true;

  var importedJS = [
    'codemirror@5.64.0/lib/codemirror.js',

    // 'xlsx@0.17.4/dist/xlsx.full.min.js'
    'xlsx@0.17.4/xlsx.js',
    'xlsx@0.17.4/jszip.js'
  ];

  if (!disableTypeScript) {
    importedJS.push('typescript@4.7.3/lib/typescript.js');
    importedJS.push('ts-jsonp@4.7.3/index.js');
  }

  var importedStyles = [
    'codemirror@5.64.0/lib/codemirror.css'
  ];

  function getTimeNow() {
    if (typeof Date.now === 'function') return Date.now();
    return +new Date();
  }

  function detectEnvironmentAndStart() {

    switch (detectEnvironment()) {
      case 'browser': return runBrowser();
      case 'node-script': return runNode(false /* asModule */);
      case 'node-module': return runNode(true /* asModule */);
    }

    throw new Error('Running in an unsupported environment.');

    function detectEnvironment() {
      if (typeof window !== 'undefined' && window && typeof window.alert === 'function'
        && typeof document !== 'undefined' && document && typeof document.createElement === 'function')
        return 'browser';
      if (typeof process !== 'undefined' && process && process.argv && typeof process.argv.length === 'number'
        && typeof require === 'function' && typeof require.resolve === 'function'
        && typeof module !== 'undefined' && module)
        if ((process.mainModule || require.main) === module)
          return 'node-script';
        else
          return 'node-module';
    }
  }

  var unmangleFromURL = (function () {

    var regex_doubleSlashWithoutLeadingColon = /[^:]\/\//;

    /** @param mangled {string} */
    function unmangleFromURL(mangled) {

      var matchEndFirstLine = regex_doubleSlashWithoutLeadingColon.exec(mangled);
      if (!matchEndFirstLine)
        return unmangleFirstLine(mangled);

      return (
        unmangleFirstLine(mangled.slice(0, matchEndFirstLine.index + 1)) + '\n' +
        unmangleSubsequentLines(mangled.slice(matchEndFirstLine.index + matchEndFirstLine[0].length))
      );
    }

    /** @param {string} text */
    function unmangleFirstLine(text) {
      return decodeURIComponent(text.replace(/\+/g, '%20'));
    }

    /** @param {string} text */
    function unmangleSubsequentLines(text) {
      return decodeURIComponent(text.replace(/\+/g, '%20'))
        .replace(/\//g, '\n');
    }

    return unmangleFromURL;
  })();

  var mangleForURL = (function () {

    /** @param {string} text */
    function mangleForURL(text) {
      if (!text) return '';

      // POST http://wikipedia.org
      // { "some": 123,
      //   "another": [1,2,3]
      // }
      //
      // becomes:
      // http://catch.rest/POST+http://wikipedia.org//{+"some":+123,/++"another":+[1,2,3]/}
      //
      // GET http://wikipedia.org/ --> http://catch.rest/GET+http://wikipedia.org/
      // POST http://wikipedia.org/ {"some":123} --> http://catch.rest/GET+http://wikipedia.org/+//{"some":123}

      var parsed = parseAsRequest(text);
      if (!parsed) return text;

      var whitespaceLead = parsed.whitespaceLead;
      var firstLine = parsed.firstLine;
      var otherLines = parsed.otherLines;

      if (whitespaceLead) whitespaceLead = mangleLeadingWhitespace(whitespaceLead);
      if (firstLine) firstLine = mangleFirstLine(firstLine);
      if (otherLines) otherLines = mangleOtherLines(otherLines);

      return (whitespaceLead || '') + (firstLine || '') + (otherLines ? '//' + otherLines : '');
    }

    var regex_SpaceOrNewline = /[ \n]/g;

    /** @param {string} leadingWhitespace */
    function mangleLeadingWhitespace(leadingWhitespace) {
      return leadingWhitespace.replace(regex_SpaceOrNewline, replaceSpaceOrNewline);
    }

    /** @param {string} spaceOrNewline */
    function replaceSpaceOrNewline(spaceOrNewline) {
      if (spaceOrNewline === ' ') return '+';
      else return '/';
    }

    var regex_colonSlashOrSlash = /(:\/\/+)|(\/\/+)|(\/$)/g;
    var regex_slash = /\//g;

    /** @param {string} firstLine */
    function mangleFirstLine(firstLine) {
      var pos = regex_colonSlashOrSlash.lastIndex = 0;
      var result = '';
      while (true) {
        var match = regex_colonSlashOrSlash.exec(firstLine);
        if (!match) {
          result += mangleText(firstLine.slice(pos));
          return result;
        }

        if (match && match[0].charCodeAt(0) === 47 /* slash */) {
          if (match[0] === '/') {
            // terminating slash
            if (match.index > pos) result += mangleText(firstLine.slice(pos, match.index)) + '/+';
            else result += '/+';
          } else {
            if (match.index > pos) result += mangleText(firstLine.slice(pos, match.index)) + replaceSlashesWith2F(match[0]);
            else result += replaceSlashesWith2F(match[0]);
          }
        } else {
          if (match.index > pos) result += mangleText(firstLine.slice(pos, match.index)) + match[0];
          else result += match[0];
        }
        pos = match.index + match[0].length;
      }
    }

    /** @param {string} text */
    function replaceSlashesWith2F(text) {
      return text.replace(regex_slash, '%2F');
    }

    var regex_hexedColonEqualPlusQuestionSlash = /%3A|%3D|%20|%3F|%2F/ig;

    /** @param {string} text */
    function mangleText(text) {
      return encodeURIComponent(text).replace(regex_hexedColonEqualPlusQuestionSlash, replaceColonEqualPlusQuestionSlash);
    }

    /** @param {string} matchText */
    function replaceColonEqualPlusQuestionSlash(matchText) {
      if (matchText === '%3A') return ':';
      else if (matchText === '%3D') return '=';
      else if (matchText === '%20') return '+';
      else if (matchText === '%3F') return '?';
      else return '/';
    }

    var regex_hexedColonEqualPlusNewline = /%3A|%3D|%20|%0A/ig;

    /** @param {string} otherLines */
    function mangleOtherLines(otherLines) {
      return encodeURIComponent(otherLines).replace(regex_hexedColonEqualPlusNewline, replaceColonEqualPlusNewline);
    }

    /** @param {string} matchText */
    function replaceColonEqualPlusNewline(matchText) {
      if (matchText === '%3A') return ':';
      else if (matchText === '%3D') return '=';
      else if (matchText === '%20') return '+';
      else return '/';
    }


    return mangleForURL;
  })();


  /** @param source {string} */
  function decodeText(source) {
    if (!source) return '';

    if (/^txt~/.test(source)) {
      return source.slice('txt~'.length);
    } else if (/^b~/.test(source)) {
      return convertFromCompressed(source.slice('b~'.length));
    } else {
      return source;
    }
  }

  /** @param text {string} */
  function encodeText(text) {
    if (text.length < 1900 && !/^\//.test(text)) return text;
    if (text.length < 1900) return 'txt~' + text;
    return 'b~' + convertToCompressed(text);
  }

  /** @param {string} text */
  function convertToCompressed(text) {
    // @ts-ignore JSZipSync is defined
    var jsz = JSZipSync();
    jsz.text('t', text);
    return jsz.generate();
  }

  /** @param {string} text */
  function convertFromCompressed(text) {
    try {
      /** @type {number[]} */
      var bytes = [];
      var bytesStr = atob(text);
      for (var i = 0; i < bytesStr.length; i++) {
        bytes.push(bytesStr.charCodeAt(i));
      }

      // @ts-ignore JSZipSync is defined
      var jsz = JSZipSync(bytes);
      /** @type {string} */
      var content = jsz.file('t').asText();
      return content;
    }
    catch (err) {
      console.error('decompression error: ', err);
      return '';
    }
  }

  function getFunctionCommentContent(fn) {
    return (fn + '').replace(/^([\s\S\n\r]*\/\*\s*)([\s\S\n\r]*)(\s*\*\/[\s\r\n]*}[\s\r\n]*)$/, function (whole, lead, content, tail) { return content; });
  }

  /**
   * @param {boolean} asModule
   */
  function runNode(asModule) {
    var fs = require('fs');
    var http = require('http');
    /** @type {http.Server} */
    var server;
    var scriptParent;
    var ghostProcess;

    var HTTP_PORT = 3100;

    if (!asModule) {
      runAsScript();
    }
    //TODO: run as module? for testing too

    function runAsScript() {

      if (!scriptParent && process.send) {
        // if child script, delay until parent is linked
        process.on('message', /** @param {*} msg */ function (msg) {
          if (msg && msg.scriptParent && !scriptParent) {
            scriptParent = msg.scriptParent;
            runAsScript();
          }
        });

        return;
      }

      process.stdout.write('Catch REST');
      var startServerPromise = startServer(handleRequest, HTTP_PORT);
      startServerPromise.then(
        function (listeningServer) {
          process.stdout.write(' http://localhost:' + HTTP_PORT + '/\n');
          server = listeningServer;

          if (process.connected) {
            watchDedicatedTtyParentAndExit();
          } else {
            watchSelfAndRestart();
          }
        },
        function (startServerError) {
          console.log('\n\nSHUTDOWN: CANNOT START http://localhost:' + HTTP_PORT + '/\n', startServerError);
          initiateShutdown();
        }
      );
    }

    function watchDedicatedTtyParentAndExit() {
      process.stdin.on('end', () => {
        console.log('parent exited.');
        initiateShutdown();
      });
    }

    function watchSelfAndRestart() {
      var lastFileContent;
      fs.watch(__filename, function () {
        fs.readFile(__filename, function (err, dt) {
          if (err) return;
          var contentStr = '' + dt;
          if (!lastFileContent) lastFileContent = getCurrentJS();
          if (contentStr !== lastFileContent) {
            lastFileContent = contentStr;
            initiateRestart(' changed:' + __filename + '\n\n');
          }
        });
      });
    }

    /**
     * @param {http.RequestListener} requestListener
     * @param {number} port
     * @returns {Promise<http.Server>}
     */
    function startServer(requestListener, port) {
      return new Promise(function (resolve, reject) {
        var started = false;
        var retryCount = 0;
        var MAX_LISTEN_RETRY_COUNT = 30;

        tryStarting();

        function tryStarting() {

          var server = http.createServer(requestListener);
          server.on('error', handleServerError);
          server.listen(port, handleServerListening);

          function handleServerListening() {
            started = true;
            server.off('error', handleServerError);
            if (process.send) {
              process.send({ server: { requestTimeout: server.requestTimeout }, platform: process.platform, cwd: process.cwd });
            }
            resolve(server);
          }

          function handleServerError(error) {
            if (started) return;

            if (error.code === 'EADDRINUSE') {
              if (retryCount >= MAX_LISTEN_RETRY_COUNT) {
                error.message = '[' + retryCount + '] ' + error.message;
                return reject(error);
              }

              if (!retryCount) {
                retryCount = (retryCount || 0) + 1;

                // first try failed, request shutdown and keep retrying
                process.stdout.write(' handover..');
                if (scriptParent) {
                  // @ts-ignore when scriptParent is set, process.send will exist
                  process.send(
                    { server: { requestTimeout: server.requestTimeout }, platform: process.platform, cwd: process.cwd });
                }

                requestShutdownExisting(port).then(
                  function () {
                    process.stdout.write('.');
                    tryStarting();
                  },
                  function (err) {
                    process.stdout.write(' [' + err.message + ']');
                    tryStarting
                  })
              } else {
                retryCount++;
                setTimeout(tryStarting, 200);
              }
              return;
            }

            reject(error);
          }
        }
      });
    }

    /**
     * @param {number} port
     * @returns {Promise<string>}
     */
    function requestShutdownExisting(port) {
      return new Promise(function (resolve, reject) {

        var postShutdownRequest = http.request(
          'http://localhost:' + port + '/shutdown', { method: 'POST' },
          handleResponse);

        postShutdownRequest.on('error', function (error) {
          if (requestCompleted) return;
          clearTimeout(requestTimeout);
          reject(error);
        });

        postShutdownRequest.end(String(scriptParent));

        var requestCompleted = false;
        var requestTimeout = setTimeout(function () {
          if (requestCompleted) return;
          requestCompleted = true;
          /** @type {Error & { timeout?: boolean }} */
          var error = new Error('Timeout');
          error.timeout = true;
          reject(error);
        }, 10000);

        /**
         * @param {http.IncomingMessage} res
         */
        function handleResponse(res) {
          if (requestCompleted) return;

          if (res.statusCode === 200) {
            if (!res.headers['content-length']) {
              requestCompleted = true;
              return resolve(res.statusCode + ' ' + res.statusMessage);
            }

            var dtMsg = '';

            res.on('data', function (dt) {
              if (requestCompleted) return;
              dtMsg += dt;
            });

            res.on('end', function () {
              if (requestCompleted) return;
              requestCompleted = true;
              resolve(dtMsg);
            });

            res.on('error', function (error) {
              if (requestCompleted) return;
              requestCompleted = true;
              reject(error);
            });
          } else {
            reject(res);
          }
        }
      });
    }

    /**
     * @param req {http.IncomingMessage}
     * @param res {http.ServerResponse}
     */
    function handleRequest(req, res) {

      var url = req.url || '/';

      if (/^\/favicon\b/.test(url)) {
        res.statusCode = 200;
        res.end();
        return;
      }
      else if (/^\/index\.js\b/.test(url)) {
        handleIndexJSRequest(req, res);
        return;
      }
      else if (/^\/restart\b/.test(url)) {
        handleRestartRequest(req, res);
        return;
      }
      else if (/^\/shutdown\b/.test(url)) {
        handleShutdownRequest(req, res);
        return;
      }
      else if (/^\/cors(\/?)/.test(url) && req.method === 'POST') {
        handleCorsRequest(req, res);
        return;
      }

      handleWithHTML(res, req);
    }

    function getCurrentJS() {
      var jsText =
        '// @ts-check\n' +
        startCatchREST + '\n\n' +
        'startCatchREST();\n';
      return jsText;
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function handleIndexJSRequest(req, res) {
      res.statusCode = 200;
      var jsText = getCurrentJS();

      process.stdout.write(req.method + ' ' + req.url + ' [application/javascript ' + jsText.length + '] 200/OK\n');
      res.setHeader('Content-Type', 'application/javascript');
      res.end(jsText);
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function handleRestartRequest(req, res) {
      if (req.method === 'GET') {
        console.log('GET ' + req.url + ' --> redirecting to POST form');
        res.setHeader('Content-Type', 'text/html');
        res.end('<form method=POST> RESTART: <input type=submit> </form>');
        return;
      }

      console.log(req.method + ' ' + req.url + ' --> initiating restart... ');
      initiateRestart(' ' + req.method + ':' + req.url + ' ');
      res.end('RESTART INITIATED');
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function handleShutdownRequest(req, res) {
      if (req.method === 'GET') {
        console.log('GET ' + req.url + ' --> redirecting to POST form');
        res.setHeader('Content-Type', 'text/html');
        res.end('<form method=POST> SHUTDOWN: <input type=submit> </form>');
        return;
      }

      var dtMsg = '';
      req.on('data', function (dt) { dtMsg += dt; });
      req.on('end', function () {
        dtMsg = dtMsg.replace(/^\s+/, '').replace(/\s+$/, '');
        initiateShutdown(dtMsg);
        res.end(
          process.pid + '\n' +
          'SHUTDOWN INITIATED');
      });
    }

    /**
     * @param {http.ServerResponse} res
     * @param {http.IncomingMessage} req
     */
    function handleWithHTML(res, req) {
      var html = generateHTML();

      res.setHeader('Content-Type', 'text/html');
      res.end(html);

      if (req.url !== '/keep-alive')
        console.log(req.method + ' ' + req.url + ' --> [text/html ' + html.length + '] 200/OK');
    }

    /**
     * @param {http.IncomingMessage} req
     */
    function getRequestBodyTextAsync(req) {
      return new Promise(function (resolve, reject) {
        var dataArray = [];

        req.on('error', handleReadRequestError);
        req.on('data', handleReadRequestData);
        req.on('end', handleReadRequestEnd);
        req.read();

        function handleReadRequestError(error) {
          reject(error);
        }

        function handleReadRequestData(data) {
          dataArray.push(data);
        }

        function handleReadRequestEnd() {
          var wholeBuffer = dataArray.length === 1 ? dataArray : Buffer.concat(dataArray);
          var wholeText = wholeBuffer.toString();
          resolve(wholeText);
        }
      });
    }

    /** @typedef {{
     *  status: number;
     *  statusText: string;
     *  headers: Record<string, string | string[] | undefined>;
     *  body?: string;
     *  url: string;
     * }} ProxiedRequestResponse */

    /**
     * @param {string} url
     * @param {string} verb
     * @returns {Promise<ProxiedRequestResponse>}
     */
    function requestAsync(url, verb) {
      return new Promise(function (resolve, reject) {
        var redirectUrl;
        var isHttps = /^https/i.test(url);
        var http = isHttps ? require('https') : require('http');
        var URL = require('url');
        var parsedURL = URL.parse(url);
        var requestObj = http.request(
          {
            hostname: parsedURL.hostname,
            port: parsedURL.port || undefined,
            path: parsedURL.path,
            method: verb || 'GET',
          }, handleRequestResponse);

        requestObj.on('error', handleRequestError);
        requestObj.on('timeout', handleRequestTimeout);
        requestObj.end(String(process.pid));

        /**
         * @param {http.IncomingMessage} res
         */
        function handleRequestResponse(res) {
          var isRedirect =
            res.headers.location &&
            [301, 302, 303, 307].indexOf(/** @type {number}*/(res.statusCode)) >= 0;

          if (isRedirect) {
            redirectUrl = /** @type {string} */(res.headers.location);
            console.log('/cors redirect ' + url + ' --> ' + redirectUrl + '...');
            resolve(requestAsync(redirectUrl, verb));
            return;
          }

          if (Number(res.headers['content-length']) > 0) {
            var responseBodyPromise = getRequestBodyTextAsync(res);
            responseBodyPromise.then(
              handleResponseBodyReceived,
              handleResponseBodyError
            );
          } else {
            handleRequestResponseWithBody(res);
          }

          function handleResponseBodyReceived(bodyText) {
            handleRequestResponseWithBody(res, bodyText);
          }

          function handleResponseBodyError(error) {
            console.log('/cors body: ' + error.message);
            reject(error);
          }
        }

        function handleRequestError(err) {
          console.log('/cors request onerror: ' + err.message);
          reject(err);
        }

        function handleRequestTimeout() {
          console.log('/cors request timeout');
          reject(new Error('Request ' + url + ' timed out.'));
        }

        /**
         * @param {http.IncomingMessage} res
         * @param {string=} bodyText
         */
        function handleRequestResponseWithBody(res, bodyText) {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: bodyText,
            url: url
          });
        }
      });
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    function handleCorsRequest(req, res) {
      var bodyTextPromise = getRequestBodyTextAsync(req);
      bodyTextPromise.then(function (text) { handleCorsRequestWithBody(req, res, text); });
    }

    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {string} bodyText
     */
    function handleCorsRequestWithBody(req, res, bodyText) {
      var parsed = parseAsRequest(bodyText);
      if (!parsed) {
        res.statusCode = 404;
        res.statusMessage = 'NO REQUEST';
        res.end('404 NO REQUEST?');
        console.log('/cors NO REQUEST');
        return;
      }

      console.log('/cors ' + parsed.url + '...');

      const requestPromise = requestAsync(parsed.url, parsed.verb);
      requestPromise.then(
        handleCorsRequestProxied,
        handleCorsRequestProxyFailed
      );

      /**
       * @param {ProxiedRequestResponse} proxied
       */
      function handleCorsRequestProxied(proxied) {
        res.end(JSON.stringify(proxied));
        console.log(
          '/cors ' +
          proxied.status + ' ' + proxied.statusText + ' ' +
          (!parsed || parsed.url === proxied.url ? '' : parsed.url + ' --> ') + proxied.url);
      }

      function handleCorsRequestProxyFailed(error) {
        res.statusCode = 500;
        res.statusMessage = error.message;
        res.end(error.stack || error + '');
        console.log('./cors ' + error.message);
      }
    }

    function generateHTML() {
      var title = unicodeTitle;
      var descr = title + '!';
      var scriptBaseURL = '/';
      return (
        '<!DOCTYPE html><html lang="en"><head>\n' +
        '<meta charset="UTF-8">\n' +
        '<meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        // TODO: decode text from URL and inject it into this title
        '<meta property="og:title" content="' + title + '">\n' +
        '<meta property="og:type" content="article" />\n' +
        '<meta property="og:description" content="' + descr + '">\n' +
        '<meta name="twitter:image:alt" content="' + descr + '">\n' +
        // '<meta property="og:image" content="' + baseURL + '~image' + localURL + '">\n' +
        // <meta property="og:url" content="http://euro-travel-example.com/index.htm">
        '<meta name="twitter:card" content="summary_large_image">\n' +

        '<' + 'script src="' + scriptBaseURL + 'index.js"' + '></' + 'script' + '>\n' +
        importedJS.map(function (jsfile) {
          return '<' + 'script' + ' src="' + '//unpkg.com/' + jsfile + '"></script>';
        }).join('\n') + '\n\n' +

        importedStyles.map(function (cssfile) {
          return '<link rel=stylesheet href="' + '//unpkg.com/' + cssfile + '">';
        }).join('\n') + '\n\n' +

        '<style>\n' +
        'html {\n' +
        ' box-sizing: border-box;\n' +
        ' background: white; color: black;\n' +
        ' font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";\n' +
        '}\n' +
        '*, *:before, *:after {\n' +
        ' box-sizing: inherit;\n' +
        '}\n' +
        '</style>\n' +

        '<title>' + title + '</title>\n' +
        '</head><body>\n' +

        '</body></html>'
      );
    }

    /** @param {string=} ghostIfPidMatch */
    function shutdownOrBecomeGhost(ghostIfPidMatch) {
      if (scriptParent || !ghostProcess) {
        process.stdout.write(' *' + process.pid + '(' + scriptParent + ') ');
        process.exit();
      } else {
        process.stdout.write(' *' + process.pid + ':close() ');
        server.close();
      }
    }

    /** @param {string=} ghostIfPidMatch */
    function initiateShutdown(ghostIfPidMatch) {
      process.stdout.write(' * ');
      setTimeout(function () {
        shutdownOrBecomeGhost(ghostIfPidMatch);
      }, 100);
    }

    /**
     * @param {string} msg
     */
    function initiateRestart(msg) {
      process.stdout.write(msg || ' restarting:' + process.pid + ' ');

      var child_process = require('child_process');

      /** @type {child_process.ChildProcess} */
      var proc;

      if (scriptParent) {
        // @ts-ignore send should be defined here
        process.send({
          restart: msg || 'restart by ' + process.pid
        });
      } else {
        proc = child_process.spawn(
          process.argv[0],
          process.argv.slice(1),
          // allow piping the stdio, and allow sending messages
          // (this is only for children of the first original process)
          { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] }
        );

        proc.on('message', handleChildProcessMessage);

        proc.send({ scriptParent: process.pid, platform: process.platform, cwd: process.cwd });

        // main process: keep pumping piped stdio
        proc.stdout.read();
        proc.stdout.on('data', function (procOut) {
          process.stdout.write(procOut);
        });

        proc.on('exit', () => {
          if (!ghostProcess) return;
          var closeOnServerDownTimeout = setTimeout(function () {
            process.exit();
          }, 2000);

          tryGet();

          function tryGet() {
            http.get('http://localhost:' + HTTP_PORT + '/keep-alive',
              function (req) {
                if (req.statusCode === 200) {
                  clearTimeout(closeOnServerDownTimeout);
                } else {
                  setTimeout(tryGet, 200);
                }
              }).on('error', function () {
                setTimeout(tryGet, 200);
              });
          }
        });
      }

      function handleChildProcessMessage(message) {
        if (message && message.restart) {
          initiateRestart(message.restart);
          return;
        }

        if (message && message.server) ghostProcess = true;

        proc.send({ scriptParent: process.pid, platform: process.platform, cwd: process.cwd });
      }
    }

  }

  var parseAsRequest = (function () {

    var regex_firstLineSeparated = /^([ \n]+)?([^\n]+)?\n?([\s\S]+)?$/;
    var regex_verbSeparated = /^\s*([A-Z]+)\s+(\S[\s\S]+)\s*$/i;
    var regex_schemeSet = /^[a-z]+:/i;

    /**
     * @param {string} text
     */
    function parseAsRequest(text) {
      var firstLineSeparatedMatch = regex_firstLineSeparated.exec(text);
      if (!firstLineSeparatedMatch) return;

      // slashes in the first line are preserved,
      // except for double-slashes that must be converted to %2F,
      // except where double-slash is preceded with colon, which is preserved too
      // also, leading line-breaks (interceded with spaces?) are converted simply to slashes

      var whitespaceLead = firstLineSeparatedMatch[1] || '';
      var firstLine = firstLineSeparatedMatch[2] ||'';
      var otherLines = firstLineSeparatedMatch[3] || '';
      if (!firstLine && !otherLines) return;

      var verbSeparatedMatch = regex_verbSeparated.exec(firstLine);

      if (verbSeparatedMatch && verbSeparatedMatch.length < 30) {
        var verb = verbSeparatedMatch[1];
        var url = verbSeparatedMatch[2];
      } else {
        var verb = 'GET';
        var url = firstLine.replace(/^\s+/, '').replace(/\s+$/, '');
      }

      var schemeSetMatch = regex_schemeSet.exec(url);
      if (!schemeSetMatch || schemeSetMatch[0].toLowerCase() === 'localhost:') {
        var deriveScheme = typeof location !== 'undefined' && /https/i.test(location.protocol || '') ? 'https' : 'http';
        url = deriveScheme + '://' + url.replace(/^\/+/, '');
      }

      return {
        whitespaceLead: whitespaceLead,
        firstLine: firstLine,
        otherLines: otherLines,
        verb: verb,
        url: url
      };
    }

    return parseAsRequest;
  })();

  function runBrowser() {

    document.title = unicodeTitle;
    populateInnerHTML();

    var layoutTABLE = /** @type {HTMLTableElement} */(document.getElementById('layoutTABLE'));
    var leftTD = /** @type {HTMLTableCellElement} */(document.getElementById('leftTD'));
    var requestTD = /** @type {HTMLTableCellElement} */(document.getElementById('requestTD'));
    var responseTD = /** @type {HTMLTableCellElement} */(document.getElementById('responseTD'));
    var statusTD = /** @type {HTMLTableCellElement} */(document.getElementById('statusTD'));
    var splitterTD = /** @type {HTMLTableCellElement} */(document.getElementById('splitterTD'));
    var splitterLabel = /** @type {HTMLSpanElement} */(document.getElementById('splitterLabel'));

    var sendBUTTON = /** @type {HTMLButtonElement} */(document.getElementById('sendBUTTON'));
    var sendLabel =  /** @type {HTMLSpanElement} */(document.getElementById('sendLabel'));

    /** @type {CodeMirror.Editor} */
    var requestCodeMirror;
    /** @type {CodeMirror.Editor} */
    var responseCodeMirror;

    splitterTD.onmousedown = splitterTD_onmousedown;
    splitterTD.ontouchstart = splitterTD_onmousedown;
    splitterTD.onmouseup = splitterTD_onmouseup;
    //splitterTD.onmousemove = splitterTD_onmousemove;
    window.onmousemove = splitterTD_onmousemove;
    window.ontouchmove = splitterTD_onmousemove;

    checkDocLoaded.repeatTimeout = null;
    checkDocLoaded();

    window.onload = function () {
      checkDocLoaded();
    }

    function checkDocLoaded() {
      if (document.readyState === 'complete') {
        var allScriptsLoaded =
          // @ts-ignore CodeMirror is defined
          typeof CodeMirror === 'function' &&

          (disableTypeScript ? true :
            typeof ts !== 'undefined' && typeof ts.createCompilerHost === 'function') &&

          // @ts-ignore JSZipSync is defined
          typeof JSZipSync === 'function';

        if (allScriptsLoaded) {
          console.log('All script loaded organically from HTML script tags');
          whenAllScriptsLoaded();
          return;
        }
        else {
          loadDependenciesAppropriately(function (source) {
            console.log('Dependencies loaded from ' + source);
            whenAllScriptsLoaded();
          });
        }
      }

      checkDocLoaded.repeatTimeout = setTimeout(checkDocLoaded, 500);
    }

    function whenAllScriptsLoaded() {
      set(statusTD, 'Loaded');
      continueWithDependencies();
      set(statusTD, 'Loaded.');

    }

    function getLocationSource() {
      if (!location) location = window.location;
      var source = unmangleFromURL(
        (location.hash || '').replace(/^#/, '') ||
        (location.search || '').replace(/^\?/, '') ||
        (location.pathname || '').replace(/^\//, '').replace(/^404.html/, '').replace(/^index.html/, '')
      );

      return source || '';
    }

    function loadDependenciesAppropriately(callback) {
      if (location.protocol === 'file:') {
        loadDependenciesFromLocalNodeModules(function (success) {
          callback('node_modules');
        });
      } else {
        loadDependenciesFromUnpkg(function (success) {
          callback('unpkg.com');
        });
      }

      /**
       * @param {(src: string) => string} mapSrc
       * @param {(success: boolean) => void} callback
       */
      function loadDependenciesFrom(mapSrc, callback) {
        /** @type {(HTMLScriptElement | HTMLLinkElement)[]} */
        var dependencyElements = [];

        for (var i = 0; i < importedJS.length; i++) {
          var script = document.createElement('script');
          script.src = mapSrc(importedJS[i]);
          dependencyElements.push(script);
        }

        for (var i = 0; i < importedStyles.length; i++) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = mapSrc(importedStyles[i]);
          dependencyElements.push(link);
        }

        loadDependencyElements(dependencyElements, callback);
      }

      /**
       * @param {(HTMLScriptElement | HTMLLinkElement)[]} elements
       * @param {(success: boolean, results: boolean[]) => void} callback
       */
      function loadDependencyElements(elements, callback) {
        // process = {
        //   env: {}
        // };
        // require = function () { }

        var loadedCount = 0;
        /** @type {boolean[]} */
        var results = [];

        for (var i = 0; i < elements.length; i++) {
          loadWithHandler(elements[i], i);
        }

        /**
         * @param {HTMLScriptElement | HTMLLinkElement} element
         * @param {number} i
         */
        function loadWithHandler(element, i) {
          elements[i].onload = onScriptLoaded;
          document.head.appendChild(elements[i]);

          /** @param {Event} evt */
          function onScriptLoaded(evt) {
            results[i] = true;
            loadedCount++;
            if (loadedCount === elements.length) {
              callback(true, results);
            }
          }
        }
      }

      /** @param {(success: boolean) => void} callback */
      function loadDependenciesFromUnpkg(callback) {
        loadDependenciesFrom(mapToUnpkg, callback);

        /** @param {string} src */
        function mapToUnpkg(src) {
          return '//unpkg.com/' + src;
        }
      }

      /** @param {(success: boolean) => void} callback */
      function loadDependenciesFromLocalNodeModules(callback) {
        loadDependenciesFrom(mapToNodeModules, callback);

        /** @param {string} src */
        function mapToNodeModules(src) {
          return './node_modules/' + src.replace(/^([^\/]+)@[^\/]+/, '$1');
        }
      }
    }

    /** @type {boolean} */
    var splitterTD_mice;

    /**
     * @param {{ button?: number }} evt
     * @param {boolean} down
     */
    function updateMice(evt, down) {
      if (evt.button) down = false;
      splitterTD_mice = down;

      if (splitterTD_mice) {
        if (!/(\s+|^)down(\s+|$)/.test(splitterTD.className || '')) splitterTD.className += ' down';
      } else {
        if (/(\s+|^)down(\s+|$)/.test(splitterTD.className || '')) splitterTD.className = (splitterTD.className || '').replace(/(\s+|^)down(\s+|$)/g, '');
      }
    }

    /** @param {Partial<MouseEvent>} evt */
    function splitterTD_onmousedown(evt) {
      updateMice(evt, true);
    }

    /** @param {MouseEvent} evt */
    function splitterTD_onmouseup(evt) {
      updateMice(evt, false);
    }

    /** @param {MouseEvent | TouchEvent} evt */
    function splitterTD_onmousemove(evt) {
      if (splitterTD_mice) {
        if (typeof evt.preventDefault === 'function') evt.preventDefault();

        var y =
          /** @type {MouseEvent} */(evt).pageY ||
          /** @type {MouseEvent} */(evt).y;

        if (!y) {
          var touches = /** @type {TouchEvent} */(evt).touches;
          if (touches && touches.length === 1)
            y = touches[0].pageY;
        }

        var ratio = y / (window.innerHeight - (statusTD.offsetHeight || statusTD.getBoundingClientRect().height));

        var ratioPercent = (ratio * 100).toFixed(2).replace(/0+$/, '') + '%';
        var reverseRatioPercent = (100 - ratio * 100).toFixed(2).replace(/0+$/, '') + '%';
        if (typeof JSON !== 'undefined' && JSON && typeof JSON.stringify === 'function') {
          window.name = '{"splitter": "' + ratioPercent + '"}';
        }

        if (requestTD.height !== ratioPercent) requestTD.height = ratioPercent;
        if (responseTD.height !== reverseRatioPercent) responseTD.height = reverseRatioPercent;
      }
    }

    /** @typedef {{
     *  status: number;
     *  statusText: string;
     *  headers: { [header: string]: string | string[] };
     *  body: string;
     *  type: ResponseType;
     *  redirected: boolean;
     *  url: string;
     * }} CommonResponseData */

    /**
     * @param {{ verb: string; url: string; body: string; }} req
     * @returns {Promise<CommonResponseData | undefined>}
     */
    function sendRequestAsync(req) {
      if (typeof location !== 'undefined' && location.host && /localhost|127/.test(location.host)) {
        return sendRequestAsync.detectAndSendDirectly(req);
      }

      return sendRequestAsync.sendViaCorsProxy(req);
    }

    sendRequestAsync.sendViaCorsProxy = (function () {
      /**
       * @param {{ verb: string; url: string; body: string; }} req
       * @returns {Promise<CommonResponseData | undefined>}
       */
      function sendViaCorsProxy(req) {
        console.log('sendViaCorsProxy ', req);
        return sendRequestAsync.detectAndSendDirectly(
          {
            url: '/cors',
            verb: 'POST',
            body: req.verb + ' ' + req.url + (req.body ? '\n' + req.body : '')
          }).then(handleResponse);
      }

      /**
       * @param {CommonResponseData | undefined} res
       */
      function handleResponse(res) {
        if (!res) return res;
        if (res.status === 200) {
          var jsonBody = JSON.parse(res.body);
          return jsonBody;
        }
      }

      return sendViaCorsProxy;
    })();

    sendRequestAsync.detectAndSendDirectly = (function () {
      /**
       * @param {{ verb: string; url: string; body?: string; }} req
       * @returns {Promise<CommonResponseData | undefined>}
       */
      function detectAndSendDirectly(req) {
        if (typeof fetch === 'function' && typeof Headers === 'function') return sendRequestAsync.sendUsingFetch(req);
        else if (typeof XMLHttpRequest === 'function') return sendRequestAsync.sendUsingXMLHttpRequest(req);
        else if (typeof ActiveXObject === 'function') return sendRequestAsync.sendUsingActiveXObject(req);
        else throw new Error('Cannot send any requests.');
      }

      return detectAndSendDirectly;
    })();

    sendRequestAsync.sendUsingFetch = (function () {

      /**
       * @param {{ url: string; verb: string; body?: string }} req
       */
      function sendUsingFetch(req) {
        try {
          var fetchPromise = fetch(
            req.url,
            {
              method: req.verb,
              body: req.body || void 0
            });

          return fetchPromise.then(fetchHandleResponse);
        }
        catch (fetchEarlyError) {
          return sendRequestAsync.sendUsingXMLHttpRequest(req);
        }

        /**
         * @param {Response} res
         */
        function fetchHandleResponse(res) {
          if (res.status === 200) {
            var textPromise = res.text();
            return textPromise.then(function (bodyText) {
              return fetchHandleBodyText(bodyText, res);
            });
          }
        }

        /**
         * @param {Response} res
         */
        function getHeaders(res) {
          /** @type {{ [header: string]: string | string[] }} */
          var headers = {};
          res.headers.forEach(function (value, key) {
            var existing = headers[key];
            if (typeof existing === 'string') headers[key] = [existing, value];
            else if (existing) existing.push(value);
            else headers[key] = value;
          });
          return headers;
        }

        /**
         * @param {string} bodyText
         * @param {Response} res
         */
        function fetchHandleBodyText(bodyText, res) {
          var headers = getHeaders(res);

          return {
            status: res.status,
            statusText: res.statusText,
            headers: headers,
            body: bodyText,
            type: res.type,
            redirected: res.redirected,
            url: res.url
          };
        }
      }

      return sendUsingFetch;
    })();

    sendRequestAsync.sendUsingXMLHttpRequest = (function () {

      /**
       * @param {{ verb: string; url: string; body?: string; }} req
       * @returns {Promise<CommonResponseData | undefined>}
       */
      function sendUsingXMLHttpRequest(req) {
        throw new Error('XMLHttpRequest feature is not implemented yet.');
      }

      return sendUsingXMLHttpRequest;
    })();

    sendRequestAsync.sendUsingActiveXObject = (function () {

      /**
       * @param {{ verb: string; url: string; body?: string; }} req
       * @returns {Promise<CommonResponseData | undefined>}
       */
      function sendUsingActiveXObject(req) {
        throw new Error('Internet Explorer ActiveX-based XMLHttpRequest feature is not implemented yet.');
      }

      return sendUsingActiveXObject;
    })();

    function continueWithDependencies() {
      requestTD.innerHTML = '';
      responseTD.innerHTML = '';
      // @ts-ignore CodeMirror is defined
      var CodeMirrorCtor = CodeMirror;
      var locationText = deriveTextFromLocation();
      updateSendLabel(locationText);
      requestCodeMirror = CodeMirrorCtor(requestTD,
        {
          lineNumbers: true,
          value: locationText,
          extraKeys: {
            'Ctrl-Enter': sendRequestInteractively,
            'Cmd-Enter': sendRequestInteractively,
          },
          autofocus: true
        });
      responseCodeMirror = CodeMirrorCtor(responseTD, { lineNumbers: true, readOnly: true });

      requestCodeMirror.on('changes', requestTextChanged);
      requestTextChanged.timeout = null;

      var sending;

      sendBUTTON.onclick = sendBUTTON_onclick;

      function requestTextChanged() {
        clearTimeout(requestTextChanged.timeout);
        requestTextChanged.timeout = setTimeout(debouncedRequestTextChanged, 100);
      }

      function debouncedRequestTextChanged() {
        requestTextChanged.timeout = 0;
        var text = requestCodeMirror.getValue();
        updateSendLabel(text);
        updateLocationWithText(text);
      }

      function sendBUTTON_onclick() {
        sendRequestInteractively();
      }

      function sendRequestInteractively() {
        if (requestTextChanged.timeout) {
          clearTimeout(requestTextChanged.timeout);
          debouncedRequestTextChanged();
        }

        set(splitterLabel, 'sending...');
        if (!/\bsending\b/i.test(splitterTD.className)) {
          splitterTD.className += ' sending';
        }

        var updateSendingTextInterval = setInterval(updateSendingText, 1000);

        var text = requestCodeMirror.getValue();
        var parsed = parseAsRequest(text);

        if (!parsed) {
          console.log('Cannot send empty request.');
          return;
        }

        var requestStart = getTimeNow();
        var promiseSendRequest = sendRequestAsync({
          verb: parsed.verb,
          url: parsed.url,
          body: parsed.otherLines
        });

        sending = promiseSendRequest;

        if (!promiseSendRequest) return;

        promiseSendRequest.then(
          handleRequestResponse,
          handleRequestFail
        );

        function updateSendingText() {
          if (sending !== promiseSendRequest) {
            clearInterval(updateSendingTextInterval);
            return;
          }

          var requestElapsedTime = getTimeNow() - requestStart;
          set(splitterLabel, 'sending: ' + Math.round(requestElapsedTime / 1000) + 's...');
        }

        /**
         * @param {CommonResponseData | undefined} res
         */
        function handleRequestResponse(res) {
          clearInterval(updateSendingTextInterval);
          if (sending !== promiseSendRequest) {
            return;
          }

          splitterTD.className = splitterTD.className.replace(/(^|\s+)sending(\s+|$)/g, ' ');

          var requestTime = getTimeNow() - requestStart;
          if (!res) {
            set(splitterLabel, 'REQUEST FAILED AS UNKNOWN ' + (requestTime / 1000) + 's');
            responseCodeMirror.setValue('');
            return;
          }

          set(splitterLabel, res.status + ' ' + res.statusText + ' ' + (requestTime / 1000) + 's');

          responseCodeMirror.setValue(
            res.body || ''
          );
        }

        function handleRequestFail(err) {
          clearInterval(updateSendingTextInterval);
          if (sending !== promiseSendRequest) {
            return;
          }

          splitterTD.className = splitterTD.className.replace(/(^|\s+)sending(\s+|$)/g, ' ');

          var requestTime = getTimeNow() - requestStart;
          set(splitterLabel, 'REQUEST FAILED ' + (requestTime / 1000) + 's');
          if (err && err.stack) {
            responseCodeMirror.setValue(err.message + '\n\n' + err.stack);
          } else {
            responseCodeMirror.setValue(err + '');
          }
        }
      }

      /**
       * @param text {string}
       * @param location {typeof window.location=}
       **/
      function updateLocationWithText(text, location) {
        if (!location) location = window.location;

        var existingText = deriveTextFromLocation(location);
        if ((text || '') === (existingText || '')) return false;

        var encoded = mangleForURL(encodeText(text));

        var hasReplaceState = typeof history !== 'undefined' && history && typeof history.replaceState === 'function';
        var isFileProtocol = /^file:$/i.test(location.protocol || '');
        var isAboutProtocol = /^about:$/i.test(location.protocol || '');
        var preferSearchToPath =
          !!(location.search || '').replace(/^\?/, '') // already has search query, keep it
          || /^\/api\//.test(location.pathname || '') // path starts with /api, this is azure function call
          || /^\/404.html/.test(location.pathname || ''); // path starts with /404.html, this is GitHub or CodeSpaces preview

        var allowReplaceState =
          !isFileProtocol &&
          !isAboutProtocol &&
          hasReplaceState;

        if (allowReplaceState && !preferSearchToPath) {
          history.replaceState(null, 'unused-string', location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/' + encoded);
        } else if (hasReplaceState && !isFileProtocol && !isAboutProtocol) {
          history.replaceState(null, 'unused-string', location.pathname + '?' + encoded);
        } else {
          if (preferSearchToPath) location.search = '';
          location.href = '#' + encoded;
        }
      }
    }

    function updateSendLabel(text) {
      var parsed = parseAsRequest(text);
      set(sendLabel, parsed && parsed.verb && parsed.verb.toUpperCase() || 'GET');
    }

    function docHead() {
      var head = document.head;
      if (!head) {
        var list = document.getElementsByTagName('head');
        if (list) head = list[0];
      }

      return head;
    }

    /**
     * @param {HTMLElement=} elem
     */
    function cleanContent(elem) {
      if (!elem) {
        var head = docHead();
        if (head) cleanContent(head);
        var body = document.body;
        if (body) cleanContent(body);
        return;
      }

      var thisScript = document.scripts && document.scripts[0];

      var children = elem.childNodes || elem.children;
      var remove = [];
      for (var i = 0; i < children.length; i++) {
        var ch = children[i];
        if (ch.nodeType === 3) {
          remove.push(ch);
          continue;
        }
        else if (/script/i.test(/** @type {HTMLElement} */(ch).tagName || '') && ch !== thisScript) {
          remove.push(ch);
        }
      }

      for (var i = 0; i < remove.length; i++) {
        /** @type {HTMLElement} */(remove[i].parentElement).removeChild(remove[i]);
      }
    }

    function populateInnerHTML() {
      if (!document.body) {
        var body = document.createElement('body');
        var docElem = document.documentElement;
        if (!docElem) {
          docElem = document.getElementsByTagName('html')[0];

          if (!docElem) {
            docElem = document.getElementsByTagName('head')[0];
            if (docElem) docElem = /** @type {HTMLElement} */(docElem.parentElement);
          }
        }
        docElem.appendChild(body);
      }


      cleanContent();

      var container = document.createElement('div');
      container.innerHTML = getFunctionCommentContent(initialHTML);
      var children = (container.childNodes || container.children);
      var add = [];
      for (var i = 0; i < children.length; i++) {
        add.push(children[i]);
      }
      for (var i = 0; i < add.length; i++) {
        document.body.appendChild(add[i]);
      }
    }

    restoreSplitterPosition();
    setTmpTexts();

    function setTmpTexts() {
      var tmpText = document.createElement('pre');
      var tmpBorder = document.createElement('pre');
      tmpBorder.style.cssText = tmpText.style.cssText = 'font: inherit; overflow: auto; height: 100%; width: 100%; border-left: solid #fbfbfb 2em; padding: 0.24em; padding-left: 0.11em;';
      set(tmpText, deriveTextFromLocation());
      requestTD.appendChild(tmpText);
      responseTD.append(tmpBorder);
    }


    /**
     * @param {typeof window.location=} location
     **/
    function deriveTextFromLocation(location) {
      var decoded = decodeText(getLocationSource());
      return decoded;
    }

    function getLocationSource() {
      if (!location) location = window.location;
      var source = unmangleFromURL(
        (location.hash || '').replace(/^#/, '') ||
        (location.search || '').replace(/^\?/, '') ||
        (location.protocol === 'file:' ? '' : (location.pathname || '').replace(/^\//, '').replace(/^api\//, '').replace(/^404.html/, ''))
      );

      return source || '';
    }

    function restoreSplitterPosition() {
      if (!window.name || typeof JSON === 'undefined' || !JSON || typeof JSON.parse !== 'function') return;
      try {
        var windowObj = JSON.parse(window.name);
        if (windowObj && windowObj.splitter && /%$/.test(windowObj.splitter)) {
          var num = Number(windowObj.splitter.replace(/%$/, ''));
          if (num > 0 && num < 100) {
            requestTD.height = windowObj.splitter;
            responseTD.height = (100 - num) + '%';
          }
        }
      } catch (err) {
        try { console.error('cannot restore splitter position: ', err); } catch (err) { }
      }
    }

    function set(elem, value) {
      if (typeof value === 'string') {
        if (elem && 'textContent' in elem) {
          elem.textContent = value;
        } else if (elem && 'innerText' in elem) {
          elem.innerText = value;
        } else {
          elem.text = value;
        }
      }
    }

    function initialHTML() {

      // <meta charset="UTF-8">
      // <meta http-equiv="X-UA-Compatible" content="IE=edge">
      // avoid this, it messes up some layout logic in Safari
      // meta name="viewport" content="width=device-width, initial-scale=1.0"

      /*
    <style>
    html {
      margin:0;padding:0;
      width:100%;height:100%;
      overflow:hidden;
      box-sizing: border-box;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;padding:0;
      width:100%;height:100%;
      overflow:hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    }

    td {
      border: solid 1px transparent;
    }
    
    #layoutTABLE {
      margin: 0;
      width: 100%; height: 100%;
    }
    
    #splitterTD {
      background: #fff0f3;
      border: solid 1px #fed4dc;
      border-left: none;
      cursor: ns-resize;
      padding: 0.3em;
      transition: background-color 200ms;
    }

    @keyframes fade {
      from { opacity: 1 }
      50% { opacity: 0.8 }
      to { opacity: 1 }
    }

    #splitterTD.sending {
      background: #fcdbe2;
      animation: 2s infinite alternate fade;
    }

    #splitterTD.down {
      background: #ffe8ed;
    }
    
    #leftTD {
      background: #fff0f3;
      padding: 1em;
    }

    #sendBUTTON {
      background: #75424c;
      border: solid 1px #ebb2c1;
      border-radius: 0.15em;
      font-size: 200%;
      padding: 0.25em;
      padding-left: 0.45em;
      padding-right: 0.45em;
      box-shadow: 2px 2px 8px #a97d89;
      color: #ffe8ee;
      cursor: pointer;
    }

    #sendBUTTON:disabled {
      background: #d9a9b2;
      border: solid 1px #8b7d81;
      border-radius: 0.15em;
      font-size: 200%;
      padding: 0.25em;
      padding-left: 0.45em;
      padding-right: 0.45em;
      color: #ffffff;
      cursor: default;
      text-shadow: 0px 0px 5px #140004;
      box-shadow: none;
    }

    #sendBUTTON #sendLabel {
      transform: scaleX(0.95);
    }
    
    #statusTD {
      background: #ffa4b4;
      padding-left: 0.5em;
      padding-bottom: 0.1em;
      padding-top: 0.1em;
    }

    #requestTD {
      position: relative;
      border-left: solid 1px #ffcfd6;
    }

    #responseTD {
      position: relative;
      border-left: solid 1px #ffcfd6;
    }

    td .CodeMirror {
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      font: inherit;
    }

    td .CodeMirror-gutters {
      border-right: solid 1px #e4e4e4;
    }

    td .CodeMirror-gutter.CodeMirror-linenumbers {
      background: #fbfbfb;
    }
    </style>
    </head>

    <table id=layoutTABLE cellspacing=0 cellpadding=0>
    <tr>
      <td id=leftTD width=20% rowspan=3 valign=top>

      <button id=sendBUTTON><span id=sendLabel><span style="filter: blur(2.5px)">GET</span></span></button>
    
      </td>
      <td width=80% height=50% id=requestTD>
    
      </td>
    </tr>
    <tr height=1>
      <td width=80% id=splitterTD>
        <span id=splitterLabel>output</span>
      </td>
    </tr>
    <tr>
      <td width=80% height=50% id=responseTD>
    
      </td>
    </tr>
    <tr>
      <td height=1 colspan=2 id=statusTD>
        Loading...
      </td>
    </tr>
    </table>
    
    */

    }

  }

  detectEnvironmentAndStart();

}

startCatchREST();

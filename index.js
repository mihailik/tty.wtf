// @ts-check <script>
function catchREST() {

  // #region SHARED FUNCTIONALITY

  /** @param {Function} fn */
  function getFunctionCommentContent(fn) {
    return (fn + '').replace(getFunctionCommentContent.regex_functionShape, getFunctionCommentContent.takeContent);
  }
  getFunctionCommentContent.takeContent = function (_whole, _lead, content, _tail) { return trimEnd(content); };
  getFunctionCommentContent.regex_functionShape = /^([\s\S\n\r]*\/\*\s*)([\s\S\n\r]*)(\s*\*\/[\s\r\n]*}[\s\r\n]*)$/;

  function getFunctionBody(fn) {
    return (fn + '').replace(getFunctionBody.regex_functionShape, getFunctionBody.takeContent);
  }
  getFunctionBody.takeContent = function (_whole, _lead, content, _tail) { return trimEnd(content); };
  getFunctionBody.regex_functionShape = /^([^{]*{\s*)([\s\S\n\r]*)(\s*}[\s\r\n]*)$/;

  /** @param {string | null | undefined} str */
  function trimEnd(str) {
    if (str == null) return '';
    return String(str).replace(trimEnd.regex_trailWS, '');
  }
  trimEnd.regex_trailWS = /[\r\n\s]+$/;


  function getTimeNow() {
    if (typeof Date.now === 'function') return Date.now();
    return +new Date();
  }

  function parseEncodedURL(url) {
    var verbOffset = getVerbOffset(url);
    if (verbOffset < 0) return;

    var encodedStr = url.slice(verbOffset + 1);
    var posEndVerbSlash = encodedStr.indexOf('/');
    var verb;
    if (posEndVerbSlash >= 0) {
      verb = encodedStr.slice(0, posEndVerbSlash);
      encodedStr = encodedStr.slice(posEndVerbSlash + 1);
    } else {
      verb = encodedStr;
      encodedStr = '';
    }

    if (verb === 'http:' || verb === 'https:') {
      encodedStr = verb + encodedStr;
      verb = 'get';
    }

    var addr;
    var addrEndPos = encodedStr.indexOf('//');
    if (addrEndPos > 0 && encodedStr.charAt(addrEndPos - 1) === ':')
      addrEndPos = encodedStr.indexOf('//', addrEndPos + 2);
    if (addrEndPos >= 0) {
      addr = encodedStr.slice(0, addrEndPos); // TODO: unescape strange characters here?
      encodedStr = encodedStr.slice(addrEndPos + 2);
    } else {
      addr = encodedStr;
      encodedStr = '';
    }

    var body = encodedStr;

    return {
      verb: verb,
      addr: addr,
      body: body
    };
  }

  /** @param {string | undefined | null} requestText */
  function parseTextRequest(requestText) {
    if (!requestText) return;
    var firstNonwhitespace = /\S/.exec(requestText);
    if (!firstNonwhitespace) return;

    var firstLineStart = requestText.lastIndexOf('\n', firstNonwhitespace.index) + 1;

    var leadEmptyLines = requestText.slice(0, firstLineStart);
    var firstLineEnd = requestText.indexOf('\n', firstLineStart);
    if (firstLineEnd < 0) firstLineEnd = requestText.length;
    var firstLine = requestText.slice(firstLineStart, firstLineEnd);
    var body = firstLineEnd < requestText.length ? requestText.slice(firstLineEnd + 1) : '';
    return {
      leadEmptyLines: leadEmptyLines,
      firstLine: firstLine,
      body: body
    };
  }

  /** @param {string} firstLine */
  function parseFirstLine(firstLine) {
    // TODO: detect verb, then URL, potentially infer HTTP/S protocol
  }

  function getVerbOffset(path) {
    var verbMatch = /\/(get|post|put|head|delete|option|connect|trace|http:|https:)(\/|$)/i.exec(path + '');
    return verbMatch ? verbMatch.index : -1;
  }

  function calcHash(str, seed) {
    if (!seed) seed = 0;
    var h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  if (typeof Math.imul !== 'function') (function () {
    function imul(x, y) {
      return (x * y) | 0;
    }
    Math.imul = imul;
  })();

  //#endregion SHARED FUNCTIONALITY

  // #region EMBEDDED RESOURCES

  var catchREST_hash = calcHash(catchREST + '').toString(36);

  var embeddedCSS = getFunctionCommentContent(function () {/*
html {
  box-sizing: border-box;
  margin:0;padding:0;
  width:100%;height:100%;

  background: white; color: black;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
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

  */});

  var embeddedBodyLayoutHTML = getFunctionCommentContent(function () {/*
  <table id=layoutTABLE cellspacing=0 cellpadding=0><tr><td height=100%>

    <table cellspacing=0 cellpadding=0 height=100% width=100%><tr>
      <td id=leftTD width=20% valign=top>
        <button id=sendBUTTON><span id=sendLabel><span style="filter: blur(2.5px)">GET</span></span></button>
      </td>

      <td width=80%>
        <table cellspacing=0 cellpadding=0 height=100% width=100%>
          <tr>
            <td height=50% id=requestTD></td>
          </tr>
          <tr>
            <td height=1 id=splitterTD> <span id=splitterLabel>output</span> </td>
          </tr>
          <tr>
            <td height=50% id=responseTD></td>
          </tr>
        </table>
      </td>
    </tr></table>

  </td></tr>
  <tr><td height=1 id=statusTD>
      Loading...
  </td></tr></table>
  */});

  var embeddedMetaBlockHTML = getFunctionCommentContent(function () {/*
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="Catch Rest 🍹">
<meta property="og:type" content="article" />
<meta property="og:description" content="Catch Rest 🍹!">
<meta name="twitter:image:alt" content="Catch Rest 🍹!">
<meta name="twitter:card" content="summary_large_image">
  */});

  var embeddedAdjustBaseURL = '(function() {\n' +
    getFunctionBody(function () {
      if (location.protocol.indexOf('file') >= 0) return;
      var verbOffset = getVerbOffset(location.pathname);
      if (verbOffset < 0) return;

      var baseUrl = location.protocol + '//' + location.host + '/' + location.pathname.slice(0, verbOffset);
      var inject = '<base href="' + baseUrl + '">';
      document.write(inject);
    }) + '\n\n' +
    getVerbOffset + '\n' +
    '})()';


  var embeddedWholeHTML = (function () {
    /** @type {Partial<typeof process>} */
    var pr = typeof process !== 'undefined' && process || {};
    var html =
      '<!DOCTYPE html><html lang="en"><head><!-- {build-by-hash:' + catchREST_hash + '} ' + new Date() + ' with  ' + pr.platform + '/' + pr.arch + ' -->\n' +
      embeddedMetaBlockHTML + '\n' +
      '<title>Catch Rest 🍹</title>\n' +

      '<' + 'script' + '>\n' +
      embeddedAdjustBaseURL + '\n' +
      '</' + 'script' + '>\n' +

      '<style>\n' +
      embeddedCSS + '\n' +
      '</style>\n' +

      '</head><body>' +

      embeddedBodyLayoutHTML + '\n' +

      '<' + 'script' + ' src="index.js"></' + 'script' + '>\n' +
      '<' + 'script' + ' src="lib.js"></' + 'script' + '>\n' +

      '<' + 'script' + '>\n' +
      'if (typeof catchREST !== "undefined" && catchREST && typeof catchREST.withDependenciesLoaded === "function")\n' +
      ' catchREST.withDependenciesLoaded();\n' +
      '</' + 'script' + '>\n' +

      '</body></html>';
    
    return html;
  })();
;
  // #endregion EMBEDDED RESOURCES

  /** @param {NodeModule=} module */
  function runAsNode(module) {
    var fs = require('fs');
    var path = require('path');
    var child_process = require('child_process');
    var http = require('http');
    var URL = require('url');

    /** @type {(() => void | (Promise<void>))[]} */
    var shutdownServices = [];
    var runningChildProcesses = [];

    var catchREST_secret_variable_name = 'catchREST_secret';
    var shared_process_secret = /** @type {string} */(process.env[catchREST_secret_variable_name]);
    if (!shared_process_secret) {
      shared_process_secret = calcHash(__dirname.toLowerCase()) + '-' + Math.random().toString(36).replace(/[\.+-,]/g, '') + '-' + Math.random().toString(36).replace(/[\.+-,]/g, '');
    }

    /** @typedef {import("http").IncomingMessage} HTTPRequest */
    /** @typedef {import("http").ServerResponse} HTTPResponse */

    // #region COMMON NODE UTILS

    /**
     * @param {string} file
     * @param {string=} encoding
     */
    function readFileAsync(file, encoding) {
      return new Promise(function (resolve, reject) {
        fs.readFile(file, { encoding: typeof encoding === 'undefined' ? 'utf8' : /** @type {BufferEncoding} */(encoding) }, function (err, text) {
          if (err) reject(err);
          else resolve(text);
        });
      })
    }

    /**
     * @param {string} file
     * @param {string | Buffer} content
     * @returns {Promise<void>}
     */
    function writeFileAsync(file, content) {
      return new Promise(function (resolve, reject) {
        fs.writeFile(file, content, function (err) {
          if (err) reject(err);
          else resolve();
        })
      });
    }

    function derivePort(str) {
      str = String(str).toLowerCase();
      var hash = calcHash(str);
      var port = 4000 + (hash % 4000);
      return port;
    }

    //#endregion

    function build() {
      // verify the build result

      var imports = [
        'codemirror/lib/codemirror.js',
        'codemirror/lib/codemirror.css',

        'xlsx/dist/xlsx.full.min.js',
        //'xlsx/jszip.js'

        'typescript/lib/typescript.js'
        // include lib.d.ts here? probably no
      ];

      var indexHTML_path = path.resolve(__dirname, 'index.html');
      var libJS_path = path.resolve(__dirname, 'lib.js');

      function detectLocalBuildValid() {
        return new Promise(function (resolve) {
          var markerRegexp = new RegExp('\\{build-by-hash:' + catchREST_hash + '\\}');
          var indexHTMLPromise = readFileAsync(indexHTML_path);
          var libJSPromise = readFileAsync(libJS_path);
          Promise.all([indexHTMLPromise, libJSPromise]).then(
            function (result) {
              var indexHTML_content = result[0];
              var libJS_content = result[1];
              resolve(markerRegexp.test(indexHTML_content) && markerRegexp.test(libJS_content));
            },
            function () {
              // failed to read
              resolve(false);
            });
        });
      }

      function readLocalImports() {
        var importReads = imports.map(function (importLocalPath) {
          var fullPath = path.resolve(__dirname, 'node_modules', importLocalPath);
          return readFileAsync(fullPath).then(function (content) {
            return {
              importLocalPath: importLocalPath,
              fullPath: fullPath,
              content: content
            };
          });
        });

        return Promise.all(importReads);
      }

      function readUnpkgImports() {
        var importDownloads = imports.map(function (importLocalPath) {
          return new Promise(function (resolve, reject) {
            var req = http.get('http://unpkg.com/' + importLocalPath);
            var buffers = [];
            req.on('data', function (data) {
              buffers.push(data);
            });
            req.on('error', function (err) {
              reject(err);
            });
            req.on('response', function (res) {
              if (res.statusCode !== 200) reject(new Error('HTTP/' + res.statusCode + ' ' + res.statusMessage));
            });
            req.on('end', function (res) {
              var wholeData = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
              resolve({
                importLocalPath: importLocalPath,
                content: wholeData.toString('utf8')
              });
            });
          });
        });

        return Promise.all(importDownloads);
      }

      /**
       * @param {{ importLocalPath: string; fullPath?: string | undefined; content: string; }[]} imports
       */
      function combineLib(imports) {
        var combined = imports.map(function (importEntry) {
          switch (path.extname(importEntry.importLocalPath).toLowerCase()) {
            case ".js": return '// #region ' + path.basename(importEntry.importLocalPath).replace(/\.js$/, '') + '\n' + importEntry.content + '\n' + '// #endregion';
            case '.css': return (
              '///// ' + path.basename(importEntry.importLocalPath) + ' /////\n' +
              '(function() { var style = document.createElement("style");\n' +
              'style.innerHTML = ' + JSON.stringify(importEntry.content) + ';\n' +
              '(document.body || document.getElementsByTagName("head")[0]).appendChild(style); })();\n'
            );
          }
        });

        return (
          '// {build-by-hash:' + catchREST_hash + '}\n' +
          combined.join('\n\n')
        );
      }

      return detectLocalBuildValid().then(function (valid) {
        if (valid) return 'Local state is validated with hash: ' + catchREST_hash;

        return readLocalImports().then(
          function (imports) {
            return withImports(imports);
          },
          function (_errorLocalImports) {
            return readUnpkgImports().then(function (imports) {
              return withImports(imports);
            });
          });

        /** @param {{ importLocalPath: string, fullPath?: string, content: string }[]} imports */
        function withImports(imports) {
          var combinedLib = combineLib(imports);

          var writeHTML = writeFileAsync(
            indexHTML_path,
            embeddedWholeHTML
          );
          var writeLib = writeFileAsync(
            libJS_path,
            combinedLib
          );

          return Promise.all([writeHTML, writeLib]).then(function () {
            return 'Updated HTML and library with hash: ' + catchREST_hash;
          });
        }
      });
    }

    /** @param {Promise} buildPromise */
    function startServer(buildPromise) {
      return new Promise(function (resolve, reject) {
        var port = derivePort(__dirname);

        var listeningServerPromise = listenToPort('', port).catch(function (error) {
          // TODO: if port is not available, send shutdown request and in the meantime start retrying...
          throw new Error();
        });

        listeningServerPromise.then(function (listeningServer) {
          console.log('server listening on http://localhost:' + listeningServer.port + '/');
          listeningServer.handle(handleRequest);

          /**
           * @param {HTTPRequest} req
           * @param {HTTPResponse} res
           */
          function handleRequest(req, res) {
            return new Promise(function (resolve, reject) {
              var url = URL.parse(/** @type {string} */(req.url), true /*parseQueryString*/);

              switch ((url.pathname || '').toLowerCase()) {
                case '/':
                case '/index.html':
                  return handleIndexHTMLRequest(req, res);

                case 'favicon.ico':
                  return handleFaviconRequest(req, res);

                case '/control':
                  return handleControlRequest(req, res, url);

                default:
                  return handleLocalFileRequest(req.url || '/', res);
              }
            });
          }

          /**
           * @param {HTTPRequest} _req
           * @param {HTTPResponse} res
           * @returns {Promise<void>}
           */
          function handleIndexHTMLRequest(_req, res) {
            return new Promise(function (resolve) {
              res.setHeader('Content-type', 'text/html');
              res.end(embeddedWholeHTML);
              resolve();
            });
          }

          /**
           * @param {string} localPath
           * @param {HTTPResponse} res
           * @returns {Promise<void>}
           */
          function handleLocalFileRequest(localPath, res) {
            return new Promise(function (resolve) {
              var mimeByExt = {
                html: 'text/html',
                htm: 'text/html',
                js: 'application/javascript',
                css: 'style/css'
              };

              // TODO: inject ETag for caching

              var verbOffset = getVerbOffset(localPath);
              if (verbOffset >= 0) localPath = localPath.slice(0, verbOffset);
              if (localPath === '/' || !localPath) localPath = '/index.html';

              var fs = require('fs');
              var path = require('path');

              var fullPath = __dirname + localPath;
              readFileAsync(fullPath, 'binary').then(function (data) {
                var mime = mimeByExt[path.extname(localPath).toLowerCase().replace(/^\./, '')];
                if (mime) res.setHeader('Content-type', mime);
                res.end(data);
                resolve();
              });
            });
          }

          /**
           * @param {HTTPRequest} _req
           * @param {HTTPResponse} res
           * @returns {Promise<void>}
           */
          function handleFaviconRequest(_req, res) {
            return new Promise(function (resolve) {
              // for now just skip
              res.end();
              console.log(' []');
              resolve();
            });
          }

          /**
           * @param {HTTPRequest} req
           * @param {HTTPResponse} res
           * @returns {Promise<void>}
           */
          function handle404Request(req, res) {
            return new Promise(function (resolve) {
              res.statusCode = 404;
              res.end(req.url + ' NOT FOUND.');
              resolve();
            });
          }

          /**
           * @param {import("http").IncomingMessage} req
           * @param {import("http").ServerResponse} res
           * @param {import("url").UrlWithParsedQuery} url
           * @returns {Promise<void> | void}
           */
          function handleControlRequest(req, res, url) {
            if (url.query[catchREST_secret_variable_name] !== shared_process_secret)
              return handle404Request(req, res);

            switch (url.query.command) {
              case 'shutdown':
                res.end('OK');
                if (process.env[catchREST_secret_variable_name]) {
                  process.exit(0);
                } else {
                  while (true) {
                    var svc = shutdownServices.pop();
                    if (!svc) break;
                    svc();
                  }
                }
                return new Promise(function (resolve) { resolve() });

              case 'restart':
                res.end('starting new instance');
                startNewInstance();
                return new Promise(function (resolve) { resolve() });
            }
          }
        });
      });

      /**
       * 
       * @param {string | null | undefined} host
       * @param {number} port
       * @returns {Promise<{ port: number, host: string, server: import('http').Server, handle(handler: (req: HTTPRequest, res: HTTPResponse, server: import('http').Server) => Promise<any>): void }>}
       */
      function listenToPort(host, port) {
        return new Promise(function (resolve, reject) {

          /** @type {{ req: HTTPRequest, res: HTTPResponse, server: import('http').Server}[]} */
          var requestQueue = [];

          /** @type {(req: HTTPRequest, res: HTTPResponse, server: import('http').Server) => Promise<void>} */
          var listener;
          var listenToPort = port;
          var listenToHost = host || '0.0.0.0';

          var server = http.createServer(function (req, res) {
            handleRequest(req, res);
          });

          server.on('listening', function () {
            resolve({
              port: listenToPort,
              host: listenToHost,
              server: server,
              /** @param {(req: HTTPRequest, res: HTTPResponse, server: import('http').Server) => Promise<void>} handler */
              handle: function (handler) {
                listener = handler;
                while (true) {
                  var next = requestQueue.shift();
                  if (!next) break;
                  handleWithListener(next);
                }
              }
            });
          });
          server.on('error', function (error) {
            reject(error);
          });
          server.listen(listenToPort, listenToHost);

          /** @param {HTTPRequest} req @param {HTTPResponse} res */
          function handleRequest(req, res) {
            var entry = { req: req, res: res, server: server };
            if (/** @type {*}*/(listener)) handleWithListener(entry);
            else requestQueue.push(entry);
          }

          /** @param {typeof requestQueue[0]} entry */
          function handleWithListener(entry) {
            var res = listener(entry.req, entry.res, entry.server);
            if (res && typeof res.then === 'function') {
              res.then(
                function () {
                  if (!entry.res.closed) {
                    console.log('Request promise completed, but request not yet handled.');
                  }
                },
                function (error) {
                  if (!entry.res.closed) {
                    if (!entry.res.headersSent) {
                      entry.res.statusCode = 500;
                      entry.res.statusMessage = error && error.message || String(error);
                      entry.res.setHeader('Content-type', 'text/plain');
                    }

                    var errorResponse = error && error.stack ? error.stack :
                      error && error.message ? error.message :
                        String(error) || 'FAILED.'

                    entry.res.end(errorResponse);
                  }
                });
            }
          }
        });
      }
    }

    function startNewInstance() {
      if (startNewInstance.current) return startNewInstance.current;

      return startNewInstance.current = new Promise(function (resolve, reject) {

        setTimeout(function () {
          startNewInstance.current = null;
        }, 1000);

        if (process.env[catchREST_secret_variable_name] && process.send) {
          process.send({
            command: 'start'
          });

          return;
        }

        var child_process = require('child_process');
        /** @type{Record<string,string>} */
        var env = {};
        env[catchREST_secret_variable_name] = shared_process_secret;
        var proc = child_process.fork(
          __filename,
          process.argv[1].toLowerCase().indexOf(
            __filename.replace(/\\/g, '/').split('/').reverse()[0].toLowerCase()) >= 0 ?
            process.argv.slice(2) :
            process.argv.slice(1),
          {
            env: env,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
          });

        if (proc.stdout) proc.stdout.on('data', handleChildStdout);
        if (proc.stderr) proc.stderr.on('data', handleChildStderr);
        proc.on('message', handleChildMessage);
        proc.on('error', handleError);
        proc.on('exit', handleExit);
        var counted = false;

        function handleChildStdout(data) {
          resolve();
          if (!counted) {
            counted = true;
            runningChildProcesses.push(proc);
          }

          var procId = proc.pid;
          process.stdout.write(data);
        }

        function handleChildStderr(data) {
          resolve();
          if (!counted) {
            counted = true;
            runningChildProcesses.push(proc);
          }

          var procId = proc.pid;
          process.stderr.write(data);
        }

        function handleError(error) {
          resolve(error);
          var procId = proc.pid;
        }

        function handleChildMessage(msg) {
          if (msg && msg.command === 'start') {
            startNewInstance();
          }
        }

        function handleExit(exitCode) {
          resolve(exitCode);

          var posCurrent = runningChildProcesses.indexOf(proc);
          if (posCurrent >= 0) runningChildProcesses.splice(posCurrent, 1);

          // TODO: debounce with timeout, shutdown if no longer runningChildProcesses-
        }

      });
    }
    /** @type {null | Promise<void>} */
    startNewInstance.current = null;


    function launchBrowser() {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve('Chrome browser launched (pretends).');
        }, 1000);
      });
    }

    function bootNode() {
      var buildPromise = build();
      var serverPromise = startServer(buildPromise);

      return Promise.all([buildPromise, serverPromise]).then(
        function (promResults) {
          var buildResult = promResults[0];
          var serverResult = promResults[1];

          console.log(buildResult, serverResult);

          return launchBrowser().then(
            function (browserResult) {
              console.log(browserResult);
            },
            function (browserStartError) {
              console.error('Failed to launch browser: ', browserStartError);
            });
        },
        function (promErrors) {
          console.error('Failed to start ', promErrors);
        });
    }

    bootNode();
  }

  function runAsBrowser() {
    // #region COMMON BROWSER UTILS

    function on(elem, eventName, callback) {
      if (elem.addEventListener) return elem.addEventListener(eventName, callback);
      else if (elem.attachEvent) return elem.attachEvent('on' + eventName, callback);
      else elem['on' + eventName] = function (evt) {
        if (!evt) evt = typeof event === 'undefined' ? void 0 : event;
        return callback(evt);
      };
    }

    function off(elem, eventName, callback) {
      if (elem.removeEventListener) return elem.removeEventListener(eventName, callback);
      else if (elem.detachEvent) return elem.detachEvent('on' + eventName, callback);
      else elem['on' + eventName] = null;
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
    // #endregion COMMON BROWSER UTILS

    function boot() {

      function bindLayout() {
        var anyMissing = false;
        var elems = {
          layoutTABLE: /**@type {HTMLTableElement}*/(id('layoutTABLE')),
          leftTD: /**@type {HTMLTableElement}*/(id('leftTD')),
          sendBUTTON: /**@type {HTMLButtonElement}*/(id('sendBUTTON')),
          sendLabel: /**@type {HTMLSpanElement}*/(id('sendLabel')),
          requestTD: /**@type {HTMLTableCellElement}*/(id('requestTD')),
          splitterTD: /**@type {HTMLTableCellElement}*/(id('splitterTD')),
          splitterLabel: /**@type {HTMLSpanElement}*/(id('splitterLabel')),
          responseTD: /**@type {HTMLTableCellElement}*/(id('responseTD')),
          statusTD: /**@type {HTMLTableCellElement}*/(id('statusTD')),
          anyMissing: anyMissing
        };
        return elems;

        function id(id) {
          var elem = document.getElementById(id);
          if (!elem) anyMissing = true;
          return elem;
        }
      }

      function populateBodyLayout() {
        var placeholder = document.createElement('div');
        placeholder.innerHTML = embeddedBodyLayoutHTML;
        while (placeholder.childNodes.length) {
          var node = placeholder.childNodes.item ? placeholder.childNodes.item(0) : placeholder.childNodes[0];
          placeholder.removeChild(node);
          document.body.appendChild(node);
        }
        return bindLayout();
      }

      function waitForLayout() {
        return new Promise(function (resolve, reject) {
          var layout = bindLayout();
          if (layout) return resolve(layout);

          if (document.body) return resolve(populateBodyLayout());

          // TODO: queue on load complete
        });
      }

      /** @param {ReturnType<typeof bindLayout>} layout */
      function makeSplitterDraggable(layout) {
        restoreSplitterPosition();

        on(layout.splitterTD, 'mousedown', splitterTD_onmousedown);
        on(layout.splitterTD, 'touchstart', splitterTD_onmousedown);
        on(layout.splitterTD, 'touchend', splitterTD_onmouseup);
        on(layout.splitterTD, 'mouseup', splitterTD_onmouseup);
        on(layout.splitterTD, 'mousemove', splitterTD_onmousemove);
        on(window, 'mousemove', splitterTD_onmousemove);
        on(window, 'touchmove', splitterTD_onmousemove);
        on(window, 'mouseup', splitterTD_onmouseup);

        /** @type {boolean} */
        var splitterTD_mice;

        /**
         * @param {{ button?: number }} evt
         * @param {boolean} down
         */
        function updateMice(evt, down) {
          // TODO: handle right-click specially!
          // if (evt.button) down = false;
          splitterTD_mice = down;

          if (splitterTD_mice) {
            if (!/(\s+|^)down(\s+|$)/.test(layout.splitterTD.className || '')) layout.splitterTD.className += ' down';
          } else {
            if (/(\s+|^)down(\s+|$)/.test(layout.splitterTD.className || '')) layout.splitterTD.className = (layout.splitterTD.className || '').replace(/(\s+|^)down(\s+|$)/g, '');
          }
        }


        /** @param {Event & Partial<MouseEvent>} evt */
        function splitterTD_onmousedown(evt) {
          updateMice(evt, true);
        }

        /** @param {Event & Partial<MouseEvent>} evt */
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

            var windowHeight = window.innerHeight || document.body.offsetHeight;
            var ratio = y / (windowHeight - (layout.statusTD.offsetHeight || layout.statusTD.getBoundingClientRect().height));

            var ratioPercent = (ratio * 100).toFixed(2).replace(/0+$/, '') + '%';
            var reverseRatioPercent = (100 - ratio * 100).toFixed(2).replace(/0+$/, '') + '%';
            if (typeof JSON !== 'undefined' && JSON && typeof JSON.stringify === 'function') {
              window.name = '{"splitter": "' + ratioPercent + '"}';
            }

            if (layout.requestTD.height !== ratioPercent) layout.requestTD.height = ratioPercent;
            if (layout.responseTD.height !== reverseRatioPercent) layout.responseTD.height = reverseRatioPercent;
          }
        }

        function restoreSplitterPosition() {
          if (!window.name || typeof JSON === 'undefined' || !JSON || typeof JSON.parse !== 'function') return;
          try {
            var windowObj = JSON.parse(window.name);
            if (windowObj && windowObj.splitter && /%$/.test(windowObj.splitter)) {
              var num = Number(windowObj.splitter.replace(/%$/, ''));
              if (num > 0 && num < 100) {
                layout.requestTD.height = windowObj.splitter;
                layout.responseTD.height = (100 - num) + '%';
              }
            }
          } catch (err) {
            try { console.error('cannot restore splitter position: ', err); } catch (err) { }
          }
        }
      }

      function startBoot() {
        var bindLayoutAndHandleSplitter = waitForLayout().then(
          function (layout) {
            makeSplitterDraggable(layout);
            return layout;
          }
        )
      }

      return startBoot();
    }

    boot();
  }

  function runAsWScript() {
    // TODO: fire mshta
  }

  function detectEnvironment() {
    if (typeof window !== 'undefined' && window && /**@type{*}*/(window.alert)
      && typeof document !== 'undefined' && document && /**@type{*}*/(document.createElement))
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

  function detectEnvironmentAndStart() {
    switch (detectEnvironment()) {
      case 'node-script': return runAsNode();
      case 'node-module': return runAsNode(module);
      case 'browser': return runAsBrowser();
      case 'wscript': return runAsWScript();
    }

    // TODO: stick sdome exports on 'this' and exit?
    throw new Error('Environment was not recognised.');
  }

  detectEnvironmentAndStart();
} catchREST();
// </script>
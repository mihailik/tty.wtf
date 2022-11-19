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
    var verbMatch = getVerb(url);
    if (!verbMatch) return;

    var encodedStr = url.slice(verbMatch.index);
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

  /** @param {string | null | undefined} path */
  function getVerb(path) {
    var verbMatch = /(^|\/)(local|read|edit|view|browse|shell|get|post|put|head|delete|option|connect|trace|mailto:|http:|https:)(\/|$)/i.exec(path + '');
    return verbMatch ? { leadingSlash: verbMatch[1], verb: verbMatch[2], trailingSlash: verbMatch[3], index: verbMatch.index + (verbMatch[1] ? 1 : 0) } : void 0;
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

  var embeddedMinCSS = getFunctionCommentContent(function () {/*
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
  */});

  var embeddedTableCSS = getFunctionCommentContent(function () {/*
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

  var embeddedTableLayoutHTML = getFunctionCommentContent(function () {/*
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

  var embeddedAdjustUrlencodedBaseURL =
    'catchREST_urlencoded = true; (function() {\n' +
    getFunctionBody(function () {
      if (location.protocol.indexOf('file') >= 0) return; // running from local file, no need to adjust base URL
      var verb = getVerb(location.pathname);
      if (!verb) return; // no deep URL, no need to adjust base URL
      if (verb.verb === 'local') {
        // @ts-ignore
        catchREST_urlencoded = false;
        return;
      }

      var baseUrl = location.protocol + '//' + location.host + '/' + location.pathname.slice(0, verb.index);
      var inject = '<base href="' + baseUrl + '">';
      document.write(inject);
    }) + '\n\n' +
    getVerb + '\n' +
    '})()';

  /**
   * @param {boolean=} urlencoded Whether trigger URLENCODED option inside the script
   * @param {string=} verbPlaceholder Verb that will likely render this page
   */
  function getEmbeddedWholeHTML(urlencoded, verbPlaceholder) {
    /** @type {Partial<typeof process>} */
    var pr = typeof process !== 'undefined' && process || {};
    var html =
      '<!DOCTYPE html><html lang="en"><head><!-- {build-by-hash:' + catchREST_hash + '} ' + new Date() + ' with  ' + pr.platform + '/' + pr.arch + ' -->\n' +
      embeddedMetaBlockHTML + '\n' +
      '<title>Catch Rest 🍹</title>\n' +

      '<' + 'script' + '>\n' +
      (urlencoded ? embeddedAdjustUrlencodedBaseURL + '\n' : '') +
      '</' + 'script' + '>\n' +

      '<style>\n' +
      embeddedMinCSS + '\n' +
      '</style>\n' +

      '</head><body>' +

      '<' + 'script' + ' src="index.js"></' + 'script' + '>\n' +
      '<' + 'script' + ' src="lib.js"></' + 'script' + '>\n' +

      '<' + 'script' + '>\n' +
      'catchREST("page");\n' +
      '</' + 'script' + '>\n' +

      '</body></html>';
    
    return html;
  }

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
      var index404HTML_path = path.resolve(__dirname, '404.html');
      var libJS_path = path.resolve(__dirname, 'lib.js');

      function detectLocalBuildValid() {
        return new Promise(function (resolve) {
          var markerRegexp = new RegExp('\\{build-by-hash:' + catchREST_hash + '\\}');
          var indexHTMLPromise = readFileAsync(indexHTML_path);
          var index404HTMLPromise = readFileAsync(index404HTML_path);
          var libJSPromise = readFileAsync(libJS_path);
          Promise.all([indexHTMLPromise, index404HTMLPromise, libJSPromise]).then(
            function (result) {
              var indexHTML_content = result[0];
              var index404HTML_content = result[1];
              var libJS_content = result[2];
              resolve(
                markerRegexp.test(indexHTML_content) &&
                markerRegexp.test(index404HTML_content) &&
                markerRegexp.test(libJS_content));
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

          var writeIndexHTML = writeFileAsync(
            indexHTML_path,
            getEmbeddedWholeHTML(true /* urlencoded */)
          );
          var writeIndex404HTML = writeFileAsync(
            index404HTML_path,
            getEmbeddedWholeHTML(true /* urlencoded */)
          );
          var writeLib = writeFileAsync(
            libJS_path,
            combinedLib
          );

          return Promise.all([writeIndexHTML, writeIndex404HTML, writeLib]).then(function () {
            return 'Updated HTML and library with hash: ' + catchREST_hash;
          });
        }
      });
    }

    /** @param {Promise<string>} buildPromise */
    function startServer(port, buildPromise) {
      return new Promise(function (resolve) { resolve(null); }).then(function () {

        /** @type {ReturnType<typeof listenToPort>} */
        var listeningServerPromise = listenToPort('', port).catch(function (error) {
          // TODO: if port is not available, send shutdown request and in the meantime start retrying...
          throw new Error();
        });

        return listeningServerPromise.then(
          function (listeningServer) {
            listeningServer.handle(handleRequest);
            return {
              listeningServer: listeningServer,
              message: 'server listening on http://localhost:' + listeningServer.port + '/'
            };

            /**
             * @param {HTTPRequest} req
             * @param {HTTPResponse} res
             */
            function handleRequest(req, res) {
              return new Promise(function (resolve) { resolve(null);  }).then(function() {
                var url = URL.parse(/** @type {string} */(req.url), true /*parseQueryString*/);
                process.stdout.write(req.method + ' ' + url.pathname);

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
                res.end(getEmbeddedWholeHTML(true /* urlencoded */));
                resolve();
              });
            }

            /**
             * @param {string} localPath
             * @param {HTTPResponse} res
             * @returns {Promise<void>}
             */
            function handleLocalFileRequest(localPath, res) {
              return new Promise(function (resolve) { resolve(null); }).then(function() {
                var mimeByExt = {
                  html: 'text/html',
                  htm: 'text/html',
                  js: 'application/javascript',
                  css: 'style/css'
                };

                // TODO: inject ETag for caching

                var verbMatch = getVerb(localPath);
                if (verbMatch) localPath = localPath.slice(0, verbMatch.index - (verbMatch.leadingSlash ? 1 : 0));
                if (localPath === '/' || !localPath) localPath = '/index.html';

                var fullPath = __dirname + localPath;
                return readFileAsync(fullPath, 'binary').then(
                  function (data) {
                    var mime = mimeByExt[path.extname(localPath).toLowerCase().replace(/^\./, '')];
                    if (mime) res.setHeader('Content-type', mime);
                    console.log(' [200 OK ' + path.relative(__dirname, fullPath) + ':' + data.length + ']');
                    res.end(data);
                  },
                  function (readError) {
                    res.statusCode = 404;
                    res.statusMessage = readError.message;
                    console.log(' [404 ' + path.relative(__dirname, fullPath) + ':' + readError.message + ']');
                    res.end(readError.stack);
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

          shutdownServices.push(function () {
            server.close();
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

    function watchSelf() {
      var changeDebounceTimeout;
      var watcher = createWatcher();

      shutdownServices.push(function () {
        watcher.close();
      });

      function checkAndTriggerRestart() {
        var currentContent = fs.readFileSync(__filename, 'utf8');
        if (currentContent.indexOf(catchREST + '') < 0) {
          // TODO: log stdio restart due to file change
          startNewInstance();
        }
      }

      function createWatcher() {
        var watcher = fs.watch(__filename, function () {
          clearTimeout(changeDebounceTimeout);
          changeDebounceTimeout = setTimeout(checkAndTriggerRestart, 200);
        });
        return watcher;
      }
    }

    function startNewInstance() {
      if (startNewInstance.current) {
        return startNewInstance.current;
      }

      return startNewInstance.current = new Promise(function (resolve, reject) {
        setTimeout(function () {
          startNewInstance.current = null;
        }, 1000);

        if (process.env[catchREST_secret_variable_name] && process.send) {
          process.send({ command: 'start' });
          return;
        }

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

          // TODO: debounce with timeout, shutdown if no longer runningChildProcesses
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

    function shutdownPredecessorIfNeeded(port) {
      if (process.env[catchREST_secret_variable_name]) {
        return requestShutdown(port).then(function () {
          // response may come before server is down and HTTP port fully released
          return new Promise(function (resolve) { setTimeout(resolve, 100); }).then(function () {
            return 'Catch REST~' + process.pid;
          });
        });
      } else {
        return new Promise(function (resolve) { resolve('Catch REST[' + process.pid + ']'); });
      }
    }

    function requestShutdown(port) {
      return new Promise(function (resolve, reject) {
        var http = require('http');
        var requestUrl = 'http://localhost:' + port + '/control?' + catchREST_secret_variable_name + '=' + shared_process_secret + '&command=shutdown';
        var httpReq = http.request(requestUrl, { method: 'POST' });
        var data = '';
        httpReq.on('data', function (chunk) {
          data += chunk;
        });
        httpReq.on('close', function () {
          resolve(data);
        });
        httpReq.on('error', function (error) {
          resolve(error);
        });
        httpReq.end();
      });
    }

    function bootNode() {
      var buildPromise = build();
      var port = derivePort(__dirname);
      var serverPromise = shutdownPredecessorIfNeeded(port).then(
        function (shutdownMessage) {
          process.stdout.write(shutdownMessage + '@' + port + ' ');
          return startServer(port, buildPromise);
        });

      return Promise.all([buildPromise, serverPromise]).then(
        function (promResults) {
          var buildResult = promResults[0];
          var serverResult = promResults[1];

          console.log(
            buildResult,
            serverResult.message
          );
          watchSelf();

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

    // #region PERSISTENCE

    var persistence = (function () {

      /** @typedef {{
       *  domTimestamp?: number;
       *  domTotalSize?: number;
       *  domLoadedSize?: number;
       *  loadedFileCount?: number;
       *  storageName?: string;
       *  storageTimestamp?: number;
       *  storageLoadFailures?: { [storage: string]: string; };
       *  newDOMFiles?: string[];
       *  newStorageFiles?: string[];
       *  read(path: string): any;
       *  continueLoading();
       *  finishParsing(completion: (drive: Drive.Detached.DOMDrive) => void);
       *  ondomnode?: (node: any, recognizedKind?: 'file' | 'totals', recognizedEntity?: any) => void;
       * }} BootState */

      // function formatTotalsInner(timestamp: number, totalSize: number): string;
      // function formatFileInner(path: string, content: any): string;
      // function formatSize(totalSize: number): string;
      // function formatDate(date: Date): string;

      // function parseTotalsInner(content: string): { timestamp: number; totalSize: number; };
      // function parseFileInner(content: string): { path: string; read(): string; };
      // function parseHTML(html: string): { files: { path: string; content: string; start: number; end: number; }[]; totals: {size?: number; timestamp?: number; start: number; end: number;}; };

      /** @typedef {{
       *  timestamp?: number;
       *  files(): string[];
       *  read(file: string): string;
       *  write(file: string, content: string | null);
       *  storedSize?(file: string): number | null;
       * }} Drive */

      /** @typedef {{
       *  timestamp?: number;
       *  write(file: string, content: string, encoding: string): void;
       *  forget(file: string): void;
       * }} Drive.Shadow */

      /** @typedef {{
       *  name: string;
       *  detect(uniqueKey: string, callback: (error: string, detached: Drive.Detached) => void): void;
       * }} Drive.Optional */

      /** @typedef {{
       *  timestamp: number;
       *  totalSize?: number;
       *  applyTo(mainDrive: Drive.Detached.DOMUpdater, callback: Drive.Detached.CallbackWithShadow): void;
       *  purge(callback: Drive.Detached.CallbackWithShadow): void;
       * }} Drive.Detached; */

      /** @typedef {{
       *  (loaded: Drive.Shadow): void;
       *  progress?: (current: number, total: number) => void;
       * }} Drive.Detached.CallbackWithShadow */

      /** @typedef {{
       *  timestamp?: number;
       *  write(file: string, content: string | null, encoding?: string): void;
       * }} Drive.Detached.DOMUpdater */

      /** @typedef {{
       *  write(file: string, content: string | null, encoding?: string): void;
       * } & Drive} Drive.Detached.DOMDrive */

      /** @typedef {{
       *  timestamp: number;
       *  totalSize: number;
       *  node: Comment;
       *  updateNode(): string | undefined;
       * }} DOMTotals */

      /**
       * @param {Document} document
       * @param {string} uniqueKey
       * @param {Drive.Optional[]=} optionalDrives
       */
      function persistence(document, uniqueKey, optionalDrives) {
        // TODO: default document, uniqueKey, optionalDrives???
        if (!optionalDrives) optionalDrives = [attached.indexedDB, attached.webSQL, attached.localStorage];

        /** @type {BootState} */
        var bootState = {
          storageLoadFailures: {},
          newDOMFiles: [],
          newStorageFiles: [],

          read: read,
          continueLoading: continueLoading,
          finishParsing: finishParsing
        };

        /** @type {{ [path: string]: DOMFile; }} */
        var byPath = {};
        /** @type {DOMTotals | undefined} */
        var totals;
        /** @type {((drive: Drive) => void) | undefined} */
        var completionCallback;
        var anticipationSize = 0;
        /** @type {Node | undefined} */
        var lastNode;
        var currentOptionalDriveIndex = 0;
        var shadowFinished = false;
        /** @type {Drive.Detached | undefined} */
        var detachedDrive; // sometimes it lingers here until DOM timestamp is ready
        /** @type {Drive.Shadow | undefined} */
        var shadow;
        /** @type {{ [path: string]: any; } | undefined} */
        var toUpdateDOM;
        /** @type {string[]} */
        var toForgetShadow = [];
        var domFinished = false;

        var newDOMFileCache = {};
        var newStorageFileCache = {};

        loadNextOptionalDrive();
        
        /** @param {string} path @this {BootState} */
        function read(path) {
          if (toUpdateDOM && path in toUpdateDOM)
            return toUpdateDOM[path];
          var f = byPath[path];
          if (f) return f.read();
          else return null;
        }

        function continueLoading() {
          if (!domFinished)
            continueParsingDOM(false /* toCompletion */);

          bootState.newDOMFiles = [];
          for (var k in newDOMFileCache) {
            if (k && k.charCodeAt(0) == 47)
              bootState.newDOMFiles.push(k);
          }
          newDOMFileCache = {};

          bootState.newStorageFiles = [];
          for (var k in newStorageFileCache) {
            if (k && k.charCodeAt(0) == 47)
              bootState.newStorageFiles.push(k);
          }
          newStorageFileCache = {};
        }

        /** @param {(drive: Drive) => void} completion */
        function finishParsing(completion) {
          if (domFinished) {
            try {
              // when debugging, break on any error will hit here too
              throw new Error('finishParsing should only be called once.');
            }
            catch (error) {
              if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                console.error(error);
            }
          }

          completionCallback = completion;
          continueParsingDOM(true /* toCompletion */);
        }

        // THESE FUNCTIONS ARE NOT EXPOSED FROM BootState

        /** @param {Node} node */
        function processNode(node) {
          if (node.nodeType !== 8) return; // skip non-comment nodes

          var cmheader = new CommentHeader(/** @type {Comment}*/(node));

          var file = DOMFile.tryParse(cmheader);
          if (file) {
            processFileNode(file);
            if (typeof bootState.ondomnode === 'function') {
              bootState.ondomnode(node, 'file', file);
            }
            return;
          }

          var totals = tryParseDOMTotals(cmheader);
          if (totals) {
            processTotalsNode(totals);
            if (typeof bootState.ondomnode === 'function') {
              bootState.ondomnode(node, 'totals', totals);
            }
            return;
          }

          if (typeof bootState.ondomnode === 'function') {
            bootState.ondomnode(node);
          }
        }

        /** @param {DOMTotals} totals */
        function processTotalsNode(totals) {
          if (totals) {
            removeNode(totals.node);
          }
          else {
            totals = totals;
            bootState.domTimestamp = totals.timestamp;
            bootState.domTotalSize = Math.max(totals.totalSize, bootState.domTotalSize || 0);

            var detached = detachedDrive;
            if (detached) {
              detachedDrive = void 0;
              compareTimestampsAndProceed(detached);
            }
          }
        }

        /** @param {DOMFile} file */
        function processFileNode(file) {
          if (byPath[file.path]) { // a file with this name was encountered before
            // prefer earlier nodes
            removeNode(file.node);
            return;
          }

          // no updating nodes until whole DOM loaded
          // (looks like some browsers get confused by updating DOM during loading)

          byPath[file.path] = file;
          newDOMFileCache[file.path] = true;

          bootState.loadedFileCount = (bootState.loadedFileCount || 0) + 1;
          bootState.domLoadedSize = (bootState.domLoadedSize || 0) + file.contentLength;
          bootState.domTotalSize = Math.max(/** @type {number} */(bootState.domTotalSize), bootState.domLoadedSize);
        }

        /** @param {Node} node */
        function removeNode(node) {
          var parent = node.parentElement || node.parentNode;
          if (parent) parent.removeChild(node);
        }

        /** @param {boolean} toCompletion */
        function continueParsingDOM(toCompletion) {

          bootState.domLoadedSize = (bootState.domLoadedSize || 0) - anticipationSize;
          anticipationSize = 0;

          while (true) {

            // keep very last node unprocessed until whole document loaded
            // -- that means each iteration we find the next node, but process this._lastNode
            var nextNode = getNextNode();

            if (!nextNode && !toCompletion) {

              // no more nodes found, but more expected: no processing at this point
              // -- but try to estimate what part of the last known node is loaded (for better progress precision)
              if (lastNode && lastNode.nodeType === 8) {
                var cmheader = new CommentHeader(this._lastNode);
                var speculativeFile = DOMFile.tryParse(cmheader);
                if (speculativeFile) {
                  anticipationSize = speculativeFile.contentLength;
                  bootState.domLoadedSize = bootState.domLoadedSize + anticipationSize;
                  bootState.domTotalSize = Math.max(/** @type {number} */(bootState.domTotalSize), bootState.domLoadedSize); // total should not become less that loaded
                }
              }
              return;
            }

            if (lastNode && lastNode.nodeType === 8) {
              processNode(lastNode);
            }
            else {
              if (typeof bootState.ondomnode === 'function') {
                bootState.ondomnode(lastNode);
              }
            }

            if (!nextNode) {
              // finish
              lastNode = void 0;
              processDOMFinished();
              return;
            }

            lastNode = nextNode;
          }
        }

        function processDOMFinished() {

          domFinished = true;

          if (toUpdateDOM) {

            // these are updates from attached storage that have not been written out
            // (because files with corresponding paths don't exist in DOM)

            for (var path in toUpdateDOM) {
              /** @type {{ content, encoding } | undefined} */
              var entry = void 0;
              if (!path || path.charCodeAt(0) !== 47) continue; // expect leading slash
              var content = toUpdateDOM[path];
              if (content && content.content && content.encoding) {
                entry = content; // content could be string or { content, encoding }
              }

              if (content === null) {
                var f = byPath[path];
                if (f) {
                  delete byPath[path];
                  removeNode(f.node);
                }
                else {
                  if (shadow) shadow.forget(path);
                  else toForgetShadow.push(path);
                }
              }
              else if (typeof content !== 'undefined') {
                var f = byPath[path];
                if (f) {
                  if (!entry)
                    entry = bestEncode(content); // it could already be { content, encoding }

                  var modified = f.write(entry.content, entry.encoding);
                  if (!modified) {
                    if (shadow) shadow.forget(path);
                    else toForgetShadow.push(path);
                  }
                }
                else {
                  var anchor = findAnchor();
                  var comment = document.createComment('');
                  var f = new DOMFile(comment, path, /** @type {*} */(null), 0, 0);
                  entry = bestEncode(content);
                  f.write(entry.content, entry.encoding);
                  byPath[path] = f;
                  newDOMFileCache[path] = true;
                  document.body.insertBefore(f.node, anchor);
                }
              }
            }
          }

          if (shadowFinished) {
            allCompleted();
            return;
          }

          var detached = detachedDrive;
          if (detached) {
            detachedDrive = void 0;
            compareTimestampsAndProceed(detached);
          }
        }

        function finishUpdateTotals() {
          if (totals) {
            if ((bootState.storageTimestamp || 0) > (bootState.domTimestamp || 0)) {
              totals.timestamp = /** @type {number} */(bootState.storageTimestamp);
              totals.updateNode();
            }
          }
        }

        function getNextNode() {
          if (!lastNode) {
            var head = document.head || /** @type {HTMLElement} */(document.getElementsByTagName('head')[0]);
            if (head) {
              var next = head.firstChild;
              if (next) return next;
            }
            var body = document.body;
            if (body)
              return body.firstChild;
            return null;
          }

          var nextNode = lastNode.nextSibling;
          if (!nextNode) {
            var body = document.body || null;
            var lastNodeParent = lastNode.parentNode || lastNode.parentElement || null;
            if (lastNodeParent !== body)
              nextNode = body.firstChild;
          }
          return nextNode;
        }

        function loadNextOptionalDrive() {
          if (currentOptionalDriveIndex >= /** @type {Drive.Optional[]} */(optionalDrives).length) {

            finishOptionalDetection();
            return;
          }

          var nextDrive = /** @type {Drive.Optional[]} */(optionalDrives)[currentOptionalDriveIndex];
          nextDrive.detect(uniqueKey, (error, detached) => {
            if (detached) {
              bootState.storageName = nextDrive.name;
              shadowDetected(detached);
            }
            else {
              if (!bootState.storageLoadFailures) bootState.storageLoadFailures = {};
              bootState.storageLoadFailures[nextDrive.name] = error || 'Empty return.';
              currentOptionalDriveIndex++;
              loadNextOptionalDrive();
            }
          });
        }

        /** @param {Drive.Detached} detached */
        function shadowDetected(detached) {
          this.storageTimestamp = detached.timestamp;
          if (totals || domFinished)
            compareTimestampsAndProceed(detached);
          else
            detachedDrive = detached;
        }

        /** @param {Drive.Detached} detached */
        function compareTimestampsAndProceed(detached) {
          /** @type {boolean | undefined} */
          var domRecent;
          if ((detached.timestamp || 0) > (bootState.domTimestamp || 0)) domRecent = false;
          else if (!detached.timestamp && !bootState.domTimestamp) domRecent = false;
          else domRecent = true;

          if (domRecent) {
            detached.purge(shad => {
              shadow = shad;
              finishOptionalDetection();
            });
          }
          else {
            toUpdateDOM = {};
            detached.applyTo(
              {
                timestamp: bootState.domTimestamp,
                write: function (path, content, encoding) {
                  applyShadowToDOM(path, content, encoding);
                }
              },
              function (shad) {
                shadow = shad;
                this._finishOptionalDetection();
              });
          }
        }

        /** @param {string} path @param {any} content @param {string=} encoding */
        function applyShadowToDOM(path, content, encoding) {
          if (domFinished) {
            var file = byPath[path];
            if (file) {
              if (content === null) {
                removeNode(file.node);
                delete byPath[path];
              }
              else {
                var modified = file.write(content, encoding);
                if (!modified)
                  toForgetShadow.push(path);
              }
            }
            else {
              if (content === null) {
                toForgetShadow.push(path);
              }
              else {
                var anchor = findAnchor();
                var comment = document.createComment('');
                var f = new DOMFile(comment, path, /** @type {*}*/(null), 0, 0);
                f.write(content, encoding);
                document.body.insertBefore(f.node, anchor);
                byPath[path] = f;
                newDOMFileCache[path] = true;
              }
            }
            newStorageFileCache[path] = true;
          }
          else {
            if (!toUpdateDOM) toUpdateDOM = {};
            toUpdateDOM[path] = encoding ? { content, encoding } : content;
            newStorageFileCache[path] = true;
          }
        }

        function findAnchor() {
          /** @type {Node | undefined} */
          var anchor;
          for (var k in byPath) if (k && k.charCodeAt(0) === 47) {
            anchor = byPath[k].node;
          }
          if (!anchor) {
            var scripts = document.getElementsByTagName('script');
            anchor = scripts[scripts.length - 1];
          }
          return anchor;
        }

        function finishOptionalDetection() {

          if (shadow) {
            for (var i = 0; i < toForgetShadow.length; i++) {
              shadow.forget(toForgetShadow[i]);
            }
          }

          shadowFinished = true;

          if (domFinished) {
            allCompleted();
          }
        }

        function allCompleted() {
          finishUpdateTotals();

          /** @type {DOMFile[]} */
          var domFiles = [];
          for (var path in byPath) {
            if (!path || path.charCodeAt(0) !== 47) continue; // expect leading slash
            domFiles.push(byPath[path]);
          }

          if (!totals)
            // FIX: find actual size/timestamp?
            totals = forceInjectTotals(0, 0);

          var domDrive = createDOMDrive(/** @type {DOMTotals} */(totals), domFiles, document);
          var mountDrive = createMountedDrive(domDrive, shadow);

          if (typeof completionCallback === 'function') {
            // TODO: report lack of subscription?
            completionCallback(mountDrive);
          } 
        }
      }

      /**
       * @class
       * @param {Comment} node
       */
      function CommentHeader(node) {
        this.node = node;
        var headerLine;
        var content;
        if (typeof node.substringData === 'function'
          && typeof node.length === 'number') {
          var chunkSize = 128;

          if (node.length >= chunkSize) {
            // TODO: cut chunks off the start and look for newlines
            var headerChunks = [];
            while (headerChunks.length * chunkSize < node.length) {
              var nextChunk = node.substringData(headerChunks.length * chunkSize, chunkSize);
              var posEOL = nextChunk.search(/\r|\n/);
              if (posEOL < 0) {
                headerChunks.push(nextChunk);
                continue;
              }

              this.header = headerChunks.join('') + nextChunk.slice(0, posEOL);
              this.contentOffset = this.header.length + 1; // if header is separated by a single CR or LF

              if (posEOL === nextChunk.length - 1) { // we may have LF part of CRLF in the next chunk!
                if (nextChunk.charAt(nextChunk.length - 1) === '\r'
                  && node.substringData((headerChunks.length + 1) * chunkSize, 1) === '\n')
                  this.contentOffset++;
              }
              else if (nextChunk.slice(posEOL, posEOL + 2) === '\r\n') {
                this.contentOffset++;
              }

              this.contentLength = node.length - this.contentOffset;
              return;
            }

            this.header = headerChunks.join('');
            this.contentOffset = this.header.length;
            this.contentLength = node.length - this.header.length;
            return;
          }
        }

        /** @type {string} */
        var wholeCommentText = node.nodeValue || '';
        var posEOL = wholeCommentText.search(/\r|\n/);
        if (posEOL < 0) {
          this.header = wholeCommentText;
          this.contentOffset = wholeCommentText.length;
          this.contentLength = wholeCommentText.length - this.contentOffset;
          return;
        }

        this.contentOffset = wholeCommentText.slice(posEOL, posEOL + 2) === '\r\n' ?
          posEOL + 2 : // ends with CRLF
          posEOL + 1; // ends with singular CR or LF

        this.header = wholeCommentText.slice(0, posEOL);
        this.contentLength = wholeCommentText.length - this.contentOffset;
      }

      /**
       * @class
       * @param {Comment} node 
       * @param {string} path 
       * @param {(text: string) => any} encoding 
       * @param {number} contentOffset 
       * @param {number} contentLength 
       */
      function DOMFile(node, path, encoding, contentOffset, contentLength) {
        this.node = node;
        this.path = path;
        this.contentLength = contentLength;

        this.read = read;
        this.write = write;

        /** @type {string | undefined} */
        var encodedPath;

        var domFile = this;

        function read() {

          // proper HTML5 has substringData to read only a chunk
          // (that saves on string memory allocations
          // comparing to fetching the whole text including the file name)
          var contentText = typeof domFile.node.substringData === 'function' ?
            domFile.node.substringData(contentOffset, 1000000000) :
            (domFile.node.nodeValue || '').slice(contentOffset);

          // XML end-comment is escaped when stored in DOM,
          // unescape it back
          var restoredText = contentText.
            replace(/\-\-\*(\**)\>/g, '--$1>').
            replace(/\<\*(\**)\!/g, '<$1!');

          // decode
          var decodedText = encoding(restoredText);

          // update just in case it's been off
          this.contentLength = decodedText.length;

          return decodedText;
        };

        function write(content, encoding) {

          content =
            content === null || typeof content === 'undefined' ? content :
              String(content);

          var encoded = encoding ? { content, encoding } : bestEncode(content);
          var protectedText = encoded.content.
            replace(/\-\-(\**)\>/g, '--*$1>').
            replace(/\<(\**)\!/g, '<*$1!');

          if (!encodedPath) {
            // most cases path is path,
            // but if anything is weird, it's going to be quoted
            // (actually encoded with JSON format)
            var encp = bestEncode(domFile.path, true /*escapePath*/);
            encodedPath = encp.content;
          }

          var leadText = ' ' + encodedPath + (encoded.encoding === 'LF' ? '' : ' [' + encoded.encoding + ']') + '\n';
          var html = leadText + protectedText;
          if (!domFile.node) return html; // can be used without backing 'node' for formatting purpose

          if (html === domFile.node.nodeValue) return false;
          domFile.node.nodeValue = html;

          encoding = encodings[encoded.encoding || 'LF'];
          contentOffset = leadText.length;

          contentLength = content.length;
          return true;
        }
      }

      /**
       * @param {CommentHeader} cmheader
       * @returns {DOMFile | undefined}
       */
      DOMFile.tryParse = function tryParse(cmheader) {

        //    /file/path/continue
        //    "/file/path/continue"
        //    /file/path/continue   [encoding]

        var parseFmt = /^\s*((\/|\"\/)(\s|\S)*[^\]])\s*(\[((\s|\S)*)\])?\s*$/;
        var parsed = parseFmt.exec(cmheader.header);
        if (!parsed) return; // does not match the format

        var filePath = parsed[1];
        var encodingName = parsed[5];

        if (filePath.charAt(0) === '"') {
          if (filePath.charAt(filePath.length - 1) !== '"') return; // unpaired leading quote
          try {
            if (typeof JSON !== 'undefined' && typeof JSON.parse === 'function')
              filePath = JSON.parse(filePath);
            else
              filePath = eval(filePath); // security doesn't seem to be compromised, input is coming from the same file
          }
          catch (parseError) {
            return; // quoted path but wrong format (JSON expected)
          }
        }
        else { // filePath NOT started with quote
          if (encodingName) {
            // regex above won't strip trailing whitespace from filePath if encoding is specified
            // (because whitespace matches 'non-bracket' class too)
            filePath = filePath.slice(0, filePath.search(/\S(\s*)$/) + 1);
          }
        }

        var encoding = encodings[encodingName || 'LF'];
        // invalid encoding considered a bogus comment, skipped
        if (encoding)
          return new DOMFile(cmheader.node, filePath, encoding, cmheader.contentOffset, cmheader.contentLength);

        return;
      }

      var monthsPrettyCase = ('Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec').split('|');
      var monthsUpperCaseStr = monthsPrettyCase.join('').toUpperCase();

      /**
       * @param {number} timestamp
       * @param {number} totalSize
       * @param {Comment} node
       */
      function domTotals(timestamp, totalSize, node) {
        var totals = {
          timestamp: timestamp,
          totalSize: totalSize,
          node: node,
          updateNode: updateNode
        };

        // cache after updating DOM, to avoid unneeded updates
        var domTimestamp = -1;
        var domTotalSize = -1;

        return totals;

        function updateNode() {

          if (domTimestamp === totals.timestamp && domTotalSize === totals.totalSize) return;

          // total 4Kb, saved 25 Apr 2015 22:52:01.231
          var newTotals =
            'total ' + formatSizeDOMTotals(totals.totalSize) + ', ' +
            'saved ' + formatDateDOMTotals(new Date(totals.timestamp));

          if (!totals.node) return newTotals;

          totals.node.nodeValue = newTotals;
          domTimestamp = totals.timestamp;
          domTotalSize = totals.totalSize;
        }
      }


      /**
       * @param {CommentHeader} cmheader
       * @returns {DOMTotals | undefined}
       */
        function tryParseDOMTotals(cmheader) {

          // TODO: preserve unknowns when parsing
          var parts = cmheader.header.split(',');
          var anythingParsed = false;
          var totalSize = 0;
          var timestamp = 0;

          for (var i = 0; i < parts.length; i++) {

            // total 234Kb
            // total 23
            // total 6Mb

            var totalFmt = /^\s*total\s+(\d*)\s*([KkMm])?b?\s*$/;
            var totalMatch = totalFmt.exec(parts[i]);
            if (totalMatch) {
              try {
                var total = parseInt(totalMatch[1]);
                if ((totalMatch[2] + '').toUpperCase() === 'K')
                  total *= 1024;
                else if ((totalMatch[2] + '').toUpperCase() === 'M')
                  total *= 1024 * 1024;
                totalSize = total;
                anythingParsed = true;
              }
              catch (totalParseError) { }
              continue;
            }

            var savedFmt = /^\s*saved\s+(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)(\s+(\d+)\:(\d+)(\:(\d+(\.(\d+))?))\s*(GMT\s*[\-\+]?\d+\:?\d*)?)?\s*$/i;
            var savedMatch = savedFmt.exec(parts[i]);
            if (savedMatch) {
              // 25 Apr 2015 22:52:01.231
              try {
                var savedDay = parseInt(savedMatch[1]);

                // first find string index within JANFEBMAR...NOVDEC then divide by three
                // which happens to be (0...11)*3
                var savedMonth = monthsUpperCaseStr.indexOf(savedMatch[2].toUpperCase());
                if (savedMonth >= 0 && savedMonth % 3 === 0)
                  savedMonth = savedMonth / 3;

                var savedYear = parseInt(savedMatch[3]);
                if (savedYear < 100)
                  savedYear += 2000; // no 19xx notation anymore :-(
                var savedHour = parseInt(savedMatch[5]);
                var savedMinute = parseInt(savedMatch[6]);
                var savedSecond = savedMatch[8] ? parseFloat(savedMatch[8]) : 0;

                if (savedMatch[4]) {
                  timestamp = new Date(savedYear, savedMonth, savedDay, savedHour, savedMinute, savedSecond | 0).valueOf();
                  timestamp += (savedSecond - (savedSecond | 0)) * 1000; // milliseconds

                  var savedGMTStr = savedMatch[11];
                  if (savedGMTStr) {
                    var gmtColonPos = savedGMTStr.indexOf(':');
                    if (gmtColonPos > 0) {
                      var gmtH = parseInt(savedGMTStr.slice(0, gmtColonPos));
                      timestamp += gmtH * 60 /*min*/ * 60 /*sec*/ * 1000 /*msec*/;
                      var gmtM = parseInt(savedGMTStr.slice(gmtColonPos + 1));
                      timestamp += gmtM * 60 /*sec*/ * 1000 /*msec*/;
                    }
                  }
                }
                else {
                  timestamp = new Date(savedYear, savedMonth, savedDay).valueOf();
                }

                anythingParsed = true;
              }
              catch (savedParseError) { }
            }

          }

          if (anythingParsed)
            return domTotals(timestamp, totalSize, cmheader.node);
        }


        /** @param {number} totalSize */
        function formatSizeDOMTotals(totalSize) {
          return (
            totalSize < 1024 * 9 ? totalSize + '' :
              totalSize < 1024 * 1024 * 9 ? ((totalSize / 1024) | 0) + 'Kb' :
                ((totalSize / (1024 * 1024)) | 0) + 'Mb');
        }

        /** @param {Date} date */
      function formatDateDOMTotals(date) {
        var dateLocalStr = date.toString(); // FIX: not very compatible option!
        var gmtMatch = (/(GMT\s*[\-\+]\d+(\:\d+)?)/i).exec(dateLocalStr);

        var d = date.getDate();
        var MMM = monthsPrettyCase[date.getMonth()];
        var yyyy = date.getFullYear();
        var h = date.getHours();
        var m = date.getMinutes();
        var s = date.getSeconds();
        var ticks = +date;

        var formatted =
          d +
          ' ' + MMM +
          ' ' + yyyy +
          (h > 9 ? ' ' : ' 0') + h +
          (m > 9 ? ':' : ':0') + m +
          (s > 9 ? ':' : ':0') + s +
          '.' + (ticks).toString().slice(-3) +
          (gmtMatch && gmtMatch[1] !== 'GMT+0000' ? ' ' + gmtMatch[1] : '');

        return formatted;
      }

      /** @param {number} timestamp @param {number} totalSize */
      function forceInjectTotals(timestamp, totalSize) {
        var comment = document.createComment('');
        var parent = document.head || document.getElementsByTagName('head')[0] || document.body;
        parent.insertBefore(comment, parent.children ? parent.children[0] : null);
        return domTotals(timestamp, totalSize, comment);
      }

      /**
       * @param {DOMTotals} totals
       * @param {DOMFile[]} fileList
       * @param {Document} document
       */
      function createDOMDrive(totals, fileList, document) {
        /** @type { { [path: string]: DOMFile; }} */
        var byPath = {};
        /** @type {Node | undefined} */
        var anchorNode;
        var totalSize = 0;

        /** @type {(typeof continueLoad) | undefined} */
        var _continueLoad = continueLoad;

        /** @type {Drive.Detached.DOMDrive} */
        var domDrive = {
          timestamp: void 0,

          files: files,
          read: read,
          write: write,
          storedSize: storedSize,
        };

        for (var i = 0; i < fileList.length; i++) {
          byPath[fileList[i].path] = fileList[i];
          totalSize += fileList[i].contentLength;
          if (!anchorNode) anchorNode = fileList[i].node;
        }

        if (!totals) {
          totals = forceInjectTotals(domDrive.timestamp || 0, totalSize);
        }

        domDrive.timestamp = totals.timestamp;

        return domDrive;

        function files() {
          if (typeof Object.keys === 'string') {
            var result = Object.keys(this._byPath);
          }
          else {
            /** @type {string[]} */
            var result = [];
            for (var k in this._byPath) if (this._byPath.hasOwnProperty(k)) {
              result.push(k);
            }
          }

          result.sort();
          return result;
        }

        /** @param {string} file */
        function read(file) {
          var file = normalizePath(file);
          var f = byPath[file];
          if (!f) return null;
          else return f.read();
        }

        /** @param {string} file */
        function storedSize(file) {
          var normFile = normalizePath(file);
          var f = byPath[normFile];
          if (!f) return null;
          else return f.contentLength;
        }

        /** @param {string} file @param {string} content @param {string=} encoding */
        function write(file, content, encoding) {

          var totalDelta = 0;

          var file = normalizePath(file);
          var f = byPath[file];

          if (content === null) {
            // removal
            if (f) {
              totalDelta -= f.contentLength;
              var parentElem = f.node.parentElement || f.node.parentNode;
              if (parentElem) parentElem.removeChild(f.node);
              delete byPath[file];
            }
          }
          else {
            if (f) { // update
              var lengthBefore = f.contentLength;
              if (!f.write(content, encoding)) return; // no changes - no update for timestamp/totals
              totalDelta += f.contentLength - lengthBefore;
            }
            else { // addition
              var comment = document.createComment('');
              var f = new DOMFile(comment, file, /** @type {*} */(null), 0, 0);
              f.write(content, encoding);

              anchorNeeded();

              if (anchorNode) document.body.insertBefore(f.node, anchorNode);
              else document.body.appendChild(f.node);
              anchorNode = f.node; // next time insert before this node
              byPath[file] = f;
              totalDelta += f.contentLength;
            }
          }

          if (domDrive.timestamp)
            totals.timestamp = domDrive.timestamp;

          totals.totalSize += totalDelta;
          totals.updateNode();
        }

        function loadProgress() {
          return { total: this._totals ? this._totals.totalSize : this._totalSize, loaded: this._totalSize };
        }

        /** @param {DOMFile | DOMTotals} entry */
        function continueLoad(entry) {

          if (!entry) {
            _continueLoad = void 0;
            if (!totals) totals = forceInjectTotals(0, totalSize);
            totals.updateNode();
            return;
          }

          if (/** @type {DOMFile} */(entry).path) {
            var file = /** @type {DOMFile} */(entry);
            // in case of duplicates, prefer earlier, remove latter
            if (byPath[file.path]) {
              if (!file.node) return;
              var p = file.node.parentElement || file.node.parentNode;
              if (p) p.removeChild(file.node);
              return;
            }

            byPath[file.path] = file;
            if (!anchorNode) anchorNode = file.node;
            totalSize += file.contentLength;
          }
          else {
            totals = /** @type {DOMTotals} */(entry);
            // consider the values, but throw away the later totals DOM node
            totals.timestamp = Math.max(totals.timestamp, totals.timestamp | 0);
            totals.totalSize = Math.max(totals.totalSize, totals.totalSize | 0);
            if (!totals.node) return;
            var p = totals.node.parentElement || totals.node.parentNode;
            if (p) p.removeChild(totals.node);
          }
        }

        function anchorNeeded() {
          // try to insert at the start, so new files will be loaded first
          var anchor = anchorNode;
          if (anchor && anchor.parentElement === document.body) return;

          // this happens when filesystem is empty, or nodes got removed
          // - we try not to bubble above scripts, so boot UI is rendered fast even on slow connections
          var scripts = document.body.getElementsByTagName('script');
          anchor = scripts[scripts.length - 1];
          if (anchor) {
            var next = anchor.nextSibling;
            if (!next && anchor.parentNode)
              next = anchor.parentNode.nextSibling;
            anchor = next || void 0; // convert null to undefined
          }

          if (anchor) anchorNode = anchor;
        }
      }


      /**
       * 
       * @param {Drive.Detached.DOMDrive} dom
       * @param {Drive.Shadow=} shadow
       * @returns {Drive}
       */
      function createMountedDrive(dom, shadow) {

        var drive = {
          updateTime: true,
          timestamp: dom.timestamp,

          files: files,
          read: read,
          write: write,
          storedSize: storedSize
        };

        /** @type {string[] | undefined} */
        var cachedFiles;

        return drive;

        function files() {
          if (!cachedFiles)
            cachedFiles = dom.files();

          return cachedFiles.slice(0);
        }

        /** @param {string} file */
        function read(file) {
          return dom.read(file);
        }

        /** @param {string} file */
        function storedSize(file) {
          if (dom.storedSize) return dom.storedSize(file);
          else return null;
        }

        /** @param {string} file @param {string} content */
        function write(file, content) {
          if (drive.updateTime)
            drive.timestamp = getTimeNow();

          cachedFiles = void 0;

          dom.timestamp = drive.timestamp;

          if (content || typeof content === 'string') {
            var encoded = bestEncode(content);
            dom.write(file, encoded.content, encoded.encoding);
            if (shadow) {
              shadow.timestamp = this.timestamp;
              shadow.write(file, encoded.content, encoded.encoding);
            }
          } else {
            dom.write(file, null);
            if (shadow) {
              shadow.timestamp = this.timestamp;
              shadow.forget(file);
            }
          }

        }
      }

      // #region ENCODING

      var encodings = (function () {
        /** @param {string} text */
        function CR(text) {
          return text.replace(/\r\n|\n/g, '\r');
        }

        /** @param {string} text */
        function CRLF(text) {
          return text.replace(/(\r\n)|\r|\n/g, '\r\n');
        }

        /** @param {string} text */
        function LF(text) {
          return text.replace(/\r\n|\r/g, '\n');
        }

        var _btoa = typeof btoa === 'function' ? btoa : __btoa;
        var _atob = typeof atob === 'function' ? atob : __atob;

        /**
         * @param {string} r
         * @returns {string}
         */
        function __btoa(r) {
          throw new Error('Polyfill for btoa is not implemented.');
        }

        /**
         * @param {string} r
         * @returns {string}
         */
        function __atob(r) {
          throw new Error('Polyfill for atob is not implemented.');
        }

        base64.btoa = _btoa;
        base64.atob = _atob;

      /** @param {string} text */
      function base64(text) {
        if (text && text.charCodeAt(0) === 42) {
          var bin = _atob(text.slice(1));
          var buf = typeof Uint8Array === 'function' ? new Uint8Array(bin.length) : [];
          for (var i = 0; i < bin.length; i++) {
            buf[i] = bin.charCodeAt(i);
          }
          return buf;
        }
        else {
          return _atob(text);
        }
      }

        /** @param {string} text */
        function json(text) {
          var result = typeof JSON === 'undefined' ? eval('(' + text + ')') : JSON.parse(text);

          if (result && typeof result !== 'string' && result.type) {
            /** @type {*} */
            var ctor = window[result.type];
            result = new ctor(result);
          }

          return result;
        }

        return {
          CR, CRLF, LF,
          base64,
          json
        };

      })();

      /** @param {string | number[]} content @param {boolean=} escapePath  */
      function bestEncode(content, escapePath) {

        if (content.length > 1024 * 2) {
          /*
          var compressed = encodings.lzma.compress(content);
          var str = '';
          for (var i = 0; i < compressed.length; i++) {
            str += String.fromCharCode((compressed[i] + 256) % 256);
          }
          var b64 = encodings.base64.btoa(str);
          if (typeof content !== 'string')
            b64 = '*' + b64;
          else
            b64 = 'A' + b64;
          if (b64.length<content.length)
            return {content:b64, encoding: 'lzma'};
            */
        }

        if (typeof content !== 'string') {
          if (typeof content === 'object' && typeof content.length === 'number'
            && content.length > 16 && typeof content[0] === 'number') {
            try {
              return { content: _encodeNumberArrayToBase64(content), encoding: 'base64' };
            }
            catch (base64Error) { }
          }
          return { content: _encodeArrayOrSimilarAsJSON(content), encoding: 'json' };
        }

        var maxEscape = ((content.length * 0.1) | 0) + 2;

        var escape = 0;
        var escapeHigh = 0;
        var prevChar = 0;
        var crCount = 0;
        var lfCount = 0;
        var crlfCount = 0;

        if (escapePath) {
          for (var i = 0; i < content.length; i++) {
            var c = content.charCodeAt(i);
            if (c < 32 || c > 126 || (c === 32 && (!i || i === content.length - 1))) {
              escape = 1;
              break;
            }
          }
        }
        else {
          for (var i = 0; i < content.length; i++) {
            var c = content.charCodeAt(i);

            if (c === 10) {
              if (prevChar === 13) {
                crCount--;
                crlfCount++;
              }
              else {
                lfCount++;
              }
            }
            else if (c === 13) {
              crCount++;
            }
            else if (c < 32 && c != 9) { // tab is an OK character, no need to escape
              escape++;
            }
            else if (c > 126) {
              escapeHigh++;
            }

            prevChar = c;

            if ((escape + escapeHigh) > maxEscape)
              break;
          }
        }

        if (escapePath) {
          if (escape)
            return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
          else
            return { content: content, encoding: 'LF' };
        }
        else {
          if (escape > maxEscape) {
            return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
          }

          else if (escape)
            return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
          else if (crCount) {
            if (lfCount)
              return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
            else
              return { content: content, encoding: 'CR' };
          }
          else if (crlfCount) {
            if (lfCount)
              return { content: _encodeUnusualStringAsJSON(content), encoding: 'json' };
            else
              return { content: content, encoding: 'CRLF' };
          }
          else {
            return { content: content, encoding: 'LF' };
          }
        }

      }

      /** @param {string} content */
      function _encodeUnusualStringAsJSON(content) {
        if (typeof JSON !== 'undefined' && typeof JSON.stringify === 'function') {
          var simpleJSON = JSON.stringify(content);
          var sanitizedJSON = simpleJSON.
            replace(/\u0000/g, '\\u0000').
            replace(/\r/g, '\\r').
            replace(/\n/g, '\\n');
          return sanitizedJSON;
        }
        else {
          var result = content.replace(
            /\"\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u0008|\u0009|\u00010|\u00011|\u00012|\u00013|\u00014|\u00015|\u0016|\u0017|\u0018|\u0019|\u0020|\u0021|\u0022|\u0023|\u0024|\u0025|\u0026|\u0027|\u0028|\u0029|\u0030|\u0031/g,
            (chr) =>
              chr === '\t' ? '\\t' :
                chr === '\r' ? '\\r' :
                  chr === '\n' ? '\\n' :
                    chr === '\"' ? '\\"' :
                      chr < '\u0010' ? '\\u000' + chr.charCodeAt(0).toString(16) :
                        '\\u00' + chr.charCodeAt(0).toString(16));
          return result;
        }
      }

      /** @param {number[]} content */
      function _encodeNumberArrayToBase64(content) {
        var str = '';
        for (var i = 0; i < content.length; i++) {
          str += String.fromCharCode(content[i]);
        }
        var b64 = '*' + encodings.base64.btoa(str);
        return b64;
      }

      function _encodeArrayOrSimilarAsJSON(content) {
        var type = content instanceof Array ? null : content.constructor.name || content.type;
        if (typeof JSON !== 'undefined' && typeof JSON.stringify === 'function') {
          if (type) {
            var wrapped = { type, content };
            var wrappedJSON = JSON.stringify(wrapped);
            return wrappedJSON;
          }
          else {
            var contentJSON = JSON.stringify(content);
            return contentJSON;
          }
        }
        else {
          var jsonArr = [];
          if (type) {
            jsonArr.push('{"type": "');
            jsonArr.push(content.type || content.prototype.constructor.name);
            jsonArr.push('", "content": [');
          }
          else {
            jsonArr.push('[');
          }

          for (var i = 0; i < content.length; i++) {
            if (i) jsonArr.push(',');
            jsonArr.push(content[i]);
          }

          if (type)
            jsonArr.push(']}');
          else
            jsonArr.push(']');

          return jsonArr.join('');
        }
      }

      // #endregion ENCODING

      // #region ATTACHED

      var attached = (function () {

        function _getLocalStorage() {
          return typeof localStorage === 'undefined' || typeof localStorage.length !== 'number' ? void 0 : localStorage;
        }

        return {
          localStorage: (function () {

            /**
             * @param {string} uniqueKey
             * @param {(error?: string, detached?: Drive.Detached) => void} callback
             */
            function detectLocalStorage(uniqueKey, callback) {
              try {
                var localStorageInstance = _getLocalStorage();
                if (!localStorageInstance) {
                  callback('Variable localStorage is not available.');
                  return;
                }

                var access = createLocalStorageAccess(localStorageInstance, uniqueKey);
                var dt = createLocalStorageDetached(access);
                callback(void 0, dt);
              }
              catch (error) {
                callback(error.message);
              }
            }

            /** @param {Storage} localStorage @param {string} prefix */
            function createLocalStorageAccess(localStorage, prefix) {
              /** @type {{ [key: string]: string; }} */
              var cache = {};

              /** @param {string} key */
              function get(key) {
                var k = expandKey(key);
                var r = localStorage.getItem(k);
                return r;
              }

              /** @param {string} key @param {string} value */
              function set(key, value) {
                var k = expandKey(key);
                try {
                  return localStorage.setItem(k, value);
                }
                catch (error) {
                  try {
                    localStorage.removeItem(k);
                    return localStorage.setItem(k, value);
                  }
                  catch (furtherError) {
                  }
                }
              }

              /** @param {string} key */
              function remove(key) {
                var k = expandKey(key);
                return localStorage.removeItem(k);
              }

              function keys() {
                /** @type {string[]} */
                var result = [];
                var len = this._localStorage.length;
                for (var i = 0; i < len; i++) {
                  var str = this._localStorage.key(i);
                  if (str.length > this._prefix.length && str.slice(0, this._prefix.length) === this._prefix)
                    result.push(str.slice(this._prefix.length));
                }
                return result;
              }

              /** @param {string} key */
              function expandKey(key) {
                var k;

                if (!key) {
                  k = prefix;
                }
                else {
                  k = cache[key];
                  if (!k)
                    cache[key] = k = prefix + key;
                }

                return k;
              }

              return {
                get: get,
                set: set,
                remove: remove,
                keys: keys
              }
            }

            /** @param {ReturnType<typeof createLocalStorageAccess>} access */
            function createLocalStorageDetached(access) {
              var detached = {
                timestamp: 0,
                applyTo,
                purge
              };

              var timestampStr = access.get('*timestamp');
              if (timestampStr && timestampStr.charAt(0) >= '0' && timestampStr.charAt(0) <= '9') {
                try {
                  detached.timestamp = parseInt(timestampStr);
                }
                catch (parseError) {
                }
              }
              
              return detached;

              /**
               * @param {Drive.Detached.DOMUpdater} mainDrive
               * @param {Drive.Detached.CallbackWithShadow} callback
               */
              function applyTo(mainDrive, callback) {
                var keys = access.keys();
                for (var i = 0; i < keys.length; i++) {
                  var k = keys[i];
                  if (k.charCodeAt(0) === 47 /* slash */) {
                    var value = this._access.get(k);
                    if (value.charCodeAt(0) === 91 /* open square bracket [ */) {
                      var cl = value.indexOf(']');
                      if (cl > 0 && cl < 10) {
                        var encoding = value.slice(1, cl);
                        var encFn = encodings[encoding];
                        if (typeof encFn === 'function') {
                          mainDrive.write(k, value.slice(cl + 1), encoding);
                          break;
                        }
                      }
                    }
                    mainDrive.write(k, value, 'LF');
                  }
                }

                var shadow = createLocalStorageShadow(access, mainDrive.timestamp);
                callback(shadow);
              }

              /** @param {Drive.Detached.CallbackWithShadow} callback */
              function purge(callback) {
                var keys = access.keys();
                for (var i = 0; i < keys.length; i++) {
                  var k = keys[i];
                  if (k.charAt(0) === '/') {
                    access.remove(k);
                  }
                }

                var shadow = createLocalStorageShadow(access, this.timestamp);
                callback(shadow);
              }
            }

            /**
             * @param {ReturnType<typeof createLocalStorageAccess>} access
             * @param {number | undefined} timestamp
             */
            function createLocalStorageShadow(access, timestamp) {
              var shadow = {
                timestamp,
                write: write,
                forget
              };

              return shadow;

              /**
               * @param {string} file
               * @param {string} content
               * @param {string} encoding
               */
              function write(file, content, encoding) {
                access.set(file, '[' + encoding + ']' + content);
                if (shadow.timestamp)
                  access.set('*timestamp', String(this.timestamp || 0));
              }

              /** @param {string} file */
              function forget(file) {
                access.remove(file);
              }
            }
                
            return {
              name: 'localStorage',
              detect: detectLocalStorage
            }
          })(), // LOCALSTORAGE

          webSQL: (function () {

            function getOpenDatabase() {
              return typeof openDatabase !== 'function' ? null : openDatabase;
            }

            /** @param {string} uniqueKey @param {(error?: string, detached?: Drive.Detached) => void} callback */
            function detectWebSQL(uniqueKey, callback) {
              try {
                detectWebSQLCore(uniqueKey, callback);
              }
              catch (error) {
                callback(error.message);
              }
            }

            /** @param {string} uniqueKey @param {(error?: string, detached?: Drive.Detached) => void} callback */
            function detectWebSQLCore(uniqueKey, callback) {

              var openDatabaseInstance = getOpenDatabase();
              if (!openDatabaseInstance) {
                callback('WebSQL API "openDatabase" is not available.');
                return;
              }

              var dbName = uniqueKey || 'portabled';

              var db = openDatabase(
                dbName, // name
                1, // version
                'Portabled virtual filesystem data', // displayName
                1024 * 1024); // size
              // upgradeCallback?


              var repeatingFailures_unexpected = 0; // protect against multiple transaction errors causing one another
              var finished = false; // protect against reporting results multiple times

              db.readTransaction(
                transaction => {

                  transaction.executeSql(
                    'SELECT value from "*metadata" WHERE name=\'editedUTC\'',
                    [],
                    (transaction, result) => {
                      /** @type {number | undefined} */
                      var editedValue;
                      if (result.rows && result.rows.length === 1) {
                        var editedValueStr = result.rows.item(0).value;
                        if (typeof editedValueStr === 'string') {
                          try {
                            editedValue = parseInt(editedValueStr);
                          }
                          catch (error) {
                            // unexpected value for the timestamp, continue as if no value found
                          }
                        }
                        else if (typeof editedValueStr === 'number') {
                          editedValue = editedValueStr;
                        }
                      }

                      finished = true;
                      callback(void 0, createWebSQLDetached(db, editedValue || 0, true));
                    },
                    (transaction, sqlError) => {
                      if (finished) return;
                      else finished = true;
                      // no data
                      callback(void 0, createWebSQLDetached(db, 0, false));
                    });
                },
                sqlError => {
                  if (finished) return;
                  else finished = true;

                  repeatingFailures_unexpected++;
                  if (repeatingFailures_unexpected > 5) {
                    callback('Loading from metadata table failed, generating multiple failures ' + sqlError.message);
                  }

                  this._createMetadataTable(
                    sqlError_creation => {
                      if (finished) return;
                      else finished = true;

                      if (sqlError)
                        callback(
                          'Loading from metadata table failed: ' + sqlError.message + ' and creation metadata table failed: ' + sqlError_creation.message);
                      else
                        // original metadata access failed, but create table succeeded
                        callback(void 0, createWebSQLDetached(db, 0, false));
                    });
                });

            }

            /**
             * @param {Database} db 
             * @param {number} timestamp 
             * @param {boolean} metadataTableIsValid 
             */
            function createWebSQLDetached(db, timestamp, metadataTableIsValid) {
              /**
               * @param {Drive.Detached.DOMUpdater} mainDrive
               * @param {Drive.Detached.CallbackWithShadow} callback
               */
              function applyTo(mainDrive, callback) {
                db.readTransaction(
                  transaction => listAllTables(
                    transaction,
                    tables => {
                      var ftab = getFilenamesFromTables(tables);
                      applyToWithFiles(transaction, ftab, mainDrive, callback);
                    },
                    sqlError => {
                      reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                      callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                    }),
                  sqlError => {
                    reportSQLError('Failed to open read transaction for the webSQL database.', sqlError);
                    callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                  });
              }

              /** @param {Drive.Detached.CallbackWithShadow} callback */
              function purge(callback) {
                db.transaction(
                  transaction => listAllTables(
                    transaction,
                    tables => {
                      purgeWithTables(transaction, tables, callback);
                    },
                    sqlError => {
                      reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                      callback(createWebSQLShadow(db, 0, false));
                    }),
                  sqlError => {
                    reportSQLError('Failed to open read-write transaction for the webSQL database.', sqlError);
                    callback(createWebSQLShadow(db, 0, false));
                  });
              }

              /**
               * @param {SQLTransaction} transaction
               * @param {{ file: string, table: string }[]} ftab
               * @param {Drive.Detached.DOMUpdater} mainDrive
               * @param {Drive.Detached.CallbackWithShadow} callback
               */
              function applyToWithFiles(transaction, ftab, mainDrive, callback) {
                if (!ftab.length) {
                  callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                  return;
                }

                var reportedFileCount = 0;

                for (var i = 0; i < ftab.length; i++) {
                  applyFile(ftab[i].file, ftab[i].table);
                }

                function completeOne() {
                  reportedFileCount++;
                  if (reportedFileCount === ftab.length) {
                    callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                  }
                }

                /** @param {string} file @param {string} table */
                function applyFile(file, table) {
                  transaction.executeSql(
                    'SELECT * FROM "' + table + '"',
                    [],
                    (transaction, result) => {
                      if (result.rows.length) {
                        var row = result.rows.item(0);
                        if (row.value === null)
                          mainDrive.write(file, null);
                        else if (typeof row.value === 'string')
                          mainDrive.write(file, fromSqlText(row.value), fromSqlText(row.encoding));
                      }
                      completeOne();
                    },
                    sqlError => {
                      completeOne();
                    });
                }
              }

              /**
               * @param {SQLTransaction} transaction
               * @param {string[]} tables
               * @param {Drive.Detached.CallbackWithShadow} callback
               */
              function purgeWithTables(transaction, tables, callback) {
                if (!tables.length) {
                  callback(createWebSQLShadow(db, 0, false));
                  return;
                }

                var droppedCount = 0;

                for (var i = 0; i < tables.length; i++) {
                  transaction.executeSql(
                    'DROP TABLE "' + tables[i] + '"',
                    [],
                    (transaction, result) => {
                      completeOne();
                    },
                    (transaction, sqlError) => {
                      reportSQLError('Failed to drop table for the webSQL database.', sqlError);
                      completeOne();
                    });
                }

                function completeOne() {
                  droppedCount++;
                  if (droppedCount === tables.length) {
                    callback(createWebSQLShadow(db, 0, false));
                  }
                }
              }

              var detached = {
                timestamp: timestamp,
                applyTo: applyTo,
                purge: purge
              };

              return detached;
            }

            /**
             * @param {Database} db
             * @param {number} timestamp
             * @param {boolean} metadataTableIsValid
             */
            function createWebSQLShadow(db, timestamp, metadataTableIsValid) {

              /** @type {{ [name: string]: string; }} */
              var cachedUpdateStatementsByFile = {};

              /**
               * @param {string} file
               * @param {string} content
               * @param {string} encoding
               */
              function write(file, content, encoding) {
                if (content || typeof content === 'string') {
                  updateCore(file, content, encoding);
                }
                else {
                  deleteAllFromTable(file);
                }
              }

              /** @param {string} file */
              function forget(file) {
                dropFileTable(file);
              }

              /**
               * @param {string} file
               * @param {string} content
               * @param {string} encoding
               */
              function updateCore(file, content, encoding) {
                var updateSQL = cachedUpdateStatementsByFile[file];
                if (!updateSQL) {
                  var tableName = mangleDatabaseObjectName(file);
                  updateSQL = createUpdateStatement(file, tableName);
                }

                var repeatingTransactionErrorCount_unexpected = 0;
                db.transaction(
                  transaction => {
                    transaction.executeSql(
                      updateSQL,
                      ['content', content, encoding],
                      updateMetadata,
                      (transaction, sqlError) => {
                        createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                      });
                  },
                  sqlError => {
                    repeatingTransactionErrorCount_unexpected++;
                    if (repeatingTransactionErrorCount_unexpected > 5) {
                      reportSQLError('Transaction failures (' + repeatingTransactionErrorCount_unexpected + ') updating file "' + file + '".', sqlError);
                      return;
                    }

                    // failure might have been due to table absence?
                    // -- redo with a new transaction
                    db.transaction(
                      transaction => {
                        createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                      },
                      sqlError_inner => {
                        // failure might have been due to *metadata table ansence
                        // -- redo with a new transaction (last attempt)
                        db.transaction(
                          transaction => {
                            updateMetdata_noMetadataCase(transaction);
                            // OK, once again for extremely confused browsers like Opera
                            transaction.executeSql(
                              updateSQL,
                              ['content', content, encoding],
                              updateMetadata,
                              (transaction, sqlError) => {
                                createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                              });
                          },
                          sqlError_ever_inner => {
                            reportSQLError(
                              'Transaction failure updating file "' + file + '" ' +
                              '(after ' +
                              (repeatingTransactionErrorCount_unexpected > 1 ? repeatingTransactionErrorCount_unexpected : '') +
                              ' errors like ' + sqlError_inner.message + ' and ' + sqlError_ever_inner.message +
                              ').',
                              sqlError);
                          });
                      });
                  });
              }

              /**
               * @param {SQLTransaction} transaction
               * @param {string} file
               * @param {string} tableName
               * @param {string} updateSQL
               * @param {string} content
               * @param {string} encoding
               */
              function createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding) {
                if (!tableName)
                  tableName = mangleDatabaseObjectName(file);

                transaction.executeSql(
                  'CREATE TABLE "' + tableName + '" (name PRIMARY KEY, value, encoding)',
                  [],
                  (transaction, result) => {
                    transaction.executeSql(
                      updateSQL,
                      ['content', content, encoding],
                      this._closures.updateMetadata,
                      (transaction, sqlError) => {
                        reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
                      });
                  },
                  (transaction, sqlError) => {
                    reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              }

              /** @param {string} file */
              function deleteAllFromTable(file) {
                var tableName = mangleDatabaseObjectName(file);
                db.transaction(
                  transaction => {
                    transaction.executeSql(
                      'DELETE FROM TABLE "' + tableName + '"',
                      [],
                      updateMetadata,
                      (transaction, sqlError) => {
                        reportSQLError('Failed to delete all from table "' + tableName + '" for file "' + file + '".', sqlError);
                      });
                  },
                  sqlError => {
                    reportSQLError('Transaction failure deleting all from table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              }

              /** @param {string} file */
              function dropFileTable(file) {
                var tableName = mangleDatabaseObjectName(file);
                db.transaction(
                  transaction => {
                    transaction.executeSql(
                      'DROP TABLE "' + tableName + '"',
                      [],
                      updateMetadata,
                      (transaction, sqlError) => {
                        reportSQLError('Failed to drop table "' + tableName + '" for file "' + file + '".', sqlError);
                      });
                  },
                  sqlError => {
                    reportSQLError('Transaction failure dropping table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              }

              /** @param {SQLTransaction} transaction */
              function updateMetadata(transaction) {
                transaction.executeSql(
                  'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
                  ['editedUTC', this.timestamp],
                  function () {
                    // OK
                  },
                  updateMetdata_noMetadataCase);
              }

              /** @param {SQLTransaction} transaction */
              function updateMetdata_noMetadataCase(transaction) {
                createMetadataTable(
                  transaction,
                  sqlerr => {
                    if (sqlerr) {
                      reportSQLError('Failed create metadata table.', sqlerr);
                      return;
                    }

                    transaction.executeSql(
                      'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
                      ['editedUTC', this.timestamp],
                      (tr, result) => {
                        // OK
                      },
                      (tr, sqlerr) => {
                        reportSQLError('Failed to update metadata table after creation.', sqlerr);
                      });
                  });
              }

              /**
               * 
               * @param {SQLTransaction} transaction
               * @param {(error?: SQLError) => void} callback 
               */
              function createMetadataTable(transaction, callback) {
                transaction.executeSql(
                  'CREATE TABLE "*metadata" (name PRIMARY KEY, value)',
                  [],
                  (transaction, result) =>
                    callback(),
                  (transaction, sqlError) =>
                    callback(sqlError));
              }

              /**
               * @param {string} file
               * @param {string} tableName
               */
              function createUpdateStatement(file, tableName) {
                return cachedUpdateStatementsByFile[file] =
                  'INSERT OR REPLACE INTO "' + tableName + '" VALUES (?,?,?)';
              }

              return {
                write: write,
                forget: forget
              };
            }

            /** @param {string} name */
            function mangleDatabaseObjectName(name) {
              // no need to polyfill btoa, if webSQL exists
              if (name.toLowerCase() === name)
                return name;
              else
                return '=' + btoa(name);
            }

            /** @param {string} name */
            function unmangleDatabaseObjectName(name) {
              if (!name || name.charAt(0) === '*') return null;

              if (name.charAt(0) !== '=') return name;

              try {
                return atob(name.slice(1));
              }
              catch (error) {
                return name;
              }
            }

            /**
             * @param {SQLTransaction} transaction
             * @param {(tables: string[]) => void} callback
             * @param {(sqlError: SQLError) => void} errorCallback
             */
            function listAllTables(transaction, callback, errorCallback) {
              transaction.executeSql(
                'SELECT tbl_name  from sqlite_master WHERE type=\'table\'',
                [],
                (transaction, result) => {
                  /** @type {string[]} */
                  var tables = [];
                  for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows.item(i);
                    var table = row.tbl_name;
                    if (!table || (table[0] !== '*' && table.charAt(0) !== '=' && table.charAt(0) !== '/')) continue;
                    tables.push(row.tbl_name);
                  }
                  callback(tables);
                },
                (transaction, sqlError) => errorCallback(sqlError));
            }

            /** @param {string[]} tables */
            function getFilenamesFromTables(tables) {
              /** @type {{ table: string; file: string; }[]} */
              var filenames = [];
              for (var i = 0; i < tables.length; i++) {
                var file = unmangleDatabaseObjectName(tables[i]);
                if (file)
                  filenames.push({ table: tables[i], file: file });
              }
              return filenames;
            }

            /** @param {string} text */
            function toSqlText(text) {
              if (text.indexOf('\u00FF') < 0 && text.indexOf('\u0000') < 0) return text;

              return text.replace(/\u00FF/g, '\u00FFf').replace(/\u0000/g, '\u00FF0');
            }

            /** @param {string} sqlText */
            function fromSqlText(sqlText) {
              if (sqlText.indexOf('\u00FF') < 0 && sqlText.indexOf('\u0000') < 0) return sqlText;

              return sqlText.replace(/\u00FFf/g, '\u00FF').replace(/\u00FF0/g, '\u0000');
            }

            function reportSQLError(message, sqlError) {
              if (typeof console !== 'undefined' && typeof console.error === 'function') {
                if (sqlError)
                  console.error(message, sqlError);
                else
                  console.error(sqlError);
              }
            }

            return {
              detect: detectWebSQL
            };
          })()
        };
      })();

      // #endregion ATTACHED

      /** @param {string} path */
      function normalizePath(path) {
        if (!path) return '/'; // empty paths converted to root

        if (path.charAt(0) !== '/') // ensuring leading slash
          path = '/' + path;

        path = path.replace(/\/\/*/g, '/'); // replacing duplicate slashes with single
        return path;
      }

      return persistence;

    })();

    // #enregion PERSISTENCE

    // local|read|edit|view|browse|shell|get|post|put|head|delete|option|connect|trace|mailto:|http:|https:
    function loadVerb(verb) {

    }

    function bootUrlEncoded() {
      var verbMatch = getVerb(location.pathname);
      if (verbMatch) {
        boot
      }
    }

    function bootBacked(uniquenessSource) {

    }

    /**
     * Booting from inside browser, one of possible 3 options/modes:
     * 1. URLENCODED (including empty URL)
     *    - local HTML will be discarded
     *    - content decoded/extracted from URL
     *    - presentation UI/verb taken from URL
     *    - auto-detection of verb from content?
     *    - support "attachments"
     *    - special case of empty: show splash
     * 2. BACKED
     *    - content is extracted from HTML body
     *    - formats to support (MIME multipart? comment-file? CSV? Markdown?)
     *    - changes loaded from storage (webSQL, indexedDB, localStorage) and applied on top
     *    - auto-detection of verb from content?
     *    - for multi-file, which one is default?
     */
    function boot() {
      // @ts-ignore
      if (typeof catchREST_urlencoded !== 'undefined' && catchREST_urlencoded) {
        bootUrlEncoded();
      } else {
        bootBacked(location.pathname);
      }
    }

    function bootOld() {

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
        placeholder.innerHTML = embeddedTableLayoutHTML;
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

  // re-entering will be diverted (and can be overridden by whatever is actually running)
  if (/** @type {*} */(catchREST)['continue']) return /** @type {*} */(catchREST)['continue']();
  /** @type {*} */(catchREST)['continue'] = function () { };

  detectEnvironmentAndStart();
} catchREST();
// </script>
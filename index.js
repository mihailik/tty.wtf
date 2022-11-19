// <script> 
// @ts-check
function startHARREST() {

  var importedJS = [
    'codemirror@5.64.0/lib/codemirror.js',
    'typescript@4.7.3/lib/typescript.js',
    'ts-jsonp@4.7.3/index.js',
    // 'xlsx@0.17.4/dist/xlsx.full.min.js'
    'xlsx@0.17.4/xlsx.js',
    'xlsx@0.17.4/jszip.js'
  ];

  var importedStyles = [
    'codemirror@5.64.0/lib/codemirror.css'
  ];
  
  function detectEnvironmentAndStart() {

    switch (detectEnvironment()) {
      case 'browser': return runBrowser();
      case 'node': return runNode();
    }

    throw new Error('Running in an unsupported environment.');

    function detectEnvironment() {
      if (typeof window !== 'undefined' && window && typeof window.alert === 'function'
        && typeof document !== 'undefined' && document && typeof document.createElement === 'function')
        return 'browser';
      if (typeof process !== 'undefined' && process && process.argv && typeof process.argv.length === 'number'
          && typeof require === 'function' && typeof require.resolve === 'function')
        return 'node';
    }
  }

  /** @param mangled {string} */
  function unmangleFromURL(mangled) {
    return decodeURIComponent(mangled
      .replace(/\//g, '\n')
      .replace(/\+/g, ' ')
    );
  }

  /** @param {string} text */
  function mangleForURL(text) {
    return encodeURIComponent(text)
      .replace(/%3A/ig, ':')
      .replace(/%20/ig, '+')
      .replace(/%0A/gi, '/');
  }

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

  function runNode() {
    var fs = require('fs');
    var path = require('path');
    var http = require('http');
    var child_process = require('child_process');
    var server;

    var HTTP_PORT = 3100;

    requestShutdownExisting(function(shutdownResult) {
      console.log('Existing run: ', shutdownResult);

      console.log('HAR Rest node server@' + process.pid);
      server = http.createServer(handleRequest);
      server.listen(HTTP_PORT, function () {
        console.log('Server started at http://localhost:' + HTTP_PORT + '/');
      });

      fs.watchFile(__filename, function () {
        initiateRestart(3000);
      });
    });

    /**
     * @param callback {(result: 'exited' | 'failed' | 'timeout') => void}
     */
    function requestShutdownExisting(callback) {
      var postShutdownRequest = http.request(
        'http://localhost:' + HTTP_PORT + '/shutdown', 
        {
          method: 'POST'
        });
      
        var requestCompleted = false;

      var requestTimeout = setTimeout(function() {
        if (requestCompleted) return;
        requestCompleted = true;
        callback('timeout');
      }, 10000);

      postShutdownRequest.on('error', function() {
        if (requestCompleted) return;
        clearTimeout(requestTimeout);
        callback('failed');
      });

      postShutdownRequest.on('end', function() {
        if (requestCompleted) return;
        clearTimeout(requestTimeout);
        setTimeout(function () {
          callback('exited');
        }, 400);
      });
    }

    /**
     * @param req {import('http').IncomingMessage}
     * @param res {import('http').ServerResponse}
     */
    function handleRequest(req, res) {

      if (/^\/favicon\b/.test(req.url)) {
        console.log(req.url + ' HTTP/400');
        res.statusCode = 400;
        res.end();
        return;
      }
      else if (/^\/restart\b/.test(req.url)) {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'text/html');
          res.end('<form method=POST> RESTART: <input type=submit> </form>');
          return;
        }

        initiateRestart();
        res.end('RESTART INITIATED');
        return;
      }
      else if (/^\/shutdown\b/.test(req.url)) {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'text/html');
          res.end('<form method=POST> SHUTDOWN: <input type=submit> </form>');
          return;
        }

        initiateShutdown();
        res.end('SHUTDOWN INITIATED');
        return;
      }

      var html = generateHTML();
      
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
      console.log(req.url + ' HTTP/200');
    }

    function generateHTML() {
      return (
        '// <' + 'script' + '> \n' +
        startHARREST + '\n' +
        '\n' +
        'startHARREST(); \n' +
        '// </' + 'script' + '>\n'
      );
    }

    function initiateShutdown() {
      setTimeout(function () {
        process.exit();
      }, 500);
    }

    var restartTimeout;
    var restarting;

    function initiateRestart(timeout) {
      if (restarting) return;
      clearTimeout(restartTimeout);

      restartTimeout = setTimeout(function () {
        console.log('Restarting on change...');
        restarting = true;
        server.close(function () {
          console.log('starting new process: ', process.argv);
          console.log('');
          child_process.spawn(
            process.argv[0],
            process.argv.slice(1),
            { stdio: 'inherit' }
          );
        });
      }, timeout || 300);

    }

  }

  function runBrowser() {

    document.title = 'Catch Rest ' + String.fromCharCode(55356) + String.fromCharCode(57209);
    populateInnerHTML();

    var layoutTABLE = /** @type {HTMLTableElement} */(document.getElementById('layoutTABLE'));
    var leftTD = /** @type {HTMLTableCellElement} */(document.getElementById('leftTD'));
    var requestTD = /** @type {HTMLTableCellElement} */(document.getElementById('requestTD'));
    var responseTD = /** @type {HTMLTableCellElement} */(document.getElementById('responseTD'));
    var statusTD = /** @type {HTMLTableCellElement} */(document.getElementById('statusTD'));
    var splitterTD = /** @type {HTMLTableCellElement} */(document.getElementById('splitterTD'));

    var requestCodeMirror;
    var responseCodeMirror;
    
    splitterTD.onmousedown = splitterTD_onmousedown;
    splitterTD.ontouchstart = splitterTD_onmousedown;
    splitterTD.onmouseup = splitterTD_onmouseup;
    //splitterTD.onmousemove = splitterTD_onmousemove;
    window.onmousemove = splitterTD_onmousemove;
    window.ontouchmove = splitterTD_onmousemove;

    loadDependenciesAppropriately(function (source) {
      console.log('Dependencies loaded from ' + source);
      set(statusTD, 'Loaded');
      continueWithDependencies();
      set(statusTD, 'Loaded.');
    });

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
        process = {
          env: {}
        };
        require = function () { }

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

        /** @param {MouseEvent | TouchEvent} evt */
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

    function continueWithDependencies() {
      requestTD.innerHTML = '';
      responseTD.innerHTML = '';
      requestCodeMirror = CodeMirror(requestTD, { lineNumbers: true, value: deriveTextFromLocation() });
      responseCodeMirror = CodeMirror(responseTD, { lineNumbers: true, readOnly: true });

      requestCodeMirror.on('changes', requestTextChanged);

      function requestTextChanged() {
        var text = requestCodeMirror.getValue();
        updateLocationWithText(text);
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
          history.replaceState(null, 'unused-string', location.protocol + location.hostname + (location.port ? ':' + location.port : '') + '/' + encoded);
        } else if (hasReplaceState && !isFileProtocol && !isAboutProtocol) {
          history.replaceState(null, 'unused-string', location.pathname + '?' + encoded);
        } else {
          if (preferSearchToPath) location.search = '';
          location.href = '#' + encoded;
        }
      }
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
      
      <title>HAR-REST</title>
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

      <button id=sendBUTTON><span id=sendLabel>GET</span></button>
    
      </td>
      <td width=80% height=50% id=requestTD>
    
      </td>
    </tr>
    <tr height=1>
      <td width=80% id=splitterTD>
        -splitter-
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

startHARREST(); 
// </script>

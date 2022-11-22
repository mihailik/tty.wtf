// @ts-check <script>
/// <reference path="./websql.d.ts" />
/// <reference types="codemirror" />

function catchREST() {

  // Debug! Temporary!
  if (typeof window !== 'undefined' && window) {
    window.onerror = function () {
      var txt = '';
      for (var i = 0; i < arguments.length; i++) {
        var add = String(arguments[i]);
        if (!txt || add.length <= 10) txt += ' ' + add;
        else if (txt.indexOf(add) >= 0) continue;
        else txt += '\n' + add;
      };
      alert(txt);
    };
  }

  // #region polyfills

  if (typeof document !== 'undefined' && document && !document.defaultView && typeof window !== 'undefined' && window) {
    // @ts-ignore
    document.defaultView = window;
  }

  if (typeof Promise === 'undefined') {
    Promise = /** @type {Partial<typeof Promise>} */(polyfillPromise());
  }

  if (typeof Object.defineProperty !== 'function') {
    // @ts-ignore
    Object.defineProperty =
      /**
       * @param {*} obj 
       * @param {*} key 
       * @param {*} attr 
       */
      function (obj, key, attr) {
        obj['_get_' + key] = attr.get;
        obj[key] = function () {
          return obj['_get_' + key]();
        };
      };
  }

  if (typeof Object.keys !== 'function') {
    Object.keys = function (obj) {
      var keys = [];
      for (var k in obj) {
        keys.push(k);
      }
      return keys;
    };
  }
  if (typeof Object.entries !== 'function') {
    Object.entries =
      /** @param {*} obj @returns {*} */
      function (obj) {
        var entries = [];
        for (var k in obj) {
          entries.push([k, obj[k]]);
        }
        return entries;
      };
  }
  if (typeof [].map !== 'function') {
    (function () {
      Array.prototype.map = function map(callback) {
        var arr = this;
        var res = [];
        for (var i = 0; i < this.length; i++) {
          if (!(String(i) in arr)) continue;
          var elem = arr[i];
          var x = callback(elem, i, arr);
          res[i] = x;
        }
        return res;
      };
    })();
  }

  if (typeof [].filter !== 'function') {
    Array.prototype.filter = function (filt) {
      var arr = this;
      var res = [];
      for (var i = 0; i < this.length; i++) {
        if (!(String(i) in arr)) continue;
        var elem = arr[i];
        if (filt(elem)) {
          res.push(elem);
        }
      }
      return res;
    };
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
    Promise.reject = reject;
    Promise.resolve = resolve;

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
          results = /** @type {*} */(void 0);
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

    function reject(reason) {
      return new Promise(function (resolve, reject) {
        reject(reason);
      });
    }

    function resolve(value) {
      return new Promise(function (resolve, reject) {
        resolve(value);
      });
    }

  }

  // #endregion

  // #region SHARED FUNCTIONALITY

  var drinkChar = '\ud83c\udf79';

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

  /** @param {string} url */
  function parseEncodedURL(url) {
    var verbMatch = getVerb(url);
    if (!verbMatch) return;

    var encodedStr = url.slice(verbMatch.index);
    var posEndVerbSlash = encodedStr.indexOf('/');
    var verb;
    var verbPos = verbMatch.index;
    if (posEndVerbSlash >= 0) {
      verb = encodedStr.slice(0, posEndVerbSlash);
      encodedStr = encodedStr.slice(posEndVerbSlash + 1);
    } else {
      verb = encodedStr;
      encodedStr = '';
    }

    if (verb === 'http:' || verb === 'https:') {
      encodedStr = verb + encodedStr;
      verb = 'GET';
      verbPos = -1;
    }

    if (verb === 'edit' || verb === 'view') {
      addr = '';
      var body = decodeURIComponent(encodedStr);
    } else {

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

      var body = decodeURIComponent(encodedStr.replace(/^(\/+)/, function (str) { return str.replace(/\//g, '\n'); }));
    }

    var result = {
      verb: verb,
      verbPos: verbPos,
      addr: addr,
      body: body
    };

    return result;
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
    var bodySeparator = firstLineEnd < requestText.length ? requestText.slice(firstLineEnd, firstLineEnd + 1) : '';
    return {
      leadEmptyLines: leadEmptyLines,
      firstLine: firstLine,
      bodySeparator: bodySeparator,
      body: body
    };
  }

  /** @param {string} firstLine */
  function parseFirstLine(firstLine) {
    // TODO: detect verb, then URL, potentially infer HTTP/S protocol

    var verbMatch = /^(\s*)(local|read|edit|view|browse|shell|get|post|put|head|delete|option|connect|trace)(\s+|$)/i.exec(firstLine + '');
    if (!verbMatch) {
      var url = firstLine.replace(/^\s+/, '');
      var urlPos = firstLine.length - url.length;
      if (url.indexOf('http:') === 0 || url.indexOf('https:') === 0) {
        url = url.replace(/\s+$/, '');
        if (!url || /\s/.test(url)) return; // do not allow whitespace inside implied verb-less URL

        return {
          verb: 'GET',
          url: url,
          verbPos: -1,
          urlPos: urlPos
        };
      }

      // neither HTTP verb matched, nor URL
      return;
    }

    var leadWhitespace = verbMatch[1] || '';
    var verb = verbMatch[2];
    var trailWhitespace = verbMatch[3];

    // capitalised verb (first word) is a strong sign of just normal text
    if (verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() === verb) return;

    var urlRest = firstLine.slice(leadWhitespace.length + verb.length);
    var url = urlRest.replace(/^\s+/, '');
    var urlPos = leadWhitespace.length + urlRest.length - url.length;
    url = url.replace(/\s+$/, '');

    if (!url) return; // empty URL is not good

    return {
      verb: verb,
      url: url,
      verbPos: leadWhitespace,
      urlPos: urlPos
    };
  }

  /** @param {string | null | undefined} path */
  function getVerb(path) {
    var verbMatch = /(^|\/)(local|read|edit|view|browse|shell|get|post|put|head|delete|option|connect|trace|http:|https:)(\/|$)/i.exec(path + '');
    return verbMatch ? { leadingSlash: verbMatch[1], verb: verbMatch[2], trailingSlash: verbMatch[3], index: verbMatch.index + (verbMatch[1] ? 1 : 0) } : void 0;
  }

  function calcHash(str, seed) {
    if (!seed) seed = 0;
    var h1 = 0xdeadbeef ^ seed,
      h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) {
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

  var embeddedMinCSS_authenticityMarker;
  var embeddedMinCSS = (function () {
    var embeddedMinCSS = getFunctionCommentContent(function () {/*
html {
  box-sizing: border-box;
  margin:0;padding:0;
  width:100%;height:100%;

  background: white; color: black;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Note Sans Math", "Note Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", "Note Sans",
    "Arial Unicode";
}
*, *:before, *:after {
  box-sizing: inherit;
}

body {
  margin:0;padding:0;
  width:100%;height:100%;
  overflow:hidden;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Note Sans Math", "Note Emoji", "Noto Sans Symbols", "Noto Sans Symbols 2", "Note Sans",
    "Arial Unicode";
}
#shell .CodeMirror {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
  font: inherit;
}

#shell .CodeMirror-gutters {
  background: #fbfbfb;
}

#shell .CodeMirror-gutter.CodeMirror-linenumber {
  color: #ddd;
}
#shell .CodeMirror-linenumber {
  min-width: 5em;
}

#shell #contentPageHost {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

#shell #contentPageHost #requestEditorHost {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

#shell #contentPageHost #splitterOuter {
  background: linear-gradient(to right, #fbfbfb 5em, #eee);
}

#shell #contentPageHost #splitter {
  box-shadow: 1em -0.3em 0.7em rgba(0,0,0, 0.11);
  padding-left: 0.6em;
  cursor: ns-resize;
}

#shell #contentPageHost #splitterLabel {
  padding-left: 1em;
}

#shell #contentPageHost #splitterBorderTop {
  background: linear-gradient(to right, transparent 5.4em, #f3f3f3 6.5em, #e6e6e6);
}

#shell #contentPageHost #splitterBorderBottom {
  background: linear-gradient(to right, transparent 1.2em, #dedada 1.5em, #d2d2d2);
}

#shell #pseudoGutter {
  border-right: solid 1px #e4e4e4;
  background: #fbfbfb;
  color: #ddd;

  position: absolute;
  left: 0; top: 0;
  height: 100%; width: 2.3em;
  text-align: right;
  padding-top: 0.25em;
  padding-right: 0.2em;
}

#shell #pseudoEditor {
  font: inherit;
  width: 100%; height: 100%;
  border: none;
  padding: 0.25em;
  padding-left: 0.6em;
  margin-left: 2em;
  outline: none;
}

#shell #leftBar {
  background: #fbfbfb;
}

#shell #leftBar #leftTop * {
  pointer-events: auto;
}

#shell .goButton {
  border-radius: 100%;
  width: 4em;
  height: 4em;
  margin-top: 3em;
  margin-left: 0.6em;
}

  */});
    embeddedMinCSS_authenticityMarker = calcHash(embeddedMinCSS).toString(36);
    embeddedMinCSS += '\n.cssAuthenticityMarker{/' + '* {hex:' + embeddedMinCSS_authenticityMarker + '} *' + '/}';
    return embeddedMinCSS;
  })();

  var embeddedShellLayoutHTML = getFunctionCommentContent(function () { /*

<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto Sans Math">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto Sans">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto Emoji">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto Sans Symbols">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Noto Sans Symbols 2">

<div id=shell style="position: fixed; left: 0; top: 0; width: 100%; height: 100%;  padding-left: 0.2em;">

  <div id=leftBar style="position: absolute; left: 0; top: 0; height: 100%; width: 0.2em;">
    <table style="width: 100%; height: 100%; position: absolute; z-index: 100000; pointer-events: none;" cellspacing=0 cellpadding=0>
    <tr><td valign=top id=leftTop>
      <!-- top sidebar -->
    </td></tr>
    <tr><td id=leftMiddle>
      <!-- middle sidebar -->
    </td></tr>
    <tr><td valign=bottom id=leftBottom>
      <!-- bottom sidebar -->
      &#x1F379; Loading...
    </td></tr></table>
  </div>

  <div style="position: relative; width: 100%; height: 100%;">
    <div id=contentPageHost>
      <div id=requestEditorHost>
        <div id="pseudoGutter">1</div>
        <textarea id="pseudoEditor">
        </textarea>
      </div>
    </div>
  </div>

</div>
  */});

  var embeddedSplashMarkdown = getFunctionCommentContent(function () {/*
# This is a prototype project code name Catch REST &#x1F379;



## What is Catch REST &#x1F379; now

A tool in some ways similar to Postman or Fiddler, letting you to prepare and fire HTTP requests and investigate results.

You will type your request in text area at the top, press a button and see resuls appear at the bottom. In many ways
Catch REST &#x1F379; is much simpler, and much more powerful than existing REST tools.

![HTTP POST request and reply](post-request-reply-screen.png)


### Simple text

Your request is plain text. Whole of it!

No more tabs and fields and radio buttons. Everything is raw glorious searchable copy-pasteable text.

URL is in text, method is in text, headers in text, body. **EVERYTHING** is in text. Finally!

You get intuitive syntax highlight and auto-detection of common conventions. Catch REST &#x1F379; doesn't do passive aggressive,
it's in your corner.

### Addressable text

Your request is reflected in the address bar. Whole of it!

That means you can take the URL and paste it in the chat to support. You can stick it in the Wiki as a verification.
You can store it in the comments.

![HTTP POST request and reply](post-request-reply.png)

### Formats auto-detection

Did I say Catch REST &#x1F379; doesn't do passive aggressive?

If your HTTP request returns JSON, you're going to see nicely formatted, navigable JSON.

If it's XML, you'll have equally usable XML tree.

For cases where result is obviously tabular data, you'll have a grid view enabled (in addition to the raw view).
That also covers CSV or Excel outputs. It doesn't take rocket science to detect and add extra views for PNG
and other image formats, or auto-handle weird nested JSON-in-string-inside-XML envelopes plaguing many
corporate messaging pipelines.



## Long term view

The goal is to allow on-the-fly active editor similar in effect to REPL or Notebooks.

The first milestone is an HTTP request tool, which is in progress now.

In parallel I am adding quick and simple Unicode character formatting,
helpful for posting on social media platforms. My current prototype for that
is on https://tty.wtf and as I build up Catch REST &#x1F379; the two may even merge.

The next step is to support Markdown, with inclusion of scripted fields.

The plan also is to allow JavaScript and some kind of simplified Excel syntax inside scripted fields.
That, plus HTTP requester would allow for more complex processing of Internet data,
issuing requests, processing data and representing the data in sensible way with tables/charts.



## Architecture and code structure

Extremely original, but out of laser focus on pragmatic goal.

### Goal

Catch REST &#x1F379; must be virtually unbreakable from any of its intended use standpoints.

It must work in any reasonable browser. It must survive in strange conditions of embedded webview,
fired from command line, and few even more exotic scenarios.

I don't want it to be defeated by choppy network conditions, or bizarre build dependencies.

### Solution

I take ultra-pragmatic approach assuming Catch REST &#x1F379; only gets **1 chance to impress you,**
and it cannot fail. And I take all the ruthlessness and inventiveness of a computer virus mentality
to deliver even impossible.

The whole of the code lives inside a single JS file (170K at the moment). This is the source code, and run code.

I use JSDoc to benefit from type checking, without transpilation phase.

The whole of dependent libraries lives inside another JS file (12Mb).

The code is ES3. Yes, good old IE6-compatible ES3, not even ES5. Once in a while I whip up my trusty VM to fix
an odd `let` or trail comma creeping into the code. The looks may degrade (no gradients and subtle shadows)
but it will work in every sane browser.

There is no UI framework, it's DOM manipulation and some 3rd party component calls (such as CodeMirror).

The code that bundles the libraries and runs mini-development HTTP server is inside that same JS file too.
Yes, that means same code is run in browser and node, and auto-detects environment to do the expected thing.



## For good luck!

In my career I've built similar tools, that helped me write software, debug software,
reproduce bugs and explore systems.

Writing code successfully in a corporate environment demands patience and strong will.
Some of the tricks I've accumulated in my career, I am putting to use in this hobby project.

I hope it works — firstly for me, and hopefully helps others.

*Ka chi fo!*

  */});
  
  var embeddedSplashText = embeddedSplashMarkdown.replace(/&#x1F379;/g, drinkChar);

  var embeddedMetaBlockHTML = getFunctionCommentContent(function () {/*
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="Catch Rest">
<meta property="og:type" content="article" />
<meta property="og:description" content="Catch Rest">
<meta name="twitter:image:alt" content="Catch Rest">
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
      }

      var baseUrl = location.protocol + '//' + location.host + location.pathname.slice(0, verb.index);
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
      '<!' + 'DOCTYPE html' + '><' + 'html lang="en"' + 
      '><' + 'head' + '>\n' +
      '<!-- {build-by-hash:' + catchREST_hash + ' ' + new Date() + ' with  ' + pr.platform + '/' + pr.arch + '} -->\n' +
      embeddedMetaBlockHTML + '\n' +
      '<title>Catch Rest &#x1F379;</title>\n' +

      '<' + 'script' + '>\n' +
      (urlencoded ? embeddedAdjustUrlencodedBaseURL + '\n' : '') +
      '</' + 'script' + '>\n' +

      '<style>\n' +
      embeddedMinCSS + '\n' +
      '</style>\n' +

      '</' + 'head' + '><' + 'body' + '>' +

      embeddedShellLayoutHTML + '\n\n' +

      '<' + 'script' + ' src="index.js"></' + 'script' + '>\n' +
      '<' + 'script' + ' src="lib.js"></' + 'script' + '>\n' +

      '<' + 'script' + '>\n' +
      'catchREST("page");\n' +
      '</' + 'script' + '>\n' +

      '</' + 'body' + '></' + 'html' + '>';
    
    return html;
  }

  // #endregion EMBEDDED RESOURCES

  /** @param {NodeModule=} module */
  function runAsNode(module) {
    var fs = require('fs');
    var path = require('path');
    var child_process = require('child_process');
    var http = require('http');
    var https = require('https');
    var URL = require('url');

    /** @type {(() => void | (Promise<void>))[]} */
    var shutdownServices = [];
    var runningChildProcesses = [];

    var catchREST_secret_variable_name = 'catchREST_secret';
    var shared_process_secret = /** @type {string} */(process.env[catchREST_secret_variable_name]);
    if (!shared_process_secret) {
      shared_process_secret = calcHash(__dirname.toLowerCase()) + '-' + Math.random().toString(36).replace(/[\.+-,]/g, '') + '-' + Math.random().toString(36).replace(/[\.+-,]/g, '');
    }

    /** @typedef {import('http').IncomingMessage} HTTPRequest */
    /** @typedef {import('http').ServerResponse} HTTPResponse */

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

        'codemirror/addon/fold/foldcode.js',
        'codemirror/addon/fold/foldgutter.js',
        'codemirror/addon/fold/brace-fold.js',
        'codemirror/addon/fold/xml-fold.js',
        'codemirror/addon/fold/indent-fold.js',
        'codemirror/addon/fold/markdown-fold.js',
        'codemirror/addon/fold/comment-fold.js',
        'codemirror/mode/javascript/javascript.js',
        'codemirror/mode/xml/xml.js',
        'codemirror/mode/css/css.js',
        'codemirror/mode/htmlmixed/htmlmixed.js',
        'codemirror/mode/htmlembedded/htmlembedded.js',
        'codemirror/mode/http/http.js',
        'codemirror/mode/sql/sql.js',
        'codemirror/mode/yaml/yaml.js',
        'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js',
        'codemirror/mode/python/python.js',
        'codemirror/mode/markdown/markdown.js',
        'codemirror/addon/fold/foldgutter.css',
        'codemirror/addon/search/search.js',
        'codemirror/addon/search/searchcursor.js',
        'codemirror/addon/search/match-highlighter.js',
        'codemirror/addon/search/matchesonscrollbar.js',
        'codemirror/addon/search/matchesonscrollbar.css',
        'codemirror/addon/search/jump-to-line.js',
        'codemirror/addon/dialog/dialog.js',
        'codemirror/addon/dialog/dialog.css',
        'codemirror/addon/scroll/annotatescrollbar.js',
        'codemirror/addon/edit/closebrackets.js',
        'codemirror/addon/edit/closetag.js',
        'codemirror/addon/edit/continuelist.js',
        'codemirror/addon/edit/matchbrackets.js',
        'codemirror/addon/edit/matchtags.js',
        'codemirror/addon/edit/trailingspace.js',

        'xlsx/dist/xlsx.full.min.js',
        //'xlsx/jszip.js'

        'typescript/lib/typescript.js'
        // include lib.d.ts here? probably no
      ];

      var indexHTML_path = path.resolve(__dirname, 'index.html');
      var index404HTML_path = path.resolve(__dirname, '404.html');
      var libJS_path = path.resolve(__dirname, 'lib.js');
      var readme_path = path.resolve(__dirname, 'README.md');

      function detectLocalBuildValid() {
        return new Promise(function (resolve) {
          var markerRegexp = new RegExp('\\{build-by-hash:' + catchREST_hash);
          var indexHTMLPromise = readFileAsync(indexHTML_path);
          var index404HTMLPromise = readFileAsync(index404HTML_path);
          var libJSPromise = readFileAsync(libJS_path);
          var readmePromise = readFileAsync(readme_path);
          Promise.all([indexHTMLPromise, index404HTMLPromise, libJSPromise, readmePromise]).then(
            function (result) {
              var indexHTML_content = result[0];
              var index404HTML_content = result[1];
              var libJS_content = result[2];
              var readme_content = result[3];
              resolve(
                markerRegexp.test(indexHTML_content) &&
                markerRegexp.test(index404HTML_content) &&
                markerRegexp.test(libJS_content) &&
                markerRegexp.test(readme_content));
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
            var maxRemainingRedirects = 10;
            getFromUrl(http.get('http://unpkg.com/' + importLocalPath));

            function getFromUrl(url) {
              var req = /^https/i.test(url) ? https.get(url) : http.get(url);
              var buffers = [];
              req.on('data', function (data) {
                buffers.push(data);
              });
              req.on('error', function (err) {
                reject(err);
              });
              req.on('response',
                function (res) {
                  if (res.statusCode === 301 || res.statusCode === 302
                    && res.headers.location
                    && maxRemainingRedirects) {
                    maxRemainingRedirects++;
                    process.stdout.write(url + ' --> ' + res.headers.location + '...');
                    getFromUrl(res.headers.location);
                    return;
                  }

                  if (res.statusCode !== 200) reject(new Error('HTTP/' + res.statusCode + ' ' + res.statusMessage));
                });
              req.on('end', function (res) {
                var wholeData = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
                resolve({
                  importLocalPath: importLocalPath,
                  content: wholeData.toString('utf8')
                });
              });
            }
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
            case '.js':
              var processedContent = importEntry.content;
              if (/typescript/.test(importEntry.importLocalPath)) {
                processedContent = strictES3(importEntry.importLocalPath, importEntry.content);

                // Disabling as it may destabilise TS: concatenate most TypeScript namespaces
                // processedContent = processedContent.replace(/\}\)\(ts\s*\|\|\s*\(ts\s*=\s*\{\}\)\);\s*(((\s*\/\/[^\n]*\n)|(\s*\/\*+[^\*]*\*\/))*)\s*var\s*ts;\s*\(function\s*\(ts\)\s*\{/g, '\n\n$1\n');

                // This causes errors:  exclude 'ts.' prefix to refer to values within ts namespace directly
                // processedContent = processedContent.replace(/([^.])\bts\./g, '$1');
              }
              return '// #region ' + path.basename(importEntry.importLocalPath).replace(/\.js$/, '') + '\n' + processedContent + '\n' + '// #endregion';
            case '.css': return (
              '///// ' + path.basename(importEntry.importLocalPath) + ' /////\n' +
              '(function(value) { var style = document.createElement("style");\n' +
              'if ("styleSheet" in style && "type" in style) {\n' +
              ' style.type = "text/css";\n' +
              ' style.styleSheet.cssText = value;\n' +
              '} else {\n' +
              ' style.innerHTML = value;\n' +
              '}\n' +
              '(document.body || document.getElementsByTagName("head")[0]).appendChild(style); })(' + JSON.stringify(importEntry.content) + ');\n'
            );
          }
        });

        return (
          '// {build-by-hash:' + catchREST_hash + ' ' + new Date() + ' with  ' + process.platform + '/' + process.arch + '}\n' +
          combined.join('\n\n')
        );
      }

      /** @param {string} filePath @param {string} content */
      function strictES3(filePath, content) {
        var jscriptKeywords =
          ('break,false,in,this,void,continue,for,new,true,while,delete,' +
            'function,null,typeof,with,else,if,return,var,' +
            'catch,class,case,const,debugger,finally,declare,do,instanceof,default,extends,export,enum,' +
            'is,import,interface,super,throw,try,switch').split(',');

        var ts = require('typescript');
        var ast = ts.createLanguageServiceSourceFile(
          filePath,
          ts.ScriptSnapshot.fromString(content),
          ts.ScriptTarget.ES3,
          '1',
          true,
          ts.ScriptKind.JS);

        var replacements = [];
        var replacementCount = 0;

        ts.forEachChild(ast, visitNode);

        if (replacements.length) {
          replacements.sort(function (r1, r2) { return r1.pos - r2.pos });
          var updatedContent = '';
          var lastPos = 0;
          for (var i = 0; i < replacements.length; i++) {
            var repl = replacements[i];
            if (repl.pos > lastPos) updatedContent += content.slice(lastPos, repl.pos);
            updatedContent += repl.text;
            lastPos = repl.pos + repl.length;
          }

          if (lastPos < content.length) {
            updatedContent += content.slice(lastPos);
            lastPos = content.length;
          }

          console.log(' handled ' + replacementCount + ' replacements');
          content = updatedContent;
        }

        return content;

        /** @param {import('typescript').Node} node */
        function visitNode(node) {
          switch (node.kind) {
            case ts.SyntaxKind.PropertyAccessExpression:
              var propAccess = /** @type {import('typescript').PropertyAccessExpression} */(node);
              if (propAccess.name.kind === ts.SyntaxKind.Identifier
                && jscriptKeywords.indexOf(propAccess.name.text) >= 0) {
                var kw = propAccess.name;
                var posDot = content.lastIndexOf('.', kw.pos);
                replacements.push({ pos: posDot, length: 1, text: '[' });
                replacements.push({ pos: kw.pos + kw.getLeadingTriviaWidth(), length: kw.text.length, text: '"' + kw.text + '"]' });
                replacementCount++;
              }
              break;

            case ts.SyntaxKind.PropertyAssignment:
              var propAssig = /** @type {import('typescript').PropertyAssignment} */(node);
              if (propAssig.name.kind === ts.SyntaxKind.Identifier
                && jscriptKeywords.indexOf(propAssig.name.text) >= 0) {
                var kw = propAssig.name;
                replacements.push({ pos: kw.pos + kw.getLeadingTriviaWidth(), length: kw.text.length, text: '"' + kw.text + '"' });
                replacementCount++;
              }
              break;

            case ts.SyntaxKind.ObjectLiteralExpression:
              var objLit = /** @type {import('typescript').ObjectLiteralExpression} */(node);
              if (objLit.properties.hasTrailingComma) {
                var ln = ast.getLineAndCharacterOfPosition(objLit.pos).line;
                if (ln > 740 && ln < 760 || true) {
                  var copy = {};
                  for (var k in objLit.properties) {
                    if (String(Number(k)) === k) continue;
                    copy[k] = objLit.properties[k];
                  }

                  var lastTok = objLit.getLastToken();
                  if (lastTok && content.slice(lastTok.pos - 1, lastTok.pos) === ',') {
                    replacements.push({
                      pos: lastTok.pos - 1,
                      length: 1,
                      text: ''
                    });

                    replacementCount++;
                  }
                }
              }
              break;

            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
              var getSetAcc = /** @type {import('typescript').GetAccessorDeclaration} */(node);
              replacements.push({
                pos: getSetAcc.pos + getSetAcc.getLeadingTriviaWidth(),
                length: getSetAcc.name.pos - (getSetAcc.pos + getSetAcc.getLeadingTriviaWidth()),
                text: ''
              });
              replacements.push({
                pos: getSetAcc.name.end,
                length: 0,
                text: ': function'
              });
              break;
          }

          ts.forEachChild(node, visitNode);
        }

      }

      return detectLocalBuildValid().then(function (valid) {
        if (valid) return 'Local state is validated with hash: ' + catchREST_hash;

        return readLocalImports().then(
          function (imports) {
            return withImports(imports);
          },
          function (errorLocalImports) {
            return readUnpkgImports().then(
              function (imports) {
                return withImports(imports);
              },
              function (errUnpkgImports) {
                throw errorLocalImports;
              });
          });

        /**
         * @param {{ importLocalPath: string, fullPath?: string, content: string }[]} imports
         * @returns {Promise<string>}
         */
        function withImports(imports) {
          var combinedLib = combineLib(imports);

          var builtHTML = getEmbeddedWholeHTML(true /* urlencoded */);

          var builtReadme = embeddedSplashMarkdown +
            '\n<' + '!--' + ' {build-by-hash:' + catchREST_hash + ' ' + new Date() + ' ' + process.platform + '/' + process.arch + '} ' + '--' + '>\n'; 

          var skipIndexHTML = skipUnlessUpdated(
            indexHTML_path,
            builtHTML
          );
          var skipIndex404HTML = skipUnlessUpdated(
            index404HTML_path,
            getEmbeddedWholeHTML(true /* urlencoded */)
          );
          var skipLib = skipUnlessUpdated(
            libJS_path,
            combinedLib
          );
          var skipReadme = skipUnlessUpdated(
            readme_path,
            builtReadme
          );

          return Promise.all([skipIndexHTML, skipIndex404HTML, skipLib, skipReadme]).then(
            function (skipped) {
              var skippedIndexHTML = skipped[0], skippedIndex404HTML = skipped[1], skippedLib = skipped[2], skippedReadme = skipped[3];

              if (skippedIndexHTML && skippedIndex404HTML && skippedLib && skippedReadme)
                return 'Build already matches files.';

              if (!skippedIndexHTML && !skippedIndex404HTML && !skippedLib && !skippedReadme)
                return 'Build updated index.html, 404.html, lib.js and README.md with hash ' + catchREST_hash;

              return 'Build only updated ' +
                (skippedIndexHTML ? '' : 'index.html ') +
                (skippedIndex404HTML ? '' : '404.html ') +
                (skippedLib ? '' : 'lib.js ') +
                (skippedReadme ? '' : 'README.md ') +
                'with hash ' + catchREST_hash;
            });

          function skipUnlessUpdated(filePath, content) {
            var alreadyMatchesPromise = readFileAsync(filePath).then(
              function (oldContent) {
                var markerRegexp = /\{build-by-hash:([^}]+)\}/g;
                if (oldContent.replace(markerRegexp, '') === content.replace(markerRegexp, '')) return true;
              },
              function () {// failed to read old file -- fine, just write then
              }
            );

            return alreadyMatchesPromise.then(
              // @ts-ignore
              function (alreadyMatches) {
                return alreadyMatches || writeFileAsync(filePath, content);
              });
          }
        }
      });
    }

    /** @param {Promise<string>} buildPromise */
    function startServer(port, buildPromise) {
      var mimeByExt = {
        html: 'text/html',
        htm: 'text/html',
        js: 'application/javascript',
        css: 'style/css'
      };

      return new Promise(function (resolve) { resolve(null); }).then(function () {
        /** @type {ReturnType<typeof listenToPort>} */
        var listeningServerPromise = listenToPort('', port)['catch'](function (error) {
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
             * @param {RequestContext} ctx
             */
            function handleRequest(ctx) {
              return new Promise(function (resolve) { resolve(null);  }).then(function() {
                process.stdout.write(ctx.req.method + ' ' + ctx.url.pathname);

                switch (ctx.path.toLowerCase()) {
                  case '/':
                  case '/index.html':
                    return handleIndexHTMLRequest(ctx);

                  case 'favicon.ico':
                    return handleFaviconRequest(ctx);

                  case '/control':
                    return handleControlRequest(ctx);

                  default:
                    return handleLocalFileRequest(ctx);
                }
              });
            }

            /** @param {RequestContext} ctx */
            function handleIndexHTMLRequest(ctx) {
                return getEmbeddedWholeHTML(true /* urlencoded */);
            }

            /**
             * @param {RequestContext} ctx
             */
            function handleLocalFileRequest(ctx) {
              return new Promise(function (resolve) { resolve(null); }).then(function() {
                // TODO: inject ETag for caching

                var localPath = ctx.path.replace(/^\/+/, '').replace(/\/\.+/g, '/').replace(/\/\/+/g, '/');
                if (localPath === '/' || !localPath) localPath = 'index.html';

                var fullPath = path.resolve(__dirname, localPath);
                return readFileAsync(fullPath, 'binary');
              });
            }

            /**
             * @param {RequestContext} ctx
             */
            function handleFaviconRequest(ctx) {
              return '-';
            }

            /**
             * @param {RequestContext} ctx
             */
            function handle404Request(ctx) {
              return {
                statusCode: 404,
                body: ctx.path + ' NOT FOUND.'
              };
            }

            /**
             * @param {RequestContext} ctx
             */
            function handleControlRequest(ctx) {
              if (ctx.url.query && ctx.url.query[catchREST_secret_variable_name] !== shared_process_secret)
                return handle404Request(ctx);

              switch (ctx.url.query && ctx.url.query.command) {
                case 'shutdown':
                  ctx.res.end('OK');
                  if (process.env[catchREST_secret_variable_name]) {
                    process.exit(0);
                  } else {
                    while (true) {
                      var svc = shutdownServices.pop();
                      if (!svc) break;
                      svc();
                    }
                  }
                  return;

                case 'restart':
                  ctx.res.end('starting new instance');
                  startNewInstance();
                  return;
              }
            }
          });
      });

      /** @typedef {{
       *  req: import('http').IncomingMessage;
       *  res: import('http').ServerResponse;
       *  server: import('http').Server;
       *  url: import('url').UrlWithParsedQuery;
       *  verb: { leadingSlash: string, verb: string, trailingSlash: string, index: number } | undefined;
       *  path: string;
       *  ext: string
       * }} RequestContext */

      /** @typedef {string | Buffer | { statusCode?: number, body: string | Buffer | null | undefined } | null | undefined} RequestHandlerResult */

      /**
       * 
       * @param {string | null | undefined} host
       * @param {number} port
       * @returns {Promise<{ port: number, host: string, server: import('http').Server, handle(handler: (ctx: RequestContext) => Promise<RequestHandlerResult>): void }>}
       */
      function listenToPort(host, port) {
        return new Promise(function (resolve, reject) {

          /** @type {RequestContext[]} */
          var requestQueue = [];

          /** @type {(ctx: RequestContext) => Promise<RequestHandlerResult>} */
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
              /** @param {(ctx: RequestContext) => Promise<RequestHandlerResult>} handler */
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
            var url = URL.parse(req.url || '', true /* parseQueryString */);
            var verb = getVerb(url.pathname);
            var pathBeforeVerb = verb ? (url.pathname || '').slice(0, verb.index - (verb.leadingSlash ? 1 : 0)) : url.pathname || '';
            var ext = path.extname(pathBeforeVerb);

            var entry = {
              req: req,
              res: res,
              server: server,
              url: url,
              verb: verb,
              path: pathBeforeVerb,
              ext: ext
            };
            if (/** @type {*}*/(listener)) handleWithListener(entry);
            else requestQueue.push(entry);
          }

          /** @param {RequestContext} entry */
          function handleWithListener(entry) {
            var res = listener(entry);
            if (res && typeof res.then === 'function') {
              res.then(
                function (result) {
                  if (!entry.res.headersSent) {
                    if (result && (typeof result === 'string' || /** @type {Buffer} */(result).length > 0 && typeof /** @type {Buffer} */(result)[0] === 'number')) {
                      var mime = mimeByExt[entry.ext.replace(/^\./, '')] || mimeByExt['html'];
                      if (mime) entry.res.setHeader('Content-type', mime);
                      console.log(' [' + entry.path + ':' + /** @type {*} */(result).length + ']');
                      entry.res.end(result);
                      return;
                    }
                    else if (result && /** @type {{ body?: unknown }} */(result).body) {
                      if (typeof /** @type {*} */(result).statusCode === 'number') {
                        entry.res.statusCode = /** @type {*} */(result).statusCode;
                        entry.res.end(/** @type {*} */(result).body);
                        return;
                      }
                    }

                    return new Promise(function (resolve) { setTimeout(resolve, 100); }).then(function () {
                      if (!entry.req.complete) 
                        console.log('Request promise completed, but request not yet handled: ' + entry.req.method + ' ' + entry.req.url);
                    });
                  }
                },
                function (error) {
                  if (!entry.res.closed) {
                    if (!entry.res.headersSent) {
                      entry.res.statusCode = error.code === 'ENOENT' ? 404 : 500;
                      entry.res.statusMessage = error && error.message || String(error);
                      entry.res.setHeader('Content-type', 'text/plain');
                      console.log(' <' + entry.res.statusCode + ' ' + (error.code ? 'code:' + error.code : error.errorCode ? 'errorCode: ' + error.errorCode : error.message) + '>');
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
            return drinkChar + '~' + process.pid;
          });
        });
      } else {
        return new Promise(function (resolve) { resolve(drinkChar + '[' + process.pid + ']'); });
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
        } else if (elem && 'styleSheet' in elem && 'type' in elem) {
          if ('type' in elem && !elem.type) elem.type = 'text/css';
          elem.styleSheet.cssText = value;
        } else if (elem && 'innerText' in elem) {
          elem.innerText = value;
        } else {
          elem.text = value;
        }
      }
    }

    function fetchXHR(url, opts) {
      if (typeof XMLHttpRequest === 'function') {
        var xhr = new XMLHttpRequest();
      } else if (typeof ActiveXObject === 'function') {
        var xhr = /** @type {XMLHttpRequest} */(new ActiveXObject('Microsoft.XMLHTTP'));
      } else {
        return fetch(url, opts).then(function (response) {
          return response.text().then(function (text) {
            return {
              headers: response.headers,
              body: text
            };
          });
        });
      }

      return new Promise(function (resolve, reject) {
        xhr.open(opts.method, url);
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              console.log(xhr);
              resolve({
                headers: {},
                body: typeof xhr.response === 'string' || xhr.response ? xhr.response : xhr.responseText
              });
            } else {
              reject(xhr.status + ' ' + xhr.statusText);
              // xhr.abort();
            }
          }
        };

        if (opts.body) {
          xhr.send(opts.body);
        } else {
          xhr.send();
        }
      });
    }

    /**
     * @template Func
     * @param {Func} func
     * @param {number} time
     * @param {number=} longest
     * @returns {Func}
     */
    function debounce(func, time, longest) {
      var timeout;
      var longestTimeout;
      var self;
      var args;
      return /** @type {Func} */(queue);
      function queue() {
        self = this;
        args = [];
        for (var i = 0; i < arguments.length; i++) { args.push(arguments[i]); }

        if (!longestTimeout && /** @type {number} */(longest) > 0) longestTimeout = setTimeout(invoke, longest);

        clearTimeout(timeout);
        timeout = setTimeout(invoke, time || 100);
      };

      function invoke() {
        clearTimeout(timeout);
        clearTimeout(longestTimeout);
        timeout = null;
        longestTimeout = null;
            /** @type {Function} */(func).apply(self, args);
      }
    }
    // #endregion COMMON BROWSER UTILS

    // #region PERSISTENCE

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
 *  finishParsing(callback?: (drive: Drive.Detached.DOMDrive) => void);
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
     *  detect(uniqueKey: string, callback: (error?: string, detached?: Drive.Detached) => void): void;
     * }} Drive.Optional */

    /** @typedef {{
     *  timestamp: number | undefined;
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

    var persistence = (function () {

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

        /**
         * @param {(drive: Drive.Detached.DOMDrive) => void} callback
         * @returns {void}
         */
        function finishParsing(callback) {
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

          if (typeof callback === 'function') {
            completionCallback = function (drive) {
              callback(drive);
            };
          }

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
          nextDrive.detect(uniqueKey, function (error, detached) {
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
            detached.purge(function (shad) {
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
                finishOptionalDetection();
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
            toUpdateDOM[path] = encoding ? { content: content, encoding: encoding } : content;
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

        return bootState;
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

          var encoded = encoding ? { content: content, encoding: encoding } : bestEncode(content);
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
          storedSize: storedSize
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
          CR: CR, CRLF: CRLF, LF: LF,
          base64: base64,
          json: json
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
            function (chr) {
              return (
                chr === '\t' ? '\\t' :
                  chr === '\r' ? '\\r' :
                    chr === '\n' ? '\\n' :
                      chr === '\"' ? '\\"' :
                        chr < '\u0010' ? '\\u000' + chr.charCodeAt(0).toString(16) :
                          '\\u00' + chr.charCodeAt(0).toString(16));
            });
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
            var wrapped = { type: type, content: content };
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
                applyTo: applyTo,
                purge: purge
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
                timestamp: timestamp,
                write: write,
                forget: forget
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
                function (transaction) {

                  transaction.executeSql(
                    'SELECT value from "*metadata" WHERE name=\'editedUTC\'',
                    [],
                    function (transaction, result) {
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
                    function (transaction, sqlError) {
                      if (finished) return;
                      else finished = true;
                      // no data
                      callback(void 0, createWebSQLDetached(db, 0, false));
                    });
                },
                function (sqlError) {
                  if (finished) return;
                  else finished = true;

                  repeatingFailures_unexpected++;
                  if (repeatingFailures_unexpected > 5) {
                    callback('Loading from metadata table failed, generating multiple failures ' + sqlError.message);
                  }

                  this._createMetadataTable(
                    function (sqlError_creation) {
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
                  function (transaction) {
                    return listAllTables(
                      transaction,
                      function (tables) {
                        var ftab = getFilenamesFromTables(tables);
                        applyToWithFiles(transaction, ftab, mainDrive, callback);
                      },
                      function (sqlError) {
                        reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                        callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                      });
                  },
                  function (sqlError) {
                    reportSQLError('Failed to open read transaction for the webSQL database.', sqlError);
                    callback(createWebSQLShadow(db, detached.timestamp, metadataTableIsValid));
                  });
              }

              /** @param {Drive.Detached.CallbackWithShadow} callback */
              function purge(callback) {
                db.transaction(
                  function (transaction) {
                    return listAllTables(
                      transaction,
                      function (tables) {
                        purgeWithTables(transaction, tables, callback);
                      },
                      function (sqlError) {
                        reportSQLError('Failed to list tables for the webSQL database.', sqlError);
                        callback(createWebSQLShadow(db, 0, false));
                      });
                  },
                  function (sqlError) {
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
                    function (transaction, result) {
                      if (result.rows.length) {
                        var row = result.rows.item(0);
                        if (row.value === null)
                          mainDrive.write(file, null);
                        else if (typeof row.value === 'string')
                          mainDrive.write(file, fromSqlText(row.value), fromSqlText(row.encoding));
                      }
                      completeOne();
                    },
                    function (sqlError) {
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
                    function (transaction, result) {
                      completeOne();
                    },
                    function (transaction, sqlError) {
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
                  function (transaction) {
                    transaction.executeSql(
                      updateSQL,
                      ['content', content, encoding],
                      updateMetadata,
                      function (transaction, sqlError) {
                        createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                      });
                  },
                  function (sqlError) {
                    repeatingTransactionErrorCount_unexpected++;
                    if (repeatingTransactionErrorCount_unexpected > 5) {
                      reportSQLError('Transaction failures (' + repeatingTransactionErrorCount_unexpected + ') updating file "' + file + '".', sqlError);
                      return;
                    }

                    // failure might have been due to table absence?
                    // -- redo with a new transaction
                    db.transaction(
                      function (transaction) {
                        createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding);
                      },
                      function (sqlError_inner) {
                        // failure might have been due to *metadata table ansence
                        // -- redo with a new transaction (last attempt)
                        db.transaction(
                          function (transaction) {
                            updateMetdata_noMetadataCase(transaction);
                            // OK, once again for extremely confused browsers like Opera
                            transaction.executeSql(
                              updateSQL,
                              ['content', content, encoding],
                              updateMetadata,
                              function (transaction, sqlError) {
                                createTableAndUpdate(transaction, file, tableName, updateSQL, content, encoding)
                              });
                          },
                          function (sqlError_ever_inner) {
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
                  function (transaction, result) {
                    transaction.executeSql(
                      updateSQL,
                      ['content', content, encoding],
                      this._closures.updateMetadata,
                      function (transaction, sqlError) {
                        reportSQLError('Failed to update table "' + tableName + '" for file "' + file + '" after creation.', sqlError);
                      });
                  },
                  function (transaction, sqlError) {
                    reportSQLError('Failed to create a table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              }

              /** @param {string} file */
              function deleteAllFromTable(file) {
                var tableName = mangleDatabaseObjectName(file);
                db.transaction(
                  function (transaction) {
                    transaction.executeSql(
                      'DELETE FROM TABLE "' + tableName + '"',
                      [],
                      updateMetadata,
                      function (transaction, sqlError) {
                        reportSQLError('Failed to delete all from table "' + tableName + '" for file "' + file + '".', sqlError);
                      });
                  },
                  function (sqlError) {
                    reportSQLError('Transaction failure deleting all from table "' + tableName + '" for file "' + file + '".', sqlError);
                  });
              }

              /** @param {string} file */
              function dropFileTable(file) {
                var tableName = mangleDatabaseObjectName(file);
                db.transaction(
                  function (transaction) {
                    transaction.executeSql(
                      'DROP TABLE "' + tableName + '"',
                      [],
                      updateMetadata,
                      function (transaction, sqlError) {
                        reportSQLError('Failed to drop table "' + tableName + '" for file "' + file + '".', sqlError);
                      });
                  },
                  function (sqlError) {
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
                  function (sqlerr) {
                    if (sqlerr) {
                      reportSQLError('Failed create metadata table.', sqlerr);
                      return;
                    }

                    transaction.executeSql(
                      'INSERT OR REPLACE INTO "*metadata" VALUES (?,?)',
                      ['editedUTC', this.timestamp],
                      function (tr, result) {
                        // OK
                      },
                      function (tr, sqlerr) {
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
                  function (transaction, result) {
                    return callback();
                  },
                  function (transaction, sqlError) {
                    return callback(sqlError);
                  });
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
                function (transaction, result) {
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
                function (transaction, sqlError) { return errorCallback(sqlError); });
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
              name: 'webSQL',
              detect: detectWebSQL
            };
          })(), // WEBSQL

          indexedDB: (function () {

            /**
             * @param {string} uniqueKey
             * @param {(error?: string, detached?: Drive.Detached) => void} callback 
             */
            function detectIndexedDB(uniqueKey, callback) {
              try {
                // Firefox fires global window.onerror
                // when indexedDB.open is called in private mode
                // (even though it still reports failure in request.onerror and DOES NOT throw anything)
                var needsFirefoxPrivateModeOnerrorWorkaround =
                  typeof document !== 'undefined' && document.documentElement && document.documentElement.style
                  && 'MozAppearance' in document.documentElement.style;

                if (needsFirefoxPrivateModeOnerrorWorkaround) {
                  try {
                    detectIndexedDBCore(uniqueKey, function (error, detached) {
                      callback(error, detached);

                      // the global window.onerror will fire AFTER request.onerror,
                      // so here we temporarily install a dummy handler for it
                      var tmp_onerror = onerror;
                      onerror = function () { };
                      setTimeout(function () {
                        // restore on the next 'beat'
                        onerror = tmp_onerror;
                      }, 1);

                    });

                  }
                  catch (err) {
                    callback(err.message);
                  }
                }
                else {

                  detectIndexedDBCore(uniqueKey, callback);
                }

              }
              catch (error) {
                callback(error.message);
              }
            }

            function _getIndexedDB() {
              return typeof indexedDB === 'undefined' || typeof indexedDB.open !== 'function' ? null : indexedDB;
            }

            /**
             * @param {string} uniqueKey
             * @param {(error?: string, detached?: Drive.Detached) => void} callback 
             */
            function detectIndexedDBCore(uniqueKey, callback) {

              var indexedDBInstance = _getIndexedDB();
              if (!indexedDBInstance) {
                callback('Variable indexedDB is not available.');
                return;
              }

              var dbName = uniqueKey || 'portabled';

              var openRequest = indexedDBInstance.open(dbName, 1);

              openRequest.onerror = function (errorEvent) { callback('Opening database error: ' + getErrorMessage(errorEvent)); };

              openRequest.onupgradeneeded = createDBAndTables;

              openRequest.onsuccess = function (event) {
                var db = openRequest.result;

                try {
                  var transaction = db.transaction(['files', 'metadata']);
                  // files mentioned here, but not really used to detect
                  // broken multi-store transaction implementation in Safari

                  transaction.onerror = function (errorEvent) { return callback('Transaction error: ' + getErrorMessage(errorEvent)); };

                  var metadataStore = transaction.objectStore('metadata');
                  var filesStore = transaction.objectStore('files');
                  var editedUTCRequest = metadataStore.get('editedUTC');
                }
                catch (getStoreError) {
                  callback('Cannot open database: ' + getStoreError.message);
                  return;
                }

                if (!editedUTCRequest) {
                  callback('Request for editedUTC was not created.');
                  return;
                }

                editedUTCRequest.onerror = function (errorEvent) {
                  var detached = createIndexedDBDetached(db, transaction, void 0);
                  callback(void 0, detached);
                };

                editedUTCRequest.onsuccess = function (event) {
                  /** @type {MetadataData} */
                  var result = editedUTCRequest.result;
                  var detached = createIndexedDBDetached(db, transaction, result && typeof result.value === 'number' ? result.value : void 0);
                  callback(void 0, detached);
                };
              }


              function createDBAndTables() {
                var db = openRequest.result;
                var filesStore = db.createObjectStore('files', { keyPath: 'path' });
                var metadataStore = db.createObjectStore('metadata', { keyPath: 'property' })
              }
            }

            function getErrorMessage(event) {
              if (event.message) return event.message;
              else if (event.target) return event.target.errorCode;
              return event + '';
            }

            /** @typedef {{
             *  path: string;
             *  content: string;
             *  encoding: string;
             *  state: string | null;
             * }} FileData
             */

            /** @typedef {{
             *  property: string;
             *  value: any;
             * }} MetadataData */

            /**
             * @param {IDBDatabase} db
             * @param {IDBTransaction | undefined} transaction
             * @param {number | undefined} timestamp
             */
            function createIndexedDBDetached(db, transaction, timestamp) {

              // ensure the same transaction is used for applyTo/purge if possible
              // -- but not if it's completed
              if (transaction) {
                transaction.oncomplete = function () {
                  transaction = void 0;
                };
              }

              var detached = {
                timestamp: timestamp,
                applyTo: applyTo,
                purge: purge
              };

              return detached;

              /**
               * @param {Drive.Detached.DOMUpdater} mainDrive
               * @param {Drive.Detached.CallbackWithShadow} callback
               */
              function applyTo(mainDrive, callback) {
                var applyTransaction = transaction || db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
                var metadataStore = applyTransaction.objectStore('metadata');
                var filesStore = applyTransaction.objectStore('files');

                var onerror = function (errorEvent) {
                  if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                    console.error('Could not count files store: ', errorEvent);
                  callback(createIndexedDBShadow(db, detached.timestamp));
                };

                try {
                  var countRequest = filesStore.count();
                }
                catch (error) {
                  try {
                    applyTransaction = db.transaction(['files', 'metadata']); // try to reuse the original opening _transaction
                    metadataStore = applyTransaction.objectStore('metadata');
                    filesStore = applyTransaction.objectStore('files');
                    countRequest = filesStore.count();
                  }
                  catch (error) {
                    onerror(error);
                    return;
                  }
                }

                countRequest.onerror = onerror;

                countRequest.onsuccess = function (event) {
                  try {
                    var storeCount = countRequest.result;

                    var cursorRequest = filesStore.openCursor();
                    cursorRequest.onerror = function (errorEvent) {
                      if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                        console.error('Could not open cursor: ', errorEvent);
                      callback(createIndexedDBShadow(db, detached.timestamp));
                    };

                    var processedCount = 0;

                    cursorRequest.onsuccess = function (event) {

                      try {
                        var cursor = cursorRequest.result;

                        if (!cursor) {
                          callback(createIndexedDBShadow(db, detached.timestamp));
                          return;
                        }

                        if (callback.progress)
                          callback.progress(processedCount, storeCount);
                        processedCount++;

                        /** @type {FileData} */
                        var result = cursor.value;
                        if (result && result.path) {
                          mainDrive.timestamp = timestamp;
                          mainDrive.write(result.path, result.content, result.encoding);
                        }

                        cursor['continue']();

                      }
                      catch (cursorContinueSuccessHandlingError) {
                        var message = 'Failing to process cursor continue';
                        try {
                          message += ' (' + processedCount + ' of ' + storeCount + '): ';
                        }
                        catch (ignoreDiagError) {
                          message += ': ';
                        }

                        if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                          console.error(message, cursorContinueSuccessHandlingError);
                        callback(createIndexedDBShadow(db, timestamp));
                      }

                    }; // cursorRequest.onsuccess

                  }
                  catch (cursorCountSuccessHandlingError) {

                    var message = 'Failing to process cursor count';
                    try {
                      message += ' (' + countRequest.result + '): ';
                    }
                    catch (ignoreDiagError) {
                      message += ': ';
                    }

                    if (typeof console !== 'undefined' && console && typeof console.error === 'function')
                      console.error(message, cursorCountSuccessHandlingError);
                    callback(createIndexedDBShadow(db, detached.timestamp));
                  }

                }; // countRequest.onsuccess

              }

              /** @param {Drive.Detached.CallbackWithShadow} callback */
              function purge(callback) {
                if (transaction) {
                  transaction = void 0;
                  setTimeout(function () { // avoid being in the original transaction
                    purgeCore(callback);
                  }, 1);
                }
                else {
                  purgeCore(callback);
                }
              }

              /** @param {Drive.Detached.CallbackWithShadow} callback */
              function purgeCore(callback) {
                var purgeTransaction = db.transaction(['files', 'metadata'], 'readwrite');

                var filesStore = purgeTransaction.objectStore('files');
                filesStore.clear();

                var metadataStore = purgeTransaction.objectStore('metadata');
                metadataStore.clear();

                callback(createIndexedDBShadow(db, -1));
              }

            }

            /**
             * @param {IDBDatabase} db
             * @param {number | undefined} timestamp
             */
            function createIndexedDBShadow(db, timestamp) {
              var lastWrite = 0;
              var conflatedWrites;

              var shadow = {
                timestamp: timestamp,
                write: write,
                forget: forget
              };

              return shadow;

              /**
               * @param {string} file
               * @param {string | null} content
               * @param {string} encoding
               */
              function write(file, content, encoding) {
                var now = getTimeNow();
                if (conflatedWrites || now - lastWrite < 10) {
                  if (!conflatedWrites) {
                    conflatedWrites = {};
                    setTimeout(function () {
                      var writes = conflatedWrites;
                      conflatedWrites = null;
                      writeCore(writes);
                    }, 0);
                  }
                  conflatedWrites[file] = { content: content, encoding: encoding };
                }
                else {
                  var entry = {};
                  entry[file] = { content: content, encoding: encoding };
                  writeCore(entry);
                }
              }

              function writeCore(writes) {
                lastWrite = getTimeNow();
                var writeTransaction = db.transaction(['files', 'metadata'], 'readwrite');
                var filesStore = writeTransaction.objectStore('files');
                var metadataStore = writeTransaction.objectStore('metadata');

                for (var file in writes) if (writes.hasOwnProperty(file)) {

                  var entry = writes[file];

                  // no file deletion here: we need to keep account of deletions too!
                  /** @type {FileData} */
                  var fileData = {
                    path: file,
                    content: entry.content,
                    encoding: entry.encoding,
                    state: null
                  };

                  var putFile = filesStore.put(fileData);
                }

                /** @type {MetadataData} */
                var md = {
                  property: 'editedUTC',
                  value: Date.now()
                };

                metadataStore.put(md);
              }

              /** @param {string} file */
              function forget(file) {
                var forgetTransaction = db.transaction(['files'], 'readwrite');
                var filesStore = forgetTransaction.objectStore('files');
                filesStore['delete'](file);
              }

            }

            return {
              name: 'indexedDB',
              detect: detectIndexedDB
            }
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

    // #endregion PERSISTENCE

    /**
     * @param {string} text
     * @param {string} mode
     */
    function createShell(text, mode) {

      injectShellStyles();
      var layout = bindLayout();
      if (!layout.allFound) {
        if (layout.shell && layout.shell.parentElement) layout.shell.parentElement.removeChild(layout.shell);
        layout = injectShellHTML();
      }

      layout.pseudoEditor.value =
        mode === 'splash' ? embeddedSplashText : text;
      layout.pseudoGutter.innerHTML =
        Array(text.split('\n').length + 1)
        .join(',').split(',')
        .map(function(_,index) {return index+1; }).join('<br>');
      console.log('Loading..');
      layout.leftBottom.style.whiteSpace = 'nowrap';
      layout.leftBottom.textContent = drinkChar + ' Loading..';

      return {
        loadingTakesTime: loadingTakesTime,
        loadingComplete: loadingComplete
      };

      function triggerVSCodeTypings() {
        var cm = require('codemirror');
        return cm;
      }

      function loadingTakesTime() {
        layout.pseudoEditor.value = (layout.pseudoEditor.value || '').replace(/^Loading\.\./, 'Loading...');
        layout.leftBottom.textContent = drinkChar + ' Loading...';
        // TODO: whatever progress...
      }

      /**
       * @param {(text: string) => void | undefined | Promise<void | unknown>} persist
       * @param {string=} textOverride
       * @param {string=} modeOverride
       */
      function loadingComplete(persist, textOverride, modeOverride) {
        if (typeof textOverride !== 'undefined') text = textOverride;
        if (typeof modeOverride !== 'undefined') mode = modeOverride;
        layout.leftBottom.textContent = drinkChar + ' OK';

        layout.requestEditorHost.innerHTML = '';
        if (mode === 'splash') {
          var editor = createCodeMirrorWithFirstClickChange(
            layout.requestEditorHost,
            {
              value: embeddedSplashText,

              mode: 'markdown',
              inputStyle: 'textarea', // force textarea, because contentEditable is flaky on mobile

              lineNumbers: true,
              extraKeys: {
                'Ctrl-Enter': accept,
                'Cmd-Enter': accept
              },
              // @ts-ignore
              foldGutter: true,
              gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
              lineWrapping: true,
              autofocus: true
            },
            function () {
              editor.setOption('mode', mode);
              editor.setValue(text);
              editor.on('changes', debounce(updateVerbButton, 200, 900));
              updateVerbButton();
            });
        } else {
          var editor =
            // @ts-ignore
            CodeMirror(
              layout.requestEditorHost,
              {
                value: text,
                mode: mode,
                inputStyle: 'textarea', // force textarea, because contentEditable is flaky on mobile
                lineNumbers: true,
                extraKeys: {
                  'Ctrl-Enter': accept,
                  'Cmd-Enter': accept
                },
                // @ts-ignore
                foldGutter: true,
                gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
                lineWrapping: true,
                autofocus: true
              }
            );

          editor.on('changes', debounce(function () {
            updateVerbButton(true);
          }, 200, 900));
          updateVerbButton();
        }

        /** @type {ReturnType<typeof requireSplitter>} */
        var withSplitter;
        /** @type {import('codemirror').Editor} */
        var replyEditor;

        function updateVerbButton(shouldPersist) {
          var value = editor.getValue();
          var pars = parseTextRequest(value);
          if (pars && pars.firstLine) {
            var parsFirst = parseFirstLine(pars.firstLine);
          }

          if (parsFirst) console.log('edited ', pars, ' url ', parsFirst);
          else if (pars) console.log('edited ', pars);

          if (parsFirst && parsFirst.verb) {
            layout.leftTop.innerHTML = '<button class=goButton>' + parsFirst.verb.toUpperCase() + '</button>';

            var goButton = /** @type {HTMLButtonElement} */(layout.leftTop.getElementsByTagName('button')[0]);
            goButton.onclick = function () {
              accept();
            };
          } else {
            layout.leftTop.innerHTML = '';
          }

          if (parsFirst && parsFirst.verbPos > 0) {
            // highlight inside CodeMirror
          }

          if (shouldPersist)
            persist(value);
        }

        /**
         * @param {HTMLElement} host
         * @param {import('codemirror').EditorConfiguration} options
         * @param {Function} firstClickCallback
         */
        function createCodeMirrorWithFirstClickChange(host, options, firstClickCallback) {
          /** @type {import('codemirror').Editor} */
          var editor =
            // @ts-ignore
            CodeMirror(
              host, options);

          var leftClickKeyMap = { LeftClick: onFirstClick };
          editor.addKeyMap(leftClickKeyMap);

          return editor;

          function onFirstClick(args) {
            editor.removeKeyMap(leftClickKeyMap);
            return firstClickCallback(args);
          }

        }

        function requireSplitter() {
          var textStart = editor.charCoords({ ch: 1, line: 0 });
          var textEnd = editor.charCoords({ ch: 1, line: editor.getDoc().lineCount() + 1 });
          var wholeHeight =
            layout.contentPageHost.offsetHeight ||
            (layout.contentPageHost.getBoundingClientRect ? layout.contentPageHost.getBoundingClientRect().height :
              window.innerHeight);

          var wholeTextHeight = textEnd.bottom - Math.min(textStart.top, 0);
          var addPaddingUnderText = 30;
          var initialSplitterRatio = wholeTextHeight + addPaddingUnderText < wholeHeight / 2 ? (wholeTextHeight + addPaddingUnderText) / wholeHeight : 0.5;

          var splitterRatio = initialSplitterRatio;

          // TODO: apply this with delay for animated entry
          layout.requestEditorHost.style.height = (initialSplitterRatio * 100).toFixed(2) + '%';

          var splitterHeight = '3em';

          var bottomContainer = document.createElement('div');
          bottomContainer.style.cssText =
            'position: absolute; left: 0;' +
            ' top: ' +(initialSplitterRatio * 100).toFixed(2) + '%;' +
            ' width: 100%;' +
            ' height: ' + (100 - initialSplitterRatio * 100).toFixed(2) + '%;' +
            ' padding-top: ' + splitterHeight;
          var bottomHost = document.createElement('div');
          bottomHost.style.cssText =
            'position: relative; width: 100%; height: 100%;';
          bottomContainer.appendChild(bottomHost);
          layout.contentPageHost.appendChild(bottomContainer);

          var splitterOuter = document.createElement('div');
          splitterOuter.id = 'splitterOuter';
          splitterOuter.style.cssText =
            'position: absolute; left: 0; top: 0; ' +
            ' width: 100%; ' +
            'padding-left: 5em; ' +
            ' height: ' + splitterHeight + ';';
          
          var splitterBorderTop = document.createElement('div');
          splitterBorderTop.style.cssText =
            'position: absolute; left: 0; top: -1px; width: 100%; height: 1px;';
          splitterBorderTop.id = 'splitterBorderTop';
          splitterOuter.appendChild(splitterBorderTop);

          var splitterContainer = document.createElement('div');
          splitterContainer.style.cssText =
            'position: relative; width: 100%; height: 100%;';
          splitterContainer.id = 'splitter';
          splitterOuter.appendChild(splitterContainer);

          splitterContainer.innerHTML =
            '<table style="width: 100%; height: 100%; position: absolute;" cellspacing=0 cellpadding=0> ' +
            '<tr><td id=splitterLabel></td></tr></table>';
          var splitterMainPanel = splitterContainer.getElementsByTagName('td')[0];

          var splitterBorderBottom = document.createElement('div');
          splitterBorderBottom.style.cssText =
            'position: relative; width: 100%; height: 1px;';
          splitterBorderBottom.id = 'splitterBorderBottom';
          splitterOuter.appendChild(splitterBorderBottom);

          bottomContainer.appendChild(splitterOuter);

          //bottomHost.style.background = 'silver';

          on(splitterOuter, 'mousedown', splitter_mousedown);
          on(splitterOuter, 'mouseup', splitter_mouseup);
          on(splitterOuter, 'mousemove', splitter_mousemove);
          on(splitterOuter, 'touchstart', splitter_touchstart);
          on(splitterOuter, 'touchmove', splitter_touchmove);
          on(splitterOuter, 'touchend', splitter_touchend);

          return {
            bottomContainer: bottomContainer,
            bottomHost: bottomHost,
            splitterContainer: splitterContainer,
            splitterMainPanel: splitterMainPanel
          };

          var dragStart, overlayElem, latestDragY;

          function createOverlay(pageY, offsetY) {
            if (overlayElem) return;
            // overlay whole window, nothing works until resizing complete
            overlayElem = document.createElement('div');
            overlayElem.style.cssText =
              'position: absolute; position: fixed; ' +
              'left: 0; top: 0; width: 100%; height: 100%; ' +
              'z-index: 1000; ' +
              'cursor: ns-resize;';
            document.body.appendChild(overlayElem);
            on(overlayElem, 'mouseup', splitter_mouseup);
            on(overlayElem, 'mousemove', splitter_mousemove);
            on(overlayElem, 'touchend', splitter_touchend);
            var splitterHeight = splitterContainer.offsetHeight;
            dragStart = {
              centerY: pageY - offsetY,
              offCenterY: offsetY,
              splitterRatio: splitterRatio
            };
          }

          function dragTo(pageY) {
            if (!overlayElem) return;
            latestDragY = pageY;
            var wholeSize = layout.contentPageHost.offsetHeight;
            var newSplitterRatio = Math.min(0.9, Math.max(0.05,
              (pageY - dragStart.offCenterY) / wholeSize));

            var newTopHeight = (newSplitterRatio * 100).toFixed(2) + '%';
            var newBottomTop = (newSplitterRatio * 100).toFixed(2) + '%';
            var newBottomHeight = (100 - newSplitterRatio * 100).toFixed(2) + '%';

            if (layout.requestEditorHost.style.height !== newTopHeight ||
              bottomContainer.style.top !== newBottomTop ||
              bottomContainer.style.height !== newBottomHeight) {
              var logmousemove = {
                topHeight: layout.requestEditorHost.style.height + ' --> ' + newTopHeight,
                requestEditorHost: layout.requestEditorHost,
                bottomTop: bottomContainer.style.top + '-->' + newBottomTop,
                bottomHeight: bottomContainer.style.height + '-->' + newBottomHeight,
                bottomContainer: bottomContainer
              };

              if (layout.requestEditorHost.style.height !== newTopHeight) {
                layout.requestEditorHost.style.height = newTopHeight;
                logmousemove.topHeight += ' (' + layout.requestEditorHost.style.height + ')';
              }
              if (bottomContainer.style.top !== newBottomTop) {
                bottomContainer.style.top = newBottomTop;
                logmousemove.bottomTop += ' (' + bottomContainer.style.top + ')';
              }
              if (bottomContainer.style.height !== newBottomHeight) {
                bottomContainer.style.height = newBottomHeight;
                logmousemove.bottomHeight += ' (' + bottomContainer.style.height + ')';
              }

              console.log('mousemove ', logmousemove);
            }

          }

          function dropOverlay() {
            if (overlayElem)
              document.body.removeChild(overlayElem);
            dragStart = void 0;
            overlayElem = void 0;
            latestDragY = void 0;
          }

          /** @param {MouseEvent} e */
          function splitter_mousedown(e) {
            if (!e) e = /** @type {MouseEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            createOverlay(e.pageY, e.offsetY);
            console.log('mousedown ', dragStart);
          }

          /** @param {MouseEvent} e */
          function splitter_mouseup(e) {
            if (!e) e = /** @type {MouseEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            console.log('mouseup ', dragStart);
            dropOverlay();
          }

          /** @param {MouseEvent} e */
          function splitter_mousemove(e) {
            if (!e) e = /** @type {MouseEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            if (!dragStart) return;

            dragTo(e.pageY);
          }

          /** @param {TouchEvent} e */
          function splitter_touchstart(e) {
            if (!e) e = /** @type {TouchEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            var touches = e.changedTouches || e.touches;
            var tch = touches && touches[0];
            if (tch && tch.pageY > 0) {
              createOverlay(tch.pageY, tch.pageY - layout.requestEditorHost.offsetHeight);
            }
          }

          /** @param {TouchEvent} e */
          function splitter_touchend(e) {
            if (!e) e = /** @type {TouchEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            dropOverlay();
          }

          /** @param {TouchEvent} e */
          function splitter_touchmove(e) {
            if (!e) e = /** @type {TouchEvent} e */(window.event);
            if (e.preventDefault) e.preventDefault();
            var touches = e.touches || e.changedTouches;
            var tch = touches && touches[0];
            for (var i = 0; touches && i < touches.length; i++) {
              if (Math.abs(touches[i].pageY - latestDragY) < Math.abs(tch.pageY - latestDragY))
                tch = touches[i];
            }

            if (tch && tch.pageY > 0)
              dragTo(tch.pageY);
          }
}

        function accept() {
          var pars = parseTextRequest(editor.getValue());

          if (pars && pars.firstLine) {
            var parsFirst = parseFirstLine(pars.firstLine);

            if (parsFirst && parsFirst.url) {
              editor.setOption('readOnly', true);
              if (!withSplitter) withSplitter = requireSplitter();

              var normalizedUrl = parsFirst.url;
              if (!/^(http|https):/i.test(normalizedUrl))
                normalizedUrl = 'http://' + normalizedUrl;

              var verbContinuous =
                parsFirst.verb.charAt(0).toUpperCase() + parsFirst.verb.slice(1).toLowerCase();
              verbContinuous +=
                (
                  // getTing - duplicate last consonant if precedet by vowel
                  'eyuioa'.indexOf(verbContinuous.charAt(verbContinuous.length - 2)) >= 0 &&
                  'eyuioa'.indexOf(verbContinuous.charAt(verbContinuous.length - 1)) < 0 ?
                  verbContinuous.charAt(verbContinuous.length - 1) :
                  ''
                ) + 'ing';

              set(withSplitter.splitterMainPanel, verbContinuous + '...');

              var ftc = fetchXHR(normalizedUrl, {
                method: parsFirst.verb,
                body: parsFirst.verb === 'GET' || !pars.body ? undefined :
                  pars.body
              });
              ftc.then(
                function (response) {
                  var headers = response.headers;
                  var text = response.body;
                  editor.setOption('readOnly', false);
                  set(withSplitter.splitterMainPanel, 'Done.');

                  if (!replyEditor) {
                    replyEditor = createReplyCodeMirror(
                      withSplitter.bottomHost,
                      text
                    );
                  } else {
                    replyEditor.setValue(text);
                  }

                }, function (err) {
                  editor.setOption('readOnly', false);
                  set(withSplitter.splitterMainPanel, 'Failed.');
                  if (!replyEditor) {
                    replyEditor = createReplyCodeMirror(
                      withSplitter.bottomHost,
                      err.message || String(err)
                    );
                  } else {
                    replyEditor.setValue(err.message);
                  }
                }
              )
            }
          }

          /**
           * @param {HTMLElement} host
           * @param {string} initalValue
           * @returns {import('codemirror').Editor}
           */
          function createReplyCodeMirror(host, initalValue) {
            var cm =
              //@ts-ignore
              CodeMirror(
                host,
                {
                  value: initalValue,

                  mode: 'javascript',

                  // @ts-ignore
                  foldGutter: true,
                  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],

                  lineNumbers: true,
                  readOnly: true,
                  lineWrapping: true
                });

            return cm;
          }
        }
      }

      function bindLayout() {
        var shell = /** @type {HTMLElement} */(document.getElementById('shell'));
 
        var leftBar = /** @type {HTMLElement} */(document.getElementById('leftBar'));
        var leftTop = /** @type {HTMLElement} */(document.getElementById('leftTop'));
        var leftMiddle = /** @type {HTMLElement} */(document.getElementById('leftMiddle'));
        var leftBottom = /** @type {HTMLElement} */(document.getElementById('leftBottom'));
 
        var contentPageHost = /** @type {HTMLElement} */(document.getElementById('contentPageHost'));
        var requestEditorHost = /** @type {HTMLElement} */(document.getElementById('requestEditorHost'));

        var pseudoEditor = /** @type {HTMLTextAreaElement} */(document.getElementById('pseudoEditor'));
        var pseudoGutter = /** @type {HTMLElement} */(document.getElementById('pseudoGutter'));

        return {
          shell: shell,
          leftBar: leftBar, leftTop: leftTop, leftMiddle: leftMiddle, leftBottom: leftBottom,
          contentPageHost: contentPageHost,
          requestEditorHost: requestEditorHost,
          pseudoEditor: pseudoEditor,
          pseudoGutter: pseudoGutter,
          allFound:
            !!shell &&
            !!leftBar && !!leftTop && !!leftMiddle && !!leftBottom &&
            !!contentPageHost && !!requestEditorHost &&
            !!pseudoEditor && /textarea/i.test(pseudoEditor.tagName || '') && !!pseudoGutter
        };
      }

      function injectShellHTML() {
        var virt = document.createElement('div');
        virt.innerHTML = embeddedShellLayoutHTML;
        var body = document.body;

        if (!body) {
          body = document.createElement('body');
          var docElement = document.documentElement;
          if (!docElement) {
            docElement =
              (document.head ? document.head.parentElement : null) ||
              document.getElementsByTagName('html')[0] ||
              (document.getElementsByTagName('head')[0] ? document.getElementsByTagName('head')[0].parentElement : null);
          }

          docElement.appendChild(body);
        }

        var lastAdded;
        for (var i = virt.childNodes.length - 1; i >= 0; i--) {
          var nod = virt.childNodes[i] || virt.childNodes.item(i);
          if (nod.nodeType === 1) {
            virt.removeChild(nod);
            if (lastAdded) body.insertBefore(nod, lastAdded);
            else body.appendChild(nod);
            lastAdded = nod;
          }
        }

        return bindLayout();
      }

      function injectShellStyles() {
        if (verifyAuthenticStylesPresent()) return;

        var style = document.createElement('style');
        set(style, embeddedMinCSS);
        var head = document.head || document.getElementsByTagName('head')[0];
        if (!head) {
          head = document.createElement('head');
          document.children[0].appendChild(head);
        }
        head.appendChild(style);

        function verifyAuthenticStylesPresent() {
          var allStyles = document.getElementsByTagName('style');
          for (var i = 0; i < allStyles.length; i++) {
            var sty = allStyles[i];
            if ((sty.innerHTML || '').indexOf(embeddedMinCSS_authenticityMarker) >= 0) return true;
          }
        }
      }
    }

    function sanitizeDOM() {
      for (var i = document.body.childNodes.length - 1; i >= 0; i--) {
        var nod = document.body.childNodes.item ? document.body.childNodes.item(i) : document.body.childNodes[i];
        if (!nod) continue;
        switch (nod.nodeType) {
          case 1: // element
            var elem = /** @type {HTMLElement} */(nod);
            // for now, just let script and style only
            if (/^(script|style)$/i.test(elem.tagName || '') || elem.id === 'shell') continue;
            break;

          case 3: // text-node
          case 4: // cdata
            break;
        }

        document.body.removeChild(nod);
      }
    }

    // local|read|edit|view|browse|shell|get|post|put|head|delete|option|connect|trace|http:|https:
    function loadVerb(verb) {

    }

    function minimalDependenciesPresent() {
      // @ts-ignore
      return typeof CodeMirror === 'function';
    }

    function bootUrlEncoded() {
      var initialTmod = getTextModeFromUrlEncoded();
      var text = initialTmod.text;
      var mode = initialTmod.mode;

      sanitizeDOM();

      var shellLoader = createShell(text, mode);
      if (minimalDependenciesPresent()) {
        complete();
      } else {
        /** @type {*} */(catchREST)['continue'] = function () {
          complete();
        };
      }

      function getTextModeFromUrlEncoded() {
        var enc = detectCurrentUrlEncoded(location);
        if (!enc) {
          var text = 'GET https://api.github.com/repos/microsoft/typescript/languages';
          var mode = 'splash';
        } else {
          var skipVerb = enc.encodedUrl.verbPos < 0 && /^http/i.test(enc.encodedUrl.addr || '');
          if (enc.encodedUrl.verb === 'edit' || enc.encodedUrl.verb === 'view')
            skipVerb = true;

          var text =
            skipVerb && !enc.encodedUrl.addr ? enc.encodedUrl.body :
              (skipVerb ? '' : enc.encodedUrl.verb) + (enc.encodedUrl.addr ? (skipVerb ? '' : ' ') + enc.encodedUrl.addr : '') +
              (enc.encodedUrl.body ? '\n' + enc.encodedUrl.body : '');
          var mode = 'javascript';
        }

        return { text: text, mode: mode };
      }

      /** @param {typeof window.location} location */
      function detectCurrentUrlEncoded(location) {
        if (/http/.test(location.protocol)) {
          var verb = getVerb(location.pathname);
          if (verb) {
            var encodedUrl = parseEncodedURL(location.pathname || '');
            var source = 'pathname';
          } else {
            var encodedUrl = parseEncodedURL(location.search);
            var source = 'search';
          }
        } else {
          var encodedUrl = parseEncodedURL((location.hash || '').replace(/^\#/, ''));
          var source = 'hash';
        }

        if (encodedUrl)
          return {
            encodedUrl: encodedUrl,
            source: source
          };
      }

      function complete() {
        shellLoader.loadingComplete(persistChange);
      }

      function persistChange(text) {
        var parsed = parseTextRequest(text);

        var enc = detectCurrentUrlEncoded(location);
        var source = enc && enc.source;
        if (typeof history.replaceState !== 'function')
          source = 'hash';
        var slashSeparated = [];
        if (enc && enc.encodedUrl && enc.encodedUrl.verbPos > 0) {
          var injectLeadPath =
            location.pathname.slice(0, enc.encodedUrl.verbPos)
              .replace(/^\/+/, '').replace(/\/+$/, '');
          if (injectLeadPath)
            slashSeparated.push(injectLeadPath);
        }

        var firstLine = parsed && parseFirstLine(parsed.firstLine);
        if (!parsed || !firstLine) {
          slashSeparated.push('edit');
          slashSeparated.push(encodeURIComponent(text));
        } else {
          if (firstLine.verbPos >= 0) slashSeparated.push(firstLine.verb);
          slashSeparated.push(firstLine.url);
          if (parsed.body) slashSeparated.push('/' + parsed.body.replace(/^(\n+)/, function (str) { return str.replace(/\n/g, '/'); }));
        }

        switch (source) {
          case 'pathname':

            history.replaceState(
              null,
              'unused-string',
              location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/' + slashSeparated.join('/'));
            break;

          case 'search': // update search
            history.replaceState(
              null,
              'unused-string',
              location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + '/' + location.pathname + '?' + slashSeparated.join('/'));
            break;

          case 'hash':
          default: // update hash
            location.hash = slashSeparated.join('/');
            break;
        }
      }
    }

    function bootBacked(uniquenessSource) {

      var shellLoader = createShell('Loading...', 'text');

      loadAsync().then(function (drive) {
        if (minimalDependenciesPresent()) {
          complete();
        } else {
          /** @type {*} */(catchREST)['continue'] = function () {
            complete();
          };
          on(window, 'load', complete);
          setTimeout(function () {
            if (document.readyState === 'complete')
              complete();
          }, 100);
        }

        console.log('drive loaded ', drive);
        var completed = false;

        function complete() {
          if (completed) return;
          completed = true;
          if (/** @type {*} */(catchREST)['continue']) {
            /** @type {*} */(catchREST)['continue'] = function () { };
          }
          off(window, 'load', complete);

          var allFiles = drive.files();
          var bestFile = findBestFile();

          var detectMode =
            /\.json$/i.test(bestFile) ? 'json' :
              /\.js$/i.test(bestFile) ? 'javascript' :
                /\.html$/i.test(bestFile) ? 'html' :
                  /\.md$/i.test(bestFile) ? 'markdown' :
                    'text';

          shellLoader.loadingComplete(
            function (updatedText) {
              drive.write(bestFile, updatedText);
            },
            drive.read(bestFile),
            detectMode
          );

          function findBestFile() {
            var bestFile =
              allFiles.filter(function (f) { return /index\.js/i.test(f); })[0] ||
              allFiles.filter(function (f) { return /index\.html/i.test(f); })[0] ||
              allFiles.filter(function (f) { return /README/i.test(f); })[0] ||
              allFiles[0];

            return bestFile;
          }
        }
      });

      /**
       * @param {((progress: { loadedSize: number, anticipatedTotalSize: number | undefined, fileCount: number }) => void)=} progressCallback
       * @returns {Promise<Drive.Detached.DOMDrive>}
       */
      function loadAsync(progressCallback) {
        return new Promise(function (resolve, reject) {
          var persist = persistence(document, uniquenessSource);

          var reportedSize = persist.domLoadedSize;
          var reportedTotalSize = persist.domTotalSize;
          var continueLoadingTimeout;
          continueLoading();

          function continueLoading() {
            if (document.readyState === 'complete')
              return persist.finishParsing(function(drive) {
                resolve(drive);
              });

            if (typeof progressCallback === 'function') {
              if ((persist.domLoadedSize || 0) > (reportedSize || 0) ||
                (persist.domTotalSize || 0) > (reportedTotalSize || 0)) {
                progressCallback({
                  loadedSize: persist.domLoadedSize || 0,
                  anticipatedTotalSize: persist.domTotalSize,
                  fileCount: persist.loadedFileCount || 0
                });
              }

              reportedSize = persist.domLoadedSize;
              reportedTotalSize = persist.domTotalSize;
            }
            continueLoadingTimeout = setTimeout(continueLoading, 400)
          }
        });

      }
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

// @ts-check

function ttywtf() {

  function addButtonHandlers() {
    var buttonsArray = document.getElementsByTagName('button');
    for (var i = 0; i < buttonsArray.length; i++) {
      addHandler(buttonsArray[i]);
    }

    /** @param {HTMLButtonElement} btn */
    function addHandler(btn) {
      btn.onmousedown = btn_onmousedown;
      btn.onmouseup = btn_mouseup;
      btn.onclick = btn_click;

      /** @param {MouseEvent} evt */
      function btn_onmousedown(evt) {
        if (evt.preventDefault) evt.preventDefault();
        if (evt.stopPropagation) evt.stopPropagation();
        if ('cancelBubble' in evt) evt.cancelBubble = true;

        var modifier = btn.id;
        var remove = (btn.className || '').indexOf('pressed') >=0;
        applyModifierToSelection(modifier, remove);
      }

      /** @param {MouseEvent} evt */
      function btn_mouseup(evt) {
        if (evt.preventDefault) evt.preventDefault();
        if (evt.stopPropagation) evt.stopPropagation();
        if ('cancelBubble' in evt) evt.cancelBubble = true;
      }

      /** @param {MouseEvent} evt */
      function btn_click(evt) {
        if (evt.preventDefault) evt.preventDefault();
        if (evt.stopPropagation) evt.stopPropagation();
        if ('cancelBubble' in evt) evt.cancelBubble = true;
      }
    }
  }

  /**
   * @param modifier {string}
   * @param remove {boolean=}
   **/
  function applyModifierToSelection(modifier, remove) {
    var oldText = textarea.value;

    if (!modifier || !oldText) return;

    var leadText = oldText.slice(0, textarea.selectionStart);
    var modifyText = oldText.slice(textarea.selectionStart, textarea.selectionEnd);
    var trailText = oldText.slice(textarea.selectionEnd);

    if (!modifyText) return;

    var newText = leadText + applyModifier(
      modifyText,
      modifier,
      remove) + trailText;

    if (oldText !== newText) {
      textarea.value = newText;
      if (textarea.selectionStart !== leadText.length) textarea.selectionStart = leadText.length;
      if (textarea.selectionEnd !== newText.length - trailText.length) textarea.selectionEnd = newText.length - trailText.length;

      textarea_onselectionchange_debounced();
    }
  }

  function getStorageText() {
    return deriveTextFromLocation();
  }

  /** @param {string} text */
  function setStorageText(text) {
    updateLocationWithText(text);
  }

  /** @param {string} text */
  function mangleForURL(text) {
    return encodeURIComponent(text)
      .replace(/%3A/ig, ':')
      .replace(/%20/ig, '+')
      .replace(/%0A/gi, '/');
  }

  /** @param mangled {string} */
  function unmangleFromURL(mangled) {
    return decodeURIComponent(mangled
      .replace(/\//g, '\n')
      .replace(/\+/g, ' ')
    );
  }

  function getLocationSource() {
    if (!location) location = window.location;
    var source = unmangleFromURL(
      (location.hash || '').replace(/^#/, '') ||
      (location.search || '').replace(/^\?/, '') ||
      (location.pathname || '').replace(/^\//, '')
    );

    return source || '';
  }

  /**
   * @param {typeof window.location=} location
   **/
  function deriveTextFromLocation(location) {
    var decoded = decodeText(getLocationSource());
    return decoded;
  }

  /** @param source {string} */
  function decodeText(source) {
    if (!source) return '';

    if (/^txt~/.test(source)) {
      return source.slice('txt~'.length);
    } else if (/^md~/.test(source)) {
      return convertFromMarkdown(source.slice('md~'.length));
    } else if (/^b~/.test(source)) {
      return convertFromCompressed(source.slice('b~'.length));
    } else {
      var fromMD = convertFromMarkdown(source);
      if (convertToMarkdown(fromMD) === source) return fromMD;
      else return source;
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
    var hasSearch = !!(location.search || '').replace(/^\?/, '');

    var allowReplaceState = 
      !/\//.test(encoded) &&
      !isFileProtocol &&
      !isAboutProtocol &&
      hasReplaceState;
    
    if (allowReplaceState && !hasSearch) {
      history.replaceState(null, 'unused-string', encoded);
    } else if (hasReplaceState && !isFileProtocol && !isAboutProtocol) {
      history.replaceState(null, 'unused-string', location.pathname + '?' + encoded);
    } else {
      if (hasSearch) location.search = '';
      location.href = '#' + encoded;
    }
  }

  /** @param text {string} */
  function encodeText(text) {
    var encoded = convertToMarkdown(text);
    if (encoded.length < 1900 && convertFromMarkdown(encoded) === text) return encoded;
    if (text.length < 1900) return 'txt~' + text;
    return 'b~' + convertToCompressed(text);
  }

  var regex_isASCII = /^[ -~\r\n\t]*$/;

  /** @param str {string} */
  function isAscii(str) {
    return typeof str === 'string' && regex_isASCII.test(str);
  }

  var regex_markdownDecorChunks = /([\*_]+)([^\*_\n]+)([\*_]+)/g;

  /**
   * @param markdown {string}
   * @returns {string}
   **/
  function convertFromMarkdown(markdown) {
    var formatted = markdown.replace(regex_markdownDecorChunks, convertFromMarkdownHelper);
    return formatted;
  }

  /**
   * @param formattedText {string}
   * @returns {string}
   **/
  function convertToMarkdown(formattedText) {
    var result = '';
    var parsed = parseRanges(formattedText);
    for (var i = 0; i < parsed.length; i++) {
      var range = parsed[i];
      if (typeof range === 'string') {
        result += range;
      } else {
        var prefix = '';
        var suffix = '';
        var text = range.plain;

        for (var j = 0; j < range.modifiers.length; j++) {
          var mod = range.modifiers[j];
          switch (mod) {
            case 'bold':
              prefix = '**' + prefix;
              suffix = suffix + '**';
              break;

            case 'italic':
              prefix = '*' + prefix;
              suffix = suffix + '*';
              break;

            case 'underlined':
              prefix = '_' + prefix;
              suffix = suffix + '_';
              break;

            default:
              text = applyModifier(text, mod);
          }
        }

        result += prefix + text + suffix;
      }
    }
    return result;
  }

  /**
   * @param whole {string}
   * @param openDecor {string}
   * @param content {string}
   * @param closeDecor {string}
   **/
  function convertFromMarkdownHelper(whole, openDecor, content, closeDecor) {
    if (openDecor==='*' && closeDecor ==='*') {
      var italic = applyModifier(content, 'italic');
      if (italic !== whole) return italic;
      else return whole;
    } else if (openDecor === '**' && closeDecor === '**') {
      var bold = applyModifier(content, 'bold');
      if (bold !== whole) return bold;
      else return whole;
    } else if (openDecor === '***' && closeDecor === '***') {
      var bolditalic = applyModifier(applyModifier(content, 'bold'), 'italic');
      if (bolditalic !== whole) return bolditalic;
      else return whole;
    } else if (openDecor === '_' && closeDecor === '_') {
      var underline = applyModifier(content, 'underlined');
      if (underline !== whole) return underline;
      else return whole;
    }
    return whole;
  }

  /**
   * @param compressed {string}
   * @returns {string}
   **/
  function convertFromCompressed(compressed) {
    // TODO: atob, then inflate
    var deflatedStr = atob(compressed);
    var deflatedArr = typeof Uint8Array === 'function' ?
      new Uint8Array(deflatedStr.length) :
      /** @type {Uint8Array} */(/** @type {*} */([]));

    for (var i = 0; i < deflatedStr.length; i++) {
      deflatedArr[i] = deflatedStr.charCodeAt(i);
    }

    var arr = pako.inflate(deflatedArr);
    var text = '';
    for (var i = 0; i < arr.length; i++) {
      text += String.fromCharCode(arr[i]);
    }
    return text;
  }

  /**
   * @param text {string}
   * @returns {string}
   **/
  function convertToCompressed(text) {
    // TODO: deflate, then btoa
    var deflatedArr = pako.deflate(text);
    var deflatedStr = '';
    for (var i = 0; i < deflatedArr.length; i++) {
      deflatedStr += String.fromCharCode(deflatedArr[i]);
    }
    var base64 = btoa(deflatedStr);
    return base64;
  }

  /** @param evt {ClipboardEvent} */
  function textarea_onpaste(evt) {
    if (!evt || !evt.clipboardData || typeof evt.clipboardData.getData !== 'function') return;

    var html = evt.clipboardData.getData('text/html');
    if (!html) return;

    var text = convertHtmlToText(html);
    if (text && typeof evt.preventDefault === 'function') {
      evt.preventDefault();

      var currentText = textarea.value;
      var unchangedPrefix = currentText.slice(0, textarea.selectionStart);
      var unchangedSuffix = currentText.slice(textarea.selectionEnd);
      var newText = unchangedPrefix + text + unchangedSuffix;
      textarea.value = newText;
      textarea.selectionStart = unchangedPrefix.length + text.length;
      textarea.selectionEnd = unchangedPrefix.length + text.length;

      textarea_onchange_debounced();
    }
  }

  /** @param html {string} */
  function convertHtmlToText(html) {

    var tmpDIV = document.createElement('div');
    tmpDIV.innerHTML = html;
    tmpDIV.style.cssText = 'position: absolute; left: -1000px; top: -1000px; color: transparent; opacity: 0;'
    document.body.appendChild(tmpDIV);

    var result = '';
    var breakAfter = false;
    try {
      visitElement(tmpDIV);
    }
    catch (err) {
      console.error('handling paste ', err);
    }
    finally {
      document.body.removeChild(tmpDIV);
    }

    return result;

    /** @param {HTMLElement} el */
    function visitElement(el) {
      if (/script|head|style|meta/i.test(el.tagName)) return;

      if (/br/i.test(el.tagName)) {
        result += '\n';
        breakAfter = false;
        return;
      }

      if (/hr/i.test(el.tagName)) {
        if (breakAfter) result += '\n----------------';
        else result += '----------------';
        breakAfter = true;
        return;
      }

      if (!el.childNodes || !el.childNodes.length) {
        visitChildlessElement(el, el.textContent || '');
        breakAfter = isSeparateParagraphElement(el);
      }
      else {
        visitElementChildren(el);
      }
    }

    /** @param {HTMLElement} el */
    function isSeparateParagraphElement(el) {
      var separateParagraph = /div|pr|td|blockquote|p/i.test(el.tagName);
      return separateParagraph;
    }

    /**
     * @param {HTMLElement} el
     * @param {string} text
     **/
    function visitChildlessElement(el, text) {
      if (text) {
        if (typeof getComputedStyle === 'function') {
          var style = getComputedStyle(el);
          if (style) {
            if (/^(code|pre)$/i.test(el.tagName) || isTypewriter(style)) text = applyModifier(text, 'typewriter');
            if (/^(b|strong)$/i.test(el.tagName) || isBold(style)) text = applyModifier(text, 'bold');
            if (/^(i)$/i.test(el.tagName) || isItalic(style)) text = applyModifier(text, 'italic');
            if (/^(sup)$/i.test(el.tagName) || isUpper(style)) text = applyModifier(text, 'upper');
            if (/^(u)$/i.test(el.tagName) || isUnderlined(style)) text = applyModifier(text, 'underlined');
          }
        }
        result += breakAfter ? '\n' + text : text;
      }
    }

    /** @param style {CSSStyleDeclaration} */
    function isBold(style) {
      if (/bold/i.test(style.fontWeight || '')) return true;
      var num = parseFloat(style.fontWeight);
      if (num >= 600) return true;
    }

    /** @param style {CSSStyleDeclaration} */
    function isItalic(style) {
      if (/italic/i.test(style.fontStyle || '')) return true;
    }

    /** @param style {CSSStyleDeclaration} */
    function isUnderlined(style) {
      if (/underline/i.test(style.textDecoration || '')) return true;
    }

    /** @param style {CSSStyleDeclaration} */
    function isTypewriter(style) {
      if (/pre/i.test(style.whiteSpace || '')) return true;
      if (/mono|courier|terminal/i.test(style.fontFamily || '')) return true;
    }

    /** @param style {CSSStyleDeclaration} */
    function isUpper(style) {
      if (/super/i.test(style.verticalAlign || '')) return true;
      if (style.fontSize) {
        var num = parseFloat(style.fontSize);
        if (num <= 13) return true;
      }
    }

    /** @param el {HTMLElement} */
    function visitElementChildren(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var childNode = el.childNodes[i];
        if (childNode.nodeType === 3 /* text */) {
          visitChildlessElement(el, childNode.textContent || '');
          breakAfter = false;
          continue;
        }

        if (childNode.nodeType === 1 /* element */) {
          visitElement(/** @type {HTMLElement} */(childNode));
          continue;
        }
      }
    }
  }

  function textarea_onchange() {
    var textareaCurrentValue = textarea.value;
    if (textareaCurrentValue === textareaLastValue) {
      textarea_onselectionchange();
    } else {
      var timestamp = Date.now();
      var shortlyAfterKeydown = (Date.now() - textareaKeyEventTimestamp) < 50;
      var formattingApplied = false;
      if (textareaCurrentValue && shortlyAfterKeydown) {
        if (textarea.selectionStart === textarea.selectionEnd) {
          var unchangedPrefixLength = Math.max(0, textarea.selectionStart - 10);
          var unchangedSuffixLength = Math.max(0, textareaCurrentValue.length - textarea.selectionStart - 2);

          if (textareaCurrentValue.slice(0, unchangedPrefixLength) === textareaLastValue.slice(0, unchangedPrefixLength)
             && (!unchangedSuffixLength || textareaCurrentValue.slice(-unchangedSuffixLength) === textareaLastValue.slice(-unchangedSuffixLength))) {
            // change is close to the cursor, good

            // find where change starts exactly
            while (unchangedPrefixLength + unchangedSuffixLength < textareaCurrentValue.length
                  && unchangedPrefixLength + unchangedSuffixLength < textareaLastValue.length
                  && textareaCurrentValue.charCodeAt(unchangedPrefixLength) === textareaLastValue.charCodeAt(unchangedPrefixLength)) {
              unchangedPrefixLength++;
            }

            // find where change ends exactly
            while (unchangedPrefixLength + unchangedSuffixLength < textareaCurrentValue.length
                  && unchangedPrefixLength + unchangedSuffixLength < textareaLastValue.length
                  && textareaCurrentValue.charCodeAt(textareaCurrentValue.length - unchangedSuffixLength) === textareaLastValue.charCodeAt(textareaLastValue.length - unchangedSuffixLength)) {
              unchangedSuffixLength++;
            }

            // will be applying modifiers one by one, more important last
            var modifiersParsed = getModifiersTextSection(
              textareaLastValue,
              unchangedPrefixLength,
              textareaLastValue.length - unchangedSuffixLength
            );
            var modifiersChange = modifiersParsed && modifiersParsed.parsed && modifiersParsed.parsed.modifiers || [];

            var modifiersLead = textareaLastValue.length === unchangedPrefixLength + unchangedSuffixLength ?
              [] :
              (modifiersParsed = getModifiersTextSection(
                textareaLastValue,
                unchangedPrefixLength,
                unchangedPrefixLength + 2
              )) && modifiersParsed.parsed && modifiersParsed.parsed.modifiers || [];

            if (modifiersChange.length) {
              var prevInnerText = textareaLastValue.slice(
                unchangedPrefixLength,
                unchangedSuffixLength ? -unchangedSuffixLength : textareaLastValue.length);
              var editedInnerText = textareaCurrentValue.slice(
                unchangedPrefixLength,
                unchangedSuffixLength ? -unchangedSuffixLength : textareaCurrentValue.length);

              var innerText = editedInnerText;
              if (innerText) {
                var applyModifierList = modifiersLead.slice().reverse();
                for (var i = 0; i < modifiersChange.length; i++) {
                  var mod = modifiersChange[i];
                  if (applyModifierList.indexOf(mod)<0) applyModifierList.unshift(mod);
                }

                for (var i = 0; i < applyModifierList.length; i++) {
                  innerText = applyModifier(innerText, applyModifierList[i],/* remove: */ false);
                }
              }

              if (innerText !== editedInnerText) {
                var newText =
                  textareaCurrentValue.slice(0, unchangedPrefixLength) +
                  innerText +
                  (unchangedSuffixLength ? textareaCurrentValue.slice(-unchangedSuffixLength) : '');

                textareaLastValue = newText;
                textarea.value = newText;
                formattingApplied = true;
                var restoreSelectionPos = unchangedPrefixLength + newText.length;
                if (textarea.selectionStart !== restoreSelectionPos || textarea.selectionEnd !== restoreSelectionPos) {
                  textarea.selectionStart = restoreSelectionPos;
                  textarea.selectionEnd = restoreSelectionPos;
                }
              }
            }
          }
        }
      }

      if (!formattingApplied) {
        textareaLastValue = textareaCurrentValue;
      }

      clearTimeout(save_timeout);
      save_timeout = setTimeout(textarea_onchange_debounced, 600);
    }
  }

  function textarea_onchange_debounced() {
    clearTimeout(save_timeout);
    setStorageText(textarea.value);
    textarea_onselectionchange_debounced();
  }

  function textarea_onmousedown() {
    textareaMouseDown = true;
    textarea_onselectionchange();
  }

  function textarea_onmouseup() {
    textareaMouseDown = false;
    textarea_onselectionchange();
  }

  function textarea_onmousemove() {
    if (!textareaMouseDown) return;
    textarea_onselectionchange();
  }

  function textarea_onkeydown(e) {
    if (e.metaKey || e.ctrlKey) {
      var letter = String.fromCharCode(e.keyCode);
      var modifier =
        letter === 'B' ? 'bold' :
        letter === 'I' ? 'italic' :
        letter === 'U' ? 'underlined' :
        '';

      if (modifier) {
        var btn = document.getElementById(modifier);
        if (btn) {
          var remove = (btn.className || '').indexOf('pressed') >=0;
          applyModifierToSelection(modifier, remove);
        }
      }
    }

    textarea_onkeyevent();
  }

  function textarea_onkeyevent(e) {
    textareaKeyEventTimestamp = Date.now();
    textarea_onchange();
  }

  function textarea_onselectionchange() {
    if (!selection_timeout_max) selection_timeout_max = setTimeout(textarea_onselectionchange_debounced, 200);
    clearTimeout(selection_timeout_slide);
    selection_timeout_slide = setTimeout(textarea_onselectionchange_debounced, 70);
  }

  function textarea_onselectionchange_debounced() {
    clearTimeout(selection_timeout_slide);
    clearTimeout(selection_timeout_max);
    selection_timeout_max = 0;

    //status.textContent = status.innerText = textarea.selectionStart + ':' + (textarea.selectionEnd - textarea.selectionStart);
    var modTextSection = getModifiersTextSection(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    console.log('modTextSection: ', modTextSection);

    var toggleButtons = document.querySelectorAll('#toolbar button');
    for (var i = 0; i < toggleButtons.length; i++) {
      var btn = /** @type {HTMLButtonElement} */(toggleButtons[i]);
      if (btn.id) {
        var pressed = modTextSection && modTextSection.parsed && modTextSection.parsed.modifiers.indexOf(btn.id) >= 0;

        if (pressed) btn.className = (btn.className || '').replace(/\s*$/, '') + ' pressed';
        else btn.className = btn.className.replace(/\s*\bpressed\b\s*/g, ' ') ;
      }
    }
  }

  /**
   * @param {string} text
   * @param {number} start
   * @param {number} end
   */
  function getModifiersTextSection(text, start, end) {
    var modText = text;
    if (start !== end) {
      modText = modText.slice(start, end);
      return { text: modText, start: start, end: end, parsed: parseRanges(modText) };
    }

    var consequentMatch = /\S+\s*$/.exec(text.slice(0, start));
    var consequentEntryStart = start - (consequentMatch ? consequentMatch[0].length : 0);

    if (!consequentMatch || !consequentMatch[0]) {
      // if cannot find consequent BEFORE, try consequent AFTER
      consequentMatch = /^\s*\S+/.exec(text.slice(start));
      if (!consequentMatch) return { text: '', start: start, end: start, parsed: parseRanges('') };
      var parsed = parseRanges(consequentMatch[0]);
      var consequentEntry = parsed[0];
    } else {
      var parsed = parseRanges(consequentMatch[0]);
      var consequentEntry = parsed[parsed.length - 1];
    }

    if (!parsed.length) return { text: '', start: start, end: start, parsed };

    // pick previous if this is punctuation or whitespace after formatted word
    if (typeof consequentEntry === 'string' && parsed && parsed.length > 1) {
      var prevConsequentEntry = parsed[parsed.length - 2];
      if (consequentEntry.indexOf('\n') < 0 &&
        typeof prevConsequentEntry !== 'string' &&
        consequentEntry == applyModifier(consequentEntry, prevConsequentEntry.fullModifiers)) {
          consequentEntry = prevConsequentEntry;
        }
    }


    if (consequentMatch && consequentMatch[0]) {
      if (consequentEntry) {
        parsed.length = 1;
        parsed.modifiers = typeof consequentEntry === 'string' ? [] : consequentEntry.modifiers;
        parsed.fullModifiers = typeof consequentEntry === 'string' ? '' : consequentEntry.fullModifiers;
        parsed[0] = consequentEntry;
      } else {
        parsed.length = 0;
        parsed.modifiers = [];
        parsed.fullModifiers = '';
      }

      return {
        text: typeof consequentEntry === 'string' ? consequentEntry : consequentEntry.formatted,
        start: consequentEntryStart,
        end: consequentEntryStart + consequentEntry.length,
        parsed: parsed
      };
    }

    return { text: '', start: start, end: start, parsed: parseRanges('')};
  }

  function window_onunload() {
    // save to local storage NOW
    textarea_onchange_debounced();
  }

  /**
   * @param text {string}
   * @param modifier {string}
   * @param remove {boolean=}
   **/
  function applyModifier(text, modifier, remove) {
    var parsed = parseRanges(text, { disableCoalescing: true });
    var text = '';

    for (var iRange = 0; iRange < parsed.length; iRange++) {
      var range = parsed[iRange];

      if (typeof range === 'string') {
        if (remove) {
          text += range;
        } else {
          var rangeMap = variants[modifier];
          if (!rangeMap && modifier !== 'underlined') {
            // strange modifier???
            text += range;
          } else {
            for (var iChar = 0; iChar < range.length; iChar++) {
              // range is an ASCII string, iterate for each character
              var ch = range.charAt(iChar);
              var formattedCh = applyModifierToPlainCh(ch, [modifier]);
              text += formattedCh;
            }
          }
        }
      } else {
        /** @type {string} */
        var applyFullModifiers;
        if (remove) {
          if (range.modifiers.indexOf(modifier)<0) {
            // formatted, but not with this modifier — not removing anything
            text += range.formatted;
            continue;
          } else if (range.modifiers.length === 1) {
            // last modifier to be removed, simply reduce back to ASCII unformatted
            text += range.plain;
            continue;
          } else {
            applyFullModifiers = range.modifiers.filter(mod => mod === modifier).join('');
          }
        } else {
          applyFullModifiers = range.modifiers.indexOf(modifier) < 0 ?
            range.modifiers.concat([modifier]).sort().join('') :
            range.fullModifiers;
        }

        var formattedCh = applyModifierToPlainCh(
          range.plain,
          applyFullModifiers === modifier ? [modifier] : [applyFullModifiers, modifier]);
        text += formattedCh;
      }
    }

    return text;
  }

  var regex_underlined = /underlined/g;

  /**
   * @param plainCh {string}
   * @param modifierAndFallbacks {string[]}
   **/
  function applyModifierToPlainCh(plainCh, modifierAndFallbacks) {
    // underlined is handled separately
    if (modifierAndFallbacks.length === 1 && modifierAndFallbacks[0] === 'underlined') return plainCh + '\u0332';

    for (var iMod = 0; iMod < modifierAndFallbacks.length; iMod++) {
      var mod = modifierAndFallbacks[iMod];

      // again, underlined is handled separately
      var underlined = regex_underlined.test(mod);
      if (underlined) mod = mod.replace(regex_underlined, '');
      if (!mod && underlined) {
        return plainCh + '\u0332';
      }

      var rangeMap = variants[mod];
      if (!rangeMap) continue;

      var formattedRange = rangeMap[plainCh];
      if (formattedRange) return formattedRange;

      for (var asciiRange in rangeMap) {
        var formattedRange = rangeMap[asciiRange];
        if (typeof formattedRange === 'string' && plainCh.charCodeAt(0) >= asciiRange.charCodeAt(0) && plainCh.charCodeAt(0) <= asciiRange.charCodeAt(1)) {
          // found respective range in modifier entry, pick corresponding formatted character
          var formattedIndex = plainCh.charCodeAt(0) - asciiRange.charCodeAt(0);
          var formattedUnit = formattedRange.length / (asciiRange.charCodeAt(1) - asciiRange.charCodeAt(0) + 1);
          var formattedChar = formattedRange.slice(formattedIndex * formattedUnit, (formattedIndex + 1) * formattedUnit);
          if (underlined) formattedChar += '\u0332';
          return formattedChar;
        }
      }
    }

    return plainCh;
  }

  var regex_escapeableRegexChars = /[#-.]|[[-^]|[?|{}]/g;

  /** @param str {string} */
  function sanitizeForRegex(str) {
    var sanitized = str.replace(regex_escapeableRegexChars, '\\$&');
    return sanitized;
  }


  function createParser() {

    /** @typedef {{ formatted: string, plain: string, modifiers: string[], fullModifiers: string }} LookupEntry */

    /** @type {{ [formatted: string]: (LookupEntry & {underlinedModifiers: string[], underlinedFullModifiers: string}) }} */
    var lookup = {};

    /** @type {RegExp} */
    var formattedRegex;

    var regex_underlinedChar = /[^\r\n]\u0332/g;

    function buildLookups() {
      /** @type {LookupEntry[]} */
      var lookupList = [];

      for (var modKind in variants) {
        var rangeMap = variants[modKind];
        if (!rangeMap || typeof rangeMap !== 'object') continue;

        var modifiers = modKind === 'bold' || modKind.indexOf('bold') ? [modKind] : ['bold', modKind.slice(4)];
        var underlinedModifiers = modifiers.concat(['underlined']);
        var underlinedFullModifiers = modKind + 'underlined';

        for (var rangeDesc in rangeMap) {
          var rangeChars = rangeMap[rangeDesc];
          if (!rangeChars || typeof rangeChars !== 'string') continue;

          var rangeCount = rangeDesc.length === 1 ? 1 : rangeDesc.charCodeAt(1) - rangeDesc.charCodeAt(0) + 1;
          var formattedWidth = rangeChars.length / rangeCount;
          for (let i = 0; i < rangeCount; i++) {
            var ascii = String.fromCharCode(rangeDesc.charCodeAt(0) + i);
            var rangeCh = rangeChars.slice(i * formattedWidth, (i + 1) * formattedWidth);
            var entry = {
              formatted: rangeCh,
              plain: ascii,
              modifiers: modifiers,
              underlinedModifiers: underlinedModifiers,
              fullModifiers: modKind,
              underlinedFullModifiers: underlinedFullModifiers
             };
            lookupList.push(entry);
            lookup[entry.formatted] = entry;
          }
        }
      }

      lookupList.sort(function (entry1, entry2) {
        return -(entry1.formatted.length - entry2.formatted.length);
      });

      formattedRegex = new RegExp(lookupList.map(function(entry) {
        var sanitizedEntry = sanitizeForRegex(entry.formatted);
        var underlineEntry = sanitizedEntry + '\u0332';
        return underlineEntry + '|' + sanitizedEntry;
      }).join('|'), 'g');
    }

    /** @typedef {(string | (LookupEntry & { length: number }))[] & { modifiers: string[], fullModifiers: string }} ParsedList */

    /**
     * @param text {string}
     * @param options {{ disableCoalescing?: boolean }=}
     **/
    function parser(text, options) {
      /** @type {ParsedList} */
      var result = /** @type{*} */([]);
      result.modifiers = [];
      result.fullModifiers = '';
      if (!text) return result;

      var disableCoalescing = options && options.disableCoalescing;

      var modifierDict = {};

      formattedRegex.lastIndex = 0;
      let index = 0;
      while (true) {
        var match = formattedRegex.exec(text);
        if (!match) break;

        if (match.index > index) {
          addUnderlinedsAndPlainTextBetween(index, match.index);
          // result.push(text.slice(index, match.index));
        }

        var underlined = false;
        
        var entryKey = match[0];
        if (entryKey.charCodeAt(entryKey.length - 1) === ('\u0332').charCodeAt(0)) {
          entryKey = entryKey.slice(0, entryKey.length - 1);
          underlined = true;
        }

        var entry = lookup[entryKey];
        var prev = result.length && result[result.length - 1];

        var modifiers = !underlined ? entry.modifiers : entry.underlinedModifiers;
        var fullModifiers = !underlined ? entry.fullModifiers : entry.underlinedFullModifiers;

        if (!disableCoalescing && prev && typeof prev !== 'string' && prev.fullModifiers === entry.fullModifiers) {
          prev.formatted += entry.formatted;
          prev.length += entry.formatted.length;
          prev.plain += entry.plain;
        } else {
          result.push({
            formatted: match[0],
            plain: entry.plain,
            modifiers: modifiers,
            fullModifiers: fullModifiers,
            length: match[0].length
          });

          for (var i = 0; i < modifiers.length; i++) {
            var mod = modifiers[i];
            if (!modifierDict[mod]) {
              modifierDict[mod] = true;
              result.modifiers.push(mod);
            }
          }
        }

        index = match.index + match[0].length;
      }

      if (index < text.length) {
        addUnderlinedsAndPlainTextBetween(index, text.length);
      }

      result.modifiers.sort();
      result.fullModifiers = result.modifiers.join('');

      return result;

      /**
       * @param start {number}
       * @param end {number}
       **/
      function addUnderlinedsAndPlainTextBetween(start, end) {
        while (start < end) {
          regex_underlinedChar.lastIndex = start;
          var matchUnderlined = regex_underlinedChar.exec(text);
          if (!matchUnderlined || matchUnderlined.index >= end) {
            result.push(text.slice(start, end));
            break;
          }

          if (matchUnderlined.index > start) result.push(text.slice(start, matchUnderlined.index));

          var underlinedText = matchUnderlined[0];
          var plain = underlinedText.slice(0,underlinedText.length - 1);

          var added = false;
          if (!disableCoalescing) {
            var prevEntry = result.length && result[result.length - 1];
            if (prevEntry && typeof prevEntry !== 'string' && prevEntry.fullModifiers === 'underlined') {
              added = true;
              prevEntry.formatted += underlinedText;
              prevEntry.plain += plain;
              prevEntry.length += underlinedText.length;
            }
          }

          if (!added) {
            result.push({
              formatted: underlinedText,
              plain: plain,
              modifiers: ['underlined'],
              fullModifiers: 'underlined',
              length: underlinedText.length
            });
          }

          if (result.modifiers.indexOf('underlined') <0) result.modifiers.push('underlined');

          start = matchUnderlined.index + underlinedText.length;
        }
      }
    }

    buildLookups();

    return parser;
  }

  function createLayout() {
    var tableLayoutHTML =
      '<table style="width: 100%; height: 100%;" cellspacing=0 cellpadding=0><tr><td width="100%">' +
      '<textarea id="textarea" autofocus>' +
      '</textarea>' +
      '</td><td width="1%" style="width: 1em;" id="toolbar" valign=top>' +
      createButtonLayout() +
      '</td></tr></table>';

    var tmpDIV = document.createElement('div');
    tmpDIV.innerHTML = tableLayoutHTML;
    var table = tmpDIV.getElementsByTagName('table')[0];

    document.body.insertBefore(table, document.body.childNodes.item(0));

    var styleCSS =
      'html { box-sizing: border-box; width: 100%; height: 100%; overflow: hidden; padding: 0; margin: 0; } ' +
      'body { background: white; color: black; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; width: 100%; height: 100%; overflow: hidden; padding: 0; margin: 0; } ' +
      '*, *:before, *:after { box-sizing: inherit; } ' +
      '#toolbar button { width: 2.7em; height: 2.7em; margin: 0.35em; margin-top: 0.25em; margin-bottom: 0; border-radius: 0.5em; background: white; border: solid 1px #d6d6d6; box-shadow: 2px 3px 6px rgb(0, 0, 0, 0.09); } ' +
      '#toolbar button.pressed { background: gray; color: white; } ' +
      '#textarea { width: 100%; height: 100%; overflow: auto; border: none; padding: 1em; outline: none; font: inherit; resize: none; }';
    
    var styleEl = document.createElement('style');
    styleEl.innerHTML = styleCSS;
    (document.head || document.getElementsByTagName('head')[0]).appendChild(styleEl);
    
    function createButtonLayout() {
      var buttonsHTML = '';
      var addedSymbols = '';
      for (var mod in variants) {
        if (mod !== 'bold' && /^bold/.test(mod)) continue;
        var symbol = mod.charAt(0);
        if (addedSymbols.indexOf(symbol) >= 0) symbol = mod.charAt(mod.length - 1);
        addedSymbols += symbol;
        symbol = applyModifierToPlainCh(symbol.toUpperCase(), mod === 'fractur' || mod === 'cursive' ? ['bold' + mod] : [mod]);
        buttonsHTML += '<button id=' + mod + ' title=' + mod.charAt(0).toUpperCase() + mod.slice(1) + '>' + symbol + '</b>';
      }
      return buttonsHTML;
    }
  }

  function initWithStorageText() {
    textarea.value = getStorageText() || '';

    //var status = document.getElementById('status');

    textarea.onchange = textarea_onchange;
    textarea.onselect = textarea_onselectionchange;
    textarea.onselectionchange = textarea_onselectionchange;
    textarea.onselectstart = textarea_onselectionchange;
    textarea.onkeydown = textarea_onkeydown;
    textarea.onkeyup = textarea_onkeyevent;
    textarea.onkeypress = textarea_onkeyevent;
    textarea.onmousedown = textarea_onmousedown;
    textarea.onmouseup = textarea_onmouseup;
    textarea.onmousemove = textarea_onmousemove;
    textarea.onpaste = textarea_onpaste;

    window.onunload = window_onunload;

    addButtonHandlers();
    textarea_onselectionchange();
  }

  var checkIfLoadedTimeout;

  function checkIfLoaded() {
    clearTimeout(checkIfLoadedTimeout);

    if (typeof pako === 'undefined') {
      checkIfLoadedTimeout = setTimeout(checkIfLoaded, 300);
    } else {
      initWithStorageText();
    }
  }

  function getStorageTextFirstTime() {
    var source = getLocationSource();
    if (!/^b~/.test(source)) {
      initWithStorageText();
      return;
    }

    textarea.onchange = ignoreEvent;
    textarea.onselect = ignoreEvent;
    textarea.onselectionchange = ignoreEvent;
    textarea.onselectstart = ignoreEvent;
    textarea.onkeydown = ignoreEvent;
    textarea.onkeyup = ignoreEvent;
    textarea.onkeypress = ignoreEvent;
    textarea.onmousedown = ignoreEvent;
    textarea.onmouseup = ignoreEvent;
    textarea.onmousemove = ignoreEvent;
    textarea.onpaste = ignoreEvent;

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('load', checkIfLoaded);
      checkIfLoadedTimeout = setTimeout(checkIfLoaded, 300);
    }

    /** @param {Event} evt */
    function ignoreEvent(evt) {
      if (typeof evt.preventDefault === 'function') evt.preventDefault();
    }

  }

  var variants = {
    bold: { AZ: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭', az: '𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇', '09': '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵' },
    italic: { AZ: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡', az: '𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻' },
    bolditalic: { AZ: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕', az: '𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯' },
    fractur: { AB: '𝔄𝔅', C: 'ℭ', DG: '𝔇𝔈𝔉𝔊', HI: 'ℌℑ', JQ: '𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔', R: 'ℜ', SY: '𝔖𝔗𝔘𝔙𝔚𝔛𝔜', Z: 'ℨ', az: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷' },
    boldfractur: { AZ: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅', az: '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟' },
    cursive: { AZ: '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵', az: '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏' }, // TODO: handle cursive B, E, F, H, I, L, M, R
    boldcursive: { AZ: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩', az: '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃' },
    upper: { AP: 'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ', Q: 'ᴼ̴', RW: 'ᴿˢᵀᵁⱽᵂ', ap: 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖ', q: '٩', rz: 'ʳˢᵗᵘᵛʷˣʸᶻ', '09': '⁰¹²³⁴⁵⁶⁷⁸⁹' },
    box: { AZ: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉' },
    plate: { AZ: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉' },
    round: { AZ: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ', az: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ', '09': '⓪①②③④⑤⑥⑦⑧⑨' },
    typewriter: { AZ: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉', az: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣', '09': '𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿' },
    wide: {
      AB: '𝔸𝔹', C:'ℂ', DG: '𝔻𝔼𝔽𝔾', H:'ℍ', IM: '𝕀𝕁𝕂𝕃𝕄', N:'ℕ', O:'𝕆', PR:'ℙℚℝ', SY:'𝕊𝕋𝕌𝕍𝕎𝕏𝕐', Z:'ℤ',
      az: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫', '09': '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡' }
  };

  var parseRanges = createParser();

  var save_timeout;
  var selection_timeout_slide;
  var selection_timeout_max;

  var textareaKeyEventTimestamp = 0;
  var textareaLastValue = '';

  createLayout();

  var textarea = /** @type {HTMLTextAreaElement} */(document.getElementById('textarea'));
  var textareaMouseDown = false;

  getStorageTextFirstTime();
}

ttywtf();
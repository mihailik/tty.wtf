const fs = require('fs');
const path = require('path');

const imports = [
  'codemirror/lib/codemirror.js',
  'codemirror/lib/codemirror.css',

  'typescript/lib/typescript.js',
  // include lib.d.ts here? probably no

  'xlsx/dist/xlsx.full.min.js',
  //'xlsx/jszip.js'
];

let combinedJS = '';

for (const im of imports) {
  const content = fs.readFileSync(path.resolve(__dirname, '../node_modules', im), 'utf8');
  console.log(im + ' [' + content.length + ']');
  switch (path.extname(im).toLowerCase()) {
    case ".js": {
      combinedJS += (combinedJS ? '\n' : '') + '// #region ' + path.basename(im).replace(/\.js$/, '') + '\n' + content + '\n' + '// #endregion';
      break;
    }
    case '.css': {
      combinedJS += (combinedJS ? '\n' : '') + '///// ' + path.basename(im) + ' /////\n' +
        '(function() { var style = document.createElement("style");\n' +
        'style.innerHTML = ' + JSON.stringify(content) + ';\n' +
        '(document.body || document.getElementsByTagName("head")[0]).appendChild(style); })();\n';
    }
  }
}

combinedJS += '\n\nif (typeof catchREST !== "undefined" && catchREST && typeof catchREST.withDependenciesLoaded === "function") catchREST.withDependenciesLoaded();\n';

console.log('combined[' + combinedJS.length + ']');
fs.writeFileSync(path.resolve(__dirname, 'combined.js'), combinedJS);

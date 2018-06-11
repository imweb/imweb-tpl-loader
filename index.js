/**
 * @format by moxhe
 * @date 2017-09-26
 */
const fs = require('fs');
const path = require('path');

const EOL = '\n';

function compileTmpl(tmpl, filePath, self) {
  var res = [];

  tmpl.replace(/<\/script>/ig, '</s<%=""%>cript>');
  res.push([
    " function (it, opt) {",
    "    it = it || {};",
    "    with(it) {",
    "        var _$out_= [];",
    "        _$out_.push('" + tmpl
      .replace(/\r\n|\n|\r/g, "\v")
      .replace(/(?:^|%>).*?(?:<%|$)/g, function ($0) {
        return $0.replace(/('|\\)/g, "\\$1").replace(/[\v\t]/g, "").replace(/\s+/g, " ")
      })
      .replace(/[\v]/g, EOL)
      .replace(/<%\s*include\s+([^\s]+)\s*%>/g, function (all, filename) {
        var data = '';
        var fullname = path.resolve(filePath, filename);

        self.addDependency(fullname);

        if (fs.existsSync(fullname)) {
          data = fs.readFileSync(fullname, { 'encoding': 'utf8' });
          return "', " + compileTmpl(data, path.dirname(fullname), self) + "(it, opt), '";
        } else {
          throw new Error(`[imweb-tpl-loader]${fullname} not found.`);
        }
      })
      .replace(/<%=\s*include\(['"]([^'"]+)['"]\)(\([^\)]*\))\s*%>/g, function (all, filename, args) {
        var data = '';
        var fullname = path.resolve(self.context, filename);

        self.addDependency(fullname);

        if (fs.existsSync(fullname)) {
          data = fs.readFileSync(fullname, { 'encoding': 'utf8' });
          return "', " + compileTmpl(data, path.dirname(fullname), self) + args + ", '";
        } else {
          throw new Error(`[imweb-tpl-loader]${fullname} not found.`);
        }
      })
      .replace(/<%==(.*?)%>/g, "', opt.encodeHtml($1), '")
      .replace(/<%=(.*?)%>/g, "', $1, '")
      .replace(/<%-(.*?)%>/g, "', $1, '")
      .replace(/<%(<-)?/g, "');" + EOL + "      ")
      .replace(/->(\w+)%>/g, EOL + "      $1.push('")
      .split("%>").join(EOL + "      _$out_.push('") + "');",
    "      return _$out_.join('');",
    "    }",
    "}"
  ].join(EOL).replace(/_\$out_\.push\(''\);/g, ''));

  return res.join('');
}

module.exports = function (content) {
  return 'module.exports = ' + compileTmpl(content, this.context, this);
};

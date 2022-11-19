var fs = require('fs');
var path = require('path');
var http = require('http');

var server = http.createServer(function (req, res) {
  var filePath = path.join(__dirname, '..', req.url);
  fs.readFile(filePath, function (err, data) {
    if (err) {
      console.log(filePath + ' not found');
      res.statusCode = 404;
      res.end(filePath + ' not found');
    }
    else {
      console.log(filePath + ' bytes[' + data.length + ']');
      res.end(data);
    }
  });
});

server.listen(9344, '0.0.0.0', function () {
  console.log('server is running on http://localhost:9343/');
})
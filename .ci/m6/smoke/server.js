const http = require("http");
const port = process.env.PORT || 8080;
const host = "0.0.0.0";
const server = http.createServer((req, res) => {
  res.writeHead(200, {"Content-Type":"text/plain"});
  res.end("ok\n");
});
server.listen(port, host, () => { console.log(`listening on ${host}:${port}`); });
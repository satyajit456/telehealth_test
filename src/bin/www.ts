#!/usr/bin/env node

// import * as Fs from 'fs-extra';
// import path from "path";
// import https from "https";

import app from "../app";
import debug from "debug";
import http from "http";
import Socket from "../services/socketIo";

const port = 3300;
console.log('port--', port)
app.set("port", port);

// const options={
//   key: Fs.readFileSync(path.join(__dirname,'../config/server.key')),
//   cert: Fs.readFileSync(path.join(__dirname,'../config/server.crt'))
// }
// const server = https.createServer(options, app);

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// server.listen(port);
server.on("error", onError);
server.on("listening", onListening);


function normalizePort(val: string): string | number | false {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val; // named pipe
  if (port >= 0) return port;  // port number
  return false;
}

function onError(error: any): void {
  if (error.syscall !== "listen") throw error;
  const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
    default:
      throw error;
  }
}

function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
  debug("Listening on " + bind);
}

// socket implement
Socket(server)

const net = require("net");
const crypto = require("crypto");
const Storage = require("./storage");

const randomHash = ({ port, address, family }) => {
  return new Promise((resolve) => {
    const hash = crypto.createHash("sha256");
    hash.on("readable", () => {
      const data = hash.read();
      if (data) resolve(data.toString("hex"));
    });
    console.log(`create new hash for ${family}:${address}:${port}`);
    hash.write(`${family}:${address}:${port}`);
    hash.end();
  });
};

const connections = {};

const server = net.createServer(async (socket) => {
  const { remoteAddress, remotePort, remoteFamily } = socket;

  const id = await randomHash({
    address: remoteAddress,
    family: remoteFamily,
    port: remotePort,
  });
  const info = () => `${id}-${remoteFamily}:${remoteAddress}:${remotePort}`;

  console.log(`new connection ${info()}`);

  socket.write("echo from server");
  connections[id] = socket;

  socket.on("close", (isError) => {
    console.log(`${info()} closed, reason is error? - ${isError}`);
    delete connections[id];
    for (let id in connections) {
      const currentSocket = connections[id];
      currentSocket.write(`${info()} - exit`);
    }
  });
  socket.on("end", () => {
    console.log(`${info()} ended`);
  });
  socket.on("data", (chunk) => {
    console.log(`Recieved data from client ${info()} - ${chunk}`);
    // need send to all sockets dat info
    for (let id in connections) {
      const currentSocket = connections[id];
      currentSocket.write(`${info()} - ${chunk}`);
    }
  });
  socket.on("error", (err) => {
    console.log(`Error with ${info()} socket, err: ${err}`);
  });
});
server.listen({ port: 1337 }, () => {
  console.log(`server start listen `);
});

server.on("error", (err) => {
  console.log(err);
});
server.on("close", () => {
  console.log(`Closing server`);
});

(() => {
  setInterval(() => {
    console.log(`server has ${Object.keys(connections).length}, connections`);
  }, 10000);
})();

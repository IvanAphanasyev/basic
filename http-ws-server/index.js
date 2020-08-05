const ws = require("ws");
const http = require("http");
const { resolve } = require("path");

const server = http.createServer();
const wss = new ws.Server({ noServer: true });

storage = {};

const tab = (n) => {
  const str = "   ";
  let result = "";
  for (let i = 0; i < n; i++) {
    result += str;
  }
  return result;
};
(() =>
  setInterval(() => {
    console.log(`WebSocket server has ${wss.clients.size} clients`);
  }, 15000))();

wss.on("connection", (ws, client) => {
  console.log(`${tab(1)}websocket connection: ${JSON.stringify(client)}`);
  const { key } = client;
  ws.on("message", (msg) => {
    console.log(`${tab(2)}Received message ${msg} from ${key}`);
    // Here i should parse input message, How i think for more flexibility client side should send serialized json with command type and content
    const parse = (msg) => {
      console.log(`${tab(2)}parse message from ${key}`);
      try {
        const obj = JSON.parse(msg);
        return obj;
      } catch (err) {
        throw new Error(`parse input message error, message: ${err.message}`);
      }
    };
    const validate = (obj) => {
      console.log(`${tab(2)}validate message from ${key}`);
      const { command, data } = obj;
      if (!command) throw new Error("command is required");
      if (!data) throw new Error("data is required");
      if (typeof data !== "object")
        throw new Error("data property should be a object");
      return { command, data };
    };
    const factory = (command) => {
      switch (command) {
        case "start": {
          return (data) => {
            const { name } = data;
            if (!name) throw new Error("name required (data object)");
            console.log(`${tab(3)}key ${key} set name ${name}`);
            storage[key] = { name };
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN)
                client.send(`New connection ${name}`);
            });
          };
        }
        case "message": {
          return (data) => {
            const { message } = data;
            if (!message) throw new Error("message required (data object)");
            const { name } = storage[key] || { name: "anonymous" };
            console.log(`${tab(3)} key ${key} send message ${message}`);
            wss.clients.forEach((client) => {
              if (client.readyState === ws.OPEN)
                client.send(`${name}: ${message}`);
            });
          };
        }
        default:
          throw new Error("unknown command type");
      }
    };
    try {
      const parsed = parse(msg);
      const { command, data } = validate(parsed);
      const handler = factory(command);
      handler(data);
    } catch (err) {
      ws.emit("error", err);
    }
  });
  ws.on("error", (err) => {
    console.log(`${tab(2)}Error event, key: ${key}`);
    const { message } = err;
    console.log(`${tab(3)}${message}`);
    const response = { message, error: true };
    ws.send(JSON.stringify(response));
    ws.close();
  });
  ws.on("close", () => {
    console.log(`${tab(1)}close connection, key: ${key}`);
  });
});

server.on("upgrade", (request, socket, head) => {
  const { headers, httpVersion, method, url } = request;
  console.log(
    `${tab(
      1
    )}UPGRADE HTTP request: version: ${httpVersion}, method: ${method}, url: ${url}, headers length: ${
      Object.keys(headers).length
    }`
  );
  console.log(`${tab(1)}Check websocket headers...`);
  const client = {
    version: headers["sec-websocket-version"],
    language: headers["accept-language"],
    key: headers["sec-websocket-key"],
  };
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, client);
  });
});

server.on("connection", (socket) => {
  const { remoteAddress, remoteFamily, remotePort } = socket;
  console.log(
    `${tab(0)}new tcp connection ${remoteAddress}:${remotePort}:${remoteFamily}`
  );
});
server.on("close", () => {
  console.log(`close server...`);
});
server.on("error", (err) => {
  console.log(`Server error: `);
  console.log(err);
  console.log(`Close server...`);
  process.exit(1);
});
server.on("request", (incomingMessage, serverResponse) => {
  const { headers, httpVersion, method, url, socket } = incomingMessage;

  const { remoteAddress, remoteFamily, remotePort } = socket;

  socket.on("close", () =>
    console.log(
      `Socket ${remoteAddress}:${remotePort}:${remoteFamily} close event`
    )
  );
  socket.on("end", () =>
    console.log(
      `Socket ${remoteAddress}:${remotePort}:${remoteFamily} end event`
    )
  );
  console.log(
    `${tab(
      1
    )}HTTP request: version: ${httpVersion}, method: ${method}, url: ${url}, headers length: ${
      Object.keys(headers).length
    }`
  );
  console.log(
    `${tab(2)}Here i should parse url address and emit handler by result....`
  );

  const handler = async ({ req, res }) => {
    console.log(`${tab(3)}handle request...`);
    const firstNumber = Math.floor(Math.random() * 1000);
    const secondNUmber = Math.floor(Math.random() * 1500);

    const thirdNumber = firstNumber * secondNUmber;

    const response = {
      message: "success",
      data: thirdNumber,
    };
    const data = Buffer.from(JSON.stringify(response), "utf8");
    console.log(`${tab(3)}` + data);

    res.status = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(data + "\n");
  };

  handler({ req: incomingMessage, res: serverResponse })
    .then(() => {
      console.log(
        `${tab(
          1
        )}Server sended success result to ${remoteAddress}:${remotePort}:${remoteFamily}`
      );
    })
    .catch((reason) => {
      console.log(`${tab(3)}handler error: `);
      console.log(`${tab(3)} + ${reason}`);

      serverResponse.setHeader("Content-Type", "application/json");
      serverResponse.status = 500;
      const response = {
        error: true,
        message: "unhandled error",
        data: reason.message ? reason.message : "unknown",
      };
      const data = Buffer.from(JSON.stringify(response), "utf-8");
      serverResponse.end(data + `\n`);
      console.log(
        `${tab(
          1
        )}Server sended failed result to ${remoteAddress}:${remotePort}:${remoteFamily}`
      );
    });
});
server.listen(1337, "0.0.0.0", () => {
  console.log(`server start listen on port 1337`);
});

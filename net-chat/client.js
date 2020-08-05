const net = require("net");
const readline = require("readline");

const args = process.argv.slice(2);

const name = args[0] || "anonymous";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${name} `,
});

const client = new net.Socket();

client.connect(1337, "localhost", () => {
  console.log("Connected");

  client.write(`${name}`);
});

client.on("data", (chunk) => {
  console.log(`recieved: ${chunk}`);
  //client.destroy();
});

client.on("close", () => {
  console.log("Conncetion closed");
  process.exit(1);
});

rl.prompt();
rl.on("line", (line) => {
  client.write(line);
});
rl.on("close", () => {
  process.exit(1);
});

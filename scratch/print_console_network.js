const wsUrl = process.argv[2];
if (!wsUrl) {
  console.error("Please provide WebSocket URL");
  process.exit(1);
}

import('ws').then(({ default: WebSocket }) => {
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to DevTools! Listening to logs...");
    send("Runtime.enable");
    send("Network.enable");
  };

  let msgId = 1;
  function send(method, params = {}) {
    ws.send(JSON.stringify({ id: msgId++, method, params }));
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.method === "Runtime.consoleAPICalled") {
      const args = data.params.args.map(arg => arg.value || arg.description || JSON.stringify(arg)).join(" ");
      console.log(`[Console ${data.params.type}] ${args}`);
    } else if (data.method === "Runtime.exceptionThrown") {
      console.error("Exception thrown:", data.params.exceptionDetails);
    } else if (data.method === "Network.requestWillBeSent") {
      console.log(`[Request] ${data.params.request.method} ${data.params.request.url}`);
    } else if (data.method === "Network.loadingFailed") {
      console.error(`[Network Fail] ID: ${data.params.requestId} Error: ${data.params.errorText}`);
    } else if (data.method === "Network.responseReceived") {
      const res = data.params.response;
      console.log(`[Response] Status ${res.status} URL: ${res.url}`);
    }
  };
}).catch(console.error);

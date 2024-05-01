const express = require("express");
const { io } = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const { ProxyAgent } = require("proxy-agent");
const agent = new ProxyAgent();

const app = express();
const port = process.env.PORT || 8081;

var opts = {
	agent: agent,
	auth: {
		jwt: "anonymous-ask-user",
	},
	reconnection: true,
	reconnectionDelay: 500,
	reconnectionDelayMax: 5000,
	reconnectionAttempts: 999,
	transports: ["websocket"],
	path: "/socket.io",
	hostname: "www.perplexity.ai",
	secure: true,
	port: "443",
	extraHeaders: {
		Cookie: process.env.PPLX_COOKIE,
		"User-Agent": process.env.USER_AGENT,
		Accept: "*/*",
		priority: "u=1, i",
		Referer: "https://www.perplexity.ai/",
	},
};

app.post("/v1/messages", (req, res) => {
	req.rawBody = "";
	req.setEncoding("utf8");

	req.on("data", function (chunk) {
		req.rawBody += chunk;
	});

	req.on("end", async () => {
		res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
		try {
			let jsonBody = JSON.parse(req.rawBody);
			if (jsonBody.stream == false) {
				res.send(
					JSON.stringify({
						id: uuidv4(),
						content: [
							{
								text: "Please turn on streaming.",
							},
							{
								id: "string",
								name: "string",
								input: {},
							},
						],
						model: "string",
						stop_reason: "end_turn",
						stop_sequence: "string",
						usage: {
							input_tokens: 0,
							output_tokens: 0,
						},
					})
				);
			} else if (jsonBody.stream == true) {
				// 计算用户消息长度
				let userMessage = [{ question: "", answer: "" }];
				let userQuery = "";
				let lastUpdate = true;
				if (jsonBody.system) {
					// 把系统消息加入messages的首条
					jsonBody.messages.unshift({ role: "system", content: jsonBody.system });
				}
				console.log(jsonBody.messages);
				jsonBody.messages.forEach((msg) => {
					if (msg.role == "system" || msg.role == "user") {
						if (lastUpdate) {
							userMessage[userMessage.length - 1].question += msg.content + "\n";
						} else if (userMessage[userMessage.length - 1].question == "") {
							userMessage[userMessage.length - 1].question += msg.content + "\n";
						} else {
							userMessage.push({ question: msg.content + "\n", answer: "" });
						}
						lastUpdate = true;
					} else if (msg.role == "assistant") {
						if (!lastUpdate) {
							userMessage[userMessage.length - 1].answer += msg.content + "\n";
						} else if (userMessage[userMessage.length - 1].answer == "") {
							userMessage[userMessage.length - 1].answer += msg.content + "\n";
						} else {
							userMessage.push({ question: "", answer: msg.content + "\n" });
						}
						lastUpdate = false;
					}
				});
                // user message to plaintext
                let previousMessages = jsonBody.messages
                    .map((msg) => {
                        return msg.content
                    })
                    .join("\n\n");

                let msgid = uuidv4();
				// send message start
				res.write(
					createEvent("message_start", {
						type: "message_start",
						message: {
							id: msgid,
							type: "message",
							role: "assistant",
							content: [],
							model: "claude-3-opus-20240229",
							stop_reason: null,
							stop_sequence: null,
							usage: { input_tokens: 8, output_tokens: 1 },
						},
					})
				);
				res.write(createEvent("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }));
				res.write(createEvent("ping", { type: "ping" }));

				// proxy response
                var socket = io("wss://www.perplexity.ai/", opts);

                socket.on("connect", function () {
                    console.log(" > [Connected]");
                    socket
                        .emitWithAck("perplexity_ask", previousMessages, {
                            "version": "2.9",
                            "source": "default",
                            "attachments": [],
                            "language": "en-GB",
                            "timezone": "Europe/London",
                            "search_focus": "writing",
                            "frontend_uuid": uuidv4(),
                            "mode": "concise",
                            "is_related_query": false,
                            "is_default_related_query": false,
                            "visitor_id": uuidv4(),
                            "frontend_context_uuid": uuidv4(),
                            "prompt_source": "user",
                            "query_source": "home"
                        })
                        .then((response) => {
                            
                            console.log(response);
                            res.write(createEvent("content_block_stop", { type: "content_block_stop", index: 0 }));
                            res.write(
                                createEvent("message_delta", {
                                    type: "message_delta",
                                    delta: { stop_reason: "end_turn", stop_sequence: null },
                                    usage: { output_tokens: 12 },
                                })
                            );
                            res.write(createEvent("message_stop", { type: "message_stop" }));

                            res.end();
                        });
                });
                socket.onAny((event, ...args) => {
                    console.log(`got ${event}`);
                });
                socket.on("query_progress", (data) => {
                    if(data.text){
                        var text = JSON.parse(data.text)
                        var chunk = text.chunks[text.chunks.length - 1];
                        if(chunk){
                            chunkJSON = JSON.stringify({
                                type: "content_block_delta",
                                index: 0,
                                delta: { type: "text_delta", text: chunk },
                            });
                            res.write(createEvent("content_block_delta", chunkJSON));
                        }
                    }
                });
                socket.on("disconnect", function () {
                    console.log(" > [Disconnected]");
                });
                socket.on("error", (error) => {
                    console.log(error);
                });
                socket.on("connect_error", function (error) {
                    if (error.description && error.description == 403) {
                        console.log(" > [Error] 403 Forbidden");
                    }
                    console.log(error);
                });
				
			} else {
				throw new Error("Invalid request");
			}
		} catch (e) {
			console.log(e);
			res.write(JSON.stringify({ error: e.message }));
			res.end();
			return;
		}
	});
});

// handle other
app.use((req, res, next) => {
	res.status(404).send("Not Found");
});

app.listen(port, () => {
	console.log(`Perplexity proxy listening on port ${port}`);
});

// eventStream util
function createEvent(event, data) {
	// if data is object, stringify it
	if (typeof data === "object") {
		data = JSON.stringify(data);
	}
	return `event: ${event}\ndata: ${data}\n\n`;
}

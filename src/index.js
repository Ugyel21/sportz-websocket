import AgentAPI from "apminsight";
AgentAPI.config();

import express from 'express';
import http from 'http';
import { matchRouter } from "./routes/matches.js";
import {attachWebSocketServer} from "./ws/server.js";
import {securityMiddleware} from "./arcjet.js";
import {commentaryRouter} from "./routes/commentary.js";

const app = express();
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
const server = http.createServer(app);

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

//app.use(securityMiddleware());

app.use('/matches', matchRouter);
app.use('/matches/:id/commentary', commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
    const protocol = process.env.PUBLIC_PROTOCOL ?? 'http';
    const hostLabel = HOST === '0.0.0.0' ? 'localhost' : HOST;
    const baseUrl = `${protocol}://${hostLabel}:${PORT}`;
    console.log(`Server is running on ${ baseUrl }`);
    console.log(`WebSocket Server is running on ${ baseUrl.replace('http', 'ws')}/ws`);
})
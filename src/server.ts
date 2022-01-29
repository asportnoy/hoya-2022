import express from 'express';
import http from 'http';
import {WebSocketServer, WebSocket, RawData} from 'ws';
import {Session} from './session';

const app = express();
const server = http.createServer(app);
server.listen(process.env.PORT || 8000, () => {
	console.log('Server started');
});

app.use(express.static(`${__dirname}/../static`));

const wsServer = new WebSocketServer({server, path: '/'});

wsServer.on('connection', socket => {
	new Session(socket);
});

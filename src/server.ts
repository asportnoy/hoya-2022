import express from 'express';
import http from 'http';
import {WebSocketServer, WebSocket, RawData} from 'ws';
import {Session} from './session';

const app = express();
const server = http.createServer(app);
server.listen(process.env.PORT || 8000, () => {
	console.log('Server started');
});

app.use((req, res, next) => {
	if (
		process.env.NODE_ENV === 'production' &&
		req.headers['x-forwarded-proto'] !== 'https'
	) {
		res.redirect(`https://${req.headers.host}${req.url}`);
		return;
	}

	next();
});

app.use(express.static(`${__dirname}/../static`));

const wsServer = new WebSocketServer({server, path: '/'});

wsServer.on('connection', socket => {
	new Session(socket);
});

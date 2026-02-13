// Generado automaticamente por Compiler.js
import net from 'node:net';

class ClientConnector {
    constructor() {
        this.socket = null;
        this.host = 'localhost';
        this.port = 8080;
        this.buffer = '';
        this.connected = false;
        this.connecting = null;
        this.pending = new Map();
        this.nextRequestId = 1;
        this.connect();
    }

    connect() {
        if (this.connected) {
            return Promise.resolve();
        }
        if (this.connecting) {
            return this.connecting;
        }

        console.log(`Socket conectando a ${this.host}:${this.port}...`);

        this.connecting = new Promise((resolve, reject) => {
            const socket = net.createConnection({ host: this.host, port: this.port });
            this.socket = socket;
            socket.setEncoding('utf8');
            const onError = (error) => {
                this.connecting = null;
                this.socket = null;
                this.connected = false;
                reject(error);
            };

            socket.once('error', onError);
            socket.once('connect', () => {
                socket.removeListener('error', onError);
                this.connected = true;
                this.connecting = null;
                console.log('Conectado al dispatcher');
                resolve();
            });

            socket.on('data', (chunk) => this.handleData(chunk));
            socket.on('close', () => this.handleClose());
            socket.on('error', (error) => this.handleSocketError(error));
        });

        return this.connecting;
    }

    handleData(chunk) {
        this.buffer += chunk;
        let newlineIndex = this.buffer.indexOf('\n');

        while (newlineIndex !== -1) {
            const line = this.buffer.slice(0, newlineIndex).trim();
            this.buffer = this.buffer.slice(newlineIndex + 1);

            if (line) {
                this.handleResponse(line);
            }
            newlineIndex = this.buffer.indexOf('\n');
        }
    }

    handleResponse(line) {
        let response;
        try {
            response = this.deserialize(line);
        } catch (error) {
            console.error('Respuesta invalida del servidor:', error.message);
            return;
        }

        const requestId = response.requestId;
        const pending = this.pending.get(requestId);
        if (!pending) {
            return;
        }

        this.pending.delete(requestId);
        if (response.status === 'ok') {
            pending.resolve(response.data ?? response.response);
            return;
        }
        pending.reject(new Error(response.msg || 'Error RPC'));
    }

    handleClose() {
        this.connected = false;
        this.connecting = null;
        this.socket = null;
        this.buffer = '';
        this.rejectAllPending(new Error('Conexion cerrada por el servidor'));
        console.log('Desconectado del dispatcher');
    }

    handleSocketError(error) {
        if (!this.connected) {
            return;
        }
        this.rejectAllPending(new Error('Error de socket: ' + error.message));
    }

    rejectAllPending(error) {
        for (const [, pending] of this.pending) {
            pending.reject(error);
        }
        this.pending.clear();
    }

    disconnect() {
        if (!this.socket) {
            return;
        }
        this.socket.end();
        this.socket.destroy();
        this.socket = null;
        this.connected = false;
        this.connecting = null;
        this.buffer = '';
    }

    serialize(data) {
        return JSON.stringify(data);
    }

    deserialize(data) {
        return JSON.parse(data);
    }

    async send(request) {
        if (this.connecting) {
            await this.connecting;
        }

        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                reject(new Error('ClientConnector no conectado.'));
                return;
            }

            const requestId = this.nextRequestId++;
            this.pending.set(requestId, { resolve, reject });

            const payloadString = this.serialize({
                ...request,
                requestId
            }) + '\n';

            this.socket.write(payloadString, (error) => {
                if (!error) {
                    return;
                }
                this.pending.delete(requestId);
                reject(new Error('No se pudo enviar request: ' + error.message));
            });
        });
    }
}

export default ClientConnector;

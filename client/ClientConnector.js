// Generado automaticamente por Compiler.js
import net from 'node:net';

class ClientConnector {
    constructor() {
        this.socket = null;
        this.port = 8080;
        this.connected = false;
        this.connecting = null;
        this.connect();
    }

    connect() {
        if (this.connected) {
            return Promise.resolve();
        }
        if (this.connecting) {
            return this.connecting;
        }

        console.log(`Socket conectando al puerto ${this.port}...`);

        this.connecting = new Promise((resolve, reject) => {
            const socket = net.createConnection({ port: this.port });
            this.socket = socket;

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
                // console.log('Conectado al dispatcher');
                resolve();
            });

            socket.on('close', () => this.handleClose());

            socket.on('error', (error) => this.handleSocketError(error));
        });

        return this.connecting;
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

        if (!this.socket || !this.connected) {
            throw new Error('ClientConnector no conectado.');
        }

        const payloadString = this.serialize(request) + '\n';

        await new Promise((resolve, reject) => {
            this.socket.write(payloadString, (error) => {
                if (error) {
                    reject(new Error('No se pudo enviar request: ' + error.message));
                    return;
                }
                resolve();
            });
        });

        const response = await this.readResponseLine();
        if (response.status === 'ok') {
            return response.data ?? response.response;
        }
        throw new Error(response.msg || 'Error RPC');
    }

    handleClose() {
        this.connected = false;
        this.connecting = null;
        this.socket = null;
        console.log('Desconectado del dispatcher');
    }

    handleSocketError(error) {
        if (!this.connected) {
            return;
        }
        console.error('Error de socket:', error.message);
    }

    readResponseLine() {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('ClientConnector no conectado.'));
                return;
            }

            let buffer = '';

            const cleanup = () => {
                this.socket.removeListener('data', onData);
                this.socket.removeListener('error', onError);
                this.socket.removeListener('close', onClose);
            };

            const onError = (error) => {
                cleanup();
                reject(new Error('Error de socket: ' + error.message));
            };

            const onClose = () => {
                cleanup();
                reject(new Error('Conexion cerrada por el servidor'));
            };

            const onData = (chunk) => {
                buffer += chunk;
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    return;
                }

                cleanup();
                const line = buffer.slice(0, newlineIndex).trim();
                if (!line) {
                    reject(new Error('Respuesta vacia del servidor'));
                    return;
                }

                try {
                    resolve(this.deserialize(line));
                } catch (error) {
                    reject(new Error('Respuesta invalida del servidor: ' + error.message));
                }
            };

            this.socket.on('data', onData);

            this.socket.once('error', onError);

            this.socket.once('close', onClose);
        });
    }
}

export default ClientConnector;

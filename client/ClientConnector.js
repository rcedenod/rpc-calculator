// Generado automaticamente por Compiler.js
import { io } from 'socket.io-client';

class ClientConnector {
    constructor() {
        this.socket = null;
        this.defaultUrl = 'http://localhost:8080';
    }

    connect(url) {
        if (this.socket) return;

        const finalUrl = url || this.defaultUrl;
        console.log(`Conectando a ${finalUrl}...`);
        this.socket = io(finalUrl);

        this.socket.on('connect', () => console.log('Conectado al dispatcher'));
        this.socket.on('disconnect', () => console.log('Desconectado'));
        this.socket.on('connect_error', (err) => console.error('Error conexion:', err.message));
    }

    serialize(data) {
        return JSON.stringify(data);
    }

    deserialize(data) {
        return JSON.parse(data);
    }

    send(request) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error("ClientConnector no inicializado."));
            }

            const payloadString = this.serialize(request);

            this.socket.emit('rpc_call', payloadString, (responseString) => {
                try {
                    const response = this.deserialize(responseString);

                    if (response.status === 'ok') {
                        resolve(response.data ?? response.response);
                    } else {
                        reject(new Error(response.msg));
                    }
                } catch (e) {
                    reject(new Error("Error de deserializacion en el cliente: " + e.message));
                }
            });
        });
    }
}

const clientConnector = new ClientConnector();

export default clientConnector;

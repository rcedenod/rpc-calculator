const io = require('socket.io-client');

class ClientConnector {
    constructor() {
        this.socket = null;
    }

    connect(url) {
        if (this.socket) return; 
        
        console.log(`Conectando a ${url}...`);
        this.socket = io(url);

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
                        resolve(response.data);
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

module.exports = new ClientConnector();
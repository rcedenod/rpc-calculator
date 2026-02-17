const net = require('node:net');
const fs = require('fs');
const path = require('path');

class Dispatcher {
    constructor(port) {
        this.port = port;
        this.server = net.createServer((socket) => this.handleConnection(socket));

        this.server.listen(this.port, () => {
            console.log(`Servidor escuchando en el puerto ${this.port}`);
        });

        this.setupDispatcher();
    }

    serialize(data) { 
        return JSON.stringify(data); 
    }

    deserialize(data) { 
        return (typeof data === 'string') ? JSON.parse(data) : data; 
    }

    setupDispatcher() {
        this.server.on('error', (error) => {
            console.error('Error en servidor TCP:', error.message);
        });
    }

    handleConnection(socket) {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`Cliente conectado: ${clientId}`);

        let buffer = '';

        socket.on('data', (chunk) => {
            buffer += chunk;
            let newlineIndex = buffer.indexOf('\n');

            while (newlineIndex !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);

                if (line) {
                    this.handleRpc(socket, line);
                }
                newlineIndex = buffer.indexOf('\n');
            }
        });

        socket.on('close', () => {
            console.log(`Cliente desconectado: ${clientId}`);
        });

        socket.on('error', (error) => {
            console.error(`Error en cliente ${clientId}:`, error.message);
        });
    }

    async handleRpc(socket, messageJson) {
        try {
            const payload = this.deserialize(messageJson);
            console.log(`Ejecutando: ${payload.class}.${payload.method}(${(payload.params || []).join(', ')})`);

            const result = await this.executeMethod(payload);
            this.sendResponse(socket, { status: 'ok', response: result });
        } catch (error) {
            console.error("Error:", error.message);
            this.sendResponse(socket, { status: 'error', msg: error.message });
        }
    }

    sendResponse(socket, data) {
        const response = `${this.serialize(data)}\n`;
        socket.write(response);
    }

    async executeMethod(payload) {
        const { method, params = [] } = payload;
        const className = payload.class;
        const classPath = path.join(__dirname, `${className}.js`);

        if (!fs.existsSync(classPath)) throw new Error("Clase no encontrada");
        
        const ServiceClass = require(classPath);
        const instance = new ServiceClass();
        
        if (typeof instance[method] !== 'function') { 
            throw new Error("Método no existe") 
        };
        
        return await instance[method](...params);
    }
}

new Dispatcher(8080);

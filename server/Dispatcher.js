const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

class Dispatcher {
    constructor(port) {
        this.port = port;
        
        this.io = new Server(this.port, {
            cors: { origin: "*" }
        });

        console.log(`Servidor escuchando en el puerto ${this.port}`);

        this.setupDispatcher();
    }

    serialize(data) { return JSON.stringify(data); }
    deserialize(data) { return (typeof data === 'string') ? JSON.parse(data) : data; }

    setupDispatcher() {
        this.io.on('connection', (socket) => {
            console.log(`Cliente conectado: ${socket.id}`);

            socket.on('rpc_call', async (messageJson, callback) => {
                try {
                    const payload = this.deserialize(messageJson);
                    console.log(`Ejecutando: ${payload.method}`);

                    const result = await this.executeMethod(payload);
                    
                    callback(this.serialize({ status: 'ok', response: result }));
                } catch (error) {
                    console.error("Error:", error.message);
                    callback(this.serialize({ status: 'error', msg: error.message }));
                }
            });
        });
    }

    async executeMethod(payload) {
        const { method, params } = payload;
        const className = payload.class || 'Calculator';
        const classPath = path.join(__dirname, `${className}.js`);

        if (!fs.existsSync(classPath)) throw new Error("Clase no encontrada");
        
        const ServiceClass = require(classPath);
        const instance = new ServiceClass();
        
        if (typeof instance[method] !== 'function') throw new Error("Método no existe");
        
        return await instance[method](...params);
    }
}

new Dispatcher(8080);
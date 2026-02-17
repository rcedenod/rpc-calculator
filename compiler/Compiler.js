const fs = require('fs');

class Compiler {
    constructor(filePath) {
        this.filePath = filePath;
        this.config = {
            port: 3000,
            className: '',
            methods: [],
            params: {}
        };
    }

    parse() {
        try {
            const content = fs.readFileSync(this.filePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                // 1. LEER PUERTO (opcional para compatibilidad)
                if (trimmedLine.startsWith('@port:')) {
                    const val = trimmedLine.split(':')[1].trim();
                    this.config.port = parseInt(val);
                } 
                // 2. LEER CLASE
                else if (trimmedLine.startsWith('@class:')) {
                    this.config.className = trimmedLine.split(':')[1].trim();
                } 
                // 3. LEER METODOS
                else if (trimmedLine.startsWith('@method:')) {
                    const parts = trimmedLine.substring(8).trim();
                    const methodName = parts.split('(')[0];
                    const paramStruct = parts.split('(')[1].replace(')', '');
                    this.config.methods.push({ name: methodName, struct: paramStruct });
                } 
                // 4. LEER PARAMETROS
                else if (trimmedLine.startsWith('@') && trimmedLine.includes('=')) {
                    const parts = trimmedLine.split('=');
                    const structName = parts[0].trim().substring(1);
                    const paramsContent = parts[1].trim().replace('[', '').replace(']', '');
                    this.config.params[structName] = paramsContent.split(',').map(p => p.trim());
                }
            });

            console.log(`Clase: ${this.config.className} `);
            console.log(`Puerto: ${this.config.port}\n`);
            
            this.generateServerStub();
            this.generateClientConnector();
            this.generateClientProxy();

        } catch (error) {
            console.error("Error de compilacion:", error.message);
        }
    }

    generateServerStub() {
        const className = this.config.className;
        let content = `// Generado automaticamente por Compiler.js\n`;
        content += `class ${className} {\n`;
        content += `    constructor() {}\n\n`;

        this.config.methods.forEach(method => {
            const paramsList = this.config.params[method.struct].join(', ');
            content += `    ${method.name}(${paramsList}) {\n`;
            content += `        throw new Error("Metodo '${method.name}' no implementado");\n`;
            content += `    }\n`;
        });
        content += `}\nmodule.exports = ${className};`;

        fs.writeFileSync(`../server/${className}.js`, content);
        console.log(`Stubs de servidor generados: ${className}.js`);
    }

    generateClientProxy() {
        const className = this.config.className;
        const proxyName = `${className}Proxy`;
        
        let content = `// Generado automaticamente por Compiler.js\n`;
        content += `import ClientConnector from './ClientConnector.js';\n\n`;
        content += `class ${proxyName} {\n`;
        content += `    constructor() {\n`;
        content += `        this.connector = new ClientConnector();\n`;
        content += `    }\n\n`;

        this.config.methods.forEach(method => {
            const paramsList = this.config.params[method.struct].join(', ');
            content += `    async ${method.name}(${paramsList}) {\n`;
            content += `        return await this.connector.send({\n`;
            content += `            class: '${className}',\n`;
            content += `            method: '${method.name}',\n`;
            content += `            params: [${paramsList}]\n`;
            content += `        });\n`;
            content += `    }\n`;
        });

        content += `\n`;
        content += `    disconnect() {\n`;
        content += `        this.connector.disconnect();\n`;
        content += `    }\n`;
        content += `}\n`;
        content += `export default ${proxyName};\n`;

        fs.writeFileSync(`../client/${proxyName}.js`, content);
        console.log(`Stubs de cliente generados: ${proxyName}.js`);
    }

    generateClientConnector() {
        const port = this.config.port;

        const content = `// Generado automaticamente por Compiler.js
import net from 'node:net';

class ClientConnector {
    constructor() {
        this.socket = null;
        this.port = ${port};
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

        console.log(\`Socket conectando al puerto \${this.port}...\`);

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

        const payloadString = this.serialize(request) + '\\n';

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
                const newlineIndex = buffer.indexOf('\\n');
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
`;

        fs.writeFileSync(`../client/ClientConnector.js`, content);
        console.log(`Stubs de cliente generados: ClientConnector.js`);
    }
}

const compiler = new Compiler('./proto.txt');
compiler.parse();

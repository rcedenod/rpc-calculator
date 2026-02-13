const fs = require('fs');
const path = require('path');

class Compiler {
    constructor(filePath, configPath = path.join(__dirname, 'config.json')) {
        this.filePath = filePath;
        this.configPath = configPath;
        this.config = {
            host: 'localhost',
            port: 8080,
            className: '',
            methods: [],
            params: {}
        };
    }

    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            console.warn("Config no encontrada, usando valores por defecto.");
            return;
        }

        let raw = '';
        try {
            raw = fs.readFileSync(this.configPath, 'utf-8');
        } catch (error) {
            throw new Error(`No se pudo leer config: ${error.message}`);
        }

        let json = {};
        try {
            json = JSON.parse(raw);
        } catch (error) {
            throw new Error(`Config JSON invalida: ${error.message}`);
        }

        if (json.host || json.url) {
            this.config.host = String(json.host || json.url).trim();
        }

        if (json.port !== undefined && json.port !== null) {
            const parsed = parseInt(json.port, 10);
            if (Number.isNaN(parsed)) {
                throw new Error("Port invalido en config");
            }
            this.config.port = parsed;
        }
    }

    parse() {
        try {
            this.loadConfig();
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
            console.log(`Host: ${this.config.host}`);
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
        const host = this.config.host;
        const port = this.config.port;

        let content = `// Generado automaticamente por Compiler.js\n`;
        content += `import net from 'node:net';\n\n`;
        content += `class ClientConnector {\n`;
        content += `    constructor() {\n`;
        content += `        this.socket = null;\n`;
        content += `        this.host = '${host}';\n`;
        content += `        this.port = ${port};\n`;
        content += `        this.buffer = '';\n`;
        content += `        this.connected = false;\n`;
        content += `        this.connecting = null;\n`;
        content += `        this.pending = new Map();\n`;
        content += `        this.nextRequestId = 1;\n`;
        content += `        this.connect();\n`;
        content += `    }\n\n`;
        content += `    connect() {\n`;
        content += `        if (this.connected) {\n`;
        content += `            return Promise.resolve();\n`;
        content += `        }\n`;
        content += `        if (this.connecting) {\n`;
        content += `            return this.connecting;\n`;
        content += `        }\n\n`;
        content += `        console.log(\`Socket conectando a \${this.host}:\${this.port}...\`);\n\n`;
        content += `        this.connecting = new Promise((resolve, reject) => {\n`;
        content += `            const socket = net.createConnection({ host: this.host, port: this.port });\n`;
        content += `            this.socket = socket;\n`;
        content += `            socket.setEncoding('utf8');\n`;
        content += `            const onError = (error) => {\n`;
        content += `                this.connecting = null;\n`;
        content += `                this.socket = null;\n`;
        content += `                this.connected = false;\n`;
        content += `                reject(error);\n`;
        content += `            };\n\n`;
        content += `            socket.once('error', onError);\n`;
        content += `            socket.once('connect', () => {\n`;
        content += `                socket.removeListener('error', onError);\n`;
        content += `                this.connected = true;\n`;
        content += `                this.connecting = null;\n`;
        content += `                console.log('Conectado al dispatcher');\n`;
        content += `                resolve();\n`;
        content += `            });\n\n`;
        content += `            socket.on('data', (chunk) => this.handleData(chunk));\n`;
        content += `            socket.on('close', () => this.handleClose());\n`;
        content += `            socket.on('error', (error) => this.handleSocketError(error));\n`;
        content += `        });\n\n`;
        content += `        return this.connecting;\n`;
        content += `    }\n\n`;
        content += `    handleData(chunk) {\n`;
        content += `        this.buffer += chunk;\n`;
        content += `        let newlineIndex = this.buffer.indexOf('\\n');\n`;
        content += `\n`;
        content += `        while (newlineIndex !== -1) {\n`;
        content += `            const line = this.buffer.slice(0, newlineIndex).trim();\n`;
        content += `            this.buffer = this.buffer.slice(newlineIndex + 1);\n`;
        content += `\n`;
        content += `            if (line) {\n`;
        content += `                this.handleResponse(line);\n`;
        content += `            }\n`;
        content += `            newlineIndex = this.buffer.indexOf('\\n');\n`;
        content += `        }\n`;
        content += `    }\n\n`;
        content += `    handleResponse(line) {\n`;
        content += `        let response;\n`;
        content += `        try {\n`;
        content += `            response = this.deserialize(line);\n`;
        content += `        } catch (error) {\n`;
        content += `            console.error('Respuesta invalida del servidor:', error.message);\n`;
        content += `            return;\n`;
        content += `        }\n\n`;
        content += `        const requestId = response.requestId;\n`;
        content += `        const pending = this.pending.get(requestId);\n`;
        content += `        if (!pending) {\n`;
        content += `            return;\n`;
        content += `        }\n\n`;
        content += `        this.pending.delete(requestId);\n`;
        content += `        if (response.status === 'ok') {\n`;
        content += `            pending.resolve(response.data ?? response.response);\n`;
        content += `            return;\n`;
        content += `        }\n`;
        content += `        pending.reject(new Error(response.msg || 'Error RPC'));\n`;
        content += `    }\n\n`;
        content += `    handleClose() {\n`;
        content += `        this.connected = false;\n`;
        content += `        this.connecting = null;\n`;
        content += `        this.socket = null;\n`;
        content += `        this.buffer = '';\n`;
        content += `        this.rejectAllPending(new Error('Conexion cerrada por el servidor'));\n`;
        content += `        console.log('Desconectado del dispatcher');\n`;
        content += `    }\n\n`;
        content += `    handleSocketError(error) {\n`;
        content += `        if (!this.connected) {\n`;
        content += `            return;\n`;
        content += `        }\n`;
        content += `        this.rejectAllPending(new Error('Error de socket: ' + error.message));\n`;
        content += `    }\n\n`;
        content += `    rejectAllPending(error) {\n`;
        content += `        for (const [, pending] of this.pending) {\n`;
        content += `            pending.reject(error);\n`;
        content += `        }\n`;
        content += `        this.pending.clear();\n`;
        content += `    }\n\n`;
        content += `    disconnect() {\n`;
        content += `        if (!this.socket) {\n`;
        content += `            return;\n`;
        content += `        }\n`;
        content += `        this.socket.end();\n`;
        content += `        this.socket.destroy();\n`;
        content += `        this.socket = null;\n`;
        content += `        this.connected = false;\n`;
        content += `        this.connecting = null;\n`;
        content += `        this.buffer = '';\n`;
        content += `    }\n\n`;
        content += `    serialize(data) {\n`;
        content += `        return JSON.stringify(data);\n`;
        content += `    }\n\n`;
        content += `    deserialize(data) {\n`;
        content += `        return JSON.parse(data);\n`;
        content += `    }\n\n`;
        content += `    async send(request) {\n`;
        content += `        if (this.connecting) {\n`;
        content += `            await this.connecting;\n`;
        content += `        }\n\n`;
        content += `        return new Promise((resolve, reject) => {\n`;
            content += `            if (!this.socket || !this.connected) {\n`;
                content += `                reject(new Error('ClientConnector no conectado.'));\n`;
        content += `                return;\n`;
        content += `            }\n\n`;
        content += `            const requestId = this.nextRequestId++;\n`;
        content += `            this.pending.set(requestId, { resolve, reject });\n\n`;
        content += `            const payloadString = this.serialize({\n`;
        content += `                ...request,\n`;
        content += `                requestId\n`;
        content += `            }) + '\\n';\n\n`;
        content += `            this.socket.write(payloadString, (error) => {\n`;
        content += `                if (!error) {\n`;
        content += `                    return;\n`;
        content += `                }\n`;
        content += `                this.pending.delete(requestId);\n`;
        content += `                reject(new Error('No se pudo enviar request: ' + error.message));\n`;
        content += `            });\n`;
        content += `        });\n`;
        content += `    }\n`;
        content += `}\n\n`;
        content += `export default ClientConnector;\n`;

        fs.writeFileSync(`../client/ClientConnector.js`, content);
        console.log(`Stubs de cliente generados: ClientConnector.js`);
    }
}

const compiler = new Compiler('./calculator.txt');
compiler.parse();

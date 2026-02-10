const fs = require('fs');
const path = require('path');

class Compiler {
    constructor(filePath, configPath = path.join(__dirname, 'config.json')) {
        this.filePath = filePath;
        this.configPath = configPath;
        this.config = {
            port: 8080,
            host: 'localhost',
            protocol: 'http',
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

        if (json.protocol) {
            this.config.protocol = String(json.protocol).trim();
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
                if (!trimmedLine || trimmedLine.startsWith('//')) return;

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
        
        const fullUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
        
        let content = `// Generado automaticamente por Compiler.js\n`;
        content += `const clientConnector = require('./ClientConnector');\n\n`;
        content += `class ${proxyName} {\n\n`;

        content += `    static init() {\n`;
        content += `        clientConnector.connect();\n`;
        content += `    }\n\n`;

        this.config.methods.forEach(method => {
            const paramsList = this.config.params[method.struct].join(', ');
            content += `    static async ${method.name}(${paramsList}) {\n`;
            content += `        return await clientConnector.send({\n`;
            content += `            class: '${className}',\n`;
            content += `            method: '${method.name}',\n`;
            content += `            params: [${paramsList}]\n`;
            content += `        });\n`;
            content += `    }\n`;
        });

        content += `}\n\n`;
        content += `${proxyName}.init();\n`;
        content += `module.exports = ${proxyName};`;

        fs.writeFileSync(`../client/${proxyName}.js`, content);
        console.log(`Stubs de cliente generados: ${proxyName}.js`);
    }

    generateClientConnector() {
        const fullUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;

        let content = `// Generado automaticamente por Compiler.js\n`;
        content += `const io = require('socket.io-client');\n\n`;
        content += `class ClientConnector {\n`;
        content += `    constructor() {\n`;
        content += `        this.socket = null;\n`;
        content += `        this.defaultUrl = '${fullUrl}';\n`;
        content += `    }\n\n`;
        content += `    connect(url) {\n`;
        content += `        if (this.socket) return;\n\n`;
        content += `        const finalUrl = url || this.defaultUrl;\n`;
        content += `        console.log(\`Conectando a \${finalUrl}...\`);\n`;
        content += `        this.socket = io(finalUrl);\n\n`;
        content += `        this.socket.on('connect', () => console.log('Conectado al dispatcher'));\n`;
        content += `        this.socket.on('disconnect', () => console.log('Desconectado'));\n`;
        content += `        this.socket.on('connect_error', (err) => console.error('Error conexion:', err.message));\n`;
        content += `    }\n\n`;
        content += `    serialize(data) {\n`;
        content += `        return JSON.stringify(data);\n`;
        content += `    }\n\n`;
        content += `    deserialize(data) {\n`;
        content += `        return JSON.parse(data);\n`;
        content += `    }\n\n`;
        content += `    send(request) {\n`;
        content += `        return new Promise((resolve, reject) => {\n`;
        content += `            if (!this.socket) {\n`;
        content += `                return reject(new Error("ClientConnector no inicializado."));\n`;
        content += `            }\n\n`;
        content += `            const payloadString = this.serialize(request);\n\n`;
        content += `            this.socket.emit('rpc_call', payloadString, (responseString) => {\n`;
        content += `                try {\n`;
        content += `                    const response = this.deserialize(responseString);\n\n`;
        content += `                    if (response.status === 'ok') {\n`;
        content += `                        resolve(response.data);\n`;
        content += `                    } else {\n`;
        content += `                        reject(new Error(response.msg));\n`;
        content += `                    }\n`;
        content += `                } catch (e) {\n`;
        content += `                    reject(new Error("Error de deserializacion en el cliente: " + e.message));\n`;
        content += `                }\n`;
        content += `            });\n`;
        content += `        });\n`;
        content += `    }\n`;
        content += `}\n\n`;
        content += `module.exports = new ClientConnector();\n`;

        fs.writeFileSync(`../client/ClientConnector.js`, content);
        console.log(`Stubs de cliente generados: ClientConnector.js`);
    }
}

const compiler = new Compiler('./calculator.txt');
compiler.parse();

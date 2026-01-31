const fs = require('fs');

class Compiler {
    constructor(filePath) {
        this.filePath = filePath;
        this.config = {
            port: null,
            host: 'localhost',
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
                if (!trimmedLine || trimmedLine.startsWith('//')) return;

                // 1. LEER PUERTO
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

            if (!this.config.port) {
                throw new Error("Error: No se definio @port en el .txt");
            }

            console.log(`Clase ${this.config.className} `);
            console.log(`Puerto ${this.config.port}`);
            
            this.generateServerStub();
            this.generateClientProxy();

        } catch (error) {
            console.error("Error de compilacion:", error.message);
        }
    }

    generateServerStub() {
        const className = this.config.className;
        let content = `// Generado automáticamente por Compiler.js\n`;
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
        
        const fullUrl = `http://${this.config.host}:${this.config.port}`;
        
        let content = `// Archivo generado automaticamente por Compiler.js\n`;
        content += `const clientConnector = require('./ClientConnector');\n\n`;
        content += `class ${proxyName} {\n\n`;

        content += `    static init() {\n`;
        content += `        clientConnector.connect('${fullUrl}');\n`;
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
}

const compiler = new Compiler('./calculator.txt');
compiler.parse();
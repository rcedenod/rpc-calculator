// Archivo generado automaticamente por Compiler.js
const clientConnector = require('./ClientConnector');

class CalculatorProxy {

    static init() {
        clientConnector.connect('http://localhost:8080');
    }

    static async add(x, y) {
        return await clientConnector.send({
            class: 'Calculator',
            method: 'add',
            params: [x, y]
        });
    }
    static async subtract(x, y) {
        return await clientConnector.send({
            class: 'Calculator',
            method: 'subtract',
            params: [x, y]
        });
    }
    static async multiply(x, y) {
        return await clientConnector.send({
            class: 'Calculator',
            method: 'multiply',
            params: [x, y]
        });
    }
    static async divide(x, y) {
        return await clientConnector.send({
            class: 'Calculator',
            method: 'divide',
            params: [x, y]
        });
    }
}

CalculatorProxy.init();
module.exports = CalculatorProxy;
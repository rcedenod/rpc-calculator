// Generado automaticamente por Compiler.js
import ClientConnector from './ClientConnector.js';

class CalculatorProxy {
    constructor() {
        this.connector = new ClientConnector();
    }

    async add(x, y) {
        return await this.connector.send({
            class: 'Calculator',
            method: 'add',
            params: [x, y]
        });
    }
    async subtract(x, y) {
        return await this.connector.send({
            class: 'Calculator',
            method: 'subtract',
            params: [x, y]
        });
    }
    async multiply(x, y) {
        return await this.connector.send({
            class: 'Calculator',
            method: 'multiply',
            params: [x, y]
        });
    }
    async divide(x, y) {
        return await this.connector.send({
            class: 'Calculator',
            method: 'divide',
            params: [x, y]
        });
    }

    disconnect() {
        this.connector.disconnect();
    }
}
export default CalculatorProxy;

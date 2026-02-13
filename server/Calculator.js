// Generado automaticamente por Compiler.js
class Calculator {
    constructor() {}

    add(x, y) {
        return x + y;
    }
    subtract(x, y) {
        return x - y;
    }
    multiply(x, y) {
        return x * y;
    }
    divide(x, y) {
        if (y === 0) {
            throw new Error('Division por cero no permitida');
        }
        return x / y;
    }
}
module.exports = Calculator;

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import CalculatorProxy from './CalculatorProxy.js';

const rl = readline.createInterface({ input, output });
const calculator = new CalculatorProxy();

const operations = {
    '1': { key: 'add', label: 'Suma', symbol: '+' },
    '2': { key: 'subtract', label: 'Resta', symbol: '-' },
    '3': { key: 'multiply', label: 'Multiplicacion', symbol: '*' },
    '4': { key: 'divide', label: 'Division', symbol: '/' }
};

function parseNumber(rawValue) {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return null;
    return value;
}

async function askOperation() {
    console.log('\nSeleccione una operacion:');
    console.log('1) Suma (+)');
    console.log('2) Resta (-)');
    console.log('3) Multiplicacion (*)');
    console.log('4) Division (/)');
    console.log('0) Salir');

    const option = (await rl.question('Opcion: ')).trim();
    if (option === '0') return null;
    return operations[option] || undefined;
}

async function askNumber(label) {
    while (true) {
        const answer = await rl.question(`${label}: `);
        const value = parseNumber(answer);
        if (value !== null) {
            return value;
        }
        console.log('Valor invalido. Ingrese un numero entero o decimal.');
    }
}

async function executeOperation(operation, a, b) {
    if (operation.key === 'add') return calculator.add(a, b);
    if (operation.key === 'subtract') return calculator.subtract(a, b);
    if (operation.key === 'multiply') return calculator.multiply(a, b);
    if (operation.key === 'divide') return calculator.divide(a, b);
    throw new Error('Operacion no soportada');
}

async function main() {
    try {
        console.log('\nRPC Calculator CLI');

        while (true) {
            const operation = await askOperation();
            if (operation === null) {
                console.log('\nSaliendo...');
                break;
            }
            if (!operation) {
                console.log('Opcion invalida.\n');
                continue;
            }

            const a = await askNumber('\nIngrese el primer numero');
            const b = await askNumber('Ingrese el segundo numero');

            try {
                const result = await executeOperation(operation, a, b);
                console.log(`Resultado: ${a} ${operation.symbol} ${b} = ${result}`);
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        }
    } finally {
        calculator.disconnect();
        rl.close();
    }
}

main().catch((error) => {
    console.error('Error fatal:', error.message);
    rl.close();
    process.exit(1);
});

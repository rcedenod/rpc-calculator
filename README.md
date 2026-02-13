# rpc-calculator

Calculadora RPC cliente-servidor en Node.js usando sockets TCP puros con `node:net`.

## Resumen
- `compiler/Compiler.js`: genera stubs para servidor y cliente a partir de `compiler/calculator.txt`.
- `server/Dispatcher.js`: servidor RPC TCP que recibe JSON, ejecuta métodos por reflexión y responde.
- `client/ClientConnector.js`: gestiona conexión TCP, serialización y correlación de requests por `requestId`.
- `client/CalculatorProxy.js`: proxy orientado a instancia (`new CalculatorProxy()`).
- `client/cli.js`: interfaz de línea de comandos para operar la calculadora.

## Estructura
- `compiler/calculator.txt`: definición del servicio.
- `server/Calculator.js`: implementación de operaciones.
- `server/Dispatcher.js`: servidor TCP RPC.
- `client/ClientConnector.js`: conector TCP (generado).
- `client/CalculatorProxy.js`: proxy RPC (generado).
- `client/cli.js`: cliente interactivo por terminal.

## Definición del servicio
Ejemplo en `compiler/calculator.txt`:

```txt
@port: 8080
@class: Calculator
@method: add(params)
@method: subtract(params)
@method: multiply(params)
@method: divide(params)
@params = [x, y]
```

## Generar stubs
Desde `compiler/`:

```bash
node Compiler.js
```

Se actualizan:
- `server/Calculator.js`
- `client/ClientConnector.js`
- `client/CalculatorProxy.js`

## Ejecutar servidor
Desde `server/`:

```bash
npm start
```

## Ejecutar cliente CLI
Desde `client/`:

```bash
npm start
```

## Uso programático del proxy

```js
import CalculatorProxy from './CalculatorProxy.js';

const cli = new CalculatorProxy();
const result = await cli.add(3, 4);
console.log(result); // 7
```

## Protocolo de mensajes
- Request: una línea JSON con `requestId`, `class`, `method`, `params`.
- Response: una línea JSON con `requestId`, `status` (`ok|error`) y `response` o `msg`.

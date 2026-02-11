# node-distributed-calc

RPC simple cliente-servidor en Node.js con `socket.io`. Un compilador lee una especificacion (`compiler/calculator.txt`) y genera stubs para el servidor y el cliente. El `Dispatcher` recibe solicitudes RPC, invoca metodos por reflexion y devuelve la respuesta.

## Resumen
- **Compiler**: procesa la definicion de servicio y genera stubs (`server/<Clase>.js`, `client/ClientConnector.js`, `client/<Clase>Proxy.js`).
- **Dispatcher**: servidor RPC que recibe llamadas, carga la clase solicitada y ejecuta el metodo con sus parametros.
- **Cliente**: usa un proxy estatico para enviar RPC y recibir resultados.

## Estructura del repositorio
- `compiler/Compiler.js`: parser + generador de stubs.
- `compiler/calculator.txt`: definicion del servicio (clase, metodos, parametros).
- `compiler/config.json`: host, puerto y protocolo usados al generar el conector del cliente.
- `server/Dispatcher.js`: servidor `socket.io` que recibe `rpc_call` y ejecuta por reflexion.
- `server/Calculator.js`: implementacion del servicio (generado y luego editado).
- `client/ClientConnector.js`: conector del cliente (generado).
- `client/CalculatorProxy.js`: proxy RPC del cliente (generado).
- `server/package.json`: dependencias del servidor.

## Flujo RPC
1. El cliente llama a un metodo en el proxy, por ejemplo `CalculatorProxy.add(1, 2)`.
2. El proxy envia un payload:
   - `class`: nombre de la clase (ej. `Calculator`).
   - `method`: nombre del metodo (ej. `add`).
   - `params`: arreglo con parametros.
3. El `Dispatcher` recibe `rpc_call`, carga la clase desde `server/<Clase>.js`, instancia y ejecuta `instance[method](...params)`.
4. El `Dispatcher` responde con `{ status: 'ok', response: <resultado> }` o `{ status: 'error', msg: <detalle> }`.

## Definicion del servicio
Ejemplo de `compiler/calculator.txt`:
```
@class: Calculator
@method: add(params)
@method: subtract(params)
@method: multiply(params)
@method: divide(params)
@params = [x, y]
```

## Configuracion
`compiler/config.json` define la URL del servidor usada para generar el cliente:
```
{
  "host": "localhost",
  "port": 8080,
  "protocol": "http"
}
```

## Generar stubs
Desde `compiler/`:
```
node Compiler.js
```
Esto genera/actualiza:
- `server/Calculator.js`
- `client/ClientConnector.js`
- `client/CalculatorProxy.js`

## Ejecutar el servidor
Desde `server/`:
```
npm install
node Dispatcher.js
```

> Nota: `Dispatcher.js` actualmente escucha en el puerto `8080` de forma fija. Si cambias el puerto en `compiler/config.json`, debes actualizar `server/Dispatcher.js` para que coincida.

## Uso del cliente (ejemplo)
```js
import CalculatorProxy from './CalculatorProxy.js';

async function main() {
  const result = await CalculatorProxy.add(3, 4);
  console.log(result); // 7
}

main();
```

## Notas importantes
- Los archivos en `client/` y `server/` marcados como “Generado automaticamente” pueden ser sobrescritos al re-ejecutar el compilador.
- El `Dispatcher` usa reflexion: valida que exista la clase y el metodo, y luego ejecuta.
- El formato de respuesta del servidor usa la propiedad `response`. Asegurate de que el cliente la lea correctamente.

import clientConnector from './ClientConnector.js';
import CalculatorProxy from './CalculatorProxy.js';

const inputA = document.getElementById('inputA');
const inputB = document.getElementById('inputB');
const resultEl = document.getElementById('result');
const statusEl = document.getElementById('status');
const equalsBtn = document.getElementById('equalsBtn');
const opButtons = Array.from(document.querySelectorAll('.op-btn'));

let currentOp = 'add';

function setStatus(text, isError = false) {
  statusEl.textContent = text || '';
  statusEl.className = isError ? 'mt-3 text-xs text-red-400' : 'mt-3 text-xs text-gray-500';
}

function setActiveOp(op) {
  const allowedOps = new Set(['add', 'subtract', 'multiply', 'divide']);
  if (!allowedOps.has(op)) {
    setStatus(`Operacion no valida: ${op}`, true);
    return;
  }

  currentOp = op;
  console.log('[ui] operacion seleccionada:', op);
  for (const btn of opButtons) {
    const isActive = btn.dataset.op === op;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.dataset.selected = isActive ? 'true' : 'false';
    btn.classList.toggle('bg-primary', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('text-gray-400', !isActive);
    if (isActive) {
      btn.classList.remove('hover:bg-surface-hover');
      btn.classList.remove('hover:text-white');
    } else {
      btn.classList.add('hover:bg-surface-hover');
      btn.classList.add('hover:text-white');
    }
  }
}

function formatResult(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  return String(value);
}

function parseNumber(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return { ok: false, value: null };

  const isValid = /^-?\d+(\.\d+)?$/.test(trimmed);
  if (!isValid) return { ok: false, value: null };

  const num = Number(trimmed);
  if (!Number.isFinite(num)) return { ok: false, value: null };

  return { ok: true, value: num };
}

async function calculate() {
  const aParsed = parseNumber(inputA.value);
  const bParsed = parseNumber(inputB.value);

  if (!aParsed.ok || !bParsed.ok) {
    setStatus('Los valores deben ser int o float', true);
    console.log('[ui] inputs invalidos', { a: inputA.value, b: inputB.value });
    return;
  }
  const a = aParsed.value;
  const b = bParsed.value;

  setStatus('Llamando RPC...');
  console.log('[rpc] calling', { op: currentOp, a, b });

  try {
    let output;
    if (currentOp === 'add') output = await CalculatorProxy.add(a, b);
    else if (currentOp === 'subtract') output = await CalculatorProxy.subtract(a, b);
    else if (currentOp === 'multiply') output = await CalculatorProxy.multiply(a, b);
    else if (currentOp === 'divide') output = await CalculatorProxy.divide(a, b);
    else throw new Error(`Operacion no soportada: ${currentOp}`);

    resultEl.textContent = formatResult(output);
    setStatus('Operacion completada con exito');
    console.log('[rpc] resultado', output);
  } catch (err) {
    setStatus(err.message || 'Error de RPC', true);
    console.log('[rpc] error', err);
  }
}

for (const btn of opButtons) {
  btn.addEventListener('click', () => setActiveOp(btn.dataset.op));
}

clientConnector.connect();
setActiveOp(currentOp);

equalsBtn.addEventListener('click', () => {
  console.log('[ui] boton igual clickeado');
  calculate();
});

[inputA, inputB].forEach((el) => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculate();
  });
});

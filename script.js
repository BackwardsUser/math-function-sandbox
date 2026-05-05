const localStorageKey = "storedFunctions";
let functions = 0;
const newFunctionInput = document.getElementById("newFunctionInput");
const variableRegex = /<([a-z])>/gm;

function manualOverrides(functionString) {
  functionString = functionString.replace(/\^/g, "**");
  functionString = functionString.replace(/(?<!\.)sqrt/g, "Math.sqrt");
  return functionString;
}

const functions_container = document.getElementById("functions");
const emptyState = document.getElementById("empty");

function updateEmptyState() {
  emptyState.style.display = functions_container.children.length === 0 ? "flex" : "none";
}

function functionInputChanged(id, input, storedFunction, functionString) {
  const functionPreview = document.getElementById(`${id}:functionpreview`);
  const output = document.getElementById(`${id}:output`);

  const inputs = document.getElementById(`${id}:inputs`);
  let newFunctionString = functionString;

  for (let i = 0; i < inputs.children.length; i++) {
    const child = inputs.children.item(i).children.item(1);
    const [_, childVar] = child.id.split(":");
    newFunctionString = newFunctionString.toString().replace(
      new RegExp(`<${childVar}>`, 'g'),
      child.value
    );
  }

  functionPreview.innerText = newFunctionString;
  const fixedFunction = manualOverrides(newFunctionString);
  const newFunction = new Function(`return ${fixedFunction}`);
  const out = newFunction();
  console.log(out);
  output.innerText = out;
}

function removeFunction(card, func) {
  card.remove();
  updateEmptyState();

  const stored = [...unpackFunctions()];
  if (!stored) return;
  const rIndex = stored.indexOf(func);
  if (rIndex == -1) return;
  stored.splice(rIndex, 1);
  localStorage.setItem(localStorageKey, JSON.stringify(stored));
}

function collpaseArray(array) {
  if (!array || !Array.isArray(array)) return null;
  const flatArray = [];
  array.forEach(v => { if (!flatArray.includes(v)) flatArray.push(v); });
  return flatArray;
}

function createCard(storedFunction, functionString, variables, unfilteredFunction) {
  const thisId = functions++;
  const card = document.createElement("div");
  card.className = "card";
  card.id = thisId;

  /* ── header ── */
  const cardHeader = document.createElement("div");
  cardHeader.className = "card-header";

  const title = document.createElement("div");
  title.className = "card-title";
  title.title = functionString;
  title.innerText = functionString;

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-delete";
  removeBtn.innerText = "Delete";
  removeBtn.addEventListener("click", () => removeFunction(card, unfilteredFunction));

  cardHeader.appendChild(title);
  cardHeader.appendChild(removeBtn);

  /* ── body ── */
  const cardBody = document.createElement("div");
  cardBody.className = "card-body";

  /* variable inputs */
  const inputs_container = document.createElement("div");
  inputs_container.id = `${thisId}:inputs`;

  let functionPreviewString = functionString;

  collpaseArray(variables).forEach(v => {
    const row = document.createElement("div");
    row.className = "var-row";

    const label = document.createElement("label");
    label.className = "var-label";
    label.htmlFor = `${thisId}:${v}`;
    label.innerText = v;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "var-input";
    input.id = `${thisId}:${v}`;
    input.value = 0;

    let timeout;
    input.addEventListener("input", (ev) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        functionInputChanged(thisId, ev.target, ev.target.value, functionString);
      }, 500);
    });
    input.addEventListener("change", (ev) => { if (ev.target.value === "") ev.target.value = 0; });

    row.appendChild(label);
    row.appendChild(input);
    inputs_container.appendChild(row);

    functionPreviewString = functionPreviewString.replace(new RegExp(`<${v}>`, 'g'), 0);
  });

  /* expression preview */
  const exprPreview = document.createElement("div");
  exprPreview.className = "expr-preview";
  exprPreview.id = `${thisId}:functionpreview`;
  exprPreview.innerText = functionPreviewString;

  /* output */
  const outputRow = document.createElement("div");
  outputRow.className = "output-row";

  const equals = document.createElement("span");
  equals.className = "output-equals";
  equals.innerText = "=";

  const output = document.createElement("div");
  output.className = "output-value";
  output.id = `${thisId}:output`;

  let initValue;
  try {
    initValue = storedFunction();
  } catch (e) {
    // If the storedFunction fails, the function is likely improper - remove it.
    removeFunction(card, unfilteredFunction);
    return;
  }
  output.innerText = initValue;

  outputRow.appendChild(equals);
  outputRow.appendChild(output);

  cardBody.appendChild(inputs_container);
  cardBody.appendChild(exprPreview);
  cardBody.appendChild(outputRow);

  card.appendChild(cardHeader);
  card.appendChild(cardBody);

  functions_container.appendChild(card);
  updateEmptyState();
}

function createFunction(value) {
  let f;
  const variables = [];

  do {
    f = variableRegex.exec(value);
    if (f) variables.push(f[1]);
  } while (f);

  const functionString = value;

  let compiledString = value;
  variables.forEach(v => {
    compiledString = compiledString.replace(new RegExp(`<${v}>`, 'g'), v);
  });

  const storedFunction = new Function(variables, `return ${manualOverrides(compiledString)}`);
  createCard(storedFunction, functionString, variables, value);
}

function unpackFunctions() {
  const stored = localStorage.getItem(localStorageKey);
  if (!stored) return null;
  return JSON.parse(stored);
}

function saveFunction(func) {
  let stored = unpackFunctions();
  if (!stored) stored = [];
  stored.push(func);
  localStorage.setItem(localStorageKey, JSON.stringify(stored));
}

function functionExists(func) {
  const stored = unpackFunctions();
  return !!(stored && stored.includes(func));
}

function createFromInput() {
  const value = newFunctionInput.value.trim();
  if (!value) return;
  newFunctionInput.value = "";
  if (functionExists(value)) return;
  saveFunction(value);
  createFunction(value);
}

function flushLocalStorage() {
  const stored = unpackFunctions();
  if (stored == null) {
    updateEmptyState();
    return;
  }
  stored.forEach(func => createFunction(func));
  updateEmptyState();
}

flushLocalStorage();

document.getElementById("new").addEventListener("click", createFromInput);
newFunctionInput.addEventListener("keydown", (e) => { if (e.key === "Enter") createFromInput(); });

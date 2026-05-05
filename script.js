
const localStorageKey = "storedFunctions"
let functions = 0;
const newFunctionInput = document.getElementById("newFunctionInput");
const variableRegex = /<([a-z])>/gm;

/**
 * This function replaces normal math operators and replaces them with operators JS can parse.
 * This should eventually be put in the page where users can add/remove their own.
 * 
 * Current replacements:
 * ^ is the operator for XOR in JS, replaced with ** for proper exponent notation.
 * sqrt() is replaced with Math.sqrt() (do not match .sqrt, otherwise we would add .sqrt to Math.sqrt)
 */
function manualOverrides(functionString) {
  functionString = functionString.replace(/\^/g, "**");
  functionString = functionString.replace(/(?<!\.)sqrt/g, "Math.sqrt")
  return functionString;
}

const functions_container = document.getElementById("functions");

function functionInputChanged(id, input, storedFunction, functionString) {

  const [_, changedVar] = input.id.split(":")

  const functionPreview = document.getElementById(`${id}:functionpreview`);
  const output = document.getElementById(`${id}:output`);

  let variables = [];

  const inputs = document.getElementById(`${id}:inputs`);
  let newFunctionString = functionString;

  for (let i = 0; i < inputs.children.length; i++) {
    const child = inputs.children.item(i).children.item(1);
    const [_, childVar] = child.id.split(":");
    newFunctionString = newFunctionString.toString().replace(new RegExp(childVar, 'g'), child.value);
  }

  functionPreview.innerText = newFunctionString;
  const fixedFunction = manualOverrides(newFunctionString);
  const newFunction = new Function(`return ${fixedFunction}`);
  const out = newFunction();
  output.value = out;
}

function removeFunction(card, func) {
  card.remove();

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
  array.forEach(v => { if (!flatArray.includes(v)) flatArray.push(v) });
  return flatArray;
}

function createCard(storedFunction, functionString, variables, unfilteredFunction) {
  const thisId = functions++;
  const card = document.createElement("div");
  card.className = "card"
  card.id = thisId;
  card.style = "width: 18rem; height: max-content;";

  const card_body = document.createElement("div");
  card_body.className = "card-body";

  const header = document.createElement("div");
  header.className = "d-flex flex-row justify-content-between";

  const title = document.createElement("span");
  title.className = "fw-bolder ms-2";
  title.style = "height: 100%; margin: auto 0;"
  title.innerText = functionString;

  const remove = document.createElement("button");
  remove.className = "btn btn-outline-danger";
  remove.innerText = "Delete"

  remove.addEventListener("click", () => { removeFunction(card, unfilteredFunction) })

  header.appendChild(title);
  header.appendChild(remove);
  // remove.appendChild(remove_icon);

  const inputs_container = document.createElement("div");
  inputs_container.className = "inputs my-2";
  inputs_container.id = `${thisId}:inputs`;

  let functionPreviewString = functionString

  collpaseArray(variables).forEach(v => {
    const input_group = document.createElement("div");
    input_group.className = "d-flex flex-row justify-content-between"

    const label = document.createElement("label");
    label.htmlFor = `${thisId}${v}`;
    label.innerText = v;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "ms-2"
    input.id = `${thisId}:${v}`;
    input.value = 0;

    let timeout;

    input.addEventListener("input", (ev) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        functionInputChanged(thisId, ev.target, ev.target.value, functionString)
      }, 500);
    })
    input.addEventListener("change", (ev) => { if (ev.target.value == "") ev.target.value = 0 })

    input_group.appendChild(label);
    input_group.appendChild(input);
    inputs_container.appendChild(input_group);

    functionPreviewString = functionPreviewString.replace(new RegExp(v, 'g'), 0);
  });

  const function_preview = document.createElement("span");
  function_preview.className = "fw-bolder ms-1";
  function_preview.id = `${thisId}:functionpreview`;
  function_preview.innerText = functionPreviewString;

  const output_container = document.createElement("div");
  output_container.className = "d-flex flex-column";

  const output_label = document.createElement("div");
  output_label.htmlFor = `${thisId}:output`;

  const output = document.createElement("input");
  output.type = "text";
  output.id = `${thisId}:output`;
  output.placeholder = "Output";
  output.disabled = true;

  let initValue;
  try {
    initValue = storedFunction()
  } catch (e) {
    removeFunction(card, unfilteredFunction);
  }

  output.value = initValue;

  output_container.appendChild(output_label);
  output_container.appendChild(output);

  card_body.appendChild(header);
  card_body.appendChild(inputs_container);
  card_body.appendChild(function_preview);
  card_body.appendChild(output_container);

  card.appendChild(card_body);

  functions_container.appendChild(card);
}

function createFunction(value) {
  let f;

  let functionString = `${value}`;
  const variables = []

  do {
    f = variableRegex.exec(value);
    if (f) {
      variables.push(f[1]);
      functionString = functionString.replace(new RegExp(f[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), f[1])
    }
  } while (f)

  const storedFunction = new Function(variables, `return ${manualOverrides(functionString)}`);

  createCard(storedFunction, functionString, variables, value)
}

function unpackFunctions() {
  const stored = localStorage.getItem(localStorageKey);
  if (!stored)
    return null;
  const storedArray = JSON.parse(stored);
  return storedArray;
}

function saveFunction(func) {
  let stored = unpackFunctions();
  if (!stored) stored = [];
  stored.push(func);
  localStorage.setItem(localStorageKey, JSON.stringify(stored));
}

function functionExists(func) {
  const stored = unpackFunctions();
  if (stored && stored.includes(func))
    return true;
  return false;
}

function createFromInput() {
  const value = newFunctionInput.value;
  if (!value) return;
  newFunctionInput.value = "";
  if (functionExists(value)) return; // send error somehow (function already saved)
  saveFunction(value);
  createFunction(value);
}

function flushLocalStorage() {
  const stored = unpackFunctions();
  if (stored == null) return;
  stored.forEach(func => {
    console.log("Creating: " + func);
    createFunction(func);
  });
}

flushLocalStorage();

const newFunction = document.getElementById("new");
newFunction.addEventListener("click", createFromInput);
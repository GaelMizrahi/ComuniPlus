export function createElement(tag, options = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'className') element.className = value;
    else if (key === 'text') element.textContent = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
    else element.setAttribute(key, value);
  });
  children.forEach((child) => element.append(child));
  return element;
}

export function optionList(values) {
  return values.map((value) => createElement('option', { value, text: value }));
}

export function field(label, input) {
  return createElement('label', {}, [label, input]);
}

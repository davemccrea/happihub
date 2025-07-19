export function readFormValue(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Form element #${id} not found`);
    return null;
  }
  return element.value;
}

export function readFormCheckbox(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Form checkbox #${id} not found`);
    return false;
  }
  return element.checked;
}

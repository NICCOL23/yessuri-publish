import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
function element() {
  return {
    children: [], dataset: {}, events: {}, classList: { add() {}, remove() {} },
    append(...nodes) { this.children.push(...nodes); },
    prepend(node) { this.children.unshift(node); },
    setAttribute() {},
    removeAttribute(name) { if (name === 'data-drop-side') delete this.dataset.dropSide; },
    addEventListener(type, handler) { this.events[type] = handler; },
    getBoundingClientRect() { return { top: 0, height: 100 }; },
  };
}

const source = read('field-admin.js');
const dragCode = source.slice(source.indexOf('let draggedField='), source.indexOf('function render(){'));
let changes = 0;
const context = vm.createContext({
  make: element,
  fields: ['bath', 'wallpaper', 'flooring'].map(id => ({id})),
  locked: false, busy: false,
  changed() { changes++; },
  render() {},
});
vm.runInContext(dragCode + '\nthis.setupDrag=addFieldDrag;', context);
const cards = context.fields.map(({id}) => {
  const card = element(), heading = element();
  card.dataset.id = id;
  context.setupDrag(card, heading, id);
  return { card, handle: heading.children[0] };
});
const event = clientY => ({ clientY, preventDefault() {}, dataTransfer: { setData() {} } });
cards[0].handle.events.dragstart(event(5));
cards[2].card.events.dragover(event(90));
assert.equal(cards[2].card.dataset.dropSide, 'after');
cards[2].card.events.drop(event(90));
assert.deepEqual(context.fields.map(f => f.id), ['wallpaper', 'flooring', 'bath']);
assert.equal(cards[2].card.dataset.dropSide, undefined);
cards[0].handle.events.dragstart(event(5));
cards[1].card.events.drop(event(10));
assert.deepEqual(context.fields.map(f => f.id), ['bath', 'wallpaper', 'flooring']);
cards[0].handle.events.dragstart(event(5));
cards[1].card.events.dragover(event(90));
cards[0].handle.events.dragend();
assert.equal(cards[1].card.dataset.dropSide, undefined);
assert.deepEqual(context.fields.map(f => f.id), ['bath', 'wallpaper', 'flooring']);

assert.equal(changes, 2);
const expected = ['전체', '도배', '욕실·설비', '컴퓨터·IT'];
const options = expected.map(value => ({ value, textContent: value }));
const select = { ...element(), id: 'find-category', options, selectedOptions: [options[0]], value: options[0].value, dataset: {} };
const pickerButtons = [];
class FakeSelect {
  get value() { return this.currentValue; }
  set value(value) { this.currentValue = value; }
}
const pickerContext = {
  HTMLSelectElement: FakeSelect,
  window: { YESSURI_FIELDS_READY: Promise.resolve(), addEventListener() {} },
  document: { addEventListener() {}, querySelectorAll: () => [select], querySelector: () => null, body: element(), createElement: () => {const node=element();pickerButtons.push(node);return node;} },
};
select.after=()=>{}; select.currentValue=options[0].value;
await vm.runInNewContext(read('service-field-picker.js'), pickerContext);
assert.deepEqual(pickerButtons.filter(e => e.className === 'ys-field-option').map(e => e.dataset.value), expected);
console.log('PASS field drag before/after/cancel and expert picker published order');

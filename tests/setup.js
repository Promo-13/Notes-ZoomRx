import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;

// Set up other necessary browser globals
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent; 
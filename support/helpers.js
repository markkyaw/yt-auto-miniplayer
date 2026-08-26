'use strict';

// Builds a fake element for the stub document.
function fakeElement(options) {
  const opts = options || {};
  return {
    tagName: opts.tagName || 'DIV',
    href: opts.href || '',
    target: opts.target || '',
    offsetParent: opts.offsetParent === undefined ? {} : opts.offsetParent,
    attributes: opts.attributes || {},
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name] : null;
    },
    getBoundingClientRect() {
      return { width: opts.width === undefined ? 320 : opts.width };
    }
  };
}

// Installs a stub document, location, and KeyboardEvent.
function installPage(options) {
  const opts = options || {};
  const bySelector = opts.bySelector || {};
  const host = opts.host || 'www.youtube.com';
  const pathname = opts.pathname === undefined ? '/watch' : opts.pathname;
  const keyEvents = [];
  const listeners = [];

  define('location', {
    pathname: pathname,
    host: host,
    hostname: host,
    href: 'https://' + host + pathname
  });
  define('document', {
    querySelector(selector) {
      return bySelector[selector] || null;
    },
    dispatchEvent(event) {
      keyEvents.push(event);
      return true;
    },
    addEventListener(type, handler, capture) {
      listeners.push({ type: type, handler: handler, capture: capture });
    }
  });
  define('KeyboardEvent', function (type, init) {
    Object.assign(this, init || {});
    this.type = type;
  });
  return { keyEvents: keyEvents, listeners: listeners };
}

// Replaces a global, even when the runtime defines it already.
function define(name, value) {
  Object.defineProperty(globalThis, name, {
    value: value, writable: true, configurable: true
  });
}

module.exports = { fakeElement, installPage, define };

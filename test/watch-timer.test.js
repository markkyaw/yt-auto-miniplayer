'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { installPage, define } = require('../support/helpers.js');

require('../src/watch-timer.js');
const timer = globalThis.YtAmp.watchTimer;

// Installs a clock and a location the test can move.
function installClock(startMs) {
  let current = startMs;
  const intervals = [];
  define('Date', { now() { return current; } });
  define('setInterval', function (handler, ms) {
    intervals.push({ handler: handler, ms: ms });
    return intervals.length;
  });
  return {
    intervals: intervals,
    pass(ms) { current += ms; },
    goTo(pathname, search) {
      installPage({ pathname: pathname });
      globalThis.location.href =
        'https://www.youtube.com' + pathname + (search || '');
    }
  };
}

test('secondsOnWatchPage is 0 away from a watch page', () => {
  const clock = installClock(1000);
  clock.goTo('/@somechannel');
  timer.start();
  clock.pass(9000);
  assert.strictEqual(timer.secondsOnWatchPage(), 0);
});

test('secondsOnWatchPage counts the time on the watch page', () => {
  const clock = installClock(1000);
  clock.goTo('/watch', '?v=abc');
  timer.start();
  clock.pass(6000);
  assert.strictEqual(timer.secondsOnWatchPage(), 6);
});

test('a new video restarts the clock', () => {
  const clock = installClock(1000);
  clock.goTo('/watch', '?v=abc');
  timer.start();
  clock.pass(30000);
  clock.goTo('/watch', '?v=def');
  clock.intervals[0].handler();
  clock.pass(2000);
  assert.strictEqual(timer.secondsOnWatchPage(), 2);
});

test('the clock keeps running while the URL stays the same', () => {
  const clock = installClock(1000);
  clock.goTo('/watch', '?v=abc');
  timer.start();
  clock.pass(3000);
  clock.intervals[0].handler();
  clock.pass(3000);
  assert.strictEqual(timer.secondsOnWatchPage(), 6);
});

// A read must never use the time of the page before it.
test('a read after an unseen change starts the clock again', () => {
  const clock = installClock(1000);
  clock.goTo('/watch', '?v=abc');
  timer.start();
  clock.pass(30000);
  clock.goTo('/watch', '?v=def');
  assert.strictEqual(timer.secondsOnWatchPage(), 0);
});

test('start samples once every second', () => {
  const clock = installClock(1000);
  clock.goTo('/watch', '?v=abc');
  timer.start();
  assert.strictEqual(clock.intervals.length, 1);
  assert.strictEqual(clock.intervals[0].ms, 1000);
});

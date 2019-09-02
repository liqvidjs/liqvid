/*!
 * MIT License
 * 
 * Copyright (c) Yuri Sulyma
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */
var RactivePlayer =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/events/events.js":
/*!***************************************!*\
  !*** ./node_modules/events/events.js ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = $getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  var args = [];
  for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    ReflectApply(this.listener, this.target, args);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function') {
        throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
      }

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}


/***/ }),

/***/ "./src/Audio.tsx":
/*!***********************!*\
  !*** ./src/Audio.tsx ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Audio; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Media__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Media */ "./src/Media.ts");
/* harmony import */ var _utils_dom__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/dom */ "./src/utils/dom.ts");
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};



class Audio extends _Media__WEBPACK_IMPORTED_MODULE_1__["default"] {
    componentDidMount() {
        super.componentDidMount();
        const { playback } = this.player;
        for (const track of Array.from(this.domElement.textTracks)) {
            track.addEventListener("cuechange", () => {
                const captions = [];
                for (const cue of Array.from(track.activeCues)) {
                    const html = cue.text.replace(/\n/g, "<br/>");
                    captions.push(Object(_utils_dom__WEBPACK_IMPORTED_MODULE_2__["fragmentFromHTML"])(html));
                }
                playback.captions = captions;
            });
        }
    }
    render() {
        const _a = this.props, { start, obstructCanPlay, obstructCanPlayThrough, children } = _a, attrs = __rest(_a, ["start", "obstructCanPlay", "obstructCanPlayThrough", "children"]);
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("audio", Object.assign({ preload: "auto", ref: node => this.domElement = node }, attrs), children));
    }
}


/***/ }),

/***/ "./src/Captions.tsx":
/*!**************************!*\
  !*** ./src/Captions.tsx ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Captions; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./shared */ "./src/shared.ts");


class Captions extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    componentDidMount() {
        const { playback } = this.context;
        playback.hub.on("cuechange", () => {
            this.domElement.innerHTML = "";
            for (const cue of playback.captions) {
                this.domElement.appendChild(cue);
            }
        });
    }
    render() {
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-captions-display", ref: node => this.domElement = node }));
    }
}
Captions.contextType = _shared__WEBPACK_IMPORTED_MODULE_1__["PlayerContext"];


/***/ }),

/***/ "./src/Controls.tsx":
/*!**************************!*\
  !*** ./src/Controls.tsx ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Controls; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _polyfills__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./polyfills */ "./src/polyfills.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./shared */ "./src/shared.ts");
/* harmony import */ var _controls_FullScreen__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./controls/FullScreen */ "./src/controls/FullScreen.tsx");
/* harmony import */ var _controls_Help__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./controls/Help */ "./src/controls/Help.tsx");
/* harmony import */ var _controls_PlayPause__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./controls/PlayPause */ "./src/controls/PlayPause.tsx");
/* harmony import */ var _controls_ScrubberBar__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./controls/ScrubberBar */ "./src/controls/ScrubberBar.tsx");
/* harmony import */ var _controls_Settings__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./controls/Settings */ "./src/controls/Settings.tsx");
/* harmony import */ var _controls_TimeDisplay__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./controls/TimeDisplay */ "./src/controls/TimeDisplay.tsx");
/* harmony import */ var _controls_Volume__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./controls/Volume */ "./src/controls/Volume.tsx");











const SECONDS = 1000;
;
class Controls extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    constructor(props, context) {
        super(props, context);
        this.player = context;
        this.captureKeys = true;
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["bind"])(this, ["forceUpdate", "onKeyDown", "resetTimer"]);
        this.state = {
            visible: true
        };
    }
    canvasClick() {
        const { playback } = this.player;
        if (this.player.applyHooks("canvasClick").every(_ => _)) {
            playback.paused ? playback.play() : playback.pause();
        }
        this.player.hub.emit("canvasClick");
    }
    componentDidMount() {
        const { playback } = this.player;
        document.body.addEventListener("keydown", this.onKeyDown);
        document.body.addEventListener("touchstart", this.resetTimer);
        document.body.addEventListener("mousemove", this.resetTimer);
        playback.hub.on("play", this.resetTimer);
        playback.hub.on("pause", () => {
            clearTimeout(this.timer);
            this.setState({ visible: true });
        });
        playback.hub.on("stop", () => {
            clearTimeout(this.timer);
            this.setState({ visible: true });
        });
        document.body.addEventListener("mouseleave", () => {
            if (this.player.playback.paused)
                return;
            this.setState({ visible: false });
        });
    }
    onKeyDown(e) {
        if (!this.captureKeys)
            return;
        if (e.altKey || e.ctrlKey || e.metaKey)
            return;
        e.preventDefault();
        this.resetTimer();
        const { playback, script } = this.player;
        switch (e.key.toLowerCase()) {
            case "arrowleft":
                playback.seek(playback.currentTime - 5 * SECONDS);
                return;
            case "j":
                playback.seek(playback.currentTime - 10 * SECONDS);
                return;
            case "k":
            case " ":
                playback[playback.paused ? "play" : "pause"]();
                return;
            case "arrowright":
                playback.seek(playback.currentTime + 5 * SECONDS);
                return;
            case "l":
                playback.seek(playback.currentTime + 10 * SECONDS);
                return;
            case "f":
                Object(_polyfills__WEBPACK_IMPORTED_MODULE_1__["isFullScreen"])() ? Object(_polyfills__WEBPACK_IMPORTED_MODULE_1__["exitFullScreen"])() : Object(_polyfills__WEBPACK_IMPORTED_MODULE_1__["requestFullScreen"])();
                return;
            case "<":
                playback.playbackRate = _controls_Settings__WEBPACK_IMPORTED_MODULE_8__["PLAYBACK_RATES"][Math.max(0, _controls_Settings__WEBPACK_IMPORTED_MODULE_8__["PLAYBACK_RATES"].indexOf(playback.playbackRate) - 1)];
                return;
            case ">":
                playback.playbackRate = _controls_Settings__WEBPACK_IMPORTED_MODULE_8__["PLAYBACK_RATES"][Math.min(_controls_Settings__WEBPACK_IMPORTED_MODULE_8__["PLAYBACK_RATES"].length - 1, _controls_Settings__WEBPACK_IMPORTED_MODULE_8__["PLAYBACK_RATES"].indexOf(playback.playbackRate) + 1)];
                return;
            case "arrowup":
                playback.volume = playback.volume + 0.05;
                return;
            case "arrowdown":
                playback.volume = playback.volume - 0.05;
                return;
            case "m":
                playback.muted = !playback.muted;
                return;
            case "w":
                script.back();
                return;
            case "e":
                script.forward();
                return;
            case "?":
                this.$helpControl.toggleDialog();
                return;
            case "escape":
                this.$helpControl.closeDialog();
                return;
        }
        const num = parseInt(e.key, 10);
        if (!isNaN(num)) {
            playback.seek(playback.duration * num / 10);
        }
    }
    resetTimer() {
        if (this.player.playback.paused)
            return;
        if (this.timer !== undefined)
            clearTimeout(this.timer);
        this.timer = window.setTimeout(() => { this.setState({ visible: false }); }, 3000);
        this.setState({ visible: true });
    }
    render() {
        const classNames = ["rp-controls"];
        if (!this.state.visible)
            classNames.push("hidden");
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: classNames.join(" ") },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_ScrubberBar__WEBPACK_IMPORTED_MODULE_7__["default"], { thumbs: this.props.thumbs }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-controls-buttons" },
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_PlayPause__WEBPACK_IMPORTED_MODULE_6__["default"], null),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_Volume__WEBPACK_IMPORTED_MODULE_10__["default"], null),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_TimeDisplay__WEBPACK_IMPORTED_MODULE_9__["default"], null),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-controls-float-right" },
                    this.player.applyHooks("controls"),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_Settings__WEBPACK_IMPORTED_MODULE_8__["default"], null),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_Help__WEBPACK_IMPORTED_MODULE_5__["default"], { ref: control => this.$helpControl = control }),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_controls_FullScreen__WEBPACK_IMPORTED_MODULE_4__["default"], null)))));
    }
}
Controls.contextType = _shared__WEBPACK_IMPORTED_MODULE_3__["PlayerContext"];


/***/ }),

/***/ "./src/Cursor.tsx":
/*!************************!*\
  !*** ./src/Cursor.tsx ***!
  \************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Cursor; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Player */ "./src/Player.tsx");
/* harmony import */ var _utils_animation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/animation */ "./src/utils/animation.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");




class Cursor extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    constructor(props, context) {
        super(props, context);
        this.player = context;
        const { script } = this.player;
        this.start = (typeof props.start === "number") ? props.start : script.markerByName(props.start)[1];
        this.end = (typeof props.end === "number") ? props.end : script.markerByName(props.end)[1];
    }
    componentDidMount() {
        const { playback } = this.player;
        const { display } = this.domElement.style;
        this.domElement.style.display = "block";
        const { height, width } = this.domElement.getBoundingClientRect();
        this.domElement.style.display = display;
        const update = Object(_utils_animation__WEBPACK_IMPORTED_MODULE_2__["replay"])({
            data: this.props.replay,
            start: this.start,
            end: this.end,
            active: (([x, y]) => {
                Object.assign(this.domElement.style, {
                    display: "block",
                    left: `calc(${x}% - ${width / 2}px)`,
                    top: `calc(${y}% - ${height / 2}px)`
                });
            }),
            inactive: () => {
                this.domElement.style.display = "none";
            },
            compressed: true
        });
        playback.hub.on("seek", () => update(playback.currentTime));
        playback.hub.on("timeupdate", update);
        update(playback.currentTime);
    }
    render() {
        const { playback } = this.player;
        const style = {
            display: Object(_utils_misc__WEBPACK_IMPORTED_MODULE_3__["between"])(this.start, playback.currentTime, this.end) ? "block" : "none"
        };
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("img", { className: "rp-cursor", ref: (node) => { this.domElement = node; }, src: this.props.src, style: style }));
    }
}
Cursor.contextType = _Player__WEBPACK_IMPORTED_MODULE_1__["default"].Context;


/***/ }),

/***/ "./src/IdMap.tsx":
/*!***********************!*\
  !*** ./src/IdMap.tsx ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return IdMap; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_react_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/react-utils */ "./src/utils/react-utils.ts");



class IdMap extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    constructor(props) {
        super(props);
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["bind"])(this, ["renderContent"]);
        this.foundIds = new Set();
    }
    render() {
        if (this.props.hasOwnProperty("map")) {
            return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"](IdMap.Context.Provider, { value: [this.foundIds, this.props.map] }, this.renderContent([this.foundIds, this.props.map])));
        }
        else {
            return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"](IdMap.Context.Consumer, null, this.renderContent));
        }
    }
    renderContent([foundIds, map]) {
        return Object(_utils_react_utils__WEBPACK_IMPORTED_MODULE_2__["recursiveMap"])(this.props.children, node => {
            const attrs = {};
            if (node.props.hasOwnProperty("id")) {
                const { id } = node.props;
                foundIds.add(id);
                if (map[id] !== undefined)
                    Object.assign(attrs, map[id]);
            }
            if (Object.keys(attrs).length === 0) {
                return node;
            }
            else {
                return react__WEBPACK_IMPORTED_MODULE_0__["cloneElement"](node, attrs);
            }
        });
    }
}
IdMap.Context = react__WEBPACK_IMPORTED_MODULE_0__["createContext"]([]);


/***/ }),

/***/ "./src/Media.ts":
/*!**********************!*\
  !*** ./src/Media.ts ***!
  \**********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Media; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_media__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/media */ "./src/utils/media.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/time */ "./src/utils/time.ts");
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Player */ "./src/Player.tsx");





class Media extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    constructor(props, context) {
        super(props, context);
        this.player = context;
        if (typeof this.props.start === "string") {
            if (this.props.start.match(/^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d+))?$/))
                this.start = Object(_utils_time__WEBPACK_IMPORTED_MODULE_3__["parseTime"])(this.props.start);
            else
                this.start = this.player.script.markerByName(this.props.start)[1];
        }
        else {
            this.start = this.props.start;
        }
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["bind"])(this, ["onPause", "onPlay", "onRateChange", "onSeek", "onSeeking", "onTimeUpdate", "onVolumeChange"]);
    }
    componentDidMount() {
        const { playback } = this.player;
        playback.hub.on("pause", this.onPause);
        playback.hub.on("play", this.onPlay);
        playback.hub.on("ratechange", this.onRateChange);
        playback.hub.on("seek", this.onSeek);
        playback.hub.on("seeked", this.onSeek);
        playback.hub.on("seeking", this.onSeeking);
        playback.hub.on("timeupdate", this.onTimeUpdate);
        playback.hub.on("volumechange", this.onVolumeChange);
        if (this.props.obstructCanPlay) {
            this.player.obstruct("canplay", Object(_utils_media__WEBPACK_IMPORTED_MODULE_1__["awaitMediaCanPlay"])(this.domElement));
        }
        if (this.props.obstructCanPlayThrough) {
            this.player.obstruct("canplaythrough", Object(_utils_media__WEBPACK_IMPORTED_MODULE_1__["awaitMediaCanPlayThrough"])(this.domElement));
        }
        this.onVolumeChange();
        const getBuffers = () => {
            const ranges = this.domElement.buffered;
            const buffers = [];
            for (let i = 0; i < ranges.length; ++i) {
                if (ranges.end(i) === Infinity)
                    continue;
                buffers.push([ranges.start(i) * 1000 + this.start, ranges.end(i) * 1000 + this.start]);
            }
            return buffers;
        };
        const updateBuffers = () => {
            this.player.updateBuffer(this.domElement, getBuffers());
        };
        this.player.registerBuffer(this.domElement);
        updateBuffers();
        this.domElement.addEventListener("progress", updateBuffers);
    }
    get end() {
        return this.start + this.domElement.duration * 1000;
    }
    onPlay() {
        this.onTimeUpdate(this.player.playback.currentTime);
    }
    onPause() {
        this.domElement.pause();
    }
    onRateChange() {
        this.domElement.playbackRate = this.player.playback.playbackRate;
    }
    onSeeking() {
        this.domElement.pause();
    }
    onSeek(t) {
        const { playback } = this.player;
        if (Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["between"])(this.start, t, this.end)) {
            this.domElement.currentTime = (t - this.start) / 1000;
            if (this.domElement.paused && !playback.paused && !playback.seeking)
                this.domElement.play().catch(this.player.playback.pause);
        }
        else {
            if (!this.domElement.paused)
                this.domElement.pause();
        }
    }
    onTimeUpdate(t) {
        if (Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["between"])(this.start, t, this.end)) {
            if (!this.domElement.paused)
                return;
            this.domElement.currentTime = (t - this.start) / 1000;
            this.domElement.play().catch(this.player.playback.pause);
        }
        else {
            if (!this.domElement.paused)
                this.domElement.pause();
        }
    }
    onVolumeChange() {
        const { playback } = this.player;
        this.domElement.volume = playback.volume;
        this.domElement.muted = playback.muted;
    }
}
Media.defaultProps = {
    obstructCanPlay: false,
    obstructCanPlayThrough: false
};
Media.contextType = _Player__WEBPACK_IMPORTED_MODULE_4__["default"].Context;


/***/ }),

/***/ "./src/Player.tsx":
/*!************************!*\
  !*** ./src/Player.tsx ***!
  \************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Player; });
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! events */ "./node_modules/events/events.js");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(events__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _Controls__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Controls */ "./src/Controls.tsx");
/* harmony import */ var _Captions__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Captions */ "./src/Captions.tsx");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/mobile */ "./src/utils/mobile.ts");
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./shared */ "./src/shared.ts");







const ignoreCanvasClick = Symbol();
class Player extends react__WEBPACK_IMPORTED_MODULE_1__["PureComponent"] {
    constructor(props) {
        super(props);
        this.hub = new events__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.__canPlayTasks = [];
        this.__canPlayThroughTasks = [];
        this.script = this.props.script;
        this.playback = this.script.playback;
        this.rememberVolumeSettings();
        this.buffers = new Map();
        this.hooks = new Map();
        const hook = (name, listener) => {
            if (!this.hooks.has(name)) {
                this.hooks.set(name, []);
            }
            this.hooks.get(name).push(listener);
        };
        this.props.plugins.forEach(plugin => plugin.setup(hook));
        this.state = { ready: false };
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["bind"])(this, ["onMouseUp", "suspendKeyCapture", "resumeKeyCapture"]);
    }
    componentDidMount() {
        document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
        document.addEventListener("touchforcechange", e => e.preventDefault(), { passive: false });
        Promise.all(this.__canPlayTasks)
            .then(() => this.hub.emit("canplay"));
        Promise.all(this.__canPlayThroughTasks)
            .then(() => this.hub.emit("canplaythrough"));
    }
    rememberVolumeSettings() {
        const { playback } = this, storage = window.sessionStorage;
        playback.volume = parseFloat(storage.getItem("ractive volume") || "1");
        playback.muted = "true" === (storage.getItem("ractive muted") || "false");
        playback.hub.on("volumechange", () => {
            storage.setItem("ractive muted", playback.muted.toString());
            storage.setItem("ractive volume", playback.volume.toString());
        });
    }
    updateTree() {
        const { script } = this;
        recurse(this.dag);
        function recurse(leaf) {
            if (typeof leaf.first !== "undefined") {
                if (leaf.first <= script.markerIndex && (!leaf.last || script.markerIndex < leaf.last)) {
                    leaf.element.style.removeProperty("opacity");
                    leaf.element.style.removeProperty("pointer-events");
                    return leaf.children.forEach(recurse);
                }
                leaf.element.style.opacity = "0";
                leaf.element.style["pointer-events"] = "none";
            }
            else if (typeof leaf.during !== "undefined") {
                if (script.markerName.startsWith(leaf.during)) {
                    leaf.element.style.removeProperty("opacity");
                    leaf.element.style.removeProperty("pointer-events");
                    return leaf.children.forEach(recurse);
                }
                leaf.element.style.opacity = "0";
                leaf.element.style["pointer-events"] = "none";
            }
            else {
                return leaf.children.forEach(recurse);
            }
        }
    }
    onMouseUp(e) {
        if (e[ignoreCanvasClick])
            return;
        this.$controls.canvasClick();
    }
    static preventCanvasClick(e) {
        e.persist();
        e[ignoreCanvasClick] = true;
    }
    suspendKeyCapture() {
        this.$controls.captureKeys = false;
    }
    resumeKeyCapture() {
        this.$controls.captureKeys = true;
    }
    ready() {
        this.dag = toposort(this.canvas, this.script.markerNumberOf);
        this.script.hub.on("markerupdate", () => this.updateTree());
        this.updateTree();
        this.setState({
            ready: true
        });
    }
    registerBuffer(elt) {
        this.buffers.set(elt, []);
    }
    updateBuffer(elt, buffers) {
        this.buffers.set(elt, buffers);
        this.playback.hub.emit("bufferupdate");
    }
    obstruct(event, task) {
        if (event === "canplay") {
            this.__canPlayTasks.push(task);
        }
        else {
            this.__canPlayThroughTasks.push(task);
        }
    }
    applyHooks(name) {
        if (!this.hooks.has(name))
            return [];
        return this.hooks.get(name).map(_ => _());
    }
    render() {
        const attrs = {
            style: this.props.style
        };
        const canvasAttrs = _utils_mobile__WEBPACK_IMPORTED_MODULE_5__["anyHover"] ? { onMouseUp: this.onMouseUp } : {};
        const classNames = ["ractive-player"];
        if (!this.state.ready)
            classNames.push("not-ready");
        classNames.push(...this.applyHooks("classNames"));
        return (react__WEBPACK_IMPORTED_MODULE_1__["createElement"](Player.Context.Provider, { value: this },
            react__WEBPACK_IMPORTED_MODULE_1__["createElement"]("div", Object.assign({ className: classNames.join(" ") }, attrs),
                react__WEBPACK_IMPORTED_MODULE_1__["createElement"](LoadingScreen, null),
                react__WEBPACK_IMPORTED_MODULE_1__["createElement"]("div", Object.assign({ className: "rp-canvas" }, canvasAttrs, { ref: canvas => this.canvas = canvas }), this.props.children),
                react__WEBPACK_IMPORTED_MODULE_1__["createElement"](_Captions__WEBPACK_IMPORTED_MODULE_3__["default"], { player: this }),
                react__WEBPACK_IMPORTED_MODULE_1__["createElement"](_Controls__WEBPACK_IMPORTED_MODULE_2__["default"], { player: this, ref: $controls => this.$controls = $controls, ready: this.state.ready, thumbs: this.props.thumbs }))));
    }
}
Player.Context = _shared__WEBPACK_IMPORTED_MODULE_6__["PlayerContext"];
Player.defaultProps = {
    plugins: [],
    style: {}
};
Player.CONTROLS_HEIGHT = 44;
function LoadingScreen() {
    return (react__WEBPACK_IMPORTED_MODULE_1__["createElement"]("div", { className: "rp-loading-screen" },
        react__WEBPACK_IMPORTED_MODULE_1__["createElement"]("div", { className: "rp-loading-spinner" })));
}
function toposort(root, mn) {
    const nodes = Array.from(root.querySelectorAll("*[data-from-first], *[data-during]"));
    const dag = { children: [], element: root };
    const path = [dag];
    for (const node of nodes) {
        let firstMarkerName, lastMarkerName, during;
        if (node.dataset.fromFirst) {
            firstMarkerName = node.dataset.fromFirst;
            lastMarkerName = node.dataset.fromLast;
        }
        else if (node.dataset.during) {
            during = node.dataset.during;
        }
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        const leaf = {
            children: [],
            element: node
        };
        if (during)
            leaf.during = during;
        if (firstMarkerName)
            leaf.first = mn(firstMarkerName);
        if (lastMarkerName)
            leaf.last = mn(lastMarkerName);
        let current = path[path.length - 1];
        while (!current.element.contains(node)) {
            path.pop();
            current = path[path.length - 1];
        }
        current.children.push(leaf);
        path.push(leaf);
    }
    return dag;
}


/***/ }),

/***/ "./src/Video.tsx":
/*!***********************!*\
  !*** ./src/Video.tsx ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Video; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Media__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Media */ "./src/Media.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};



class Video extends _Media__WEBPACK_IMPORTED_MODULE_1__["default"] {
    onSeek(t) {
        const oldVal = this.domElement.paused;
        super.onSeek(t);
        if (this.domElement.paused === oldVal)
            return;
        if (this.domElement.paused)
            this.domElement.style.display = "none";
        else
            this.domElement.style.display = "block";
    }
    onTimeUpdate(t) {
        const oldVal = this.domElement.paused;
        super.onTimeUpdate(t);
        if (this.domElement.paused === oldVal)
            return;
        if (this.domElement.paused)
            this.domElement.style.display = "none";
        else
            this.domElement.style.display = "block";
    }
    render() {
        const { playback } = this.context;
        const _a = this.props, { start, children, obstructCanPlay, obstructCanPlayThrough } = _a, attrs = __rest(_a, ["start", "children", "obstructCanPlay", "obstructCanPlayThrough"]);
        attrs.style = Object.assign(Object.assign({}, (attrs.style || {})), { display: (this.domElement && Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["between"])(this.start, playback.currentTime, this.end)) ? "block" : "none" });
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("video", Object.assign({ preload: "auto", ref: node => this.domElement = node }, attrs), children));
    }
}


/***/ }),

/***/ "./src/controls/FullScreen.tsx":
/*!*************************************!*\
  !*** ./src/controls/FullScreen.tsx ***!
  \*************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return FullScreen; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../fake-fullscreen */ "./src/fake-fullscreen.ts");
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/mobile */ "./src/utils/mobile.ts");




function FullScreen() {
    const [state, setState] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["isFullScreen"])());
    Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(() => {
        Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["onFullScreenChange"])(() => setState(Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["isFullScreen"])()));
    });
    const events = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => { Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["isFullScreen"])() ? Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["exitFullScreen"])() : Object(_fake_fullscreen__WEBPACK_IMPORTED_MODULE_1__["requestFullScreen"])(); }), []);
    return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", Object.assign({ className: "rp-controls-fullscreen" }, events, { viewBox: "0 0 36 36" }), state ?
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"](react__WEBPACK_IMPORTED_MODULE_0__["Fragment"], null,
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 14 14 h -4 v 2 h 6 v -6 h -2 v 4 z" }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 22 14 v -4 h -2 v 6 h 6 v -2 h -4 z" }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 20 26 h 2 v -4 h 4 v -2 h -6 v 6 z" }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 10 22 h 4 v 4 h 2 v -6 h -6 v 2 z" }))
        :
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"](react__WEBPACK_IMPORTED_MODULE_0__["Fragment"], null,
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 10 16 h 2 v -4 h 4 v -2 h -6 v 6 z" }),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 20 10 v 2 h 4 v 4 h 2 v -6 h -6 z" }),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 24 24 h -4 v 2 h 6 v -6 h -2 v 4 z" }),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "white", d: "M 12 20 h -2 v 6 h 6 v -2 h -4 v -4 z" }))));
}


/***/ }),

/***/ "./src/controls/Help.tsx":
/*!*******************************!*\
  !*** ./src/controls/Help.tsx ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Help; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-dom */ "react-dom");
/* harmony import */ var react_dom__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react_dom__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/misc */ "./src/utils/misc.ts");



class Help extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    constructor(props) {
        super(props);
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["bind"])(this, ["closeDialog", "openDialog"]);
        this.state = { dialogOpen: false };
    }
    closeDialog() {
        this.setState({
            dialogOpen: false
        });
    }
    openDialog() {
        this.setState({
            dialogOpen: true
        });
    }
    toggleDialog() {
        this.setState({
            dialogOpen: !this.state.dialogOpen
        });
    }
    render() {
        const dialogStyle = {
            display: this.state.dialogOpen ? "block" : "none"
        };
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"](react__WEBPACK_IMPORTED_MODULE_0__["Fragment"], null,
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"](HelpDialog, { style: dialogStyle, closeDialog: this.closeDialog, openDialog: this.openDialog }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", { className: "rp-controls-help", onClick: this.openDialog, viewBox: "0 0 20 20" },
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "m 10.896484,3.8652344 c -1.2309996,0 -1.7499996,0.8536094 -1.7499996,1.4746094 -0.026,0.737 0.39525,1.1816406 1.2812496,1.1816406 1.059,0 1.679688,-0.7171875 1.679688,-1.4921875 0,-0.621 -0.274938,-1.1640625 -1.210938,-1.1640625 z", fill: "#FFF", stroke: "none" }),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "m 10.847656,8.0332031 c -0.765,0 -2.5524216,0.7615469 -4.1074216,2.0605469 l 0.3183594,0.523438 c 0.49,-0.33 1.3207187,-0.664063 1.5117187,-0.664063 0.148,0 0.127,0.193734 0,0.677734 L 7.8378906,13.65625 c -0.447,1.705 0.020156,2.09375 0.6601563,2.09375 0.639,0 2.2877811,-0.58175 3.8007811,-2.09375 L 11.9375,13.169922 c -0.618,0.487 -1.247453,0.71875 -1.439453,0.71875 -0.149,0 -0.2115,-0.19386 -0.0625,-0.75586 l 0.839844,-3.179687 c 0.319,-1.164 0.212265,-1.9199219 -0.427735,-1.9199219 z", fill: "#FFF", stroke: "none" }))));
    }
}
class HelpDialog extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    render() {
        const videoShortcuts = [
            ["j", "Go back 10 seconds"],
            ["<Left>", "Go back 5 seconds"],
            [() => (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tr", { key: 'space' },
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("th", { scope: "row" },
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, "k"),
                        " or ",
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, "<Space>")),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("td", null, "Play/pause")))],
            ["<Right>", "Go forward 5 seconds"],
            ["l", "Go forward 10 seconds"],
            [() => (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tr", { key: 'number' },
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("th", { scope: "row" },
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, "<0>"),
                        " \u2013 ",
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, "<9>")),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("td", null,
                        "Skip to 10",
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("var", null, "n"),
                        "% of the way through the video")))],
            ["f", "Full screen"],
            ["<Up>", "Increase volume 5%"],
            ["<Down>", "Decrease volume 5%"],
            ["m", "Mute/unmute"],
            ["?", "Show help"]
        ];
        const controls3D = [
            ["Left mouse", "Orbit"],
            ["Scroll wheel", "Zoom"],
            ["Right mouse", "Pan"]
        ];
        return react_dom__WEBPACK_IMPORTED_MODULE_1__["createPortal"](react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-help-dialog", style: this.props.style },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("button", { onClick: this.props.closeDialog }, "\u00D7"),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-help-tables" },
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("table", null,
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("caption", null, "Video controls"),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tbody", null, videoShortcuts.map(([key, desc]) => (typeof key === "function" ? key() :
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tr", { key: key },
                            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("th", { scope: "row" },
                                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, key)),
                            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("td", null, desc)))))),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("table", null,
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("caption", null, "3D controls"),
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tbody", null, controls3D.map(([key, desc]) => (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tr", { key: key },
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("th", { scope: "row" },
                            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("kbd", null, key)),
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("td", null, desc)))))))), document.body);
    }
}


/***/ }),

/***/ "./src/controls/PlayPause.tsx":
/*!************************************!*\
  !*** ./src/controls/PlayPause.tsx ***!
  \************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return PlayPause; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Player */ "./src/Player.tsx");
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/mobile */ "./src/utils/mobile.ts");




function PlayPause() {
    const { playback } = Object(react__WEBPACK_IMPORTED_MODULE_0__["useContext"])(_Player__WEBPACK_IMPORTED_MODULE_1__["default"].Context);
    const [state, setState] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(playback.paused || playback.seeking);
    Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(() => {
        const update = () => setState(playback.paused || playback.seeking);
        const events = ["pause", "play", "seeked", "seeking", "seeked", "stop"];
        for (const e of events)
            playback.hub.on(e, update);
        return () => {
            for (const e of events)
                playback.hub.off(e, update);
        };
    }, []);
    const button = Object(react__WEBPACK_IMPORTED_MODULE_0__["useRef"])();
    const events = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => playback.paused ? playback.play() : playback.pause()), []);
    return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", Object.assign({ className: "rp-controls-playpause", viewBox: "0 0 36 36", ref: button }, events), state ?
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z", fill: "white" })
        :
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 12 26 h 4 v -16 h -4 z M 21 26 h 4 v -16 h -4 z", fill: "white" })));
}


/***/ }),

/***/ "./src/controls/ScrubberBar.tsx":
/*!**************************************!*\
  !*** ./src/controls/ScrubberBar.tsx ***!
  \**************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ScrubberBar; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Player */ "./src/Player.tsx");
/* harmony import */ var _ThumbnailBox__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ThumbnailBox */ "./src/controls/ThumbnailBox.tsx");
/* harmony import */ var _utils_interactivity__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/interactivity */ "./src/utils/interactivity.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/mobile */ "./src/utils/mobile.ts");







function ScrubberBar(props) {
    const { playback } = Object(react__WEBPACK_IMPORTED_MODULE_0__["useContext"])(_Player__WEBPACK_IMPORTED_MODULE_1__["default"].Context);
    const [progress, setProgress] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({
        scrubber: playback.currentTime / playback.duration,
        thumb: playback.currentTime / playback.duration,
    });
    const [showThumb, setShowThumb] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(false);
    const scrubberBar = Object(react__WEBPACK_IMPORTED_MODULE_0__["useRef"])();
    Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(() => {
        playback.hub.on("seek", () => {
            if (playback.seeking)
                return;
            const progress = playback.currentTime / playback.duration;
            setProgress({ scrubber: progress, thumb: progress });
        });
        playback.hub.on("seeked", () => {
            const progress = playback.currentTime / playback.duration;
            setProgress(prev => ({ scrubber: progress, thumb: prev.thumb }));
        });
        playback.hub.on("timeupdate", () => {
            const progress = playback.currentTime / playback.duration;
            setProgress(prev => ({ scrubber: progress, thumb: prev.thumb }));
        });
    }, []);
    const divEvents = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => {
        if (!_utils_mobile__WEBPACK_IMPORTED_MODULE_5__["anyHover"])
            return {};
        return { onMouseDown: Object(_utils_interactivity__WEBPACK_IMPORTED_MODULE_3__["dragHelper"])((e, { x }) => {
                const rect = scrubberBar.current.getBoundingClientRect(), progress = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["constrain"])(0, (x - rect.left) / rect.width, 1);
                setProgress({ scrubber: progress, thumb: progress });
                playback.seek(progress * playback.duration);
            }, (e) => {
                playback.seeking = true;
                const rect = scrubberBar.current.getBoundingClientRect(), progress = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["constrain"])(0, (e.clientX - rect.left) / rect.width, 1);
                setProgress({ scrubber: progress, thumb: progress });
                playback.seek(progress * playback.duration);
            }, () => playback.seeking = false) };
    }, []);
    const wrapEvents = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => {
        if (!_utils_mobile__WEBPACK_IMPORTED_MODULE_5__["anyHover"])
            return [];
        return {
            onMouseOver: () => setShowThumb(true),
            onMouseMove: (e) => {
                const rect = scrubberBar.current.getBoundingClientRect(), progress = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["constrain"])(0, (e.clientX - rect.left) / rect.width, 1);
                setProgress(prev => ({ scrubber: prev.scrubber, thumb: progress }));
            },
            onMouseOut: () => setShowThumb(false)
        };
    }, []);
    const scrubberEvents = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => {
        if (_utils_mobile__WEBPACK_IMPORTED_MODULE_5__["anyHover"])
            return {};
        return { onTouchStart: Object(_utils_interactivity__WEBPACK_IMPORTED_MODULE_3__["dragHelper"])((e, { x }) => {
                const rect = scrubberBar.current.getBoundingClientRect(), progress = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["constrain"])(0, (x - rect.left) / rect.width, 1);
                setProgress({ scrubber: progress, thumb: progress });
            }, (e) => {
                e.preventDefault();
                e.stopPropagation();
                playback.seeking = true;
                setShowThumb(true);
            }, (e, { x }) => {
                e.preventDefault();
                const rect = scrubberBar.current.getBoundingClientRect(), progress = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["constrain"])(0, (x - rect.left) / rect.width, 1);
                setShowThumb(false);
                playback.seeking = false;
                playback.seek(progress * playback.duration);
            }) };
    }, []);
    const highlights = (props.thumbs && props.thumbs.highlights) || [];
    const activeHighlight = highlights.find(_ => Object(_utils_misc__WEBPACK_IMPORTED_MODULE_4__["between"])(_.time / playback.duration, progress.thumb, _.time / playback.duration + 0.01));
    const thumbTitle = activeHighlight ? activeHighlight.title : null;
    return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", Object.assign({ className: "rp-controls-scrub", ref: scrubberBar }, divEvents),
        props.thumbs &&
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"](_ThumbnailBox__WEBPACK_IMPORTED_MODULE_2__["default"], Object.assign({}, props.thumbs, { progress: progress.thumb, show: showThumb, title: thumbTitle })),
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", Object.assign({ className: "rp-controls-scrub-wrap" }, wrapEvents),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", { className: "rp-controls-scrub-progress", preserveAspectRatio: "none", viewBox: "0 0 100 10" },
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("rect", { className: "rp-progress-elapsed", x: "0", y: "0", height: "10", width: progress.scrubber * 100 }),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("rect", { className: "rp-progress-remaining", x: progress.scrubber * 100, y: "0", height: "10", width: (1 - progress.scrubber) * 100 }),
                highlights.map(({ time }) => (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("rect", { key: time, className: ["rp-thumb-highlight"].concat(time <= playback.currentTime ? "past" : []).join(" "), x: time / playback.duration * 100, y: "0", width: "1", height: "10" })))),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", Object.assign({ className: "rp-scrubber", style: { left: `calc(${progress.scrubber * 100}% - 6px)` }, viewBox: "0 0 100 100" }, scrubberEvents),
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("circle", { cx: "50", cy: "50", r: "50", stroke: "none" })))));
}


/***/ }),

/***/ "./src/controls/Settings.tsx":
/*!***********************************!*\
  !*** ./src/controls/Settings.tsx ***!
  \***********************************/
/*! exports provided: PLAYBACK_RATES, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PLAYBACK_RATES", function() { return PLAYBACK_RATES; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Settings; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Player */ "./src/Player.tsx");
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/mobile */ "./src/utils/mobile.ts");




const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
function Settings() {
    const player = Object(react__WEBPACK_IMPORTED_MODULE_0__["useContext"])(_Player__WEBPACK_IMPORTED_MODULE_1__["default"].Context), { playback } = player;
    const [dialog, setDialog] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])({ main: false, speed: false });
    const [currentRate, setRate] = Object(react__WEBPACK_IMPORTED_MODULE_0__["useState"])(playback.playbackRate);
    Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(() => {
        playback.hub.on("ratechange", () => setRate(playback.playbackRate));
        player.hub.on("canvasClick", () => setDialog({ main: false, speed: false }));
    });
    const setSpeed = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => {
        const map = {};
        for (const rate of PLAYBACK_RATES) {
            map[rate] = Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => {
                playback.playbackRate = rate;
                setDialog({ main: true, speed: false });
            });
        }
        return map;
    }, []);
    const toggle = Object(react__WEBPACK_IMPORTED_MODULE_0__["useMemo"])(() => Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => setDialog(prev => ({ main: !(prev.main || prev.speed), speed: false }))), []);
    const openMain = Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => setDialog({ main: true, speed: false }));
    const openSpeed = Object(_utils_mobile__WEBPACK_IMPORTED_MODULE_2__["onClick"])(() => setDialog({ speed: true, main: false }));
    const dialogStyle = { display: dialog.main ? "block" : "none" };
    const speedDialogStyle = { display: dialog.speed ? "block" : "none" };
    return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-controls-settings" },
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-settings-speed-dialog", style: speedDialogStyle },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", Object.assign({ className: "rp-dialog-subtitle" }, openMain), "< Speed"),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("ul", null, PLAYBACK_RATES.map(rate => (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("li", Object.assign({ className: rate === currentRate ? "selected" : "", key: rate }, setSpeed[rate]), rate === 1 ? "Normal" : rate.toString()))))),
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-settings-dialog", style: dialogStyle },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("table", null,
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tbody", null,
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("tr", Object.assign({}, openSpeed),
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("th", { scope: "row" }, "Speed"),
                        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("td", null,
                            currentRate === 1 ? "Normal" : currentRate,
                            " >"))))),
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", Object.assign({}, toggle, { viewBox: "0 0 48 48" }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { fill: "#FFF", d: "m24.04 0.14285c-1.376 0-2.7263 0.12375-4.0386 0.34741l-0.64 6.7853c-1.3572 0.37831-2.6417 0.90728-3.8432 1.585l-5.244-4.3317c-2.2152 1.5679-4.1541 3.4955-5.7217 5.7101l4.3426 5.2437c-0.67695 1.2001-1.2177 2.4878-1.5959 3.8432l-6.7745 0.64053c-0.22379 1.3127-0.34741 2.6622-0.34741 4.0386 0 1.3788 0.12285 2.7238 0.34741 4.0386l6.7745 0.64056c0.37825 1.3554 0.91896 2.6431 1.5959 3.8432l-4.3317 5.2437c1.5648 2.2089 3.4908 4.1457 5.6997 5.7105l5.2545-4.3426c1.2023 0.67835 2.485 1.2174 3.8432 1.5959l0.64053 6.7853c1.3123 0.22368 2.6626 0.33658 4.0386 0.33658s2.7155-0.11289 4.0278-0.33658l0.64053-6.7853c1.3582-0.37847 2.6409-0.91755 3.8432-1.5959l5.2545 4.3426c2.2088-1.5649 4.1348-3.5017 5.6997-5.7105l-4.3317-5.2437c0.67695-1.2001 1.2177-2.4878 1.5959-3.8432l6.7744-0.64056c0.22456-1.3148 0.34741-2.6598 0.34741-4.0386 0-1.3765-0.12361-2.726-0.34741-4.0386l-6.7744-0.64053c-0.37825-1.3554-0.91896-2.6431-1.5959-3.8432l4.3426-5.2437c-1.568-2.2146-3.507-4.1422-5.722-5.7101l-5.2437 4.3317c-1.2015-0.67776-2.486-1.2067-3.8432-1.585l-0.641-6.7853c-1.3123-0.22366-2.6518-0.34741-4.0278-0.34741zm0 14.776c5.0178 0 9.076 4.0691 9.076 9.0869s-4.0582 9.0869-9.076 9.0869-9.0869-4.0691-9.0869-9.0869 4.0691-9.0869 9.0869-9.0869z" }))));
}


/***/ }),

/***/ "./src/controls/ThumbnailBox.tsx":
/*!***************************************!*\
  !*** ./src/controls/ThumbnailBox.tsx ***!
  \***************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ThumbnailBox; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Player */ "./src/Player.tsx");
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/time */ "./src/utils/time.ts");




function ThumbnailBox(props) {
    const player = Object(react__WEBPACK_IMPORTED_MODULE_0__["useContext"])(_Player__WEBPACK_IMPORTED_MODULE_1__["default"].Context), { playback } = player;
    const { cols, rows, frequency, path, progress, show, title, height, width } = props;
    const count = cols * rows;
    Object(react__WEBPACK_IMPORTED_MODULE_0__["useEffect"])(() => {
        const maxSlide = Math.floor(playback.duration / frequency / 1000), maxSheet = Math.floor(maxSlide / count);
        player.hub.on("canplay", () => {
            for (let sheetNum = 0; sheetNum <= maxSheet; ++sheetNum) {
                const img = new Image();
                img.src = path.replace("%s", sheetNum.toString());
            }
        });
    }, []);
    const time = progress * playback.duration / 1000, markerNum = Math.floor(time / frequency), sheetNum = Math.floor(markerNum / count), markerNumOnSheet = markerNum % count, row = Math.floor(markerNumOnSheet / rows), col = markerNumOnSheet % rows;
    const sheetName = path.replace("%s", sheetNum.toString());
    return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-controls-thumbnail", style: {
            display: show ? "block" : "none",
            left: `calc(${progress * 100}%)`
        } },
        title && react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-thumbnail-title" }, title),
        react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-thumbnail-box" },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("img", { src: sheetName, style: {
                    left: `-${col * width}px`,
                    top: `-${row * height}px`
                } }),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-thumbnail-time" }, Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["formatTime"])(time * 1000)))));
}


/***/ }),

/***/ "./src/controls/TimeDisplay.tsx":
/*!**************************************!*\
  !*** ./src/controls/TimeDisplay.tsx ***!
  \**************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return TimeDisplay; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shared */ "./src/shared.ts");
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/time */ "./src/utils/time.ts");



class TimeDisplay extends react__WEBPACK_IMPORTED_MODULE_0__["PureComponent"] {
    componentDidMount() {
        this.context.playback.hub.on("seek", () => this.forceUpdate());
        this.context.playback.hub.on("timeupdate", () => this.forceUpdate());
    }
    render() {
        const { playback } = this.context;
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-controls-time" },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-current-time" }, Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["formatTime"])(playback.currentTime)),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-time-separator" }, "/"),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("span", { className: "rp-total-time" }, Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["formatTime"])(playback.duration))));
    }
}
TimeDisplay.contextType = _shared__WEBPACK_IMPORTED_MODULE_1__["PlayerContext"];


/***/ }),

/***/ "./src/controls/Volume.tsx":
/*!*********************************!*\
  !*** ./src/controls/Volume.tsx ***!
  \*********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Volume; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _shared__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../shared */ "./src/shared.ts");
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/misc */ "./src/utils/misc.ts");



class Volume extends react__WEBPACK_IMPORTED_MODULE_0__["Component"] {
    constructor(props, context) {
        super(props, context);
        this.player = context;
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_2__["bind"])(this, ["onInput"]);
    }
    componentDidMount() {
        this.player.playback.hub.on("volumechange", () => this.forceUpdate());
    }
    onInput(e) {
        this.player.playback.volume = parseFloat(e.target.value) / 100;
    }
    render() {
        const { playback } = this.player;
        return (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("div", { className: "rp-controls-volume" },
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("svg", { onClick: () => playback.muted = !playback.muted, viewBox: "0 0 100 100" },
                react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 10 35 h 20 l 25 -20 v 65 l -25 -20 h -20 z", fill: "white", stroke: "none" }),
                playback.muted ?
                    react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 63 55 l 20 20 m 0 -20 l -20 20", stroke: "white", strokeWidth: "7" })
                    :
                        (react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("g", null,
                            playback.volume > 0 && react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 62 32.5 a 1,1 0 0,1 0,30", fill: "white", stroke: "none" }),
                            playback.volume >= 0.5 && react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("path", { d: "M 62 15 a 1,1 0 0,1 0,65 v -10 a 10,10 0 0,0 0,-45 v -10 z", fill: "white", stroke: "none" })))),
            react__WEBPACK_IMPORTED_MODULE_0__["createElement"]("input", { min: "0", max: "100", onChange: this.onInput, onInput: this.onInput, type: "range", value: playback.muted ? 0 : playback.volume * 100 })));
    }
}
Volume.contextType = _shared__WEBPACK_IMPORTED_MODULE_1__["PlayerContext"];


/***/ }),

/***/ "./src/fake-fullscreen.ts":
/*!********************************!*\
  !*** ./src/fake-fullscreen.ts ***!
  \********************************/
/*! exports provided: requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "requestFullScreen", function() { return requestFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exitFullScreen", function() { return exitFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isFullScreen", function() { return isFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "onFullScreenChange", function() { return onFullScreenChange; });
/* harmony import */ var _polyfills__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./polyfills */ "./src/polyfills.ts");

let __isFullScreen = false;
const __callbacks = [];
const requestFullScreen = _polyfills__WEBPACK_IMPORTED_MODULE_0__["fullscreenEnabled"] ? _polyfills__WEBPACK_IMPORTED_MODULE_0__["requestFullScreen"] : () => {
    window.parent.postMessage({ type: "fake-fullscreen", value: true }, location.origin);
    if (!__isFullScreen) {
        __isFullScreen = true;
        for (const _ of __callbacks)
            _();
    }
};
const exitFullScreen = _polyfills__WEBPACK_IMPORTED_MODULE_0__["fullscreenEnabled"] ? _polyfills__WEBPACK_IMPORTED_MODULE_0__["exitFullScreen"] : () => {
    window.parent.postMessage({ type: "fake-fullscreen", value: false }, location.origin);
    if (__isFullScreen) {
        __isFullScreen = false;
        for (const _ of __callbacks)
            _();
    }
};
const isFullScreen = _polyfills__WEBPACK_IMPORTED_MODULE_0__["fullscreenEnabled"] ? _polyfills__WEBPACK_IMPORTED_MODULE_0__["isFullScreen"] : () => {
    return __isFullScreen;
};
const onFullScreenChange = _polyfills__WEBPACK_IMPORTED_MODULE_0__["fullscreenEnabled"] ? _polyfills__WEBPACK_IMPORTED_MODULE_0__["onFullScreenChange"] : (callback) => {
    __callbacks.push(callback);
};


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! exports provided: Audio, Cursor, IdMap, Playback, Player, Script, Utils, Video */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _Audio__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Audio */ "./src/Audio.tsx");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Audio", function() { return _Audio__WEBPACK_IMPORTED_MODULE_0__["default"]; });

/* harmony import */ var _Cursor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Cursor */ "./src/Cursor.tsx");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Cursor", function() { return _Cursor__WEBPACK_IMPORTED_MODULE_1__["default"]; });

/* harmony import */ var _IdMap__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./IdMap */ "./src/IdMap.tsx");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "IdMap", function() { return _IdMap__WEBPACK_IMPORTED_MODULE_2__["default"]; });

/* harmony import */ var _playback__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./playback */ "./src/playback.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Playback", function() { return _playback__WEBPACK_IMPORTED_MODULE_3__["default"]; });

/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Player */ "./src/Player.tsx");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Player", function() { return _Player__WEBPACK_IMPORTED_MODULE_4__["default"]; });

/* harmony import */ var _script__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./script */ "./src/script.ts");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Script", function() { return _script__WEBPACK_IMPORTED_MODULE_5__["default"]; });

/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils */ "./src/utils.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "Utils", function() { return _utils__WEBPACK_IMPORTED_MODULE_6__; });
/* harmony import */ var _Video__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./Video */ "./src/Video.tsx");
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "Video", function() { return _Video__WEBPACK_IMPORTED_MODULE_7__["default"]; });












/***/ }),

/***/ "./src/playback.ts":
/*!*************************!*\
  !*** ./src/playback.ts ***!
  \*************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Playback; });
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! events */ "./node_modules/events/events.js");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(events__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/time */ "./src/utils/time.ts");



class Playback {
    constructor(options) {
        Object.assign(this, {
            currentTime: 0,
            hub: new events__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"](),
            duration: options.duration,
            playbackRate: 1,
            playingFrom: 0,
            startTime: performance.now(),
            __captions: [],
            __muted: false,
            __playbackRate: 1,
            paused: true,
            __seeking: false,
            __volume: 1,
            __canPlayTasks: [],
            __canPlayThroughTasks: []
        });
        this.audioContext = new (window.AudioContext || webkitAudioContext)();
        this.audioNode = this.audioContext.createGain();
        this.audioNode.connect(this.audioContext.destination);
        this.hub.setMaxListeners(0);
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["bind"])(this, ["pause", "play", "__advance"]);
        requestAnimationFrame(this.__advance);
    }
    get captions() {
        return this.__captions;
    }
    set captions(captions) {
        this.__captions = captions;
        this.hub.emit("cuechange");
    }
    get muted() {
        return this.__muted;
    }
    set muted(val) {
        if (val === this.__muted)
            return;
        this.__muted = val;
        if (this.__muted) {
            this.audioNode.gain.value = 0;
        }
        else {
            this.audioNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
        this.hub.emit("volumechange");
    }
    get playbackRate() {
        return this.__playbackRate;
    }
    set playbackRate(val) {
        if (val === this.__playbackRate)
            return;
        this.__playbackRate = val;
        this.playingFrom = this.currentTime;
        this.startTime = performance.now();
        this.hub.emit("ratechange");
    }
    get seeking() {
        return this.__seeking;
    }
    set seeking(val) {
        if (val === this.__seeking)
            return;
        this.__seeking = val;
        if (this.__seeking)
            this.hub.emit("seeking");
        else
            this.hub.emit("seeked");
    }
    pause() {
        this.paused = true;
        this.playingFrom = this.currentTime;
        this.hub.emit("pause");
    }
    play() {
        this.paused = false;
        this.hub.emit("play");
    }
    seek(t) {
        if (typeof t === "string")
            t = Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["parseTime"])(t);
        t = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["constrain"])(0, t, this.duration);
        this.currentTime = this.playingFrom = t;
        this.startTime = performance.now();
        this.hub.emit("seek", t);
    }
    get volume() {
        return this.__volume;
    }
    set volume(volume) {
        this.muted = false;
        this.__volume = Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["constrain"])(0, volume, 1);
        if (this.__volume === 0) {
            this.audioNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        }
        else {
            this.audioNode.gain.exponentialRampToValueAtTime(this.__volume, this.audioContext.currentTime + 2);
        }
        this.hub.emit("volumechange");
    }
    stop() {
        this.paused = true;
        this.playingFrom = 0;
        this.hub.emit("stop");
    }
    __advance(t) {
        if (this.paused || this.__seeking) {
            this.startTime = t;
        }
        else {
            this.currentTime = this.playingFrom + Math.max((t - this.startTime) * this.__playbackRate, 0);
            if (this.currentTime >= this.duration) {
                this.currentTime = this.duration;
                this.stop();
            }
            this.hub.emit("timeupdate", this.currentTime);
        }
        requestAnimationFrame(this.__advance);
    }
}


/***/ }),

/***/ "./src/polyfills.ts":
/*!**************************!*\
  !*** ./src/polyfills.ts ***!
  \**************************/
/*! exports provided: fullscreenEnabled, requestFullScreen, exitFullScreen, isFullScreen, onFullScreenChange */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fullscreenEnabled", function() { return fullscreenEnabled; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "requestFullScreen", function() { return requestFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "exitFullScreen", function() { return exitFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isFullScreen", function() { return isFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "onFullScreenChange", function() { return onFullScreenChange; });
const id = (_) => _;
const fullscreenEnabled = ["fullscreenEnabled", "webkitFullscreenEnabled", "mozFullScreenEnabled", "msFullscreenEnabled"]
    .map(_ => document[_])
    .concat(false)
    .find(_ => _ !== undefined);
const requestFullScreen = ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"]
    .map(_ => document.body[_])
    .concat(() => { })
    .find(id)
    .bind(document.body);
const exitFullScreen = ["exitFullscreen", "webkitExitFullscreen", "mozCancelFullScreen", "msExitFullscreen"]
    .map(_ => document[_])
    .concat(async () => { })
    .find(id)
    .bind(document);
const isFullScreen = () => ["fullscreen", "webkitIsFullScreen", "mozFullScreen"]
    .map(_ => document[_])
    .find(_ => _ !== undefined);
function onFullScreenChange(callback) {
    for (const event of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"])
        document.addEventListener(event, callback);
}


/***/ }),

/***/ "./src/script.ts":
/*!***********************!*\
  !*** ./src/script.ts ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Script; });
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! events */ "./node_modules/events/events.js");
/* harmony import */ var events__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(events__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/time */ "./src/utils/time.ts");
/* harmony import */ var _playback__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./playback */ "./src/playback.ts");




class Script {
    constructor(markers) {
        this.hub = new events__WEBPACK_IMPORTED_MODULE_0__["EventEmitter"]();
        this.hub.setMaxListeners(0);
        Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["bind"])(this, ["markerByName", "markerNumberOf", "__updateMarker"]);
        let time = 0;
        for (const marker of markers) {
            if (marker.length === 2) {
                const [, duration] = marker;
                marker[1] = time;
                marker[2] = time + Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["parseTime"])(duration);
            }
            else {
                const [, begin, end] = marker;
                marker[1] = Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["parseTime"])(begin);
                marker[2] = Object(_utils_time__WEBPACK_IMPORTED_MODULE_2__["parseTime"])(end);
            }
            time = marker[2];
        }
        this.markers = markers;
        this.markerIndex = 0;
        this.playback = new _playback__WEBPACK_IMPORTED_MODULE_3__["default"]({
            duration: this.markers[this.markers.length - 1][2]
        });
        this.playback.hub.on("seek", this.__updateMarker);
        this.playback.hub.on("timeupdate", this.__updateMarker);
    }
    get markerName() {
        return this.markers[this.markerIndex][0];
    }
    back() {
        this.playback.seek(this.markers[Math.max(0, this.markerIndex - 1)][1]);
    }
    forward() {
        this.playback.seek(this.markers[Math.min(this.markers.length - 1, this.markerIndex + 1)][1]);
    }
    markerByName(name) {
        return this.markers[this.markerNumberOf(name)];
    }
    markerNumberOf(name) {
        for (let i = 0; i < this.markers.length; ++i) {
            if (this.markers[i][0] === name)
                return i;
        }
        throw new Error(`Marker ${name} does not exist`);
    }
    __updateMarker(t) {
        let newIndex;
        for (let i = 0; i < this.markers.length; ++i) {
            const [, begin, end] = this.markers[i];
            if (Object(_utils_misc__WEBPACK_IMPORTED_MODULE_1__["between"])(begin, t, end)) {
                newIndex = i;
                break;
            }
        }
        if (newIndex === undefined)
            newIndex = this.markers.length - 1;
        if (newIndex !== this.markerIndex) {
            const prevIndex = this.markerIndex;
            this.markerIndex = newIndex;
            this.hub.emit("markerupdate", prevIndex);
        }
    }
}


/***/ }),

/***/ "./src/shared.ts":
/*!***********************!*\
  !*** ./src/shared.ts ***!
  \***********************/
/*! exports provided: PlayerContext */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PlayerContext", function() { return PlayerContext; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

const PlayerContext = react__WEBPACK_IMPORTED_MODULE_0__["createContext"](null);


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/*! exports provided: animation, authoring, interactivity, media, misc, mobile, react, time */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _utils_animation__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./utils/animation */ "./src/utils/animation.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "animation", function() { return _utils_animation__WEBPACK_IMPORTED_MODULE_0__; });
/* harmony import */ var _utils_authoring__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils/authoring */ "./src/utils/authoring.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "authoring", function() { return _utils_authoring__WEBPACK_IMPORTED_MODULE_1__; });
/* harmony import */ var _utils_interactivity__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils/interactivity */ "./src/utils/interactivity.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "interactivity", function() { return _utils_interactivity__WEBPACK_IMPORTED_MODULE_2__; });
/* harmony import */ var _utils_media__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./utils/media */ "./src/utils/media.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "media", function() { return _utils_media__WEBPACK_IMPORTED_MODULE_3__; });
/* harmony import */ var _utils_misc__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./utils/misc */ "./src/utils/misc.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "misc", function() { return _utils_misc__WEBPACK_IMPORTED_MODULE_4__; });
/* harmony import */ var _utils_mobile__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./utils/mobile */ "./src/utils/mobile.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "mobile", function() { return _utils_mobile__WEBPACK_IMPORTED_MODULE_5__; });
/* harmony import */ var _utils_react_utils__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./utils/react-utils */ "./src/utils/react-utils.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "react", function() { return _utils_react_utils__WEBPACK_IMPORTED_MODULE_6__; });
/* harmony import */ var _utils_time__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./utils/time */ "./src/utils/time.ts");
/* harmony reexport (module object) */ __webpack_require__.d(__webpack_exports__, "time", function() { return _utils_time__WEBPACK_IMPORTED_MODULE_7__; });











/***/ }),

/***/ "./src/utils/animation.ts":
/*!********************************!*\
  !*** ./src/utils/animation.ts ***!
  \********************************/
/*! exports provided: animate, replay, easings */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "animate", function() { return animate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "replay", function() { return replay; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "easings", function() { return easings; });
/* harmony import */ var _misc__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./misc */ "./src/utils/misc.ts");

function animate(options) {
    if (!("startValue" in options))
        options.startValue = 0;
    if (!("endValue" in options))
        options.endValue = 1;
    if (!("easing" in options))
        options.easing = (x) => x;
    const { startValue, endValue, startTime, duration, easing } = options;
    return (t) => startValue + easing(Object(_misc__WEBPACK_IMPORTED_MODULE_0__["constrain"])(0, (t - startTime) / duration, 1)) * (endValue - startValue);
}
function replay({ data, start, end, active, inactive, compressed }) {
    if (typeof compressed === "undefined")
        compressed = false;
    const times = data.map(d => d[0]);
    if (compressed) {
        for (let i = 1; i < times.length; ++i) {
            times[i] += times[i - 1];
        }
    }
    if (typeof start === "undefined")
        start = 0;
    if (typeof end === "undefined")
        end = start + times[times.length - 1];
    let lastTime = 0, i = 0, isActive = true;
    function listener(t) {
        if (t < start || t >= end) {
            if (isActive) {
                isActive = false;
                return inactive();
            }
            return;
        }
        isActive = true;
        if (t < lastTime)
            i = 0;
        lastTime = t;
        let maxI = Math.min(i, times.length - 1);
        for (; i < times.length; i++) {
            if (start + times[i] < t)
                maxI = i;
            else
                break;
        }
        const [, current] = data[maxI];
        active(current, maxI);
    }
    return listener;
}
const easings = {
    easeInSine: [0.47, 0, 0.745, 0.715],
    easeOutSine: [0.39, 0.575, 0.565, 1],
    easeInOutSine: [0.445, 0.05, 0.55, 0.95],
    easeInQuad: [0.55, 0.085, 0.68, 0.53],
    easeOutQuad: [0.25, 0.46, 0.45, 0.94],
    easeInOutQuad: [0.455, 0.03, 0.515, 0.955],
    easeInCubic: [0.55, 0.055, 0.675, 0.19],
    easeOutCubic: [0.215, 0.61, 0.355, 1],
    easeInOutCubic: [0.645, 0.045, 0.355, 1],
    easeInQuart: [0.895, 0.03, 0.685, 0.22],
    easeOutQuart: [0.165, 0.84, 0.44, 1],
    easeInOutQuart: [0.77, 0, 0.175, 1],
    easeInQuint: [0.755, 0.05, 0.855, 0.06],
    easeOutQuint: [0.23, 1, 0.32, 1],
    easeInOutQuint: [0.86, 0, 0.07, 1],
    easeInExpo: [0.95, 0.05, 0.795, 0.035],
    easeOutExpo: [0.19, 1, 0.22, 1],
    easeInOutExpo: [1, 0, 0, 1],
    easeInCirc: [0.6, 0.04, 0.98, 0.335],
    easeOutCirc: [0.075, 0.82, 0.165, 1],
    easeInOutCirc: [0.785, 0.135, 0.15, 0.86],
    easeInBack: [0.6, -0.28, 0.735, 0.045],
    easeOutBack: [0.175, 0.885, 0.32, 1.275],
    easeInOutBack: [0.68, -0.55, 0.265, 1.55]
};


/***/ }),

/***/ "./src/utils/authoring.ts":
/*!********************************!*\
  !*** ./src/utils/authoring.ts ***!
  \********************************/
/*! exports provided: showIf, during, from */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "showIf", function() { return showIf; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "during", function() { return during; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "from", function() { return from; });
function showIf(cond) {
    if (!cond)
        return {
            style: {
                opacity: 0,
                pointerEvents: "none"
            }
        };
    return {};
}
;
function during(prefix) {
    return {
        ["data-during"]: prefix
    };
}
function from(first, last) {
    return {
        ["data-from-first"]: first,
        ["data-from-last"]: last
    };
}


/***/ }),

/***/ "./src/utils/dom.ts":
/*!**************************!*\
  !*** ./src/utils/dom.ts ***!
  \**************************/
/*! exports provided: fragmentFromHTML */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fragmentFromHTML", function() { return fragmentFromHTML; });
function fragmentFromHTML(str) {
    const t = document.createElement("template");
    t.innerHTML = str;
    return t.content.cloneNode(true);
}


/***/ }),

/***/ "./src/utils/interactivity.ts":
/*!************************************!*\
  !*** ./src/utils/interactivity.ts ***!
  \************************************/
/*! exports provided: dragHelper, dragHelperReact */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dragHelper", function() { return dragHelper; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dragHelperReact", function() { return dragHelperReact; });
/* harmony import */ var _Player__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Player */ "./src/Player.tsx");

function isReactMouseEvent(e) {
    return ("nativeEvent" in e) && e.nativeEvent instanceof MouseEvent;
}
function dragHelper(move, down = () => { }, up = () => { }) {
    return (e) => {
        if (e instanceof MouseEvent || isReactMouseEvent(e)) {
            if (e.button !== 0)
                return;
            let lastX = e.clientX, lastY = e.clientY;
            const upHandler = (e) => {
                const dx = e.clientX - lastX, dy = e.clientY - lastY;
                document.body.removeEventListener("mousemove", moveHandler);
                window.removeEventListener("mouseup", upHandler);
                return up(e, { x: e.clientX, y: e.clientY, dx, dy });
            };
            const moveHandler = (e) => {
                const dx = e.clientX - lastX, dy = e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;
                return move(e, { x: e.clientX, y: e.clientY, dx, dy });
            };
            document.body.addEventListener("mousemove", moveHandler, false);
            window.addEventListener("mouseup", upHandler, false);
            return down(e, { x: lastX, y: lastY }, upHandler, moveHandler);
        }
        else {
            e.preventDefault();
            const touches = e.changedTouches;
            const touchId = touches[0].identifier;
            let lastX = touches[0].clientX, lastY = touches[0].clientY;
            const upHandler = (e) => {
                e.preventDefault();
                for (const touch of Array.from(e.changedTouches)) {
                    if (touch.identifier !== touchId)
                        continue;
                    const dx = touch.clientX - lastX, dy = touch.clientY - lastY;
                    window.removeEventListener("touchend", moveHandler);
                    window.removeEventListener("touchcancel", upHandler);
                    window.removeEventListener("touchmove", moveHandler);
                    return up(e, { x: touch.clientX, y: touch.clientY, dx, dy });
                }
            };
            const moveHandler = (e) => {
                e.preventDefault();
                for (const touch of Array.from(e.changedTouches)) {
                    if (touch.identifier !== touchId)
                        continue;
                    const dx = touch.clientX - lastX, dy = touch.clientY - lastY;
                    lastX = touch.clientX;
                    lastY = touch.clientY;
                    return move(e, { x: touch.clientX, y: touch.clientY, dx, dy });
                }
            };
            window.addEventListener("touchend", upHandler, { capture: false, passive: false });
            window.addEventListener("touchcancel", upHandler, { capture: false, passive: false });
            window.addEventListener("touchmove", moveHandler, { capture: false, passive: false });
            return down(e, { x: lastX, y: lastY }, upHandler, moveHandler);
        }
    };
}
function dragHelperReact(move, down, up) {
    const listener = dragHelper(move, down, up);
    return {
        onMouseDown: listener,
        onMouseUp: _Player__WEBPACK_IMPORTED_MODULE_0__["default"].preventCanvasClick,
        onTouchStart: listener
    };
}


/***/ }),

/***/ "./src/utils/media.ts":
/*!****************************!*\
  !*** ./src/utils/media.ts ***!
  \****************************/
/*! exports provided: awaitMediaCanPlay, awaitMediaCanPlayThrough */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "awaitMediaCanPlay", function() { return awaitMediaCanPlay; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "awaitMediaCanPlayThrough", function() { return awaitMediaCanPlayThrough; });
function awaitMediaCanPlay(media) {
    return new Promise((resolve) => {
        if (media.readyState === media.HAVE_FUTURE_DATA) {
            return resolve();
        }
        else {
            media.addEventListener("canplay", () => resolve());
        }
    });
}
function awaitMediaCanPlayThrough(media) {
    return new Promise((resolve) => {
        if (media.readyState === media.HAVE_ENOUGH_DATA) {
            return resolve();
        }
        else {
            media.addEventListener("canplaythrough", () => resolve());
        }
    });
}


/***/ }),

/***/ "./src/utils/misc.ts":
/*!***************************!*\
  !*** ./src/utils/misc.ts ***!
  \***************************/
/*! exports provided: bind, wait, waitFor, range, constrain, between */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "bind", function() { return bind; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "wait", function() { return wait; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "waitFor", function() { return waitFor; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "range", function() { return range; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "constrain", function() { return constrain; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "between", function() { return between; });
function bind(o, methods) {
    for (const method of methods)
        o[method] = o[method].bind(o);
}
function wait(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
function waitFor(callback, interval = 10) {
    return new Promise((resolve) => {
        const checkCondition = () => {
            if (callback()) {
                resolve();
            }
            else {
                setTimeout(checkCondition, interval);
            }
        };
        checkCondition();
    });
}
function range(n) {
    return new Array(n).fill(null).map((_, i) => i);
}
;
function constrain(min, val, max) {
    return Math.min(max, Math.max(min, val));
}
function between(min, val, max) {
    return (min <= val) && (val < max);
}


/***/ }),

/***/ "./src/utils/mobile.ts":
/*!*****************************!*\
  !*** ./src/utils/mobile.ts ***!
  \*****************************/
/*! exports provided: anyHover, onClick */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "anyHover", function() { return anyHover; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "onClick", function() { return onClick; });
const anyHover = window.matchMedia("(any-hover: hover)").matches;
const onClick = (callback) => {
    if (anyHover) {
        return { onClick: callback };
    }
    else {
        let touchId, target;
        return {
            onTouchStart: (e) => {
                if (touchId)
                    return;
                target = e.currentTarget;
                touchId = e.changedTouches[0].identifier;
            },
            onTouchEnd: (e) => {
                if (!touchId)
                    return;
                for (const touch of Array.from(e.changedTouches)) {
                    if (touch.identifier !== touchId)
                        continue;
                    if (target.contains(document.elementFromPoint(touch.clientX, touch.clientY))) {
                        callback(e);
                    }
                    touchId = null;
                }
            }
        };
    }
};


/***/ }),

/***/ "./src/utils/react-utils.ts":
/*!**********************************!*\
  !*** ./src/utils/react-utils.ts ***!
  \**********************************/
/*! exports provided: recursiveMap */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "recursiveMap", function() { return recursiveMap; });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);

function recursiveMap(children, fn) {
    return react__WEBPACK_IMPORTED_MODULE_0__["Children"].map(children, (child) => {
        if (!react__WEBPACK_IMPORTED_MODULE_0__["isValidElement"](child)) {
            return child;
        }
        if ("children" in child.props) {
            child = react__WEBPACK_IMPORTED_MODULE_0__["cloneElement"](child, {
                children: recursiveMap(child.props.children, fn)
            });
        }
        return fn(child);
    });
}


/***/ }),

/***/ "./src/utils/time.ts":
/*!***************************!*\
  !*** ./src/utils/time.ts ***!
  \***************************/
/*! exports provided: parseTime, formatTime, formatTimeMs */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parseTime", function() { return parseTime; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "formatTime", function() { return formatTime; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "formatTimeMs", function() { return formatTimeMs; });
function parseTime(str) {
    const [h, m, s, ms] = str
        .match(/^(?:(?:(\d+):)?(\d+):)?(\d+)(?:\.(\d+))?$/)
        .slice(1)
        .map(x => x || "0");
    const [hours, minutes, seconds, milliseconds] = [h, m, s, ms.padEnd(3, "0")].map(x => parseInt(x, 10));
    return milliseconds + 1000 * (seconds + 60 * (minutes + 60 * hours));
}
function formatTime(time) {
    const minutes = Math.floor(time / 60 / 1000), seconds = Math.floor(time / 1000 % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
function formatTimeMs(time) {
    const milliseconds = Math.floor(time % 1000), minutes = Math.floor(time / 60 / 1000), seconds = Math.floor(time / 1000 % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
}


/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "React" ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = React;

/***/ }),

/***/ "react-dom":
/*!***************************!*\
  !*** external "ReactDOM" ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = ReactDOM;

/***/ })

/******/ });
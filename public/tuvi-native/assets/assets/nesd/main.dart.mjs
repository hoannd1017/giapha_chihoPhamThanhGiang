// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: x0 => new Int16Array(x0),
      AC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      AD: x0 => x0.screen,
      AE: x0 => new ResizeObserver(x0),
      AF: x0 => x0.key,
      AG: x0 => x0.v8BreakIterator,
      AH: x0 => x0.selectionDirection,
      AI: () => globalThis.WeakRef,
      AJ: (x0,x1) => new Blob(x0,x1),
      AK: x0 => x0.navigator,
      AL: (x0,x1) => x0.getAllKeys(x1),
      AM: x0 => x0.body,
      AN: x0 => x0.loader,
      B: s => printToConsole(s),
      BB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      BC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      BD: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      BE: (x0,x1) => x0.getPropertyValue(x1),
      BF: x0 => x0.identifier,
      BG: () => globalThis.Intl,
      BH: x0 => x0.selectionStart,
      BI: (x0,x1,x2) => x0.insertBefore(x1,x2),
      BJ: x0 => globalThis.URL.createObjectURL(x0),
      BK: () => globalThis.window,
      BL: x0 => new Date(x0),
      BM: x0 => x0.signal,
      BN: () => globalThis._flutter,
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: x0 => new Uint16Array(x0),
      CC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      CD: x0 => x0.tabIndex,
      CE: x0 => globalThis.parseFloat(x0),
      CF: x0 => x0.touches,
      CG: (x0,x1) => x0.segment(x1),
      CH: x0 => x0.selectionEnd,
      CI: x0 => x0.id,
      CJ: (x0,x1) => x0.addModule(x1),
      CK: x0 => new Blob(x0),
      CL: (o, p, v) => o[p] = v,
      CM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: x0 => new Int32Array(x0),
      DC: (x0,x1) => x0.querySelector(x1),
      DD: (x0,x1) => x0.contains(x1),
      DE: (x0,x1) => x0.getComputedStyle(x1),
      DF: x0 => x0.pressure,
      DG: x0 => x0.index,
      DH: x0 => x0.keyCode,
      DI: x0 => x0.offsetHeight,
      DJ: x0 => globalThis.URL.revokeObjectURL(x0),
      DK: x0 => globalThis.fetch(x0),
      DL: (x0,x1,x2,x3) => globalThis.IDBKeyRange.bound(x0,x1,x2,x3),
      DM: (x0,x1,x2) => x0.addEventListener(x1,x2),
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      EC: (x0,x1) => x0.item(x1),
      ED: x0 => x0.activeElement,
      EE: x0 => x0.documentElement,
      EF: x0 => x0.tiltY,
      EG: x0 => x0.next(),
      EH: (x0,x1) => x0.scrollIntoView(x1),
      EI: x0 => x0.offsetWidth,
      EJ: (x0,x1) => ({outputChannelCount: x0,processorOptions: x1}),
      EK: x0 => x0.arrayBuffer(),
      EL: (x0,x1,x2) => x0.put(x1,x2),
      EM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      F: () => new Error().stack,
      FB: x0 => new Uint32Array(x0),
      FC: x0 => x0.length,
      FD: x0 => x0.parentNode,
      FE: x0 => x0.computedStyleMap(),
      FF: x0 => x0.tiltX,
      FG: x0 => x0.value,
      FH: x0 => x0.multiViewEnabled,
      FI: x0 => x0.stopPropagation(),
      FJ: (x0,x1,x2) => new AudioWorkletNode(x0,x1,x2),
      FK: x0 => x0.arrayBuffer(),
      FL: (x0,x1) => x0.delete(x1),
      FM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      G: s => JSON.stringify(s),
      GB: x0 => new Float32Array(x0),
      GC: (x0,x1) => x0.querySelectorAll(x1),
      GD: x0 => x0.tagName,
      GE: (x0,x1) => x0.get(x1),
      GF: x0 => x0.pointerType,
      GG: x0 => x0.done,
      GH: (x0,x1) => x0.replaceWith(x1),
      GI: x0 => x0.disabled,
      GJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      GK: (x0,x1) => x0.fetch(x1),
      GL: (x0,x1,x2) => x0.transaction(x1,x2),
      GM: x0 => x0.id,
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      HC: (x0,x1) => x0.getAttribute(x1),
      HD: x0 => x0.target,
      HE: (o, p) => p in o,
      HF: x0 => x0.pointerId,
      HG: (o, m, a) => o[m].apply(o, a),
      HH: (x0,x1) => { x0.type = x1 },
      HI: (x0,x1) => { x0.min = x1 },
      HJ: (o) => {
        const typeofValue = typeof o;
        return (typeofValue === 'object') ||
            typeofValue === 'function';
      },
      HK: (x0,x1) => x0.get(x1),
      HL: (x0,x1) => x0.objectStore(x1),
      HM: x0 => x0.index,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Float64Array(x0),
      IC: x0 => x0.remove(),
      ID: x0 => x0.clientY,
      IE: (x0,x1) => { x0.textContent = x1 },
      IF: x0 => x0.getCoalescedEvents(),
      IG: x0 => x0.iterator,
      IH: (x0,x1) => { x0.className = x1 },
      II: (x0,x1) => { x0.max = x1 },
      IJ: x0 => x0.data,
      IK: x0 => x0.status,
      IL: x0 => x0.name,
      IM: x0 => x0.gamepad,
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      JC: (x0,x1) => x0.appendChild(x1),
      JD: x0 => x0.clientX,
      JE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      JF: (x0,x1) => x0.getModifierState(x1),
      JG: () => globalThis.Symbol,
      JH: (x0,x1) => { x0.tabIndex = x1 },
      JI: (x0,x1) => { x0.disabled = x1 },
      JJ: x0 => x0.audioWorklet,
      JK: x0 => x0.headers,
      JL: x0 => x0.result,
      JM: x0 => x0.value,
      K: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      KB: x0 => new ArrayBuffer(x0),
      KC: (x0,x1) => x0.append(x1),
      KD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      KE: x0 => x0.matches,
      KF: s => s.trimLeft(),
      KG: (x0,x1) => new Intl.Segmenter(x0,x1),
      KH: (x0,x1) => { x0.name = x1 },
      KI: (x0,x1) => { x0.scrollLeft = x1 },
      KJ: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      KK: x0 => x0.history,
      KL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      KM: x0 => x0.axes,
      L: o => o === undefined,
      LB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      LC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      LD: x0 => x0.getBoundingClientRect(),
      LE: (x0,x1) => x0.matchMedia(x1),
      LF: s => s.toUpperCase(),
      LG: x0 => x0.Segmenter,
      LH: (x0,x1) => { x0.placeholder = x1 },
      LI: (x0,x1) => { x0.spellcheck = x1 },
      LJ: x0 => x0.naturalHeight,
      LK: (x0,x1,x2,x3) => x0.putImageData(x1,x2,x3),
      LL: (x0,x1) => { x0.onerror = x1 },
      LM: x0 => x0.buttons,
      M: o => String(o),
      MB: (x0,x1,x2) => new DataView(x0,x1,x2),
      MC: x0 => x0.style,
      MD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      ME: x0 => x0.matches,
      MF: (x0,x1) => x0[x1],
      MG: x0 => x0.buffer,
      MH: (x0,x1) => { x0.autocomplete = x1 },
      MI: (x0,x1) => { x0.disabled = x1 },
      MJ: x0 => x0.naturalWidth,
      MK: x0 => x0.arrayBuffer(),
      ML: x0 => x0.message,
      MM: x0 => x0.getGamepads(),
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: (o, p) => o[p],
      NC: x0 => x0.debugShowSemanticsNodes,
      ND: s => new Date(s * 1000).getTimezoneOffset() * 60,
      NE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      NF: x0 => x0.index,
      NG: x0 => x0.wasmMemory,
      NH: (x0,x1) => { x0.name = x1 },
      NI: (x0,x1) => x0.getRandomValues(x1),
      NJ: (x0,x1) => { x0.src = x1 },
      NK: (x0,x1) => x0.transferFromImageBitmap(x1),
      NL: x0 => x0.name,
      NM: x0 => x0.reset(),
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      OC: o => o,
      OD: Date.now,
      OE: f => f.dartFunction,
      OF: x0 => x0.pop(),
      OG: () => globalThis.window._flutter_skwasmInstance,
      OH: (x0,x1) => { x0.placeholder = x1 },
      OI: () => globalThis.crypto,
      OJ: x0 => x0.decode(),
      OK: x0 => x0.height,
      OL: x0 => x0.error,
      OM: x0 => x0.vibrationActuator,
      P: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      PC: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      PD: (handle) => clearTimeout(handle),
      PE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PF: x0 => x0.flags,
      PG: () => new TextDecoder(),
      PH: (x0,x1) => { x0.action = x1 },
      PI: l => new DataView(new ArrayBuffer(l)),
      PJ: (x0,x1) => { x0.decoding = x1 },
      PK: x0 => x0.width,
      PL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PM: x0 => x0.connected,
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: o => o.byteOffset,
      QC: (x0,x1) => x0.warn(x1),
      QD: (x0,x1) => x0.closest(x1),
      QE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      QF: (a, s) => a.join(s),
      QG: (d, digits) => d.toFixed(digits),
      QH: (x0,x1) => { x0.method = x1 },
      QI: (a, i) => a.splice(i, 1),
      QJ: (x0,x1) => { x0.crossOrigin = x1 },
      QK: x0 => x0.rasterEndMilliseconds,
      QL: (x0,x1) => { x0.onsuccess = x1 },
      QM: x0 => x0.hidden,
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: o => o.buffer,
      RC: x0 => x0.console,
      RD: x0 => x0.bottom,
      RE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      RF: (x0,x1) => x0.error(x1),
      RG: x0 => x0.maxHeight,
      RH: (x0,x1) => { x0.noValidate = x1 },
      RI: a => a.pop(),
      RJ: (x0,x1) => x0.createObjectURL(x1),
      RK: x0 => x0.rasterStartMilliseconds,
      RL: x0 => x0.target,
      RM: (x0,x1) => x0.querySelector(x1),
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: Function.prototype.call.bind(DataView.prototype.getUint8),
      SC: () => globalThis.window,
      SD: x0 => x0.top,
      SE: (o, i) => o[i],
      SF: () => globalThis.console,
      SG: x0 => x0.maxWidth,
      SH: (x0,x1) => x0.removeAttribute(x1),
      SI: (map, o, v) => map.set(o, v),
      SJ: x0 => x0.URL,
      SK: x0 => x0.imageBitmaps,
      SL: x0 => x0.indexedDB,
      SM: (x0,x1) => x0.createElement(x1),
      T: x0 => new Promise(x0),
      TB: (b, o) => new DataView(b, o),
      TC: (o, c) => o instanceof c,
      TD: x0 => x0.right,
      TE: o => o.length,
      TF: s => s.trimRight(),
      TG: x0 => x0.minHeight,
      TH: x0 => x0.isConnected,
      TI: (map, o) => map.get(o),
      TJ: x0 => new Blob(x0),
      TK: (x0,x1) => { x0.height = x1 },
      TL: (x0,x1,x2) => x0.setItem(x1,x2),
      TM: (o, a) => o + a,
      U: (x0,x1,x2) => x0.call(x1,x2),
      UB: (b, o, l) => new DataView(b, o, l),
      UC: (x0,x1) => x0.exec(x1),
      UD: x0 => x0.left,
      UE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      UF: x0 => x0.blur(),
      UG: x0 => x0.minWidth,
      UH: x0 => x0.click(),
      UI: () => new WeakMap(),
      UJ: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      UK: (x0,x1) => { x0.width = x1 },
      UL: x0 => x0.localStorage,
      UM: x0 => x0.children,
      V: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      VB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      VC: x0 => x0.length,
      VD: x0 => x0.clientY,
      VE: x0 => x0.language,
      VF: x0 => x0.button,
      VG: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      VH: (x0,x1) => x0.getElementsByClassName(x1),
      VI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      VJ: x0 => new window.ImageDecoder(x0),
      VK: x0 => x0.convertToBlob(),
      VL: (x0,x1) => x0.getItem(x1),
      VM: (x0,x1) => { x0.id = x1 },
      W: x0 => new Array(x0),
      WB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      WC: (x0,x1) => { x0.lastIndex = x1 },
      WD: x0 => x0.clientX,
      WE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      WF: x0 => x0.innerHeight,
      WG: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      WH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      WI: (a, s, e) => a.slice(s, e),
      WJ: x0 => x0.name,
      WK: (x0,x1,x2) => new ImageData(x0,x1,x2),
      WL: (x0,x1) => x0.key(x1),
      WM: x0 => x0.click(),
      X: o => [o],
      XB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      XC: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      XD: x0 => x0.changedTouches,
      XE: () => globalThis.window.FinalizationRegistry,
      XF: x0 => x0.innerWidth,
      XG: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      XH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      XI: x0 => x0.disconnect(),
      XJ: x0 => x0.repetitionCount,
      XK: (x0,x1) => x0.getContext(x1),
      XL: x0 => x0.length,
      XM: (x0,x1) => x0.removeChild(x1),
      Y: (o0, o1) => [o0, o1],
      YB: (t, s) => t.set(s),
      YC: o => o instanceof RegExp,
      YD: x0 => x0.offsetY,
      YE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YF: x0 => x0.height,
      YG: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      YH: (x0,x1) => x0.dispatchEvent(x1),
      YI: x0 => x0.close(),
      YJ: x0 => x0.frameCount,
      YK: (x0,x1) => new OffscreenCanvas(x0,x1),
      YL: x0 => x0.canvasKitMaximumSurfaces,
      YM: x0 => x0.firstChild,
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      ZC: (string, times) => string.repeat(times),
      ZD: x0 => x0.offsetX,
      ZE: x0 => new window.FinalizationRegistry(x0),
      ZF: x0 => x0.width,
      ZG: x0 => x0.history,
      ZH: (x0,x1) => x0.createEvent(x1),
      ZI: x0 => x0.stop(),
      ZJ: x0 => x0.selectedTrack,
      ZK: x0 => x0.allocationSize(),
      ZL: x0 => x0.hostElement,
      ZM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      aC: x0 => x0.dotAll,
      aD: x0 => x0.type,
      aE: (x0,x1) => x0.unregister(x1),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.search,
      aH: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      aI: (x0,x1) => x0.postMessage(x1),
      aJ: x0 => x0.completed,
      aK: (x0,x1) => x0.copyTo(x1),
      aL: x0 => x0.location,
      aM: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      b: (x0,x1,x2) => { x0[x1] = x2 },
      bB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      bC: x0 => x0.unicode,
      bD: x0 => x0.maxTouchPoints,
      bE: (x0,x1) => x0.contains(x1),
      bF: x0 => x0.clientWidth,
      bG: x0 => x0.location,
      bH: x0 => x0.readText(),
      bI: x0 => x0.port,
      bJ: x0 => x0.ready,
      bK: (x0,x1) => { x0.height = x1 },
      bL: (x0,x1) => x0.getModifierState(x1),
      bM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      c: o => o,
      cB: Function.prototype.call.bind(DataView.prototype.getUint32),
      cC: x0 => x0.ignoreCase,
      cD: x0 => x0.platform,
      cE: (s) => +s,
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.pathname,
      cH: x0 => x0.clipboard,
      cI: x0 => x0.currentTime,
      cJ: x0 => x0.tracks,
      cK: (x0,x1) => { x0.width = x1 },
      cL: x0 => x0.metaKey,
      cM: x0 => x0.length,
      d: (o, p) => o[p],
      dB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      dC: x0 => x0.multiline,
      dD: x0 => x0.body,
      dE: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      dF: (x0,x1) => { x0.name = x1 },
      dG: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      dH: (x0,x1) => x0.writeText(x1),
      dI: x0 => x0.port2,
      dJ: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      dK: (x0,x1) => x0.toDataURL(x1),
      dL: x0 => x0.altKey,
      dM: (x0,x1) => x0.item(x1),
      e: () => globalThis,
      eB: Function.prototype.call.bind(DataView.prototype.getInt32),
      eC: (string, token) => string.split(token),
      eD: () => globalThis.document,
      eE: s => s.trim(),
      eF: x0 => x0.head,
      eG: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      eH: x0 => x0.unlock(),
      eI: () => new MessageChannel(),
      eJ: (x0,x1) => x0.decode(x1),
      eK: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      eL: x0 => x0.ctrlKey,
      eM: x0 => x0.size,
      f: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      fC: o => o instanceof Array,
      fD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      fE: x0 => x0.classList,
      fF: (x0,x1) => x0.removeChild(x1),
      fG: o => Object.keys(o),
      fH: (x0,x1) => x0.lock(x1),
      fI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fJ: x0 => x0.displayHeight,
      fK: (x0,x1) => x0.getContext(x1),
      fL: x0 => x0.isComposing,
      fM: x0 => x0.name,
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: o => o instanceof Uint16Array,
      gC: (a, i) => a[i],
      gD: x0 => x0.hasFocus(),
      gE: x0 => x0.preventDefault(),
      gF: x0 => x0.firstChild,
      gG: x0 => x0.state,
      gH: x0 => x0.orientation,
      gI: (x0,x1) => { x0.onmessage = x1 },
      gJ: x0 => x0.displayWidth,
      gK: x0 => x0.format,
      gL: x0 => x0.code,
      gM: x0 => x0.type,
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: Function.prototype.call.bind(DataView.prototype.getUint16),
      hC: a => a.length,
      hD: x0 => x0.relatedTarget,
      hE: x0 => x0.parent,
      hF: x0 => x0.viewConstraints,
      hG: x0 => x0.hash,
      hH: (x0,x1) => x0.querySelector(x1),
      hI: x0 => x0.port1,
      hJ: x0 => x0.duration,
      hK: (x0,x1) => x0.getElementById(x1),
      hL: x0 => x0.repeat,
      hM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      i: (l, r) => l === r,
      iB: o => o instanceof Int16Array,
      iC: (x0,x1) => x0.test(x1),
      iD: x0 => x0.shiftKey,
      iE: x0 => x0.timeStamp,
      iF: x0 => x0.hostElement,
      iG: x0 => x0.state,
      iH: (x0,x1) => { x0.title = x1 },
      iI: x0 => x0.resume(),
      iJ: x0 => x0.image,
      iK: (x0,x1) => x0.add(x1),
      iL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      iM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      j: x0 => x0.random(),
      jB: Function.prototype.call.bind(DataView.prototype.getInt16),
      jC: x0 => x0.userAgent,
      jD: (decoder, codeUnits) => decoder.decode(codeUnits),
      jE: (x0,x1) => x0.hasAttribute(x1),
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: (x0,x1) => x0.go(x1),
      jH: (x0,x1) => x0.vibrate(x1),
      jI: (x0,x1) => x0.warn(x1),
      jJ: () => globalThis.window.ImageDecoder,
      jK: x0 => x0.remove(),
      jL: x0 => x0.userAgent,
      jM: x0 => x0.files,
      k: o => o,
      kB: o => o instanceof Uint8ClampedArray,
      kC: x0 => x0.navigator,
      kD: () => new TextDecoder("utf-8", {fatal: true}),
      kE: x0 => x0.buttons,
      kF: x0 => ({runApp: x0}),
      kG: x0 => x0.parentElement,
      kH: x0 => x0.arrayBuffer(),
      kI: () => globalThis.console,
      kJ: (x0,x1) => x0.revokeObjectURL(x1),
      kK: x0 => x0.classList,
      kL: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      kM: (x0,x1) => { x0.display = x1 },
      l: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      lB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      lC: Function.prototype.call.bind(String.prototype.toLowerCase),
      lD: () => new TextDecoder("utf-8", {fatal: false}),
      lE: x0 => x0.ctrlKey,
      lF: () => typeof dartUseDateNowForTicks !== "undefined",
      lG: (x0,x1) => x0.querySelectorAll(x1),
      lH: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      lI: x0 => x0.state,
      lJ: x0 => x0.close(),
      lK: () => globalThis.document,
      lL: x0 => x0.baseURI,
      lM: x0 => x0.style,
      m: () => globalThis.Math,
      mB: Function.prototype.call.bind(DataView.prototype.setInt32),
      mC: Object.is,
      mD: (a, i, v) => a[i] = v,
      mE: x0 => x0.y,
      mF: () => Date.now(),
      mG: (x0,x1) => x0.removeProperty(x1),
      mH: x0 => x0.status,
      mI: (x0,x1,x2,x3) => x0.createBuffer(x1,x2,x3),
      mJ: () => new FileReader(),
      mK: (x0,x1,x2) => x0.open(x1,x2),
      mL: x0 => x0.document,
      mM: (x0,x1) => { x0.accept = x1 },
      n: (x0,x1) => x0.prepend(x1),
      nB: Function.prototype.call.bind(DataView.prototype.setUint32),
      nC: x0 => x0.vendor,
      nD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      nE: x0 => x0.x,
      nF: () => 1000 * performance.now(),
      nG: (x0,x1) => x0.add(x1),
      nH: (x0,x1) => x0.fetch(x1),
      nI: (x0,x1,x2) => x0.copyToChannel(x1,x2),
      nJ: (x0,x1) => x0.readAsArrayBuffer(x1),
      nK: x0 => x0.close(),
      nL: x0 => x0.abort(),
      nM: (x0,x1) => { x0.multiple = x1 },
      o: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      oB: Function.prototype.call.bind(DataView.prototype.setInt16),
      oC: (x0,x1) => x0.createTextNode(x1),
      oD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      oE: x0 => x0.scrollTop,
      oF: (x0,x1) => x0.requestAnimationFrame(x1),
      oG: x0 => x0.data,
      oH: x0 => x0.content,
      oI: x0 => x0.createBufferSource(),
      oJ: x0 => x0.result,
      oK: x0 => x0.message,
      oL: () => new AbortController(),
      oM: (x0,x1) => { x0.draggable = x1 },
      p: b => !!b,
      pB: Function.prototype.call.bind(DataView.prototype.setUint16),
      pC: (x0,x1) => { x0.id = x1 },
      pD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      pE: x0 => x0.offsetTop,
      pF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      pG: (x0,x1) => { x0.scrollTop = x1 },
      pH: x0 => x0.document,
      pI: (x0,x1) => x0.connect(x1),
      pJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      pK: x0 => x0.name,
      pL: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      pM: (x0,x1) => { x0.type = x1 },
      q: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qB: Function.prototype.call.bind(DataView.prototype.setUint8),
      qC: (x0,x1) => { x0.nonce = x1 },
      qD: x0 => x0.visibilityState,
      qE: x0 => x0.scrollLeft,
      qF: x0 => x0.now(),
      qG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      qH: x0 => x0.debugSkipFontRetryDelay,
      qI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qJ: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      qK: (x0,x1) => ({keyPath: x0,autoIncrement: x1}),
      qL: (x0,x1) => globalThis.fetch(x0,x1),
      qM: (x0,x1) => { x0.download = x1 },
      r: (x0,x1) => x0.focus(x1),
      rB: Function.prototype.call.bind(DataView.prototype.setInt8),
      rC: x0 => x0.nonce,
      rD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      rE: x0 => x0.offsetLeft,
      rF: x0 => x0.performance,
      rG: (x0,x1) => { x0.value = x1 },
      rH: (x0,x1,x2) => x0.set(x1,x2),
      rI: (x0,x1) => x0.start(x1),
      rJ: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      rK: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      rL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      rM: (x0,x1) => { x0.target = x1 },
      s: () => ({}),
      sB: Function.prototype.call.bind(DataView.prototype.getInt8),
      sC: () => globalThis.window.flutterConfiguration,
      sD: x0 => x0.disconnect(),
      sE: x0 => x0.offsetParent,
      sF: x0 => new Uint8Array(x0),
      sG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      sH: x0 => x0.fontFallbackBaseUrl,
      sI: (x0,x1) => { x0.onended = x1 },
      sJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      sK: x0 => x0.autoIncrement,
      sL: (x0,x1) => x0.forEach(x1),
      sM: (x0,x1) => { x0.href = x1 },
      t: (o, p, v) => o[p] = v,
      tB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      tC: (x0,x1) => x0.attachShadow(x1),
      tD: x0 => new Intl.Locale(x0),
      tE: (o, p, r) => o.replace(p, () => r),
      tF: (x0,x1,x2) => x0.slice(x1,x2),
      tG: (x0,x1) => { x0.value = x1 },
      tH: (handle) => clearInterval(handle),
      tI: x0 => x0.destination,
      tJ: () => new XMLHttpRequest(),
      tK: (o, t) => typeof o === t,
      tL: x0 => x0.statusText,
      tM: x0 => x0.length,
      u: () => [],
      uB: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      uC: (x0,x1) => x0.createElement(x1),
      uD: x0 => x0.region,
      uE: (o, p, r) => o.replaceAll(p, () => r),
      uF: (x0,x1) => x0.decode(x1),
      uG: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      uH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      uI: (x0,x1) => { x0.buffer = x1 },
      uJ: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      uK: x0 => x0.keyPath,
      uL: x0 => x0.url,
      uM: x0 => x0.getReader(),
      v: (a, i) => a.push(i),
      vB: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      vC: x0 => x0.scale,
      vD: x0 => x0.script,
      vE: x0 => x0.deltaMode,
      vF: (x0,x1) => x0.adoptText(x1),
      vG: x0 => x0.value,
      vH: () => Date.now(),
      vI: x0 => x0.sampleRate,
      vJ: x0 => x0.send(),
      vK: x0 => x0.name,
      vL: x0 => x0.getReader(),
      vM: x0 => x0.value,
      w: x0 => new Int8Array(x0),
      wB: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      wC: x0 => x0.visualViewport,
      wD: x0 => x0.language,
      wE: x0 => x0.deltaY,
      wF: x0 => x0.first(),
      wG: x0 => x0.selectionDirection,
      wH: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      wI: x0 => ({sampleRate: x0}),
      wJ: x0 => x0.type,
      wK: (x0,x1) => x0.get(x1),
      wL: x0 => x0.read(),
      wM: x0 => x0.done,
      x: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      xB: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      xC: x0 => x0.devicePixelRatio,
      xD: x0 => x0.languages,
      xE: x0 => x0.deltaX,
      xF: x0 => x0.next(),
      xG: x0 => x0.selectionStart,
      xH: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      xI: x0 => new AudioContext(x0),
      xJ: x0 => x0.response,
      xK: x0 => x0.getTime(),
      xL: x0 => x0.value,
      xM: x0 => x0.read(),
      y: x0 => new Uint8Array(x0),
      yB: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      yC: x0 => x0.height,
      yD: (x0,x1) => x0.observe(x1),
      yE: x0 => x0.wheelDeltaY,
      yF: x0 => x0.current(),
      yG: x0 => x0.selectionEnd,
      yH: x0 => new WeakRef(x0),
      yI: (x0,x1) => x0.info(x1),
      yJ: (x0,x1) => { x0.responseType = x1 },
      yK: x0 => globalThis.Object.keys(x0),
      yL: x0 => x0.done,
      yM: x0 => x0.body,
      z: x0 => new Uint8ClampedArray(x0),
      zB: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      zC: x0 => x0.width,
      zD: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      zE: x0 => x0.wheelDeltaX,
      zF: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      zG: x0 => x0.value,
      zH: x0 => x0.deref(),
      zI: x0 => ({type: x0}),
      zJ: x0 => x0.vendor,
      zK: x0 => x0.length,
      zL: x0 => x0.cancel(),
      zM: x0 => x0.assetBase,

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}

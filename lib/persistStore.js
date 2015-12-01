'use strict';

exports.__esModule = true;
exports['default'] = persistStore;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashForeach = require('lodash.foreach');

var _lodashForeach2 = _interopRequireDefault(_lodashForeach);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _defaultsAsyncLocalStorage = require('./defaults/asyncLocalStorage');

var _defaultsAsyncLocalStorage2 = _interopRequireDefault(_defaultsAsyncLocalStorage);

function persistStore(store, config, onComplete) {
  if (config === undefined) config = {};

  // defaults
  var blacklist = config.blacklist || [];
  var whitelist = config.whitelist || false;
  var rehydrateAction = config.rehydrateAction || defaultRehydrateAction;
  var completeAction = config.completeAction || defaultCompleteAction;
  var serialize = config.serialize || defaultSerialize;
  var deserialize = config.deserialize || defaultDeserialize;
  var transforms = config.transforms || [];
  var storage = config.storage || _defaultsAsyncLocalStorage2['default'];
  var debounce = config.debounce || false;
  var shouldRestore = !config.skipRestore;

  // initialize values
  var timeIterator = null;
  var lastState = store.getState();
  var purgeMode = false;
  var restoreCount = 0;
  var completionCount = 0;
  var storesToProcess = [];
  var restoredState = {};

  // restore
  if (shouldRestore) {
    _lodashForeach2['default'](lastState, function (s, key) {
      if (whitelistBlacklistCheck(key)) return;
      restoreCount += 1;
      setImmediate(function () {
        restoreKey(key, function (err, substate) {
          if (err) substate = null;
          completionCount += 1;
          restoredState[key] = substate;
          if (completionCount === restoreCount) rehydrationComplete();
        });
      });
    });
    if (restoreCount === 0) rehydrationComplete();
  } else rehydrationComplete();

  // store
  store.subscribe(function () {
    if (timeIterator !== null) clearInterval(timeIterator);

    var state = store.getState();
    _lodashForeach2['default'](state, function (subState, key) {
      if (whitelistBlacklistCheck(key)) return;
      if (lastState[key] === state[key]) return;
      if (storesToProcess.indexOf(key) !== -1) return;
      storesToProcess.push(key);
    });

    // time iterator (read: debounce)
    timeIterator = setInterval(function () {
      if (storesToProcess.length === 0) {
        clearInterval(timeIterator);
        return;
      }

      var key = createStorageKey(storesToProcess[0]);
      var endState = transforms.reduce(function (subState, transformer) {
        return transformer['in'](subState);
      }, state[storesToProcess[0]]);
      if (typeof endState !== 'undefined') storage.setItem(key, serialize(endState), warnIfSetError(key));
      storesToProcess.shift();
    }, debounce);

    lastState = state;
  });

  function whitelistBlacklistCheck(key) {
    if (whitelist && whitelist.indexOf(key) === -1) return true;
    if (blacklist.indexOf(key) !== -1) return true;
    return false;
  }

  function restoreKey(key, cb) {
    storage.getItem(createStorageKey(key), function (err, serialized) {
      if (err && process.env.NODE_ENV !== 'production') console.warn('Error restoring data for key:', key, err);else rehydrate(key, serialized, cb);
    });
  }

  function rehydrate(key, serialized, cb) {
    var state = null;

    try {
      var data = deserialize(serialized);
      state = transforms.reduceRight(function (subState, transformer) {
        return transformer.out(subState);
      }, data);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.warn('Error restoring data for key:', key, err);
      storage.removeItem(key, warnIfRemoveError(key));
    }

    if (state !== null) {
      if (purgeMode === '*' || Array.isArray(purgeMode) && purgeMode.indexOf(key) !== -1) return;
      store.dispatch(rehydrateAction(key, state));
    }
    cb && cb(null, state);
  }

  function rehydrationComplete() {
    store.dispatch(completeAction());
    setImmediate(function () {
      return onComplete && onComplete(null, restoredState);
    });
  }

  function purge(keys) {
    purgeMode = keys;
    _lodashForeach2['default'](keys, function (key) {
      storage.removeItem(createStorageKey(key), warnIfRemoveError(key));
    });
  }

  function purgeAll() {
    purgeMode = '*';
    storage.getAllKeys(function (err, allKeys) {
      if (err && process.env.NODE_ENV !== 'production') {
        console.warn('Error in storage.getAllKeys');
      }
      purge(allKeys.filter(function (key) {
        return key.indexOf(_constants2['default'].keyPrefix) === 0;
      }).map(function (key) {
        return key.slice(_constants2['default'].keyPrefix.length);
      }));
    });
  }

  // return `persistor`
  return {
    rehydrate: rehydrate,
    purge: purge,
    purgeAll: purgeAll
  };
}

function warnIfRemoveError(key) {
  return function removeError(err) {
    if (err && process.env.NODE_ENV !== 'production') {
      console.warn('Error storing data for key:', key, err);
    }
  };
}

function warnIfSetError(key) {
  return function setError(err) {
    if (err && process.env.NODE_ENV !== 'production') {
      console.warn('Error storing data for key:', key, err);
    }
  };
}

function createStorageKey(key) {
  return _constants2['default'].keyPrefix + key;
}

function defaultRehydrateAction(key, data) {
  return {
    type: _constants2['default'].REHYDRATE,
    key: key,
    payload: data
  };
}

function defaultCompleteAction() {
  return {
    type: _constants2['default'].REHYDRATE_COMPLETE
  };
}

function defaultSerialize(data) {
  return JSON.stringify(data);
}

function defaultDeserialize(serial) {
  return JSON.parse(serial);
}
module.exports = exports['default'];
'use strict';

exports.__esModule = true;
var nextTick = process && process.nextTick ? process.nextTick : setImmediate;

var noLS = process && process.env && process.env.NODE_ENV === 'production' ? function () {
  /* noop */return null;
} : function () {
  console.error('redux-persist asyncLocalStorage requires a global localStorage object. Either use a different storage backend or if this is a universal redux application you probably should conditionally persist like so: https://gist.github.com/rt2zz/ac9eb396793f95ff3c3b');
  return null;
};

var localStorage = typeof window === 'object' && typeof window.localStorage !== 'undefined' ? window.localStorage : { getItem: noLS, setItem: noLS, removeItem: noLS, getAllKeys: noLS };

exports['default'] = {
  getItem: function getItem(key, cb) {
    try {
      var s = localStorage.getItem(key);
      nextTick(function () {
        cb(null, s);
      });
    } catch (e) {
      cb(e);
    }
  },
  setItem: function setItem(key, string, cb) {
    try {
      localStorage.setItem(key, string);
      nextTick(function () {
        cb(null);
      });
    } catch (e) {
      cb(e);
    }
  },
  removeItem: function removeItem(key, cb) {
    try {
      localStorage.removeItem(key);
      nextTick(function () {
        cb(null);
      });
    } catch (e) {
      cb(e);
    }
  },
  getAllKeys: function getAllKeys(cb) {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      nextTick(function () {
        cb(null, keys);
      });
    } catch (e) {
      cb(e);
    }
  }
};
module.exports = exports['default'];
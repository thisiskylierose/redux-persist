'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodashIsplainobject = require('lodash.isplainobject');

var _lodashIsplainobject2 = _interopRequireDefault(_lodashIsplainobject);

var _bufferActions = require('./bufferActions');

var _bufferActions2 = _interopRequireDefault(_bufferActions);

var _constants = require('./constants');

module.exports = function autoRehydrate() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return function (next) {
    return function (reducer, initialState) {
      var rehydrationReducer = createRehydrationReducer(reducer);

      // buffer actions
      var store = next(rehydrationReducer, initialState);
      var dispatch = _bufferActions2['default'](onBufferEnd)(store.dispatch);

      return _extends({}, store, {
        dispatch: dispatch
      });
    };
  };

  function onBufferEnd(err, queue) {
    if (err) console.error(err);
    if (config.log) console.log('redux-persist/autoRehydrate action buffer released', queue);
  }

  function checkIsObject(data, reducedState, key) {
    if (data.size || data.hasOwnProperty('size') || reducedState[key].size || reducedState[key].hasOwnProperty('size')) {
      return true;
    } else if (_lodashIsplainobject2['default'](data) || _lodashIsplainobject2['default'](reducedState[key])) {
      return true;
    }
    return false;
  }

  function createRehydrationReducer(reducer) {
    return function (state, action) {
      if (action.type === _constants.REHYDRATE) {
        var key = action.key;
        var data = action.payload;
        var reducedState = reducer(state, action);

        // if reducer modifies substate, skip auto rehydration
        if (state[key] !== reducedState[key]) {
          if (config.log) console.log('redux-persist/autoRehydrate sub state for key "%s" modified, skipping autoRehydrate', key);
          return reducedState;
        }

        var autoReducedState = _extends({}, reducedState);
        var isObject = checkIsObject(data, reducedState, key);
        if (!isObject) {
          // assign value
          autoReducedState[key] = data;
        } else {
          // shallow merge
          var subState = {};
          for (var subkey in reducedState[key]) {
            subState[subkey] = reducedState[key][subkey];
          }
          for (var datakey in data) {
            subState[datakey] = data[datakey];
          }
          autoReducedState[key] = subState;
        }

        if (config.log) console.log('redux-persist/autoRehydrate key: %s, rehydrated to:', key, autoReducedState[key]);
        return autoReducedState;
      } else {
        return reducer(state, action);
      }
    };
  }
};
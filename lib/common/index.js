"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raPromiseMiddlewaer = exports.registerPromise = exports.loadingModel = void 0;
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var effectsMap = {};
function delay(time, value) {
    if (time === void 0) { time = 300; }
    if (value === void 0) { value = true; }
    return new Promise(function (resolve) {
        setTimeout(function () { return resolve(value); }, time);
    });
}
function nextTick(callback, thisObject) {
    Promise.resolve().then(callback.bind(thisObject));
}
// 用来做统一的异步状态管理
exports.loadingModel = {
    namespace: 'loading',
    state: {
        effects: {},
    },
    reducers: {
        updateLoading: function (state, action) {
            if (action.payload && typeof action.payload === 'object') {
                Object.keys(action.payload).forEach(function (key) {
                    state.effects[key] = action.payload[key];
                });
            }
            return state;
        },
    },
};
function dispatchFactory(namespace, dispatch) {
    return function (action) {
        if (namespace &&
            action.type &&
            typeof action.type === 'string' &&
            !action.type.includes('/')) {
            action.type = namespace + "/" + action.type;
        }
        return new Promise(function (resolve) {
            var ret = dispatch(action);
            if (typeof ret.then === 'function') {
                ret.then(resolve);
            }
            else {
                resolve(ret);
            }
        });
    };
}
function registerPromise(key, effFun) {
    effectsMap[key] = effFun;
}
exports.registerPromise = registerPromise;
function raPromiseMiddlewaer(middel) {
    return function (next) {
        return function (action) {
            var fun = effectsMap[action.type];
            if (fun) {
                return new Promise(function (resolve) {
                    var _a;
                    var funResult = fun(action, {
                        select: middel.getState,
                        dispatch: dispatchFactory(action.type.includes('/') ? action.type.split('/')[0] : undefined, middel.dispatch),
                        delay: delay,
                        nextTick: nextTick,
                        lodash: lodash_1.default,
                    });
                    if (typeof funResult.then === 'function') {
                        middel.dispatch({
                            type: 'loading/updateLoading',
                            payload: (_a = {}, _a[action.type] = true, _a),
                        });
                        nextTick(function () {
                            funResult.then(function (ret) {
                                var _a;
                                middel.dispatch({
                                    type: 'loading/updateLoading',
                                    payload: (_a = {}, _a[action.type] = false, _a),
                                });
                                resolve(ret);
                            });
                        });
                    }
                });
            }
            return next(action);
        };
    };
}
exports.raPromiseMiddlewaer = raPromiseMiddlewaer;
//# sourceMappingURL=index.js.map
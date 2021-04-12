"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.raPromiseMiddleware = exports.registerPromise = exports.mixinLoadingReducers = exports.mixinLoadingState = exports.loadingModel = void 0;
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var REDUCER_FUNC_NAME = Symbol
    ? Symbol('@@#loadingFuncname#@@')
    : '@@#loadingFuncname#@@';
var effectsMap = {};
function delay(time, value) {
    if (time === void 0) { time = 300; }
    if (value === void 0) { value = true; }
    return new Promise(function (resolve) {
        setTimeout(function () { return resolve(value); }, time);
    });
}
function nextTick(callback) {
    Promise.resolve().then(callback);
}
// 用来做统一的异步状态管理
exports.loadingModel = {
    namespace: 'loading',
    state: {
        effects: {},
    },
    reducers: (_a = {},
        _a[REDUCER_FUNC_NAME] = function (state, action) {
            if (action.payload && typeof action.payload === 'object') {
                Object.keys(action.payload).forEach(function (key) {
                    state.effects[key] = action.payload[key];
                });
            }
            return Object.assign({}, state);
        },
        _a),
};
// 混入 initState
function mixinLoadingState(initState) {
    if (initState === void 0) { initState = {}; }
    return Object.assign(initState, { loading: exports.loadingModel.state });
}
exports.mixinLoadingState = mixinLoadingState;
// 混入 redux
function mixinLoadingReducers(initState, reducers) {
    if (initState === void 0) { initState = { loading: { effects: {} } }; }
    var newReducers = function (state, action) {
        if (state === void 0) { state = initState; }
        if (exports.loadingModel.reducers[action.type]) {
            var func = exports.loadingModel.reducers[action.type];
            var loadingState = func(state.loading, action);
            state.loading = loadingState;
            return Object.assign({}, state);
        }
        return reducers(state, action);
    };
    return newReducers;
}
exports.mixinLoadingReducers = mixinLoadingReducers;
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
function raPromiseMiddleware(store) {
    return function (next) {
        return function (action) {
            var effectFun = effectsMap[action.type];
            if (effectFun) {
                return new Promise(function (resolve, reject) {
                    var _a;
                    var funResult = effectFun(action, {
                        select: store.getState,
                        dispatch: dispatchFactory(action.type.includes('/') ? action.type.split('/')[0] : undefined, store.dispatch),
                        delay: delay,
                        nextTick: nextTick,
                        lodash: lodash_1.default,
                    });
                    //  如果是 Promise 函数走 异步过程
                    if (funResult &&
                        typeof funResult === 'object' &&
                        typeof funResult.then === 'function') {
                        store.dispatch({
                            type: REDUCER_FUNC_NAME,
                            payload: (_a = {}, _a[action.type] = true, _a),
                        });
                        nextTick(function () {
                            funResult
                                .then(function (ret) {
                                var _a;
                                store.dispatch({
                                    type: REDUCER_FUNC_NAME,
                                    payload: (_a = {}, _a[action.type] = false, _a),
                                });
                                resolve(ret);
                            })
                                .catch(reject);
                        });
                    }
                    else {
                        // 如果不是 Promise 函数直接返回结果
                        resolve(funResult);
                    }
                });
            }
            return next(action);
        };
    };
}
exports.raPromiseMiddleware = raPromiseMiddleware;
//# sourceMappingURL=index.js.map
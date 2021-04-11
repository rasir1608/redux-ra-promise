var _a;
import _ from 'lodash';
var reducerFuncname = Symbol('@@loadingFuncname');
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
export var loadingModel = {
    namespace: 'loading',
    state: {
        effects: {},
    },
    reducers: (_a = {},
        _a[reducerFuncname] = function (state, action) {
            if (action.payload && typeof action.payload === 'object') {
                Object.keys(action.payload).forEach(function (key) {
                    state.effects[key] = action.payload[key];
                });
            }
            return state;
        },
        _a),
};
// 混入 initState
export function mixinLoadingState(initState) {
    if (initState === void 0) { initState = {}; }
    return Object.assign(initState, { loading: loadingModel.state });
}
// 混入 redux
export function mixinLoadingReducers(initState, reducers) {
    if (initState === void 0) { initState = { loading: { effects: {} } }; }
    var newReducers = function (state, action) {
        if (state === void 0) { state = initState; }
        if (loadingModel.reducers[action.type]) {
            var func = loadingModel.reducers[action.type];
            var namestate = func(state.loading, action);
            state.loading = namestate;
            return state;
        }
        return reducers(state, action);
    };
    return newReducers;
}
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
export function registerPromise(key, effFun) {
    effectsMap[key] = effFun;
}
export function raPromiseMiddlewaer(store) {
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
                        lodash: _,
                    });
                    //  如果是 Promise 函数走 异步过程
                    if (funResult &&
                        typeof funResult === 'object' &&
                        typeof funResult.then === 'function') {
                        store.dispatch({
                            type: reducerFuncname,
                            payload: (_a = {}, _a[action.type] = true, _a),
                        });
                        nextTick(function () {
                            funResult
                                .then(function (ret) {
                                var _a;
                                store.dispatch({
                                    type: reducerFuncname,
                                    payload: (_a = {}, _a[action.type] = false, _a),
                                });
                                resolve(ret);
                            })
                                .catch(reject);
                        });
                    }
                    else {
                        // 如果不是 Promise 函数直接返回 结果
                        resolve(funResult);
                    }
                });
            }
            return next(action);
        };
    };
}
//# sourceMappingURL=index.js.map
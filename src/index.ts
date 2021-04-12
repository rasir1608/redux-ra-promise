import { AnyAction, Reducer } from 'redux';
import _, { LoDashStatic } from 'lodash';

const REDUCER_FUNC_NAME = Symbol
  ? Symbol('@@#loadingFuncname#@@')
  : '@@#loadingFuncname#@@';
export { AnyAction, Reducer };

export type NormalObject = { [key: string]: any };

export type EffectHelper = {
  select: () => NormalObject;
  dispatch: (action: AnyAction) => Promise<any>;
  delay: (time: number, value?: any) => Promise<any>;
  nextTick: (callback: () => void) => void;
  lodash: LoDashStatic;
};

export type Effect = (action: AnyAction, helper: EffectHelper) => Promise<any>;

export type LoadingModelState = {
  effects: { [key: string]: boolean };
};
export interface LoadingModel {
  namespace: 'loading';
  state: LoadingModelState;
  reducers: {
    [key: string]: Reducer;
  };
}

const effectsMap: { [key: string]: Effect } = {};

function delay(time = 300, value = true) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), time);
  });
}

function nextTick(callback: () => void) {
  Promise.resolve().then(callback);
}

// 用来做统一的异步状态管理
export const loadingModel: LoadingModel = {
  namespace: 'loading',
  state: {
    effects: {},
  },
  reducers: {
    [REDUCER_FUNC_NAME]: (state: NormalObject, action: AnyAction) => {
      if (action.payload && typeof action.payload === 'object') {
        Object.keys(action.payload).forEach((key) => {
          state.effects[key] = action.payload[key];
        });
      }
      return Object.assign({}, state);
    },
  },
};

// 混入 initState
export function mixinLoadingState(initState: NormalObject = {}) {
  return Object.assign(initState, { loading: loadingModel.state });
}
// 混入 redux
export function mixinLoadingReducers(
  initState: NormalObject = { loading: { effects: {} } },
  reducers: Reducer,
): Reducer {
  const newReducers = function (state = initState, action: AnyAction) {
    if (loadingModel.reducers[action.type]) {
      const func = loadingModel.reducers[action.type];
      const loadingState = func(state.loading, action);
      state.loading = loadingState;
      return Object.assign({}, state);
    }
    return reducers(state, action);
  };
  return newReducers;
}

function dispatchFactory(
  namespace: string | undefined | null,
  dispatch: (action: AnyAction) => Promise<any>,
) {
  return function (action: AnyAction) {
    if (
      namespace &&
      action.type &&
      typeof action.type === 'string' &&
      !action.type.includes('/')
    ) {
      action.type = `${namespace}/${action.type}`;
    }
    return new Promise((resolve) => {
      const ret = dispatch(action);
      if (typeof ret.then === 'function') {
        ret.then(resolve);
      } else {
        resolve(ret);
      }
    });
  };
}

export function registerPromise(key, effFun) {
  effectsMap[key] = effFun;
}

export function raPromiseMiddleware(store) {
  return function (next) {
    return function (action) {
      const effectFun = effectsMap[action.type];
      if (effectFun) {
        return new Promise((resolve, reject) => {
          const funResult = effectFun(action, {
            select: store.getState,
            dispatch: dispatchFactory(
              action.type.includes('/') ? action.type.split('/')[0] : undefined,
              store.dispatch,
            ),
            delay,
            nextTick,
            lodash: _,
          });
          //  如果是 Promise 函数走 异步过程
          if (
            funResult &&
            typeof funResult === 'object' &&
            typeof funResult.then === 'function'
          ) {
            store.dispatch({
              type: REDUCER_FUNC_NAME,
              payload: { [action.type]: true },
            });
            nextTick(() => {
              funResult
                .then((ret) => {
                  store.dispatch({
                    type: REDUCER_FUNC_NAME,
                    payload: { [action.type]: false },
                  });
                  resolve(ret);
                })
                .catch(reject);
            });
          } else {
            // 如果不是 Promise 函数直接返回结果
            resolve(funResult);
          }
        });
      }
      return next(action);
    };
  };
}

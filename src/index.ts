import { AnyAction, Reducer } from 'redux';
import _, { LoDashStatic } from 'lodash';

export { AnyAction, Reducer };

export type NormalObject = { [key: string]: any };

export type EffectHelper = {
  select: () => NormalObject;
  dispatch: (action: AnyAction) => Promise<any>;
  delay: (time: number, value?: any) => Promise<any>;
  nextTick: (callback: () => void, thisObject: any) => void;
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
    updateLoading: Reducer;
  };
}

const effectsMap: { [key: string]: Effect } = {};

function delay(time = 300, value = true) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), time);
  });
}

function nextTick(callback: () => void, thisObject?: any) {
  Promise.resolve().then(callback.bind(thisObject));
}

// 用来做统一的异步状态管理
export const loadingModel: LoadingModel = {
  namespace: 'loading',
  state: {
    effects: {},
  },
  reducers: {
    updateLoading: (state: NormalObject, action: AnyAction) => {
      if (action.payload && typeof action.payload === 'object') {
        Object.keys(action.payload).forEach((key) => {
          state.effects[key] = action.payload[key];
        });
      }
      return state;
    },
  },
};

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

export function registerPromise(namespace, key, effFun) {
  effectsMap[`${namespace}/${key}`] = effFun;
}

export function raPromiseMiddlewaer(middel) {
  return function (next) {
    return function (action) {
      const fun = effectsMap[action.type];
      if (fun) {
        return new Promise((resolve) => {
          const funResult = fun(action, {
            select: middel.getState,
            dispatch: dispatchFactory(
              action.type.includes('/') ? action.type.split('/')[0] : undefined,
              middel.dispatch,
            ),
            delay,
            nextTick,
            lodash: _,
          });
          if (typeof funResult.then === 'function') {
            middel.dispatch({
              type: 'loading/updateLoading',
              payload: { [action.type]: true },
            });
            nextTick(() => {
              funResult.then((ret) => {
                middel.dispatch({
                  type: 'loading/updateLoading',
                  payload: { [action.type]: false },
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

# redux-ra-promise

#### 作者

- rasir

#### 介绍

redux 中间件。允许用户使用 Promise 函数进行异步处理。与 redux-promise 不同的是，redux-promise 是处理 action 或 action.payload 为 Promise 的情况，而 redux-ra-promise 是处理当响应函数为 Promise 的情况

#### API

- registerPromise
  ` 注册 Promise 异步处理函数`
- raPromiseMiddlewaer
  `ra-promise 中间件`
- loadingModel
  `异步管理状态`
- mixinLoadingState
  `将loading的state混合进入redux的初始值中`
- mixinLoadingReducers
  `将loading的redux混合进入redux的reducer中`

#### 使用方法

```
// store.js
import { createStore, applyMiddleware } from 'redux';
import { raPromiseMiddlewaer, registerPromise,  mixinLoadingReducers, mixinLoadingState } from 'redux-ra-promise';

/*
  minxin 之后的 initState 数据结构
  {
    counter:0,
    loading:{
      effects:{}
    }
  }
*/

const initState = mixinLoadingState({
  counter: 0,
});



const reducer = function (state = { counter: 0 }, action) {
  switch (action.type) {
    case 'plus':
      state.counter += 1;
      break;
    case 'minus':
      state.counter -= 1;
      break;
    case 'update':
      state.counter = action.payload.counter;
      break;
    default:
      break;
  }
  return state;
};

const effects = {
  add: async (action, { dispatch, lodash }) => {
    return new Promise(() => {
      lodash.debounce(() => {
        dispatch({ type: 'plus' });
      });
    });
  },
  getAdd: async ({ payload }, { dispatch }) => {
    const ret = await dispatch({ type: 'getCounter', payload });
    return ret;
  },
  getCounter: async ({ payload }, { select, lodash }) => {
    return new Promise((resolve) => {
      lodash.debounce(() => {
        setTimeout(() => {
          const { counter } = select();
          resolve(counter + payload);
        }, 500);
      });
    });
  },
};

Object.keys(effects).forEach((key) => {
  registerPromise(key, effects[key]);
});

// 生成 store
const store = createStore(
  mixinLoadingReducers(initState, reducer),
  initState,
  applyMiddleware(raPromiseMiddlewaer),
);

... redux 使用不赘述
```

```
// page.ts
import React from "react";
import { connect } from "react-redux";
import styles from "./index.less";
export default connect(({counter}) => ({counter }),
  (dispatch) => ({
    onPromiseIncreaseClick: async (counter) => {
        await dispatch({
            type: "add",
            payload: { counter: counter + 1 }
        });
    }
  })
)(function ({
  counter,
  onPromiseIncreaseClick,
}: any) {
  return (
    <div>
      {counter}
      <button onClick={() => onPromiseIncreaseClick(counter)}>
         counter + 1
      </button>
    </div>
  );
});

```

以上是普通的用户，也支持 `namespace/funcname` 格式的用法。

如果是习惯使用 dva 的 model 的用户在单个 model 内 effets 中函数中使用 dispatch 的 type 如果没有加 `namespace` 前缀，中间件会自动给你加上去。
比如你的数据结构如下：

```
// models/modules/message.ts
import { ReduxStore } from "../index";
const message: ReduxStore = {
  namespace: "message",
  state: {
    counter: 0,
    time: 1
  },
  effects: {
    addCounter: async ({ payload }, { dispatch }) => {
      const ret = await new Promise((resolve) => {
        setTimeout(() => {
          resolve(payload.counter + 1);
        }, 1000);
      });
      await dispatch({ type: "update", payload: { time: 2, counter: ret } });
      return ret;
    },
    updateCounter: async (action, { dispatch }) => {
      const ret = await dispatch({
        type: "addCounter",
        payload: action.payload
      });
      return ret;
    }
  },
  reducers: {
    update: (state: any, { payload }: any) => ({
      ...state,
      ...payload
    })
  },
  subscribes: {
    setup({ history }): void {
      history.listen((...args) => {
        console.log(args);
      });
    }
  }
};
export default message;

```

推荐 redux 的多 model 配置方法

```
// models/index.ts
import { createStore, applyMiddleware, AnyAction } from "redux";
import {
  Effect,
  raPromiseMiddlewaer,
  registerPromise,
  loadingModel
} from "redux-ra-promise";

type NormalObject = { [key: string]: any };
export type Reducer<S = any, A = AnyAction> = (
  state: S | undefined,
  action: A,
  store?: NormalObject
) => S;

export type SubScribe = (
  state: NormalObject,
  action: any,
  store: NormalObject
) => any;
interface ReduxStore {
  namespace: string;
  state: NormalObject;
  effects?: {
    [key: string]: Effect;
  };
  reducers?: {
    [key: string]: Reducer;
  };
  subscribes?: {
    [key: string]: SubScribe;
  };
}
const reducersMap: { [key: string]: Reducer } = {};
const namespaceSet: Set<string> = new Set();
const initState: NormalObject = {
  loading: { effects: {} }
};
const subScribesMap: { [key: string]: any } = {};

// 在 modules 文件中定义的 reduxStore
const modules: ReduxStore[] = [loadingModel];
/**
 * Webpack [Dependency Management | webpack]
 * require.context(directory, useSubdirectories, regExp)
 * directory: 要查找的文件路径
 * useSubdirectories: 是否查找子目录
 * regExp: 要匹配文件的正则
 */
// 获取 modules 文件夹里的所有 ts 文件
const files = (require as any).context("./modules", false, /\.ts$/);

files.keys().forEach((key: string) => {
  if (key === "./index.ts") return;
  modules.push(files(key).default);
});
// 合并所有 reducers
function combinReducers(state = initState, action: any) {
  const { type } = action;
  if (reducersMap[type] && typeof reducersMap[type] === "function") {
    return reducersMap[type](state, action);
  }
  return state;
}
// 将 model 文件中的数据注册到 store 中
function registerStore(store: ReduxStore) {
  const { namespace, state, reducers, effects, subscribes = {} } = store;
  if (namespaceSet.has(namespace)) {
    return console.error(`${namespace} model 的 namespace 重复`);
  }
  namespaceSet.add(namespace);
  registerState(namespace, state);
  registerEffects(namespace, effects);
  registerReducers(namespace, reducers);
  registerSubscribes(namespace, subscribes);
}
// 注册 state
function registerState(namespace: string, state: NormalObject) {
  initState[namespace] = state;
}

// 注册 effects
function registerEffects(
  namespace: string,
  effects?: {
    [key: string]: Effect;
  }
) {
  if (namespace === "loading") return;
  if (effects) {
    Object.keys(effects).forEach((key) => {
      registerPromise(`${namespace}/${key}`, effects[key]);
    });
  }
}

// 注册 reducers
function registerReducers(
  namespace: string,
  reducers?: {
    [key: string]: Reducer;
  }
) {
  if (reducers) {
    Object.keys(reducers).forEach((rk) => {
      reducersMap[`${namespace}/${rk}`] = function (
        state: NormalObject,
        action: AnyAction
      ) {
        const func = reducers[rk];
        const namestate = func(state[namespace], action, state);
        state[namespace] = namestate;
        return { ...state };
      };
    });
  }
}

// 注册 subscribes
function registerSubscribes(
  namespace: string,
  subscribes?: {
    [key: string]: SubScribe;
  }
) {
  if (subscribes) {
    Object.keys(subscribes).forEach((k) => {
      subScribesMap[`${namespace}/${k}`] = subscribes[k];
    });
  }
}

// 将 modules 文件夹下所有 model 都注册进 redux 中
modules.forEach(registerStore);
// 生成 store
const store = createStore(
  combinReducers,
  initState,
  applyMiddleware(raPromiseMiddlewaer)
);
export { subScribesMap, ReduxStore };
export default store;

// 为什么不使用  redux 的 compose 函数 ？
// 无法使用 namespace/funname 方式触发 reducer

```

#### `loadingModel` 的用法

仿照 `dva` 的习惯，提供了 `loading.effects` API。在使用 `redux` 时，只要将 `loadingModel.state` 放入 `initState` ，`loadingModel.reducer` 混合进 `reducers` 就可以通过 `store.getState()` 拿到 `loading.effect[type]` 的 `boolean` 值。使用方法和 `dva` 一样。

```
// 有 namespace 的配置
connect(
  ({ message: { counter }, loading: { effects } }: any) => ({
    counter,
    loading: effects["message/updateCounter"]
  }))
// 无 namespace 的配置
connect(
  ({ counter, loading: { effects } }: any) => ({
    counter,
    loading: effects["updateCounter"]
  }))
```

#### 关于 lodash

在 effects 函数中第二个参数里面，有丢了一个 lodash 对象进去。是因为我很喜欢用 lodash，如果同学们不喜欢也请留言告知，我会酌情在以后的版本去掉它。当然，如果没人觉得不好，就保留好了。

#### 寄语

这个插件刚开始弄，有错误的地方希望大家帮忙指正。如果觉得还可以帮忙 star 一下。谢谢！

#### license

MIT

import { createStore, applyMiddleware } from 'redux';
import { raPromiseMiddlewaer, registerPromise } from '../src/index';

const initState = {
  counter: 0,
};

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
          const { counter } = select;
          resolve(counter + payload);
        }, 500);
      });
    });
  },
  getRet: ({ payload }, { select, lodash }) => {
    return 'aa';
  },
};

Object.keys(effects).forEach((key) => {
  registerPromise(key, effects[key]);
});

// 生成 store
const store = createStore(
  reducer,
  initState,
  applyMiddleware(raPromiseMiddlewaer),
);

describe('ra-promise 1', () => {
  it('debounce counter = 1', () => {
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    (store.dispatch({ type: 'add' }) as any).then(() => {
      expect(store.getState().counter).toBe(1);
    });
  });
});

test('await ret = 2', () => {
  (store.dispatch({ type: 'getAdd', payload: 1 }) as any).then((ret) => {
    expect(ret).toBe(1);
  });
});
test('plain function', () => {
  (store.dispatch({ type: 'getRet' }) as any).then((ret) => {
    expect(ret).toEqual('aa');
  });
});

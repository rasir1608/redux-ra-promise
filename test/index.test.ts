import { createStore, applyMiddleware } from 'redux';
import {
  raPromiseMiddlewaer,
  registerPromise,
  mixinLoadingReducers,
  mixinLoadingState,
} from '../src/index';

const initState = mixinLoadingState({
  counter: 0,
});

const reducer = function (state = initState, action) {
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
    lodash.debounce(() => {
      dispatch({ type: 'plus' });
    });
  },
  getAdd: async ({ payload }, { dispatch }) => {
    const ret = await dispatch({ type: 'getCounter', payload });
    return ret;
  },
  getCounter: async ({ payload }, { select, lodash }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const { counter } = select();
        resolve(counter + payload);
      }, 500);
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
  mixinLoadingReducers(initState, reducer),
  initState,
  applyMiddleware(raPromiseMiddlewaer),
);
describe('ra-promise 1', () => {
  it('debounce counter = 1', (done) => {
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    store.dispatch({ type: 'add' });
    (store.dispatch({ type: 'add' }) as any)
      .then(() => {
        expect(store.getState().counter).toBe(1);
        done();
      })
      .catch(() => done());
  });
});

test('await ret = 2', (done) => {
  (store.dispatch({ type: 'getAdd', payload: 1 }) as any)
    .then((ret) => {
      expect(ret).toBe(1);
      done();
    })
    .catch(() => done());
});
test('plain function', (done) => {
  (store.dispatch({ type: 'getRet' }) as any)
    .then((ret) => {
      expect(ret).toEqual('aa');
      done();
    })
    .catch(() => done());
});

describe('test loading', () => {
  const resolve = store.dispatch({ type: 'getAdd', payload: 2 });
  const startLoading = store.getState().loading.effects['getAdd'];
  it('start loading', () => {
    expect(startLoading).toBe(true);
  });
  it('end loading', async (done) => {
    (resolve as any).then(() => {
      expect(store.getState().loading.effects['getAdd']).toBe(false);
      done();
    });
  });
});

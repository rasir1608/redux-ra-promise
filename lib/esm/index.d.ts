import { AnyAction, Reducer } from 'redux';
import { LoDashStatic } from 'lodash';
declare const reducerFuncname: unique symbol;
export { AnyAction, Reducer };
export declare type NormalObject = {
    [key: string]: any;
};
export declare type EffectHelper = {
    select: () => NormalObject;
    dispatch: (action: AnyAction) => Promise<any>;
    delay: (time: number, value?: any) => Promise<any>;
    nextTick: (callback: () => void) => void;
    lodash: LoDashStatic;
};
export declare type Effect = (action: AnyAction, helper: EffectHelper) => Promise<any>;
export declare type LoadingModelState = {
    effects: {
        [key: string]: boolean;
    };
};
export interface LoadingModel {
    namespace: 'loading';
    state: LoadingModelState;
    reducers: {
        [reducerFuncname]: Reducer;
    };
}
export declare const loadingModel: LoadingModel;
export declare function mixinLoadingState(initState?: NormalObject): NormalObject & {
    loading: LoadingModelState;
};
export declare function mixinLoadingReducers(initState: NormalObject | undefined, reducers: Reducer): Reducer;
export declare function registerPromise(key: any, effFun: any): void;
export declare function raPromiseMiddlewaer(store: any): (next: any) => (action: any) => any;

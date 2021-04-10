import { AnyAction, Reducer } from 'redux';
import { LoDashStatic } from 'lodash';
export { AnyAction, Reducer };
export declare type NormalObject = {
    [key: string]: any;
};
export declare type EffectHelper = {
    select: () => NormalObject;
    dispatch: (action: AnyAction) => Promise<any>;
    delay: (time: number, value?: any) => Promise<any>;
    nextTick: (callback: () => void, thisObject: any) => void;
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
        updateLoading: Reducer;
    };
}
export declare const loadingModel: LoadingModel;
export declare function registerPromise(key: any, effFun: any): void;
export declare function raPromiseMiddlewaer(middel: any): (next: any) => (action: any) => any;

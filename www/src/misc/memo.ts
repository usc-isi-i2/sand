import memoizeOne, { EqualityFn } from "memoize-one";
import _ from "lodash";

function deepEqual(newArgs: any[], lastArgs: any[]) {
  return _.isEqual(newArgs[1], lastArgs[1]);
}

function wrappedFunction<T>(resultFn: () => T, deps: any) {
  return resultFn();
}

const getMemo = () => memoizeOne(wrappedFunction, deepEqual);
export default getMemo;

/**
 * Performs a deep merge of an array of objects
 * @author inspired by [jhildenbiddle](https://stackoverflow.com/a/48218209).
 */

export function mergeDeep (...objects) {
  // console.log('objects =>', objects);
  const isObject = (obj) => obj && typeof obj === 'object' && !(obj instanceof Array);
  const objectTest = objects.filter((obj) => isObject(obj));
  // console.log('objectTest =>', objectTest);

  if (objectTest.length !== objects.length) {
    throw new Error('Can only merge objects');
  }
  const target = {};

  objects.forEach(source => {
    Object.keys(source).forEach(key => {
      const targetValue = target[key];
      const sourceValue = source[key];
      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        target[key] = targetValue.concat(sourceValue);
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
      } else {
        target[key] = sourceValue;
      }
    });
  });
  return target;
}

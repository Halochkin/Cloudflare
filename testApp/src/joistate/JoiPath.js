
class JoiPath {

  static objectEquals(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    let p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
      p.every(function (i) { return JoiPath.objectEquals(x[i], y[i]); });
  }

  static testPath(root, path){
    if(!root)
      return false;
    for (let key of path) {
      if (!root[key])
        return false;
      root = root[key];
    }
    return true;
  }

  static removeUndefinedFields(obj){
    let res = Object.assign({}, obj);
    for (let key in res) {
      if (res[key] === undefined)
        delete res[key];
    }
    return res;
  }

  static deepFreeze(o) {
    if (!o) return o;
    Object.freeze(o);
    Object.getOwnPropertyNames(o).forEach((prop) => {
      if (o.hasOwnProperty(prop) &&
        o[prop] !== null &&
        (typeof o[prop] === "object" || typeof o[prop] === "function") &&
        !Object.isFrozen(o[prop])) {
        this.deepFreeze(o[prop]);
      }
    });
    return o;
  }

  static deepClone(obj) {
    const freeze = true;
    if (null === obj || "object" !== typeof obj) //todo replace with instanceof
      return obj;
    let clone = Object.assign({}, obj);
    for (let attr in obj) {
      if (obj.hasOwnProperty(attr))
        clone[attr] = JoiPath.deepClone(obj[attr], freeze);
    }
    return freeze ? Object.freeze(clone) : clone;
  }

  //returns an immutable copy of A with the branches of B either
  // - merged (if they differ) or
  // - nulled out in result (if B point null value).
  //
  //if either only B === null, then the branch will be deleted. (if the same criteria was set for A, it would be impossible to write in a new value for the same key later)
  //if either A or B === undefined or {} (empty object), then the other branch is used.
  static mergeDeepWithNullToDelete(A, B) {
    if (B === null) return null;
    if (B === undefined || JoiGraph.emptyObject(B))
      return A;
    if (A === undefined || JoiGraph.emptyObject(A))
      return B;
    if (A === B)
      return A;
    if (!(A instanceof Object && B instanceof Object))
      return B;

    let C = Object.assign({}, A);
    let hasMutated = false;
    for (let key of Object.keys(B)) {
      const a = A[key];
      const b = B[key];
      let c = JoiPath.mergeDeepWithNullToDelete(a, b, false);
      if (c === a)
        continue;
      hasMutated = true;
      if (c === null)
        delete C[key];
      else
        C[key] = c; //null is also set as a value in C
    }
    if (!hasMutated)
      return A;
    if (Object.keys(C).length === 0)
      return {};
    return C;
  }

  /**
   * Flattens a normal object tree to an array of {path, value} objects
   * where path is an array of keys as strings. Only works with objects.
   *
   *     let tree = {a: {x: 1}, b: {y: {"12": "something"}}};
   *     let flatTree = JoiPath.flatten(tree, "start", "/");
   *     //flatTree == {"start/a/x": 1, "start/b/y/12: "something"}
   *
   * @param object object to be flattened
   * @param startPath <string> to be used (att! does this path use the same segment separator as you send in)
   * @param separator "/" or "."
   * @returns an object of [{path: <array>, value: ?}] for that object
   */
  static flatten(object, startPath, separator) {
    startPath = startPath ? [startPath] : [];
    separator = separator || ".";

    const _flattenImpl = function (obj, path, separator, res) {
      if (obj instanceof Object) {
        for (let key of Object.keys(obj))
          _flattenImpl(obj[key], path.concat([key]), separator, res);
      } else if (obj !== undefined) {
        res[path.join(separator)] = obj;
      }
    };

    const res = {}; //mutable
    _flattenImpl(object, startPath, separator, res);
    return res;
  }

  /**
   * adds a startPath to all keys
   *
   * let flat = {"a/b": 1, c: 2, "xyz/12": 3};
   * let extendedFlat = State.pathsToObject("new/root/", flat);
   * extendedFlat == {"new/root/a/b": 1, "new/root/c": 2, "new/root/xyz/12": 3}; //true
   *
   * @param flat an array of a flattened object
   * @param {string} startPath
   * @param {string} separator used between the elements of the path, such as "." or "/"
   * @returns a new object with extended key names.
   */
  static pathsToObject(flat, startPath, separator) {
    let result = {};
    for (let pathValue of flat)
      result[startPath + pathValue.path.join(separator)] = pathValue.value;
    return result;
  }

  static setInStr(obj, path, value) {
    return JoiPath.setIn(obj, JoiPath.strToArray(path), value);
  }

  static setIn(obj, path, value) {
    const freeze = true;
    return JoiPath.getIn(obj, path) === value ? obj : JoiPath.setInNoCheck(obj, path, value, freeze);
  }

  //returns sets a value to object tree path,
  //if some part of that path is explicitly set to null,
  //then nothing is set and undefined is returned
  static setInNoCheck(obj, path, value) {
    const freeze = true;
    let rootRes = Object.assign({}, obj);
    let resPath = [];
    let res = rootRes;
    if (res === null) return undefined;
    for (let i = 0; i < path.length - 1; i++) {
      let key = path[i];
      res[key] = Object.assign({}, res[key]);
      resPath[i] = res[key];
      res = res[key];
      if (res === null) return undefined;
    }
    res[path[path.length - 1]] = freeze ? Object.freeze(value) : value;

    for (let i = 0; i < resPath.length; i++) {
      Object.freeze(resPath[i]);
    }

    return freeze ? Object.freeze(rootRes) : rootRes;
  }

  /**
   * Immutable set function that acccepts null as wildcard in a path.
   * Because we have the wildcard function, no values will be set in the object if the path does not match.
   *
   * @param {object} obj the object in which the values are to be set
   * @param {object} path ["prop1", null, "prop2"] that path to the value to be set.
   *                 If one of the values are null, then all the properties at that level will be traversed
   * @param {object} value the value to be set. Try to use null and not undefined if you want to set something to nothing.
   * @returns a new object C with the new value(s) set. As few objects are cloned as possible.
   */
  static setInPathWithNullAsWildCard(obj, path, value) {
    if (path.length === 0)
      return value;
    if (obj === undefined)
      return undefined;
    if (obj === null)
      return obj;
    let res = Object.assign({}, obj);
    let key = path[0];
    if (key === null) {
      let mutated = false;
      for (let key of Object.keys(res)) {
        let newValue = JoiPath.setInPathWithNullAsWildCard(res[key], path.slice(1), value);
        if (newValue !== res[key]) {
          mutated = true;
          res[key] = newValue;
        }
      }
      return mutated ? res : obj;
    }
    let newValue = JoiPath.setInPathWithNullAsWildCard(res[key], path.slice(1), value);
    if (newValue === res[key])
      return obj;
    res[key] = newValue;
    return res;
  }

  static getIn(obj, path) {
    if (!(obj instanceof Object)) return undefined;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      obj = obj[key];
      if (!(obj instanceof Object)) return undefined;
    }
    return obj[path[path.length - 1]];
  }

  /**
   * Immutable filter that strips out
   * 1) entries of A that are matching exactly entries in B
   * 2) all empty entries (with undefined or empty objects as value).
   *
   * @param {object} A the object to be filtered
   * @param {object} B the filter
   * @returns A if nothing is filtered away,
   *          undefined if A is empty or the whole content of A is filtered out by B,
   *          a new object C which is an immuted version of the partially filtered A.
   */
  static filterDeep(A, B) {
    const noA = A === undefined || JoiPath.emptyObject(A);
    const noB = B === undefined || JoiPath.emptyObject(B);
    if (noA && noB) return undefined;
    if (noB) return A;
    if (noA) return undefined;
    if (A === B) return undefined;
    if (!(A instanceof Object && B instanceof Object)) return A;

    const C = {};
    let hasFiltered = false;
    for (let key of Object.keys(A)) {
      const a = A[key];
      const b = B[key];
      if (a === null && b === undefined) {
        hasFiltered = true; //todo Work with this, maybe make a nicer model in realtimeboard.
        continue;
        /*second check is removing A[key]=null && B[key]=undefined*/
      }
      let c = JoiPath.filterDeep(a, b);
      if (c !== a)
        hasFiltered = true;
      if (c !== undefined)
        C[key] = c;
    }
    if (!hasFiltered)
      return A;
    if (Object.keys(C).length === 0)
      return undefined;
    return C;
  }

  static isNothing(A) {
    return A === undefined || A === null || JoiGraph.emptyObject(A);
  }

  //removes the
  static filterPath(obj, key, value) {
    const res = Object.assign({}, obj);
    if (key === null) {
      let hasFiltered = false;
      for (let key of Object.keys(res)) {
        if (res[key] === value) {
          hasFiltered = true;
          delete res[key];
        }
      }
      return hasFiltered ? res : obj;
    }
    if (res[key] === value) {
      delete res[key];
      return res;
    }
    return obj;
  }

  // static matchesPathValue(CC, ["shapes", null, "selected"], true);
  static matchesPathValue(obj, path, value) {
    if (!obj) return undefined;
    const key = path[0];
    if (path.length === 1) {
      if (key !== null) {
        if (obj[key] === value)
          return obj;
        return undefined;
      }
      const res = {};
      for (let key of Object.keys(obj)) {
        if (obj[key] === value)
          return obj;
      }
      return undefined;
    }
    const nextPath = path.slice(1);
    if (key !== null) {
      let child = JoiPath.matchesPathValue(obj[key], nextPath, value);
      if (child === undefined)
        return undefined;
      return obj;
    }
    let res = {};
    for (let key of Object.keys(obj)) {
      let child = JoiPath.matchesPathValue(obj[key], nextPath, value);
      if (child !== undefined)
        res[key] = child;
    }
    if (Object.keys(res).length)
      return res;
    return undefined;
  }

  static strToArray(str) {
    return JoiPath.pathCache[str] || (JoiPath.pathCache[str] = str.split("."));
  }
}

JoiPath.pathCache = {};

//todo use the filter method recursively to add, delete, update doc data in the objects as well.
/*
static filterFirestore(origin, path, filter) {
  const _frozen = true;
  let res = Object.assign({}, origin);
  const start = res;
  for (let key of path) {
    if (!res[key])
      res[key] = {};
    res = res[key] = Object.assign({}, res[key]);
  }
  for (let key in res) {
    if (!filter[key])
      delete res[key];
  }
  for (let key in filter) {
    if (!res[key])
      res[key] = filter[key];
  }
  return _frozen ? JoiPath.deepFreeze(start) : start;
}
*/


var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/shell/codex-cli.ts
import { dirname, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/infra/cli/input/argument-parser.js
function makeOptional(parser) {
  return {
    parse: (args, position, commandName) => {
      if (position >= args.length) {
        return {
          ok: true,
          value: void 0
        };
      }
      return parser.parse(args, position, commandName);
    },
    optional: () => makeOptional(parser)
  };
}
var arg = {
  number: (name) => ({
    parse: (args, position, commandName) => {
      if (position >= args.length) {
        return {
          ok: false,
          message: `${commandName}: missing required argument <${name}>`
        };
      }
      const raw = args[position];
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        return {
          ok: false,
          message: `${commandName}: not a valid number: '${raw}'`
        };
      }
      return {
        ok: true,
        value: parsed
      };
    },
    optional: function() {
      return makeOptional(this);
    }
  }),
  string: (name) => ({
    parse: (args, position, commandName) => {
      if (position >= args.length) {
        return {
          ok: false,
          message: `${commandName}: missing required argument <${name}>`
        };
      }
      return {
        ok: true,
        value: args[position]
      };
    },
    optional: function() {
      return makeOptional(this);
    }
  }),
  rest: () => ({
    parse: (args, position) => ({
      ok: true,
      value: args.slice(position)
    }),
    optional: function() {
      return makeOptional(this);
    }
  }),
  state: (name, schema) => ({
    parse: (args, position, commandName) => {
      if (position >= args.length) {
        return {
          ok: false,
          message: `${commandName}: missing required argument <${name}>`
        };
      }
      const raw = args[position];
      const result = schema.safeParse(raw);
      if (!result.success) {
        return {
          ok: false,
          message: `${commandName}: invalid state '${raw}'`
        };
      }
      return {
        ok: true,
        value: result.data
      };
    },
    optional: function() {
      return makeOptional(this);
    }
  })
};

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/domain/command-definition.js
function defineRoutes(routes2) {
  return routes2;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-state.js
var WorkflowStateError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowStateError";
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// ../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg2) => {
        addIssueToContext(ctx, arg2);
        if (arg2.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg2) => ZodString.create({ ...arg2, coerce: true })),
  number: ((arg2) => ZodNumber.create({ ...arg2, coerce: true })),
  boolean: ((arg2) => ZodBoolean.create({
    ...arg2,
    coerce: true
  })),
  bigint: ((arg2) => ZodBigInt.create({ ...arg2, coerce: true })),
  date: ((arg2) => ZodDate.create({ ...arg2, coerce: true }))
};
var NEVER = INVALID;

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/non-empty-string.js
var nonEmptyStringSchema = external_exports.string().trim().min(1);
function requireNonEmptyString(value, name) {
  const trimmed = value.trim();
  if (trimmed.length === 0)
    throw new TypeError(`${name} must be a non-empty string.`);
  return trimmed;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/base-event.js
var baseEventSchema = external_exports.object({
  type: nonEmptyStringSchema,
  at: nonEmptyStringSchema
}).passthrough();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/stored-event.js
function flattenStoredEvent(stored) {
  return {
    ...stripEnvelopeKeys(stored.payload),
    type: stored.envelope.type,
    at: stored.envelope.at
  };
}
function toPayload(event) {
  return stripEnvelopeKeys(event);
}
function stripEnvelopeKeys(record) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "type" || key === "at")
      continue;
    result[key] = value;
  }
  return result;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/reflection-types.js
var reflectionCategorySchema = external_exports.enum([
  "state-efficiency",
  "review-rework",
  "quality-gates",
  "tooling",
  "workflow-design"
]);
var reflectionConfidenceSchema = external_exports.enum(["low", "medium", "high"]);
var evidenceBaseSchema = external_exports.object({ label: nonEmptyStringSchema.optional() });
var reflectionEvidenceSchema = external_exports.discriminatedUnion("kind", [
  evidenceBaseSchema.extend({
    kind: external_exports.literal("state-period"),
    state: nonEmptyStringSchema,
    startedAt: nonEmptyStringSchema.optional(),
    endedAt: nonEmptyStringSchema.optional()
  }),
  evidenceBaseSchema.extend({
    kind: external_exports.literal("event"),
    seq: external_exports.number().int().positive()
  }),
  evidenceBaseSchema.extend({
    kind: external_exports.literal("event-range"),
    startSeq: external_exports.number().int().positive(),
    endSeq: external_exports.number().int().positive()
  }),
  evidenceBaseSchema.extend({
    kind: external_exports.literal("journal-entry"),
    at: nonEmptyStringSchema,
    agentName: nonEmptyStringSchema.optional()
  }),
  evidenceBaseSchema.extend({
    kind: external_exports.literal("transcript-range"),
    startIndex: external_exports.number().int().nonnegative(),
    endIndex: external_exports.number().int().nonnegative()
  }),
  evidenceBaseSchema.extend({
    kind: external_exports.literal("tool-activity"),
    state: nonEmptyStringSchema.optional(),
    toolName: nonEmptyStringSchema.optional(),
    metric: nonEmptyStringSchema.optional()
  })
]);
var reflectionFindingSchema = external_exports.object({
  title: nonEmptyStringSchema,
  category: reflectionCategorySchema,
  opportunity: nonEmptyStringSchema,
  likelyCause: nonEmptyStringSchema,
  suggestedChange: nonEmptyStringSchema,
  expectedImpact: nonEmptyStringSchema,
  confidence: reflectionConfidenceSchema.optional(),
  evidence: external_exports.array(reflectionEvidenceSchema).min(1)
});
var reflectionPayloadSchema = external_exports.object({
  summary: nonEmptyStringSchema.optional(),
  findings: external_exports.array(reflectionFindingSchema).max(10)
}).strict();
var recordReflectionInputSchema = external_exports.object({
  label: nonEmptyStringSchema.optional(),
  agentName: nonEmptyStringSchema.optional(),
  sourceState: nonEmptyStringSchema.optional(),
  reflection: reflectionPayloadSchema
}).strict();
var storedReflectionSchema = external_exports.object({
  id: external_exports.number().int().positive(),
  sessionId: nonEmptyStringSchema,
  createdAt: nonEmptyStringSchema,
  label: nonEmptyStringSchema.optional(),
  agentName: nonEmptyStringSchema.optional(),
  sourceState: nonEmptyStringSchema.optional(),
  reflection: reflectionPayloadSchema
}).strict();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/review-types.js
var reviewTypeSchema = nonEmptyStringSchema;
var reviewVerdictSchema = external_exports.enum(["PASS", "FAIL"]);
var reviewFindingSeveritySchema = external_exports.enum(["minor", "major", "critical"]);
var reviewFindingStatusSchema = external_exports.enum(["blocking", "non-blocking", "accepted-risk"]);
var reviewFindingSchema = external_exports.object({
  title: nonEmptyStringSchema.optional(),
  severity: reviewFindingSeveritySchema.optional(),
  status: reviewFindingStatusSchema.optional(),
  rule: nonEmptyStringSchema.optional(),
  file: nonEmptyStringSchema.optional(),
  startLine: external_exports.number().int().positive().optional(),
  endLine: external_exports.number().int().positive().optional(),
  details: nonEmptyStringSchema.optional(),
  recommendation: nonEmptyStringSchema.optional()
}).strict().superRefine((finding, context) => {
  if (finding.title === void 0 && finding.details === void 0 && finding.rule === void 0) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected review finding to include at least one of title, details, or rule.",
      path: ["title"]
    });
  }
  if (finding.endLine !== void 0 && finding.startLine === void 0) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected startLine when endLine is provided.",
      path: ["startLine"]
    });
  }
  if (finding.startLine !== void 0 && finding.endLine !== void 0 && finding.endLine < finding.startLine) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected endLine to be greater than or equal to startLine.",
      path: ["endLine"]
    });
  }
});
var reviewPayloadSchema = external_exports.object({
  verdict: reviewVerdictSchema,
  summary: nonEmptyStringSchema.optional(),
  branch: nonEmptyStringSchema.optional(),
  pullRequestNumber: external_exports.number().int().positive().optional(),
  findings: external_exports.array(reviewFindingSchema)
}).strict();
var recordReviewInputSchema = reviewPayloadSchema.extend({
  reviewType: reviewTypeSchema,
  sourceState: nonEmptyStringSchema.optional()
}).strict();
var storedReviewSchema = recordReviewInputSchema.extend({
  id: external_exports.number().int().positive(),
  sessionId: nonEmptyStringSchema,
  createdAt: nonEmptyStringSchema
}).strict();
var listedReviewSchema = storedReviewSchema.extend({ repository: nonEmptyStringSchema.optional() }).strict();
var reviewFiltersSchema = external_exports.object({
  repository: nonEmptyStringSchema.optional(),
  branch: nonEmptyStringSchema.optional(),
  pullRequestNumber: external_exports.number().int().positive().optional(),
  reviewType: reviewTypeSchema.optional(),
  verdict: reviewVerdictSchema.optional()
}).strict();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/engine-events.js
var sessionStartedSchema = external_exports.object({
  type: external_exports.literal("session-started"),
  at: nonEmptyStringSchema,
  transcriptPath: nonEmptyStringSchema,
  repository: nonEmptyStringSchema,
  currentState: nonEmptyStringSchema,
  states: external_exports.array(nonEmptyStringSchema)
});
var transitionedSchema = external_exports.object({
  type: external_exports.literal("transitioned"),
  at: nonEmptyStringSchema,
  from: nonEmptyStringSchema,
  to: nonEmptyStringSchema,
  preBlockedState: nonEmptyStringSchema.optional(),
  iteration: external_exports.number().optional(),
  developingHeadCommit: nonEmptyStringSchema.optional(),
  developerDone: external_exports.boolean().optional()
});
var agentRegisteredSchema = external_exports.object({
  type: external_exports.literal("agent-registered"),
  at: nonEmptyStringSchema,
  agentType: nonEmptyStringSchema,
  agentId: nonEmptyStringSchema
});
var agentShutDownSchema = external_exports.object({
  type: external_exports.literal("agent-shut-down"),
  at: nonEmptyStringSchema,
  agentName: nonEmptyStringSchema
});
var journalEntrySchema = external_exports.object({
  type: external_exports.literal("journal-entry"),
  at: nonEmptyStringSchema,
  agentName: nonEmptyStringSchema,
  content: nonEmptyStringSchema
});
var writeCheckedSchema = external_exports.object({
  type: external_exports.literal("write-checked"),
  at: nonEmptyStringSchema,
  tool: nonEmptyStringSchema,
  filePath: nonEmptyStringSchema,
  allowed: external_exports.boolean(),
  reason: nonEmptyStringSchema.optional()
});
var bashCheckedSchema = external_exports.object({
  type: external_exports.literal("bash-checked"),
  at: nonEmptyStringSchema,
  tool: nonEmptyStringSchema,
  command: nonEmptyStringSchema,
  allowed: external_exports.boolean(),
  reason: nonEmptyStringSchema.optional()
});
var pluginReadCheckedSchema = external_exports.object({
  type: external_exports.literal("plugin-read-checked"),
  at: nonEmptyStringSchema,
  tool: nonEmptyStringSchema,
  path: nonEmptyStringSchema,
  allowed: external_exports.boolean(),
  reason: nonEmptyStringSchema.optional()
});
var idleCheckedSchema = external_exports.object({
  type: external_exports.literal("idle-checked"),
  at: nonEmptyStringSchema,
  agentName: nonEmptyStringSchema,
  allowed: external_exports.boolean(),
  reason: nonEmptyStringSchema.optional()
});
var identityVerifiedSchema = external_exports.object({
  type: external_exports.literal("identity-verified"),
  at: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
  transcriptPath: nonEmptyStringSchema
});
var contextRequestedSchema = external_exports.object({
  type: external_exports.literal("context-requested"),
  at: nonEmptyStringSchema,
  agentName: nonEmptyStringSchema
});
var reviewRecordedEventSchema = external_exports.object({
  type: external_exports.literal("review-recorded"),
  at: nonEmptyStringSchema,
  reviewId: external_exports.number().int().positive(),
  reviewType: nonEmptyStringSchema,
  verdict: external_exports.enum(["PASS", "FAIL"])
});
var engineEventSchema = external_exports.discriminatedUnion("type", [
  sessionStartedSchema,
  transitionedSchema,
  agentRegisteredSchema,
  agentShutDownSchema,
  journalEntrySchema,
  writeCheckedSchema,
  bashCheckedSchema,
  pluginReadCheckedSchema,
  idleCheckedSchema,
  identityVerifiedSchema,
  contextRequestedSchema,
  reviewRecordedEventSchema
]);
var platformOwnedEventTypesExcludedFromWorkflowState = /* @__PURE__ */ new Set([
  "agent-registered",
  "agent-shut-down",
  "journal-entry",
  "write-checked",
  "bash-checked",
  "plugin-read-checked",
  "idle-checked",
  "identity-verified",
  "context-requested"
]);
function isPlatformOwnedEventExcludedFromWorkflowState(type) {
  return platformOwnedEventTypesExcludedFromWorkflowState.has(type);
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-state-reducer.js
function reduceWorkflowStateFromStoredEvents(workflowDefinition2, storedEvents) {
  return storedEvents.map(flattenStoredEvent).filter((event) => !isPlatformOwnedEventExcludedFromWorkflowState(event.type)).reduce((workflowState, event) => workflowDefinition2.fold(workflowState, event), workflowDefinition2.initialState());
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/repository-tracking-events.js
var issueRecordedSchema = external_exports.object({
  type: external_exports.literal("issue-recorded"),
  at: nonEmptyStringSchema,
  issueNumber: external_exports.number()
});
var branchRecordedSchema = external_exports.object({
  type: external_exports.literal("branch-recorded"),
  at: nonEmptyStringSchema,
  branch: nonEmptyStringSchema
});
var prRecordedSchema = external_exports.object({
  type: external_exports.literal("pr-recorded"),
  at: nonEmptyStringSchema,
  prNumber: external_exports.number()
});
var repositoryMetadataEventSchema = external_exports.discriminatedUnion("type", [
  issueRecordedSchema,
  branchRecordedSchema,
  prRecordedSchema
]);

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/precondition-result.js
var pass = () => ({ pass: true });
var fail = (reason) => ({
  pass: false,
  reason
});

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/bash-enforcement.js
function buildCommandPattern(command) {
  const parts = command.trim().split(/\s+/);
  const escapedParts = parts.map((part) => part.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const patternBody = escapedParts.join("\\s+");
  return new RegExp(`(?:^|\\s|&&|;)${patternBody}(?:\\s|$|-|;|&)`);
}
function checkBashCommand(command, forbidden, stateExemptions) {
  for (const flag of forbidden.flags ?? []) {
    if (command.includes(flag)) {
      return fail(`Forbidden flag '${flag}' in command.`);
    }
  }
  for (const forbiddenCommand of forbidden.commands) {
    if (stateExemptions.includes(forbiddenCommand))
      continue;
    const pattern = buildCommandPattern(forbiddenCommand);
    if (pattern.test(command)) {
      return fail(`Forbidden command '${forbiddenCommand}' in command.`);
    }
  }
  return pass();
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/identity-verification.js
function checkIdentity(messages, pattern) {
  const textMessages = messages.filter((message) => message.textContent !== void 0);
  if (textMessages.length === 0) {
    return { status: "never-spoken" };
  }
  const hasEverSpokenWithPrefix = textMessages.some((message) => message.textContent !== void 0 && pattern.test(message.textContent));
  if (!hasEverSpokenWithPrefix) {
    return { status: "lost" };
  }
  const lastMessage = messages.at(-1);
  if (lastMessage?.textContent === void 0) {
    return { status: "silent-turn" };
  }
  if (pattern.test(lastMessage.textContent)) {
    return { status: "verified" };
  }
  return { status: "lost" };
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/infra/cli/presentation/output-guidance.js
var SEPARATOR = "----------------------------------------------------------------";
var PLATFORM_NOTIFICATION_FENCE = "****************************************************************";
var JOURNAL_GUIDANCE = [
  PLATFORM_NOTIFICATION_FENCE,
  "PLATFORM NOTIFICATION",
  "",
  "Record your progress and reasoning as you work by calling:",
  '  <workflow-command> write-journal <agent-name> "<detailed journal entry>"',
  "",
  "Use the same workflow command prefix used for other workflow commands such as transition.",
  "",
  "Use it for key decisions, progress milestones, and blockers.",
  "Every session should have a journal trail of the work performed.",
  PLATFORM_NOTIFICATION_FENCE
].join("\n");
function formatBlock(title, body) {
  return `${title}
${SEPARATOR}
${body}`;
}
function appendJournalGuidance(body) {
  return `${body}

${JOURNAL_GUIDANCE}`;
}
function formatTransitionSuccess(title, procedureContent, expectedPrefix) {
  return formatBlock(title, appendJournalGuidance(`${procedureContent}

Next message MUST begin with: ${expectedPrefix}`));
}
function formatTransitionError(to, reason, currentProcedure, expectedPrefix) {
  return formatBlock(`Cannot transition to ${to}`, `${reason}

You are still in the current state. Complete the checklist before transitioning.

${currentProcedure}

Next message MUST begin with: ${expectedPrefix}`);
}
function formatIllegalTransitionError(reason, currentProcedure, expectedPrefix) {
  return formatBlock("Illegal transition", `${reason}

You are still in the current state. Complete the checklist before transitioning.

${currentProcedure}

Next message MUST begin with: ${expectedPrefix}`);
}
function formatOperationGateError(op, reason, expectedPrefix) {
  return formatBlock(`Cannot ${op}`, `${reason}

Next message MUST begin with: ${expectedPrefix}`);
}
function formatOperationSuccess(op, body, expectedPrefix) {
  return formatBlock(op, `${body}

Next message MUST begin with: ${expectedPrefix}`);
}
function formatInitSuccess(procedureContent, expectedPrefix) {
  return formatBlock("Feature team initialized", appendJournalGuidance(`${procedureContent}

Next message MUST begin with: ${expectedPrefix}`));
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-engine-support.js
function buildPrefixPattern(registry) {
  const prefixes = [];
  for (const stateName in registry) {
    const definition = registry[stateName];
    prefixes.push(`${definition.emoji} ${stateName}`);
  }
  return new RegExp(`^(${prefixes.join("|")})`);
}
function getExpectedPrefix(stateName, registry) {
  return `${registry[stateName].emoji} ${stateName}`;
}
function buildProcedurePath(engineDeps, stateName) {
  return `${engineDeps.getPluginRoot()}/states/${String(stateName).toLowerCase()}.md`;
}
function readProcedure(engineDeps, stateName) {
  return engineDeps.readFile(buildProcedurePath(engineDeps, stateName));
}
function enrichSessionStartedEvents(engineDeps, events, transcriptPath, repository, currentState, states) {
  const validRepository = requireNonEmptyString(repository, "repository");
  const validTranscriptPath = requireNonEmptyString(transcriptPath, "transcriptPath");
  const enriched = events.map((event) => {
    if (event.type !== "session-started") {
      return event;
    }
    return {
      ...event,
      transcriptPath: validTranscriptPath,
      repository: validRepository,
      currentState,
      states: [...states]
    };
  });
  if (enriched.some((event) => event.type === "session-started")) {
    return enriched;
  }
  return [{
    type: "session-started",
    at: engineDeps.now(),
    transcriptPath: validTranscriptPath,
    repository: validRepository,
    currentState,
    states: [...states]
  }, ...enriched];
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-engine-platform-operations.js
function writeJournalWithPlatformEvents(context, agentName, content) {
  const gate = context.applyIdentityGate("write-journal");
  if (gate !== void 0)
    return gate;
  context.persistPlatformEvent({
    type: "journal-entry",
    at: context.engineDeps.now(),
    agentName,
    content
  });
  const state = context.workflow.getState();
  const body = context.factory.getOperationBody?.("write-journal", state) ?? "Write journal entry";
  return {
    type: "success",
    output: formatOperationSuccess("write-journal", body, getExpectedPrefix(state.currentStateMachineState, context.factory.getRegistry()))
  };
}
function checkBashWithPlatformEvents(context, toolName, command, bashForbidden2) {
  const state = context.workflow.getState();
  const currentStateName = state.currentStateMachineState;
  const currentPrefix = getExpectedPrefix(currentStateName, context.factory.getRegistry());
  const gate = context.applyIdentityGate("bash-check");
  if (gate !== void 0)
    return gate;
  if (toolName !== "Bash") {
    context.persistPlatformEvent({
      type: "bash-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      command,
      allowed: true
    });
    return {
      type: "success",
      output: ""
    };
  }
  const exemptions = context.factory.getRegistry()[currentStateName].allowForbidden?.bash ?? [];
  const bashCheckResult = checkBashCommand(command, bashForbidden2, exemptions);
  if (!bashCheckResult.pass) {
    const reason = `Bash command blocked in ${currentStateName}. ${bashCheckResult.reason}`;
    context.persistPlatformEvent({
      type: "bash-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      command,
      allowed: false,
      reason
    });
    return {
      type: "blocked",
      output: formatOperationGateError("bash-check", reason, currentPrefix)
    };
  }
  context.persistPlatformEvent({
    type: "bash-checked",
    at: context.engineDeps.now(),
    tool: toolName,
    command,
    allowed: true
  });
  return {
    type: "success",
    output: ""
  };
}
function checkWriteWithPlatformEvents(context, toolName, filePath, isWriteAllowed2) {
  const state = context.workflow.getState();
  const currentStateName = state.currentStateMachineState;
  const currentPrefix = getExpectedPrefix(currentStateName, context.factory.getRegistry());
  const gate = context.applyIdentityGate("write-check");
  if (gate !== void 0)
    return gate;
  const writeTools = /* @__PURE__ */ new Set(["Write", "Edit", "NotebookEdit"]);
  if (!writeTools.has(toolName)) {
    context.persistPlatformEvent({
      type: "write-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      filePath,
      allowed: true
    });
    return {
      type: "success",
      output: ""
    };
  }
  const storePath = `${context.engineDeps.getPluginRoot()}/workflow.db`;
  if (filePath === storePath) {
    context.persistPlatformEvent({
      type: "write-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      filePath,
      allowed: true
    });
    return {
      type: "success",
      output: ""
    };
  }
  if (!(context.factory.getRegistry()[currentStateName].forbidden?.write ?? false)) {
    context.persistPlatformEvent({
      type: "write-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      filePath,
      allowed: true
    });
    return {
      type: "success",
      output: ""
    };
  }
  if (!isWriteAllowed2(filePath, state)) {
    const reason = `Write to '${filePath}' is forbidden in state ${currentStateName}`;
    context.persistPlatformEvent({
      type: "write-checked",
      at: context.engineDeps.now(),
      tool: toolName,
      filePath,
      allowed: false,
      reason
    });
    return {
      type: "blocked",
      output: formatOperationGateError("write-check", reason, currentPrefix)
    };
  }
  context.persistPlatformEvent({
    type: "write-checked",
    at: context.engineDeps.now(),
    tool: toolName,
    filePath,
    allowed: true
  });
  return {
    type: "success",
    output: ""
  };
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-state-serialization.js
function serializeWorkflowState(state) {
  try {
    return {
      type: "success",
      output: JSON.stringify(state, null, 2)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      type: "error",
      output: `Failed to serialize workflow state: ${message}`
    };
  }
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-engine.js
var WorkflowEngine = class {
  factory;
  engineDeps;
  workflowDeps;
  constructor(factory, engineDeps, workflowDeps) {
    this.factory = factory;
    this.engineDeps = engineDeps;
    this.workflowDeps = workflowDeps;
  }
  startSession(sessionId, transcriptPath, repository) {
    const validSessionId = requireNonEmptyString(sessionId, "sessionId");
    const validTranscriptPath = requireNonEmptyString(transcriptPath, "transcriptPath");
    const validRepository = requireNonEmptyString(repository, "repository");
    if (this.engineDeps.store.hasSessionStarted(validSessionId)) {
      return {
        type: "success",
        output: ""
      };
    }
    const initialState = this.factory.initialState();
    const workflow = this.factory.buildWorkflow(initialState, this.workflowDeps);
    workflow.startSession(validTranscriptPath, validRepository);
    const registry = this.factory.getRegistry();
    const stateNames = Object.keys(registry);
    const pendingEvents = enrichSessionStartedEvents(this.engineDeps, workflow.getPendingEvents(), validTranscriptPath, validRepository, initialState.currentStateMachineState, stateNames);
    this.engineDeps.store.appendEvents(validSessionId, this.wrapEvents(pendingEvents, initialState));
    const procedureContent = this.engineDeps.readFile(buildProcedurePath(this.engineDeps, initialState.currentStateMachineState));
    const expectedPrefix = getExpectedPrefix(initialState.currentStateMachineState, registry);
    return {
      type: "success",
      output: formatInitSuccess(procedureContent, expectedPrefix)
    };
  }
  transaction(sessionId, op, fn) {
    this.requireSession(sessionId);
    const workflow = this.rehydrateFromEvents(sessionId);
    const registry = this.factory.getRegistry();
    const gate = this.applyIdentityGate(sessionId, workflow, op);
    if (gate !== void 0)
      return gate;
    const result = fn(workflow);
    this.persistEvents(sessionId, workflow);
    const currentPrefix = getExpectedPrefix(workflow.getState().currentStateMachineState, registry);
    if (!result.pass) {
      return {
        type: "blocked",
        output: formatOperationGateError(op, result.reason, currentPrefix)
      };
    }
    const body = this.factory.getOperationBody?.(op, workflow.getState()) ?? op;
    return {
      type: "success",
      output: formatOperationSuccess(op, body, currentPrefix)
    };
  }
  writeJournal(sessionId, agentName, content) {
    this.requireSession(sessionId);
    const workflow = this.rehydrateFromEvents(sessionId);
    return writeJournalWithPlatformEvents(this.platformOperationContext(sessionId, workflow), agentName, content);
  }
  transition(sessionId, target) {
    this.requireSession(sessionId);
    const workflow = this.rehydrateFromEvents(sessionId);
    const state = workflow.getState();
    const currentStateName = state.currentStateMachineState;
    const registry = this.factory.getRegistry();
    const gate = this.applyIdentityGate(sessionId, workflow, "transition");
    if (gate !== void 0)
      return gate;
    const currentDef = registry[currentStateName];
    if (!currentDef.canTransitionTo.includes(target)) {
      const legalTargets = currentDef.canTransitionTo;
      const reason = `Illegal transition ${currentStateName} -> ${target}. Legal targets from ${currentStateName}: [${legalTargets.join(", ") || "none"}].`;
      const currentProcedure = readProcedure(this.engineDeps, workflow.getState().currentStateMachineState);
      const currentPrefix = getExpectedPrefix(currentStateName, registry);
      return {
        type: "blocked",
        output: formatIllegalTransitionError(reason, currentProcedure, currentPrefix)
      };
    }
    if (target !== "BLOCKED" && currentDef.transitionGuard) {
      const context2 = this.factory.buildTransitionContext(state, currentStateName, target, this.workflowDeps);
      const guardResult = currentDef.transitionGuard(context2);
      if (!guardResult.pass) {
        const currentProcedure = readProcedure(this.engineDeps, workflow.getState().currentStateMachineState);
        const currentPrefix = getExpectedPrefix(currentStateName, registry);
        return {
          type: "blocked",
          output: formatTransitionError(target, guardResult.reason, currentProcedure, currentPrefix)
        };
      }
    }
    const targetDef = registry[target];
    const stateBefore = workflow.getState();
    const context = this.factory.buildTransitionContext(stateBefore, currentStateName, target, this.workflowDeps);
    const stateAfter = targetDef.onEntry ? targetDef.onEntry(stateBefore, context) : stateBefore;
    const transitionEvent = this.factory.buildTransitionEvent ? this.factory.buildTransitionEvent(currentStateName, target, stateBefore, stateAfter, this.engineDeps.now()) : {
      type: "transitioned",
      at: this.engineDeps.now(),
      from: currentStateName,
      to: target
    };
    workflow.appendEvent(transitionEvent);
    targetDef.afterEntry?.();
    this.persistEvents(sessionId, workflow);
    const newState = workflow.getState();
    const title = this.factory.getTransitionTitle?.(newState.currentStateMachineState, newState) ?? newState.currentStateMachineState;
    const procedure = readProcedure(this.engineDeps, workflow.getState().currentStateMachineState);
    const newPrefix = getExpectedPrefix(newState.currentStateMachineState, registry);
    return {
      type: "success",
      output: formatTransitionSuccess(title, procedure, newPrefix)
    };
  }
  checkBash(sessionId, toolName, command, bashForbidden2) {
    this.requireSession(sessionId);
    const workflow = this.rehydrateFromEvents(sessionId);
    return checkBashWithPlatformEvents(this.platformOperationContext(sessionId, workflow), toolName, command, bashForbidden2);
  }
  checkWrite(sessionId, toolName, filePath, isWriteAllowed2) {
    this.requireSession(sessionId);
    const workflow = this.rehydrateFromEvents(sessionId);
    return checkWriteWithPlatformEvents(this.platformOperationContext(sessionId, workflow), toolName, filePath, isWriteAllowed2);
  }
  getState(sessionId) {
    this.requireSession(sessionId);
    return serializeWorkflowState(this.rehydrateFromEvents(sessionId).getState());
  }
  persistSessionId(sessionId) {
    this.engineDeps.appendToFile(this.engineDeps.getEnvFilePath(), `export CLAUDE_SESSION_ID='${sessionId}'
`);
  }
  hasSession(sessionId) {
    return this.engineDeps.store.hasSessionStarted(sessionId);
  }
  hasSessionStarted(sessionId) {
    return this.engineDeps.store.hasSessionStarted(sessionId);
  }
  requireSession(sessionId) {
    if (!this.engineDeps.store.hasSessionStarted(sessionId)) {
      throw new WorkflowStateError(`No session found for '${sessionId}'. Run init first.`);
    }
  }
  rehydrateFromEvents(sessionId) {
    const stored = this.engineDeps.store.readEvents(sessionId);
    const state = reduceWorkflowStateFromStoredEvents(this.factory, stored);
    return this.factory.buildWorkflow(state, this.workflowDeps);
  }
  persistEvents(sessionId, workflow) {
    const pending = workflow.getPendingEvents();
    if (pending.length === 0)
      return;
    const preAppendState = this.rehydrateFromEvents(sessionId).getState();
    this.engineDeps.store.appendEvents(sessionId, this.wrapEvents(pending, preAppendState));
  }
  wrapEvents(events, startState) {
    const { stored } = events.reduce((accumulator, event) => ({
      state: this.factory.fold(accumulator.state, event),
      stored: [...accumulator.stored, {
        envelope: {
          type: event.type,
          at: event.at,
          state: accumulator.state.currentStateMachineState
        },
        payload: toPayload(event)
      }]
    }), {
      state: startState,
      stored: []
    });
    return stored;
  }
  applyIdentityGate(sessionId, workflow, op) {
    const identityResult = this.verifyIdentity(sessionId, workflow);
    if (identityResult === void 0)
      return void 0;
    this.persistEvents(sessionId, workflow);
    const currentPrefix = getExpectedPrefix(workflow.getState().currentStateMachineState, this.factory.getRegistry());
    return {
      type: "blocked",
      output: formatOperationGateError(op, identityResult, currentPrefix)
    };
  }
  verifyIdentity(sessionId, workflow) {
    const transcriptPath = workflow.getTranscriptPath();
    const state = workflow.getState().currentStateMachineState;
    const registry = this.factory.getRegistry();
    const pattern = buildPrefixPattern(registry);
    const messages = this.engineDeps.transcriptReader.readMessages(transcriptPath);
    const identityCheckResult = checkIdentity(messages, pattern);
    this.persistPlatformEvent(sessionId, workflow.getState(), {
      type: "identity-verified",
      at: this.engineDeps.now(),
      status: identityCheckResult.status,
      transcriptPath
    });
    if (identityCheckResult.status === "lost") {
      const currentProcedure = readProcedure(this.engineDeps, state);
      return [
        "Your last message is missing the required state prefix.",
        "",
        `- send a new message starting with: ${getExpectedPrefix(state, registry)}`,
        "- then continue with the current procedure",
        "",
        "Current procedure:",
        "",
        currentProcedure
      ].join("\n");
    }
    return void 0;
  }
  platformOperationContext(sessionId, workflow) {
    return {
      workflow,
      engineDeps: this.engineDeps,
      factory: this.factory,
      applyIdentityGate: (op) => this.applyIdentityGate(sessionId, workflow, op),
      persistPlatformEvent: (event) => this.persistPlatformEvent(sessionId, workflow.getState(), event)
    };
  }
  persistPlatformEvent(sessionId, state, event) {
    const platformEvent = engineEventSchema.parse(event);
    this.engineDeps.store.appendEvents(sessionId, [{
      envelope: {
        type: platformEvent.type,
        at: platformEvent.at,
        state: state.currentStateMachineState
      },
      payload: toPayload(platformEvent)
    }]);
  }
};

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/testing/workflow-spec.js
var EMPTY_OVERRIDES = Object.freeze({});

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/shell/exit-codes.js
var EXIT_ALLOW = 0;
var EXIT_ERROR = 1;
var EXIT_BLOCK = 2;

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/infra/cli/presentation/hook-output.js
function formatDenyDecision(reason) {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  });
}
function formatContextInjection(context) {
  return JSON.stringify({ additionalContext: context });
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/infra/external-clients/claude-hooks/hook-schemas.js
var hookCommonInputSchema = external_exports.object({
  session_id: external_exports.string().trim().min(1),
  transcript_path: external_exports.string().trim().min(1),
  cwd: external_exports.string().trim().min(1),
  permission_mode: external_exports.string().optional(),
  hook_event_name: external_exports.string().trim().min(1)
});
var preToolUseInputSchema = hookCommonInputSchema.extend({
  tool_name: external_exports.string().trim().min(1),
  tool_input: external_exports.record(external_exports.unknown()),
  tool_use_id: external_exports.string().trim().min(1)
});
var subagentStartInputSchema = hookCommonInputSchema.extend({
  agent_id: external_exports.string().trim().min(1),
  agent_type: external_exports.string().trim().min(1)
});
var teammateIdleInputSchema = hookCommonInputSchema.extend({ teammate_name: external_exports.string().optional() });

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/domain/pre-tool-use-handler.js
function createPreToolUseHandler(config) {
  return (engine, sessionId, toolName, toolInput) => {
    const filePath = extractFilePath(toolInput);
    const command = extractCommand(toolInput);
    const ctx = {
      toolName,
      filePath,
      command
    };
    for (const gate of config.customGates ?? []) {
      const result = engine.transaction(sessionId, `hook:${gate.name}`, (workflow) => {
        const check = gate.check(workflow, ctx);
        if (check === true)
          return { pass: true };
        return {
          pass: false,
          reason: check
        };
      });
      if (result.type === "blocked")
        return result;
    }
    if (toolName === "Bash")
      return engine.checkBash(sessionId, toolName, command, config.bashForbidden);
    return engine.checkWrite(sessionId, toolName, filePath, config.isWriteAllowed);
  };
}
function extractFilePath(toolInput) {
  return resolveStringField(toolInput["file_path"]) || resolveStringField(toolInput["path"]) || resolveStringField(toolInput["pattern"]);
}
function extractCommand(toolInput) {
  return resolveStringField(toolInput["command"]);
}
function resolveStringField(value) {
  if (value === void 0 || value === null)
    return "";
  if (typeof value === "string")
    return value;
  throw new TypeError(`Expected string or undefined in tool_input field. Got ${typeof value}: ${String(value)}`);
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/infra/external-clients/git/repository-name.js
import { execFileSync } from "node:child_process";
var httpsRemotePattern = /github\.com\/([^/]+\/[^/.]+?)(?:\.git)?$/;
var sshRemotePattern = /github\.com:([^/]+\/[^/.]+?)(?:\.git)?$/;
function getRepositoryName(cwd) {
  try {
    const url = execFileSync("/usr/bin/git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      cwd
    }).trim();
    const httpsMatch = httpsRemotePattern.exec(url);
    if (httpsMatch?.[1] !== void 0)
      return httpsMatch[1];
    const sshMatch = sshRemotePattern.exec(url);
    if (sshMatch?.[1] !== void 0)
      return sshMatch[1];
    return void 0;
  } catch {
    return void 0;
  }
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/domain/reflection-process-observations.js
import { readFileSync } from "node:fs";

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-event-store@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-event-store/dist/platform/infra/external-clients/sqlite/sqlite-runtime.js
import { createRequire } from "node:module";
var require2 = createRequire(import.meta.url);
var sqliteFactory = loadSqliteFactory();
function openSqliteDatabase(path2, options = {}) {
  return wrapSqliteDatabase(sqliteFactory.open(path2, options));
}
function enableWalMode(database) {
  database.exec("PRAGMA journal_mode = WAL");
}
function loadSqliteFactory() {
  if (process.versions["bun"] !== void 0) {
    return loadBunSqliteFactory();
  }
  return loadNodeSqliteFactory();
}
function loadBunSqliteFactory() {
  const requiredModule = require2("bun:sqlite");
  if (!isBunSqliteModule(requiredModule)) {
    throw new TypeError("bun:sqlite did not expose Database.");
  }
  return {
    open(path2, options) {
      return options.readonly === true ? new requiredModule.Database(path2, { readonly: true }) : new requiredModule.Database(path2);
    }
  };
}
function loadNodeSqliteFactory() {
  const requiredModule = require2("node:sqlite");
  if (!isNodeSqliteModule(requiredModule)) {
    throw new TypeError("node:sqlite did not expose DatabaseSync.");
  }
  return {
    open(path2, options) {
      return new requiredModule.DatabaseSync(path2, { readOnly: options.readonly === true });
    }
  };
}
function wrapSqliteDatabase(db) {
  return {
    prepare: (sql) => wrapSqliteStatement(db.prepare(sql)),
    exec: (sql) => db.exec(sql),
    close: () => db.close()
  };
}
function wrapSqliteStatement(statement) {
  return {
    all: (...params) => statement.all(...params),
    get: (...params) => normalizeGetResult(statement.get(...params)),
    run: (...params) => statement.run(...params)
  };
}
function normalizeGetResult(row) {
  return row === null ? void 0 : row;
}
function isBunSqliteModule(value) {
  return typeof value === "object" && value !== null && "Database" in value;
}
function isNodeSqliteModule(value) {
  return typeof value === "object" && value !== null && "DatabaseSync" in value;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-event-store@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-event-store/dist/platform/domain/sqlite-review-storage.js
var createReviewsTableSql = `
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    review_type TEXT NOT NULL,
    verdict TEXT NOT NULL,
    branch TEXT,
    pull_request_number INTEGER,
    source_state TEXT,
    payload_json TEXT NOT NULL
  )
`;
var createReviewsSessionIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_reviews_session_created_at
  ON reviews (session_id, created_at ASC, id ASC)
`;
var createReviewsTypeVerdictIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_reviews_type_verdict
  ON reviews (review_type, verdict)
`;
var createReviewsBranchIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_reviews_branch
  ON reviews (branch)
`;
var createReviewsPullRequestIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_reviews_pull_request_number
  ON reviews (pull_request_number)
`;
var reviewIdRowSchema = external_exports.object({ id: external_exports.union([external_exports.number(), external_exports.bigint(), external_exports.string()]) });
var reviewRowsSchema = external_exports.array(external_exports.object({
  id: external_exports.number(),
  session_id: external_exports.string(),
  created_at: external_exports.string(),
  review_type: external_exports.string(),
  verdict: external_exports.string(),
  branch: external_exports.string().nullable(),
  pull_request_number: external_exports.number().nullable(),
  source_state: external_exports.string().nullable(),
  payload_json: external_exports.string()
}));
var listedReviewRowsSchema = external_exports.array(external_exports.object({
  id: external_exports.number(),
  session_id: external_exports.string(),
  created_at: external_exports.string(),
  review_type: external_exports.string(),
  verdict: external_exports.string(),
  branch: external_exports.string().nullable(),
  pull_request_number: external_exports.number().nullable(),
  source_state: external_exports.string().nullable(),
  payload_json: external_exports.string(),
  repository: external_exports.string().nullable()
}));
var persistedReviewPayloadSchema = recordReviewInputSchema.passthrough();
function buildReviewFilters(filters) {
  const parsed = reviewFiltersSchema.parse(filters);
  const conditions = [];
  const parameters = [];
  if (parsed.repository !== void 0) {
    conditions.push(`(
      SELECT json_extract(events.payload, '$.repository')
      FROM events
      WHERE events.session_id = reviews.session_id AND events.type = 'session-started'
      ORDER BY events.seq ASC
      LIMIT 1
    ) = ?`);
    parameters.push(parsed.repository);
  }
  if (parsed.branch !== void 0) {
    conditions.push("reviews.branch = ?");
    parameters.push(parsed.branch);
  }
  if (parsed.pullRequestNumber !== void 0) {
    conditions.push("reviews.pull_request_number = ?");
    parameters.push(parsed.pullRequestNumber);
  }
  if (parsed.reviewType !== void 0) {
    conditions.push("reviews.review_type = ?");
    parameters.push(parsed.reviewType);
  }
  if (parsed.verdict !== void 0) {
    conditions.push("reviews.verdict = ?");
    parameters.push(parsed.verdict);
  }
  return {
    conditions,
    parameters
  };
}
function parseStoredReviewRow(row) {
  const parsedPayload = JSON.parse(row.payload_json);
  return storedReviewSchema.parse({
    ...parseReviewPayload(parsedPayload),
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    reviewType: row.review_type,
    verdict: row.verdict,
    ...row.branch === null ? {} : { branch: row.branch },
    ...row.pull_request_number === null ? {} : { pullRequestNumber: row.pull_request_number },
    ...row.source_state === null ? {} : { sourceState: row.source_state }
  });
}
function parseListedReviewRow(row) {
  const parsedPayload = JSON.parse(row.payload_json);
  return listedReviewSchema.parse({
    ...parseReviewPayload(parsedPayload),
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    reviewType: row.review_type,
    verdict: row.verdict,
    ...row.branch === null ? {} : { branch: row.branch },
    ...row.pull_request_number === null ? {} : { pullRequestNumber: row.pull_request_number },
    ...row.source_state === null ? {} : { sourceState: row.source_state },
    ...row.repository === null ? {} : { repository: row.repository }
  });
}
function parseReviewPayload(payload) {
  const parsed = persistedReviewPayloadSchema.parse(payload);
  return {
    findings: parsed.findings,
    ...parsed.summary === void 0 ? {} : { summary: parsed.summary },
    ...parsed.branch === void 0 ? {} : { branch: parsed.branch },
    ...parsed.pullRequestNumber === void 0 ? {} : { pullRequestNumber: parsed.pullRequestNumber }
  };
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-event-store@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-event-store/dist/platform/domain/sqlite-event-store.js
var createTableSql = `
  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    at TEXT NOT NULL,
    state TEXT,
    payload TEXT NOT NULL
  )
`;
var createReflectionsTableSql = `
  CREATE TABLE IF NOT EXISTS reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    label TEXT,
    agent_name TEXT,
    source_state TEXT,
    payload_json TEXT NOT NULL
  )
`;
var createReflectionsIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_reflections_session_created_at
  ON reflections (session_id, created_at DESC, id DESC)
`;
var eventRowSchema = external_exports.array(external_exports.object({
  type: external_exports.string(),
  at: external_exports.string(),
  state: external_exports.string().nullable(),
  payload: external_exports.string()
}));
var rowWithSessionIdSchema = external_exports.array(external_exports.object({ session_id: external_exports.string() }));
var countFieldSchema = external_exports.union([external_exports.number(), external_exports.bigint(), external_exports.string()]);
var countRowSchema = external_exports.object({ count: countFieldSchema });
var tableInfoRowSchema = external_exports.array(external_exports.object({ name: external_exports.string() }));
var reflectionIdRowSchema = external_exports.object({ id: countFieldSchema });
var reflectionRowsSchema = external_exports.array(external_exports.object({
  id: external_exports.number(),
  session_id: external_exports.string(),
  created_at: external_exports.string(),
  label: external_exports.string().nullable(),
  agent_name: external_exports.string().nullable(),
  source_state: external_exports.string().nullable(),
  payload_json: external_exports.string()
}));
function createStore(dbPath) {
  const db = openSqliteDatabase(dbPath);
  enableWalMode(db);
  db.exec(createTableSql);
  db.exec(createReflectionsTableSql);
  db.exec(createReflectionsIndexSql);
  db.exec(createReviewsTableSql);
  db.exec(createReviewsSessionIndexSql);
  db.exec(createReviewsTypeVerdictIndexSql);
  db.exec(createReviewsBranchIndexSql);
  db.exec(createReviewsPullRequestIndexSql);
  ensureStateColumn(db);
  return {
    db,
    readEvents(sessionId) {
      const rawRows = db.prepare("SELECT type, at, state, payload FROM events WHERE session_id = ? ORDER BY seq").all(sessionId);
      const rows = eventRowSchema.parse(rawRows);
      return rows.map((row, index) => buildStoredEvent(row, sessionId, index));
    },
    appendEvents(sessionId, events) {
      if (events.length === 0)
        return;
      const insert = db.prepare("INSERT INTO events (session_id, type, at, state, payload) VALUES (?, ?, ?, ?, ?)");
      db.exec("BEGIN IMMEDIATE");
      try {
        for (const event of events) {
          insert.run(sessionId, event.envelope.type, event.envelope.at, event.envelope.state ?? null, JSON.stringify(event.payload));
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    sessionExists(sessionId) {
      return readCount(db, "SELECT COUNT(1) AS count FROM events WHERE session_id = ?", sessionId) > 0;
    },
    hasSessionStarted(sessionId) {
      return readCount(db, "SELECT COUNT(1) AS count FROM events WHERE session_id = ? AND type = 'session-started'", sessionId) > 0;
    },
    recordReflection(sessionId, createdAt, input) {
      const parsedInput = recordReflectionInputSchema.parse(input);
      const insert = db.prepare("INSERT INTO reflections (session_id, created_at, label, agent_name, source_state, payload_json) VALUES (?, ?, ?, ?, ?, ?)");
      db.exec("BEGIN IMMEDIATE");
      try {
        insert.run(sessionId, createdAt, parsedInput.label ?? null, parsedInput.agentName ?? null, parsedInput.sourceState ?? null, JSON.stringify(parsedInput.reflection));
        const rawId = db.prepare("SELECT last_insert_rowid() AS id").get();
        const parsedId = reflectionIdRowSchema.parse(rawId);
        const id = Number(parsedId.id);
        db.exec("COMMIT");
        return storedReflectionSchema.parse({
          id,
          sessionId,
          createdAt,
          ...parsedInput.label === void 0 ? {} : { label: parsedInput.label },
          ...parsedInput.agentName === void 0 ? {} : { agentName: parsedInput.agentName },
          ...parsedInput.sourceState === void 0 ? {} : { sourceState: parsedInput.sourceState },
          reflection: parsedInput.reflection
        });
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    listReflections(sessionId) {
      const rawRows = db.prepare("SELECT id, session_id, created_at, label, agent_name, source_state, payload_json FROM reflections WHERE session_id = ? ORDER BY created_at DESC, id DESC").all(sessionId);
      const rows = reflectionRowsSchema.parse(rawRows);
      return rows.map((row) => {
        const reflectionPayload = JSON.parse(row.payload_json);
        return storedReflectionSchema.parse({
          id: row.id,
          sessionId: row.session_id,
          createdAt: row.created_at,
          ...row.label === null ? {} : { label: row.label },
          ...row.agent_name === null ? {} : { agentName: row.agent_name },
          ...row.source_state === null ? {} : { sourceState: row.source_state },
          reflection: reflectionPayload
        });
      });
    },
    recordReview(sessionId, createdAt, input) {
      const parsedInput = recordReviewInputSchema.parse(input);
      const insert = db.prepare("INSERT INTO reviews (session_id, created_at, review_type, verdict, branch, pull_request_number, source_state, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      db.exec("BEGIN IMMEDIATE");
      try {
        insert.run(sessionId, createdAt, parsedInput.reviewType, parsedInput.verdict, parsedInput.branch ?? null, parsedInput.pullRequestNumber ?? null, parsedInput.sourceState ?? null, JSON.stringify(parsedInput));
        const rawId = db.prepare("SELECT last_insert_rowid() AS id").get();
        const parsedId = reviewIdRowSchema.parse(rawId);
        const id = Number(parsedId.id);
        db.exec("COMMIT");
        return storedReviewSchema.parse({
          id,
          sessionId,
          createdAt,
          ...parsedInput
        });
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    recordReviewWithEvent(sessionId, createdAt, input, eventState) {
      const parsedInput = recordReviewInputSchema.parse(input);
      const insertReview = db.prepare("INSERT INTO reviews (session_id, created_at, review_type, verdict, branch, pull_request_number, source_state, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      const insertEvent = db.prepare("INSERT INTO events (session_id, type, at, state, payload) VALUES (?, ?, ?, ?, ?)");
      db.exec("BEGIN IMMEDIATE");
      try {
        insertReview.run(sessionId, createdAt, parsedInput.reviewType, parsedInput.verdict, parsedInput.branch ?? null, parsedInput.pullRequestNumber ?? null, parsedInput.sourceState ?? null, JSON.stringify(parsedInput));
        const rawId = db.prepare("SELECT last_insert_rowid() AS id").get();
        const parsedId = reviewIdRowSchema.parse(rawId);
        const id = Number(parsedId.id);
        insertEvent.run(sessionId, "review-recorded", createdAt, eventState, JSON.stringify({
          reviewId: id,
          reviewType: parsedInput.reviewType,
          verdict: parsedInput.verdict
        }));
        db.exec("COMMIT");
        return storedReviewSchema.parse({
          id,
          sessionId,
          createdAt,
          ...parsedInput
        });
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    listSessionReviews(sessionId) {
      const rawRows = db.prepare("SELECT id, session_id, created_at, review_type, verdict, branch, pull_request_number, source_state, payload_json FROM reviews WHERE session_id = ? ORDER BY created_at ASC, id ASC").all(sessionId);
      const rows = reviewRowsSchema.parse(rawRows);
      return rows.map(parseStoredReviewRow);
    },
    listReviews(filters) {
      const parsedFilters = buildReviewFilters(filters);
      const whereClause = parsedFilters.conditions.length === 0 ? "" : `WHERE ${parsedFilters.conditions.join(" AND ")}`;
      const rawRows = db.prepare(`
        SELECT
          reviews.id,
          reviews.session_id,
          reviews.created_at,
          reviews.review_type,
          reviews.verdict,
          reviews.branch,
          reviews.pull_request_number,
          reviews.source_state,
          reviews.payload_json,
          (
            SELECT json_extract(events.payload, '$.repository')
            FROM events
            WHERE events.session_id = reviews.session_id AND events.type = 'session-started'
            ORDER BY events.seq ASC
            LIMIT 1
          ) AS repository
        FROM reviews
        ${whereClause}
        ORDER BY reviews.created_at DESC, reviews.id DESC
      `).all(...parsedFilters.parameters);
      const rows = listedReviewRowsSchema.parse(rawRows);
      return rows.map(parseListedReviewRow);
    },
    listSessions() {
      const rawRows = db.prepare("SELECT session_id FROM events GROUP BY session_id ORDER BY MIN(seq)").all();
      return rowWithSessionIdSchema.parse(rawRows).map((row) => row.session_id);
    }
  };
}
function readCount(db, query, sessionId) {
  const rawRow = db.prepare(query).get(sessionId);
  if (rawRow === void 0 || rawRow === null)
    return 0;
  const parsed = countRowSchema.safeParse(rawRow);
  if (!parsed.success) {
    throw new WorkflowStateError(`Invalid count query row for session ${sessionId}: ${parsed.error.message}`);
  }
  const normalized = Number(parsed.data.count);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new WorkflowStateError(`Invalid count value for session ${sessionId}: ${String(parsed.data.count)}`);
  }
  return normalized;
}
function tryParsePayload(payload, index) {
  try {
    return JSON.parse(payload);
  } catch (cause) {
    throw new WorkflowStateError(`Cannot parse event payload at index ${index}: ${String(cause)}`);
  }
}
function ensureStateColumn(db) {
  const rawColumns = db.prepare("PRAGMA table_info(events)").all();
  const columns = tableInfoRowSchema.parse(rawColumns);
  if (columns.some((column) => column.name === "state"))
    return;
  db.exec("ALTER TABLE events ADD COLUMN state TEXT");
}
function buildStoredEvent(row, sessionId, index) {
  const parsedPayload = tryParsePayload(row.payload, index);
  if (!isRecord(parsedPayload)) {
    throw new WorkflowStateError(`Invalid event payload at index ${index} for session ${sessionId}: expected object`);
  }
  return {
    envelope: {
      type: row.type,
      at: row.at,
      state: row.state ?? void 0
    },
    payload: stripEnvelopeKeys(parsedPayload)
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/domain/reflection-process-observations.js
var jsonlToolUseSchema = external_exports.object({
  type: external_exports.literal("tool_use"),
  name: external_exports.string()
});
var jsonlAssistantSchema = external_exports.object({
  type: external_exports.literal("assistant"),
  timestamp: external_exports.string().optional(),
  message: external_exports.object({ content: external_exports.array(external_exports.unknown()).optional() }).optional()
});
var opencodeActivityRowSchema = external_exports.object({
  m_time: external_exports.number().nullable(),
  p_time: external_exports.number().nullable(),
  part_data: external_exports.string()
});
var opencodeToolPartSchema = external_exports.object({
  type: external_exports.literal("tool"),
  tool: external_exports.string()
});
function parseTs(raw) {
  if (typeof raw !== "string")
    return 0;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function collectToolUses(content, timestampMs) {
  const results = [];
  for (const block of content) {
    const parsed = jsonlToolUseSchema.safeParse(block);
    if (parsed.success) {
      results.push({
        name: parsed.data.name,
        timestampMs
      });
    }
  }
  return results;
}
function extractToolCallsFromJsonl(path2) {
  const raw = readFileSync(path2, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  return lines.flatMap((line) => {
    const parsed = jsonlAssistantSchema.safeParse(safeParseJson(line));
    if (!parsed.success)
      return [];
    return collectToolUses(parsed.data.message?.content ?? [], parseTs(parsed.data.timestamp));
  });
}
function extractOpencodeToolCall(row) {
  const parsedRow = opencodeActivityRowSchema.safeParse(row);
  if (!parsedRow.success)
    return null;
  const parsedPart = opencodeToolPartSchema.safeParse(safeParseJson(parsedRow.data.part_data));
  if (!parsedPart.success)
    return null;
  return {
    name: parsedPart.data.tool,
    timestampMs: parsedRow.data.p_time ?? parsedRow.data.m_time ?? 0
  };
}
function extractToolCallsFromOpencode(path2, sessionId) {
  const db = openSqliteDatabase(path2, { readonly: true });
  try {
    const rows = db.prepare(`
      SELECT m.time_created as m_time, p.time_created as p_time, p.data as part_data
      FROM message m
      JOIN part p ON p.message_id = m.id
      WHERE m.session_id = ?
      ORDER BY m.time_created ASC, p.time_created ASC
    `).all(sessionId);
    const calls = [];
    for (const row of rows) {
      const call = extractOpencodeToolCall(row);
      if (call !== null)
        calls.push(call);
    }
    return calls;
  } finally {
    db.close();
  }
}
function readToolCalls(transcriptPath, sessionId) {
  if (transcriptPath === void 0 || transcriptPath.length === 0)
    return [];
  try {
    if (transcriptPath.endsWith(".jsonl"))
      return extractToolCallsFromJsonl(transcriptPath);
    if (transcriptPath.endsWith(".db"))
      return extractToolCallsFromOpencode(transcriptPath, sessionId);
    return [];
  } catch {
    return [];
  }
}
function computeStatePeriods(events, currentState) {
  if (events.length === 0)
    return [];
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const startEvent = events.find((event) => event.envelope.type === "session-started") ?? firstEvent;
  const startStateRaw = startEvent.payload["currentState"];
  const initialState = typeof startStateRaw === "string" && startStateRaw.length > 0 ? startStateRaw : currentState;
  const aggregated = events.reduce((accumulator, event) => {
    if (event.envelope.type !== "transitioned")
      return accumulator;
    const nextState = event.payload["to"];
    if (typeof nextState !== "string" || nextState.length === 0)
      return accumulator;
    const endedAt = event.envelope.at;
    return {
      state: nextState,
      startedAt: endedAt,
      periods: [...accumulator.periods, {
        state: accumulator.state,
        startedAt: accumulator.startedAt,
        endedAt,
        durationMs: Math.max(parseTs(endedAt) - parseTs(accumulator.startedAt), 0)
      }]
    };
  }, {
    state: initialState,
    startedAt: startEvent.envelope.at,
    periods: []
  });
  return [...aggregated.periods, {
    state: aggregated.state,
    startedAt: aggregated.startedAt,
    endedAt: lastEvent.envelope.at,
    durationMs: Math.max(parseTs(lastEvent.envelope.at) - parseTs(aggregated.startedAt), 0)
  }];
}
function buildObservedEventTypes(events) {
  const counts = /* @__PURE__ */ new Map();
  const payloadKeys = /* @__PURE__ */ new Map();
  for (const event of events) {
    counts.set(event.envelope.type, (counts.get(event.envelope.type) ?? 0) + 1);
    const keys = payloadKeys.get(event.envelope.type) ?? /* @__PURE__ */ new Set();
    for (const key of Object.keys(event.payload))
      keys.add(key);
    payloadKeys.set(event.envelope.type, keys);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([type, count]) => ({
    type,
    count,
    payloadKeys: [...payloadKeys.get(type) ?? /* @__PURE__ */ new Set()].sort((a, b) => a.localeCompare(b))
  }));
}
function buildStateDurationSummary(periods) {
  const totalDurationMs = periods.reduce((sum, period) => sum + period.durationMs, 0);
  const byState = periods.reduce((map, period) => {
    const current = map.get(period.state) ?? {
      durationMs: 0,
      entryCount: 0
    };
    map.set(period.state, {
      durationMs: current.durationMs + period.durationMs,
      entryCount: current.entryCount + 1
    });
    return map;
  }, /* @__PURE__ */ new Map());
  return {
    totalDurationMs,
    states: [...byState.entries()].map(([state, value]) => ({
      state,
      durationMs: value.durationMs,
      percentageOfSession: totalDurationMs === 0 ? 0 : Math.round(value.durationMs / totalDurationMs * 1e3) / 10,
      entryCount: value.entryCount
    })).sort((a, b) => b.durationMs - a.durationMs || a.state.localeCompare(b.state))
  };
}
function buildTransitionSummary(events) {
  const transitions = events.flatMap((event) => {
    if (event.envelope.type !== "transitioned")
      return [];
    const from = event.payload["from"];
    const to = event.payload["to"];
    return typeof from === "string" && typeof to === "string" ? [{
      from,
      to
    }] : [];
  });
  const counts = transitions.reduce((map, transition) => {
    const key = `${transition.from}\0${transition.to}`;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, /* @__PURE__ */ new Map());
  const repeatedPathCounts = transitions.slice(0, -1).reduce((map, transition, index) => {
    const next = transitions.at(index + 1);
    if (next === void 0)
      return map;
    const key = [transition.from, transition.to, next.to].join("\0");
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, /* @__PURE__ */ new Map());
  return {
    transitions: [...counts.entries()].map(([key, count]) => {
      const parts = key.split("\0");
      const from = parts[0];
      const to = parts[1];
      return {
        from: typeof from === "string" ? from : "",
        to: typeof to === "string" ? to : "",
        count
      };
    }).sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
    repeatedPaths: [...repeatedPathCounts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({
      path: key.split("\0"),
      count
    })).sort((a, b) => b.count - a.count || a.path.join(">").localeCompare(b.path.join(">")))
  };
}
function buildDenialSummary(events) {
  const byType = {
    write: 0,
    bash: 0,
    pluginRead: 0,
    idle: 0
  };
  const byState = /* @__PURE__ */ new Map();
  const denialTypes = /* @__PURE__ */ new Map([
    ["write-checked", "write"],
    ["bash-checked", "bash"],
    ["plugin-read-checked", "pluginRead"],
    ["idle-checked", "idle"]
  ]);
  for (const event of events) {
    const key = denialTypes.get(event.envelope.type);
    if (key === void 0 || event.payload["allowed"] !== false)
      continue;
    byType[key] += 1;
    const state = event.envelope.state ?? "unknown";
    byState.set(state, (byState.get(state) ?? 0) + 1);
  }
  return {
    total: byType.write + byType.bash + byType.pluginRead + byType.idle,
    byType,
    byState: [...byState.entries()].map(([state, count]) => ({
      state,
      count
    })).sort((a, b) => b.count - a.count || a.state.localeCompare(b.state))
  };
}
function buildCounts(calls, startedAtMs, endedAtMs) {
  return calls.reduce((accumulator, call) => {
    if (call.timestampMs < startedAtMs || call.timestampMs > endedAtMs)
      return accumulator;
    accumulator.toolCounts.set(call.name, (accumulator.toolCounts.get(call.name) ?? 0) + 1);
    return {
      totalToolCalls: accumulator.totalToolCalls + 1,
      toolCounts: accumulator.toolCounts
    };
  }, {
    totalToolCalls: 0,
    toolCounts: /* @__PURE__ */ new Map()
  });
}
function bucketToolCallsByState(calls, periods) {
  return periods.map((period) => {
    const counts = buildCounts(calls, parseTs(period.startedAt), parseTs(period.endedAt));
    return {
      state: period.state,
      totalToolCalls: counts.totalToolCalls,
      toolCounts: [...counts.toolCounts.entries()].map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    };
  });
}
function buildToolSummary(transcriptPath, sessionId, periods) {
  const calls = readToolCalls(transcriptPath, sessionId);
  return {
    usedToolNames: [...new Set(calls.map((call) => call.name))].sort((a, b) => a.localeCompare(b)),
    byState: bucketToolCallsByState(calls, periods)
  };
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/domain/reflection-process.js
function computeCurrentState(workflowDefinition2, events) {
  return reduceWorkflowStateFromStoredEvents(workflowDefinition2, events).currentStateMachineState;
}
function buildDiscoverySources(input) {
  return [
    ...input.repositoryRoot === void 0 ? [] : [{
      kind: "repository-root",
      path: input.repositoryRoot
    }],
    ...input.transcriptPath === void 0 || input.transcriptPath === "" ? [] : [{
      kind: "transcript",
      path: input.transcriptPath
    }],
    ...input.eventStorePath === void 0 || input.eventStorePath === "" ? [] : [{
      kind: "event-store",
      path: input.eventStorePath,
      sessionId: input.sessionId
    }]
  ];
}
function buildReflectionProcess(input) {
  const currentState = computeCurrentState(input.workflowDefinition, input.events);
  const periods = computeStatePeriods(input.events, currentState);
  return {
    schemaVersion: 1,
    context: {
      sessionId: input.sessionId,
      ...input.repository === void 0 ? {} : { repository: input.repository },
      ...input.repositoryRoot === void 0 ? {} : { repositoryRoot: input.repositoryRoot },
      ...input.transcriptPath === void 0 || input.transcriptPath === "" ? {} : { transcriptPath: input.transcriptPath },
      ...input.eventStorePath === void 0 || input.eventStorePath === "" ? {} : { eventStorePath: input.eventStorePath },
      currentState
    },
    discovery: { sources: buildDiscoverySources(input) },
    workflow: {
      knownStates: Object.keys(input.workflowDefinition.getRegistry()).sort((a, b) => a.localeCompare(b)),
      observedEventTypes: buildObservedEventTypes(input.events)
    },
    observations: {
      stateDurations: buildStateDurationSummary(periods),
      transitions: buildTransitionSummary(input.events),
      denials: buildDenialSummary(input.events),
      tools: buildToolSummary(input.transcriptPath, input.sessionId, periods)
    },
    instructions: {
      objective: "Produce optimisation opportunities only for this session. Do not restate information already visible in the UI.",
      questionsToAnswer: [
        "Where was the most time spent, and why?",
        "Did any state loops indicate rework or late discovery?",
        "Did a review phase or quality gate discover issues later than it should have?",
        "Were instructions unclear, tools blocked, or better tools unused?",
        "What concrete workflow, tooling, or process change would improve the next run?"
      ],
      constraints: [
        "Do not include what went well.",
        "Do not summarize the session without an improvement conclusion.",
        "Do not assume the largest numbers are the most important issues.",
        "Use raw evidence only to confirm cause and recommendation.",
        "Every finding must be evidence-backed and actionable."
      ],
      recommendedSteps: [
        "Scan the repository to find the project workflow definition and related state files.",
        "Review the observed event types to understand workflow-specific signals.",
        "Inspect the event log and transcript for the observations that appear most relevant.",
        "Record only structured optimisation findings that match the required output schema."
      ]
    },
    output: {
      kind: "reflection",
      schemaVersion: 1,
      allowedCategories: [
        "state-efficiency",
        "review-rework",
        "quality-gates",
        "tooling",
        "workflow-design"
      ],
      maxFindings: 10
    }
  };
}
function resolveRepository(events) {
  for (const event of events) {
    if (event.envelope.type !== "session-started")
      continue;
    const repository = event.payload["repository"];
    if (typeof repository === "string" && repository.length > 0)
      return repository;
  }
  return void 0;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/entrypoint/reflection-routes.js
function jsonResult(value) {
  return {
    output: JSON.stringify(value, null, 2),
    exitCode: EXIT_ALLOW
  };
}
function errorResult(output) {
  return {
    output,
    exitCode: EXIT_ERROR
  };
}
function parseFlagArgs(args) {
  const flags = /* @__PURE__ */ new Map();
  for (const [index, key] of args.entries()) {
    if (index % 2 === 1)
      continue;
    const value = args[index + 1];
    if (!key.startsWith("--")) {
      return {
        ok: false,
        message: `Invalid flag: ${String(key)}`
      };
    }
    if (typeof value !== "string" || value.length === 0) {
      return {
        ok: false,
        message: `Missing value for flag: ${key}`
      };
    }
    flags.set(key, value);
  }
  return {
    ok: true,
    flags
  };
}
function validateReflectionFlags(flags) {
  for (const key of flags.keys()) {
    if (key !== "--label" && key !== "--agent-name" && key !== "--source-state") {
      return `Unknown flag: ${key}`;
    }
  }
  return null;
}
function handleGetReflectionProcessRoute(engine, engineDeps, config, args, getSessionId, getSessionTranscriptPath, getSessionRepository, getRepositoryRoot, getWorkflowEventsDbPath) {
  if (args.length > 1) {
    return errorResult("get-reflection-process does not accept arguments");
  }
  if (getSessionId === void 0) {
    return errorResult("get-reflection-process requires an active workflow session");
  }
  const sessionId = getSessionId();
  if (!engine.hasSessionStarted(sessionId)) {
    return errorResult(`Session ${sessionId} has not been started`);
  }
  const events = engineDeps.store.readEvents(sessionId);
  return jsonResult(buildReflectionProcess({
    sessionId,
    repository: getSessionRepository?.() ?? resolveRepository(events),
    repositoryRoot: getRepositoryRoot?.(),
    transcriptPath: getSessionTranscriptPath?.(),
    eventStorePath: getWorkflowEventsDbPath?.(),
    workflowDefinition: config.workflowDefinition,
    events
  }));
}
function handleRecordReflectionRoute(engine, engineDeps, args, readStdin, getSessionId) {
  if (getSessionId === void 0) {
    return errorResult("record-reflection requires an active workflow session");
  }
  if (readStdin === void 0) {
    return errorResult("record-reflection requires JSON on stdin");
  }
  const parsedFlags = parseFlagArgs(args.slice(1));
  if (!parsedFlags.ok) {
    return errorResult(parsedFlags.message);
  }
  const flagError = validateReflectionFlags(parsedFlags.flags);
  if (flagError !== null) {
    return errorResult(flagError);
  }
  const sessionId = getSessionId();
  if (!engine.hasSessionStarted(sessionId)) {
    return errorResult(`Session ${sessionId} has not been started`);
  }
  try {
    const reflectionPayload = JSON.parse(readStdin());
    const parsed = recordReflectionInputSchema.safeParse({
      label: parsedFlags.flags.get("--label"),
      agentName: parsedFlags.flags.get("--agent-name"),
      sourceState: parsedFlags.flags.get("--source-state"),
      reflection: reflectionPayload
    });
    if (!parsed.success) {
      return errorResult(`Invalid reflection payload: ${parsed.error.message}`);
    }
    const stored = engineDeps.store.recordReflection(sessionId, engineDeps.now(), parsed.data);
    return jsonResult({
      ok: true,
      id: stored.id,
      sessionId: stored.sessionId,
      createdAt: stored.createdAt
    });
  } catch (error) {
    return errorResult(`Invalid reflection JSON: ${String(error)}`);
  }
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/entrypoint/review-routes.js
function jsonResult2(value) {
  return {
    output: JSON.stringify(value, null, 2),
    exitCode: EXIT_ALLOW
  };
}
function errorResult2(output) {
  return {
    output,
    exitCode: EXIT_ERROR
  };
}
function blockedResult(output) {
  return {
    output,
    exitCode: EXIT_BLOCK
  };
}
function parseReviewArguments(args) {
  const reviewType = args[1];
  const reviewJson = args[2];
  if (args.length !== 3 || typeof reviewType !== "string" || typeof reviewJson !== "string") {
    return {
      ok: false,
      message: "record-review requires <review-type> and <review-json> arguments"
    };
  }
  if (reviewType.length === 0) {
    return {
      ok: false,
      message: "record-review requires a non-empty review type"
    };
  }
  return {
    ok: true,
    reviewType,
    reviewJson
  };
}
function isReviewAllowed(allowedWorkflowOperations) {
  return allowedWorkflowOperations.some((allowedWorkflowOperation) => allowedWorkflowOperation === "record-review");
}
function handleRecordReviewRoute(engine, engineDeps, workflowDefinition2, args, getSessionId) {
  if (getSessionId === void 0) {
    return errorResult2("record-review requires an active workflow session");
  }
  const parsedArguments = parseReviewArguments(args);
  if (!parsedArguments.ok) {
    return errorResult2(parsedArguments.message);
  }
  const sessionId = getSessionId();
  if (!engine.hasSessionStarted(sessionId)) {
    return errorResult2(`Session ${sessionId} has not been started`);
  }
  const reviewPayloadResult = parseReviewPayload2(parsedArguments.reviewJson);
  if (!reviewPayloadResult.ok) {
    return errorResult2(reviewPayloadResult.message);
  }
  const parsedReview = reviewPayloadSchema.safeParse(reviewPayloadResult.payload);
  if (!parsedReview.success) {
    return errorResult2(`Invalid review payload: ${parsedReview.error.message}`);
  }
  const currentStateName = computeCurrentState2(workflowDefinition2, engineDeps.store.readEvents(sessionId));
  const allowedWorkflowOperations = workflowDefinition2.getRegistry()[currentStateName].allowedWorkflowOperations.map((allowedWorkflowOperation) => String(allowedWorkflowOperation));
  if (!isReviewAllowed(allowedWorkflowOperations)) {
    return blockedResult(`record-review is not allowed in state ${currentStateName}.`);
  }
  const createdAt = engineDeps.now();
  const stored = engineDeps.store.recordReviewWithEvent(sessionId, createdAt, {
    reviewType: parsedArguments.reviewType,
    sourceState: currentStateName,
    ...parsedReview.data
  }, currentStateName);
  return jsonResult2({
    ok: true,
    id: stored.id,
    sessionId,
    createdAt: stored.createdAt,
    reviewType: parsedArguments.reviewType,
    verdict: parsedReview.data.verdict
  });
}
function computeCurrentState2(workflowDefinition2, storedEvents) {
  const state = reduceWorkflowStateFromStoredEvents(workflowDefinition2, storedEvents);
  return state.currentStateMachineState;
}
function parseReviewPayload2(reviewJson) {
  try {
    return {
      ok: true,
      payload: JSON.parse(reviewJson)
    };
  } catch (error) {
    return {
      ok: false,
      message: `Invalid review JSON: ${String(error)}`
    };
  }
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/features/workflow-runner/entrypoint/workflow-runner.js
function resolvePreToolUseHandler(config) {
  const hasPolicy = config.bashForbidden !== void 0 || config.isWriteAllowed !== void 0 || config.customGates !== void 0;
  if (config.preToolUseHandler !== void 0) {
    if (hasPolicy) {
      throw new TypeError("WorkflowRunnerConfig: preToolUseHandler is mutually exclusive with bashForbidden/isWriteAllowed/customGates. Provide either policy fields (default path) or a custom handler (escape hatch), not both.");
    }
    return config.preToolUseHandler;
  }
  if (config.bashForbidden === void 0 && config.isWriteAllowed === void 0) {
    if (config.customGates !== void 0) {
      throw new TypeError("WorkflowRunnerConfig: customGates requires bashForbidden and isWriteAllowed to also be set.");
    }
    return void 0;
  }
  if (config.bashForbidden === void 0 || config.isWriteAllowed === void 0) {
    throw new TypeError("WorkflowRunnerConfig: bashForbidden and isWriteAllowed must be provided together.");
  }
  if (config.customGates === void 0) {
    return createPreToolUseHandler({
      bashForbidden: config.bashForbidden,
      isWriteAllowed: config.isWriteAllowed
    });
  }
  return createPreToolUseHandler({
    bashForbidden: config.bashForbidden,
    isWriteAllowed: config.isWriteAllowed,
    customGates: config.customGates
  });
}
function engineResultToRunnerResult(result) {
  switch (result.type) {
    case "success":
      return {
        output: result.output,
        exitCode: EXIT_ALLOW
      };
    case "blocked":
      return {
        output: result.output,
        exitCode: EXIT_BLOCK
      };
    case "error":
      return {
        output: result.output,
        exitCode: EXIT_ERROR
      };
  }
}
function parseArgs(argParsers, args, routeName) {
  const values = [];
  for (const [index, parser] of (argParsers ?? []).entries()) {
    const result = parser.parse(args, index + 1, routeName);
    if (!result.ok)
      return {
        ok: false,
        message: result.message
      };
    values.push(result.value);
  }
  return {
    ok: true,
    values
  };
}
function assertSessionId(values) {
  const id = values[0];
  if (typeof id !== "string")
    throw new TypeError("session-id argument must be a string");
  return id;
}
function assertTarget(values) {
  const target = values[1];
  if (typeof target !== "string")
    throw new TypeError("target argument must be a string");
  return target;
}
function createWorkflowRunner(config) {
  const resolvedHandler = resolvePreToolUseHandler(config);
  return (args, engineDeps, workflowDeps, options) => {
    const engine = new WorkflowEngine(config.workflowDefinition, engineDeps, workflowDeps);
    if (args.length > 0) {
      return handleRoute(engine, engineDeps, config, args, args[0], options?.readStdin, options?.getSessionId, options?.getSessionTranscriptPath, options?.getSessionRepository, options?.getRepositoryRoot, options?.getWorkflowEventsDbPath);
    }
    if (options?.readStdin === void 0)
      return {
        output: "No command and no stdin available",
        exitCode: EXIT_ERROR
      };
    return handleHook(engine, resolvedHandler, options.readStdin);
  };
}
function handleWriteJournalRoute(engine, args, getSessionId) {
  const hasExplicitSessionId = getSessionId === void 0;
  const sessionId = hasExplicitSessionId ? args[1] : getSessionId();
  const agentNameIndex = hasExplicitSessionId ? 2 : 1;
  const contentIndex = hasExplicitSessionId ? 3 : 2;
  const agentName = args[agentNameIndex];
  const content = args.slice(contentIndex).join(" ").trim();
  if (typeof sessionId !== "string" || typeof agentName !== "string" || content.length === 0) {
    return {
      output: "write-journal requires <agent-name> and <content> arguments",
      exitCode: EXIT_ERROR
    };
  }
  return engineResultToRunnerResult(engine.writeJournal(sessionId, agentName, content));
}
function handleGetStateRoute(engine, args, getSessionId) {
  const sessionId = getSessionId === void 0 ? args[1] : getSessionId();
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return {
      output: "get-state requires <session-id> argument",
      exitCode: EXIT_ERROR
    };
  }
  return engineResultToRunnerResult(engine.getState(sessionId));
}
function handleRoute(engine, engineDeps, config, args, routeName, readStdin, getSessionId, getSessionTranscriptPath, getSessionRepository, getRepositoryRoot, getWorkflowEventsDbPath) {
  const builtin = resolveBuiltinRoute(engine, engineDeps, config, args, routeName, readStdin, getSessionId, getSessionTranscriptPath, getSessionRepository, getRepositoryRoot, getWorkflowEventsDbPath);
  if (builtin !== void 0)
    return builtin;
  const routeDef = Object.hasOwn(config.routes, routeName) ? config.routes[routeName] : void 0;
  if (routeDef === void 0)
    return {
      output: `Unknown command: ${routeName}`,
      exitCode: EXIT_ERROR
    };
  const parsedArgs = parseArgs(routeDef.args, args, routeName);
  if (!parsedArgs.ok)
    return {
      output: parsedArgs.message,
      exitCode: EXIT_ERROR
    };
  const resolveSessionId2 = () => getSessionId === void 0 ? assertSessionId(parsedArgs.values) : getSessionId();
  const argsAfterSessionId = () => getSessionId === void 0 ? parsedArgs.values.slice(1) : parsedArgs.values;
  const resolveTarget = () => {
    if (getSessionId === void 0)
      return assertTarget(parsedArgs.values);
    const target = parsedArgs.values[0];
    if (typeof target !== "string")
      throw new TypeError("target argument must be a string");
    return target;
  };
  switch (routeDef.type) {
    case "session-start": {
      const transcriptPath = getSessionTranscriptPath === void 0 ? "" : getSessionTranscriptPath();
      const repository = getSessionRepository === void 0 ? "" : getSessionRepository();
      if (repository === void 0)
        throw new TypeError("repository must be a non-empty string.");
      return engineResultToRunnerResult(engine.startSession(resolveSessionId2(), transcriptPath, repository));
    }
    case "transition":
      return engineResultToRunnerResult(engine.transition(resolveSessionId2(), config.workflowDefinition.stateSchema.parse(resolveTarget())));
    case "transaction":
      return engineResultToRunnerResult(engine.transaction(resolveSessionId2(), routeName, (workflow) => routeDef.handler(workflow, ...argsAfterSessionId())));
  }
}
function resolveBuiltinRoute(engine, engineDeps, config, args, routeName, readStdin, getSessionId, getSessionTranscriptPath, getSessionRepository, getRepositoryRoot, getWorkflowEventsDbPath) {
  switch (routeName) {
    case "get-state":
      return handleGetStateRoute(engine, args, getSessionId);
    case "get-reflection-process":
      return handleGetReflectionProcessRoute(engine, engineDeps, config, args, getSessionId, getSessionTranscriptPath, getSessionRepository, getRepositoryRoot, getWorkflowEventsDbPath);
    case "record-reflection":
      return handleRecordReflectionRoute(engine, engineDeps, args, readStdin, getSessionId);
    case "record-review":
      return handleRecordReviewRoute(engine, engineDeps, config.workflowDefinition, args, getSessionId);
    case "write-journal":
      return handleWriteJournalRoute(engine, args, getSessionId);
    default:
      return void 0;
  }
}
function handleHook(engine, resolvedHandler, readStdin) {
  const stdin = readStdin();
  const hookInput = JSON.parse(stdin);
  const commonParse = hookCommonInputSchema.safeParse(hookInput);
  if (!commonParse.success)
    return {
      output: `Invalid hook input: ${commonParse.error.message}`,
      exitCode: EXIT_ERROR
    };
  const common = commonParse.data;
  if (common.hook_event_name === "SessionStart") {
    engine.persistSessionId(common.session_id);
    if (!engine.hasSessionStarted(common.session_id)) {
      return {
        output: "",
        exitCode: EXIT_ALLOW
      };
    }
    const repository = getRepositoryName(common.cwd);
    if (repository === void 0)
      throw new TypeError("repository must be a non-empty string.");
    return engineResultToRunnerResult(engine.startSession(common.session_id, common.transcript_path, repository));
  }
  if (!engine.hasSession(common.session_id))
    return {
      output: "",
      exitCode: EXIT_ALLOW
    };
  switch (common.hook_event_name) {
    case "PreToolUse":
      return handlePreToolUseHook(engine, resolvedHandler, stdin);
    case "SubagentStart":
      return handleSubagentStartHook(engine, stdin);
    case "TeammateIdle":
      return handleTeammateIdleHook(engine, stdin);
    default:
      return {
        output: "",
        exitCode: EXIT_ALLOW
      };
  }
}
function handlePreToolUseHook(engine, resolvedHandler, stdin) {
  const hookInput = JSON.parse(stdin);
  const toolParse = preToolUseInputSchema.safeParse(hookInput);
  if (!toolParse.success)
    return {
      output: `Invalid pre-tool-use input: ${toolParse.error.message}`,
      exitCode: EXIT_ERROR
    };
  return handlePreToolUse(engine, resolvedHandler, toolParse.data);
}
function handlePreToolUse(engine, resolvedHandler, input) {
  if (resolvedHandler === void 0)
    return {
      output: "",
      exitCode: EXIT_ALLOW
    };
  const result = resolvedHandler(engine, input.session_id, input.tool_name, input.tool_input);
  if (result.type === "blocked")
    return {
      output: formatDenyDecision(result.output),
      exitCode: EXIT_BLOCK
    };
  return engineResultToRunnerResult(result);
}
function handleSubagentStartHook(engine, stdin) {
  const hookInput = JSON.parse(stdin);
  const parsed = subagentStartInputSchema.safeParse(hookInput);
  if (!parsed.success)
    return {
      output: `Invalid subagent-start input: ${parsed.error.message}`,
      exitCode: EXIT_ERROR
    };
  const input = parsed.data;
  const result = engine.transaction(input.session_id, "register-agent", (workflow) => workflow.registerAgent(input.agent_type, input.agent_id));
  return {
    output: formatContextInjection(result.type === "success" ? result.output : ""),
    exitCode: EXIT_ALLOW
  };
}
function handleTeammateIdleHook(engine, stdin) {
  const hookInput = JSON.parse(stdin);
  const parsed = teammateIdleInputSchema.safeParse(hookInput);
  if (!parsed.success)
    return {
      output: `Invalid teammate-idle input: ${parsed.error.message}`,
      exitCode: EXIT_ERROR
    };
  const input = parsed.data;
  const agentName = resolveTeammateName(input.teammate_name);
  return engineResultToRunnerResult(engine.transaction(input.session_id, "check-idle", (workflow) => workflow.handleTeammateIdle(agentName)));
}
function resolveTeammateName(teammateName) {
  if (teammateName === void 0) {
    return "";
  }
  return teammateName;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-cli@0.4.1/node_modules/@nt-ai-lab/deterministic-agent-workflow-cli/dist/platform/infra/external-clients/process/default-process-deps.js
import { appendFileSync, readFileSync as readFileSync2 } from "node:fs";
function createDefaultProcessDeps() {
  return {
    getEnv: (name) => process.env[name],
    exit: (code) => process.exit(code),
    writeStdout: (value) => {
      process.stdout.write(value);
    },
    writeStderr: (value) => {
      process.stderr.write(value);
    },
    getArgv: () => process.argv,
    readFile: (path2) => readFileSync2(path2, "utf8"),
    appendToFile: (path2, content) => appendFileSync(path2, content),
    buildStore: (dbPath) => createStore(dbPath)
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/deterministic-agent-workflow-cli/define-workflow-routes.ts
function defineWorkflowRoutes(routes2) {
  return defineRoutes(routes2);
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-codex@0.4.2/node_modules/@nt-ai-lab/deterministic-agent-workflow-codex/dist/features/codex-code-cli/entrypoint/codex-code-workflow-cli.js
import { accessSync, constants, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-codex@0.4.2/node_modules/@nt-ai-lab/deterministic-agent-workflow-codex/dist/platform/infra/external-clients/codex/codex-hook-schemas.js
var codexHookInputSchema = external_exports.object({
  session_id: external_exports.string().trim().min(1),
  transcript_path: external_exports.string().trim().min(1).nullable(),
  cwd: external_exports.string().trim().min(1),
  hook_event_name: external_exports.enum(["SessionStart", "PreToolUse", "SubagentStart", "Stop"])
});
var codexPreToolUseInputSchema = codexHookInputSchema.extend({
  hook_event_name: external_exports.literal("PreToolUse"),
  tool_name: external_exports.string().trim().min(1),
  tool_input: external_exports.record(external_exports.unknown())
});
var codexSubagentStartInputSchema = codexHookInputSchema.extend({
  hook_event_name: external_exports.literal("SubagentStart"),
  agent_id: external_exports.string().trim().min(1),
  agent_type: external_exports.string().trim().min(1)
});

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-codex@0.4.2/node_modules/@nt-ai-lab/deterministic-agent-workflow-codex/dist/features/codex-code-cli/entrypoint/codex-code-workflow-cli.js
var EMPTY_TRANSCRIPT_READER = { readMessages: () => [] };
function requireNonEmptyString2(value, name) {
  if (value === void 0)
    throw new TypeError(`${name} must be a non-empty string.`);
  const trimmed = value.trim();
  if (trimmed.length === 0)
    throw new TypeError(`${name} must be a non-empty string.`);
  return trimmed;
}
function resolveTranscriptPath(sessionId, suppliedPath, now) {
  const candidate = suppliedPath === null ? "" : suppliedPath.trim();
  if (candidate.length > 0) {
    try {
      accessSync(candidate, constants.R_OK);
      if (!statSync(candidate).isFile())
        throw new TypeError("not a file");
    } catch {
      throw new TypeError(`Codex transcript is not a readable file: ${candidate}`);
    }
    return candidate;
  }
  const startedAt = new Date(now());
  const directory = join(homedir(), ".codex", "sessions", String(startedAt.getUTCFullYear()), String(startedAt.getUTCMonth() + 1).padStart(2, "0"), String(startedAt.getUTCDate()).padStart(2, "0"));
  const suffix = `-${sessionId}.jsonl`;
  const matches = (() => {
    try {
      return readdirSync(directory).filter((name) => name.startsWith("rollout-") && name.endsWith(suffix)).map((name) => join(directory, name));
    } catch {
      throw new TypeError(`Unable to resolve exactly one readable Codex transcript for session ${sessionId} in ${directory}.`);
    }
  })();
  if (matches.length !== 1) {
    throw new TypeError(`Unable to resolve exactly one readable Codex transcript for session ${sessionId} in ${directory}.`);
  }
  const transcriptPath = requireNonEmptyString2(matches[0], "transcriptPath");
  try {
    accessSync(transcriptPath, constants.R_OK);
    if (!statSync(transcriptPath).isFile())
      throw new TypeError("not a file");
  } catch {
    throw new TypeError(`Unable to resolve exactly one readable Codex transcript for session ${sessionId} in ${directory}.`);
  }
  return transcriptPath;
}
function createCodexWorkflowCli(config) {
  const root = config.workflowRoot ?? resolveWorkflowRoot();
  const databasePath = resolveDatabasePath(config.processDeps);
  const store = config.processDeps.buildStore(databasePath);
  const now = () => (/* @__PURE__ */ new Date()).toISOString();
  const engineDeps = {
    store,
    getPluginRoot: () => root,
    getEnvFilePath: () => join(root, ".codex", "unused.env"),
    readFile: config.processDeps.readFile,
    appendToFile: config.processDeps.appendToFile,
    now,
    transcriptReader: config.transcriptReader ?? EMPTY_TRANSCRIPT_READER
  };
  const args = config.processDeps.getArgv().slice(2);
  try {
    const result = args.length === 0 ? handleHookInvocation(config, engineDeps, root, now) : handleWorkflowCommand(config, engineDeps, root, now, args);
    writeResult(config.processDeps, result);
  } catch (error) {
    config.processDeps.writeStderr(`[${now()}] ERROR: ${String(error)}
`);
    config.processDeps.exit(1);
  }
}
function handleWorkflowCommand(config, engineDeps, root, now, args) {
  if (args.length < 2 || args[0] === "" || args[1] === "") {
    throw new TypeError("Codex workflow commands require <operation> <session-id> [args]");
  }
  const [operation, sessionId, ...operationArgs] = args;
  const workflowDeps = buildWorkflowDeps(config, engineDeps.store, root, now, sessionId);
  return createWorkflowRunner(config)([operation, ...operationArgs], engineDeps, workflowDeps, { getSessionId: () => sessionId });
}
function buildWorkflowDeps(config, store, root, now, sessionId) {
  const platform = {
    getPluginRoot: () => root,
    now,
    getSessionId: () => sessionId,
    store
  };
  return config.buildWorkflowDeps(platform);
}
function resolveWorkflowRoot() {
  return process.cwd();
}
function resolveDatabasePath(processDeps2) {
  const configured = processDeps2.getEnv("WORKFLOW_EVENTS_DB");
  if (configured !== void 0 && configured !== "")
    return configured;
  const home = processDeps2.getEnv("HOME");
  if (home === void 0 || home === "")
    throw new TypeError("Missing required environment variable: HOME");
  return join(home, ".workflow-events.db");
}
function handleHookInvocation(config, engineDeps, root, now) {
  const raw = config.processDeps.readFile("/dev/stdin");
  const parsed = codexHookInputSchema.parse(JSON.parse(raw));
  const workflowDeps = buildWorkflowDeps(config, engineDeps.store, root, now, parsed.session_id);
  const engine = new WorkflowEngine(config.workflowDefinition, engineDeps, workflowDeps);
  switch (parsed.hook_event_name) {
    case "SessionStart":
      return startSession(config, engine, parsed.session_id, parsed.transcript_path, parsed.cwd, now);
    case "PreToolUse":
      return checkToolUse(config, engine, raw);
    case "SubagentStart":
      return registerSubagent(engine, raw);
    case "Stop":
      return preventUnsupportedStop(config, engineDeps, parsed.session_id);
  }
}
function startSession(config, engine, sessionId, transcriptPath, cwd, now) {
  if (!engine.hasSessionStarted(sessionId)) {
    const transcriptFile = resolveTranscriptPath(sessionId, transcriptPath, now);
    const repository = getRepositoryName(cwd);
    if (repository === void 0)
      throw new TypeError("repository must be a non-empty string.");
    const result = engine.startSession(sessionId, transcriptFile, repository);
    if (result.type !== "success")
      return toRunnerResult(result);
  }
  return {
    output: formatContextInjection(`Workflow session: ${sessionId}. Use ${config.workflowCommand} transition ${sessionId} <STATE> for transitions, or ${config.workflowCommand} <OPERATION> ${sessionId} <ARGS> for workflow operations.`),
    exitCode: 0
  };
}
function checkToolUse(config, engine, raw) {
  const input = codexPreToolUseInputSchema.parse(JSON.parse(raw));
  if (!engine.hasSessionStarted(input.session_id))
    return {
      output: "",
      exitCode: 0
    };
  const handler = resolvePreToolUseHandler2(config);
  if (handler === void 0)
    return {
      output: "",
      exitCode: 0
    };
  if (input.tool_name === "apply_patch")
    return checkPatchPaths(handler, engine, input.session_id, input.tool_input);
  return toHookResult(handler(engine, input.session_id, input.tool_name, input.tool_input));
}
function resolvePreToolUseHandler2(config) {
  if (config.bashForbidden === void 0 && config.isWriteAllowed === void 0) {
    if (config.customGates !== void 0) {
      throw new TypeError("CodexWorkflowCliConfig: customGates requires bashForbidden and isWriteAllowed.");
    }
    return void 0;
  }
  if (config.bashForbidden === void 0 || config.isWriteAllowed === void 0) {
    throw new TypeError("CodexWorkflowCliConfig: bashForbidden and isWriteAllowed must be provided together.");
  }
  return createPreToolUseHandler({
    bashForbidden: config.bashForbidden,
    isWriteAllowed: config.isWriteAllowed,
    customGates: config.customGates
  });
}
function checkPatchPaths(handler, engine, sessionId, toolInput) {
  const command = toolInput.command;
  if (typeof command !== "string")
    return deny("Codex apply_patch hook is missing tool_input.command");
  const paths = extractPatchPaths(command);
  if (paths.length === 0)
    return deny("Cannot determine every file edited by Codex apply_patch");
  for (const path2 of paths) {
    const result = handler(engine, sessionId, "Write", {
      file_path: path2,
      command
    });
    if (result.type === "blocked")
      return toHookResult(result);
  }
  return {
    output: "",
    exitCode: 0
  };
}
function extractPatchPaths(command) {
  const paths = /* @__PURE__ */ new Set();
  for (const line of command.split("\n")) {
    const match = /^\*\*\* Update File: (.+)$|^\*\*\* Add File: (.+)$|^\*\*\* Delete File: (.+)$/.exec(line);
    const path2 = match?.[1] ?? match?.[2] ?? match?.[3];
    if (path2 !== void 0 && path2 !== "")
      paths.add(path2);
  }
  return [...paths];
}
function registerSubagent(engine, raw) {
  const input = codexSubagentStartInputSchema.parse(JSON.parse(raw));
  if (!engine.hasSessionStarted(input.session_id))
    return {
      output: "",
      exitCode: 0
    };
  const result = engine.transaction(input.session_id, "register-agent", (workflow) => workflow.registerAgent(input.agent_type, input.agent_id));
  return {
    output: formatContextInjection(result.type === "success" ? result.output : ""),
    exitCode: 0
  };
}
function preventUnsupportedStop(config, engineDeps, sessionId) {
  const stored = engineDeps.store.readEvents(sessionId);
  if (!engineDeps.store.hasSessionStarted(sessionId))
    return {
      output: "",
      exitCode: 0
    };
  const state = reduceWorkflowStateFromStoredEvents(config.workflowDefinition, stored);
  if (config.workflowDefinition.getRegistry()[state.currentStateMachineState].allowIdle === true)
    return {
      output: "",
      exitCode: 0
    };
  return {
    output: JSON.stringify({
      decision: "block",
      reason: `Workflow state ${state.currentStateMachineState} does not allow stopping.`
    }),
    exitCode: 0
  };
}
function toHookResult(result) {
  if (result.type === "blocked")
    return deny(result.output);
  return toRunnerResult(result);
}
function toRunnerResult(result) {
  return {
    output: result.output,
    exitCode: result.type === "success" ? 0 : 1
  };
}
function deny(reason) {
  return {
    output: formatDenyDecision(reason),
    exitCode: 0
  };
}
function writeResult(processDeps2, result) {
  if (result.output !== "")
    processDeps2.writeStdout(result.output);
  processDeps2.exit(result.exitCode);
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/adapters/git/workflow-git-status-reader.ts
function createWorkflowGitStatusReader(readGitRepositoryStatus2) {
  return () => {
    const status = readGitRepositoryStatus2();
    return {
      changedFilesVsDefault: status.changedFilesVsDefault,
      currentBranch: status.currentBranch,
      hasCommitsVsDefault: status.hasCommitsVsDefault,
      headCommit: status.headCommit,
      workingTreeClean: status.workingTreeClean
    };
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/adapters/github/workflow-pull-request-creator.ts
function createWorkflowPullRequestCreator(createGithubPullRequest) {
  return (request) => {
    const pullRequest = createGithubPullRequest({
      body: request.body,
      title: request.title
    });
    return {
      isDraft: pullRequest.isDraft,
      prNumber: pullRequest.prNumber,
      prUrl: pullRequest.prUrl
    };
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/adapters/github/workflow-pull-request-feedback-reader.ts
function createWorkflowPullRequestFeedbackReader(readGithubPullRequestFeedback) {
  return (prNumber) => {
    const feedback = readGithubPullRequestFeedback(prNumber);
    return {
      coderabbitReviewSeen: feedback.coderabbitReviewSeen,
      reviewDecision: feedback.reviewDecision,
      threads: feedback.threads.map((thread) => ({
        comments: thread.comments.map((comment) => ({
          author: comment.author,
          body: comment.body,
          ...comment.url === void 0 ? {} : { url: comment.url }
        })),
        id: thread.id,
        isOutdated: thread.isOutdated,
        isResolved: thread.isResolved,
        line: thread.line,
        path: thread.path
      })),
      unresolvedCount: feedback.unresolvedCount
    };
  };
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/workflow-state.js
var WorkflowStateError2 = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowStateError";
  }
};

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/base-event.js
var baseEventSchema2 = external_exports.object({
  type: external_exports.string(),
  at: external_exports.string()
}).passthrough();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/reflection-types.js
var reflectionCategorySchema2 = external_exports.enum([
  "state-efficiency",
  "review-rework",
  "quality-gates",
  "tooling",
  "workflow-design"
]);
var reflectionConfidenceSchema2 = external_exports.enum(["low", "medium", "high"]);
var evidenceBaseSchema2 = external_exports.object({ label: external_exports.string().min(1).optional() });
var reflectionEvidenceSchema2 = external_exports.discriminatedUnion("kind", [
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("state-period"),
    state: external_exports.string().min(1),
    startedAt: external_exports.string().min(1).optional(),
    endedAt: external_exports.string().min(1).optional()
  }),
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("event"),
    seq: external_exports.number().int().positive()
  }),
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("event-range"),
    startSeq: external_exports.number().int().positive(),
    endSeq: external_exports.number().int().positive()
  }),
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("journal-entry"),
    at: external_exports.string().min(1),
    agentName: external_exports.string().min(1).optional()
  }),
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("transcript-range"),
    startIndex: external_exports.number().int().nonnegative(),
    endIndex: external_exports.number().int().nonnegative()
  }),
  evidenceBaseSchema2.extend({
    kind: external_exports.literal("tool-activity"),
    state: external_exports.string().min(1).optional(),
    toolName: external_exports.string().min(1).optional(),
    metric: external_exports.string().min(1).optional()
  })
]);
var reflectionFindingSchema2 = external_exports.object({
  title: external_exports.string().min(1),
  category: reflectionCategorySchema2,
  opportunity: external_exports.string().min(1),
  likelyCause: external_exports.string().min(1),
  suggestedChange: external_exports.string().min(1),
  expectedImpact: external_exports.string().min(1),
  confidence: reflectionConfidenceSchema2.optional(),
  evidence: external_exports.array(reflectionEvidenceSchema2).min(1)
});
var reflectionPayloadSchema2 = external_exports.object({
  summary: external_exports.string().min(1).optional(),
  findings: external_exports.array(reflectionFindingSchema2).max(10)
}).strict();
var recordReflectionInputSchema2 = external_exports.object({
  label: external_exports.string().min(1).optional(),
  agentName: external_exports.string().min(1).optional(),
  sourceState: external_exports.string().min(1).optional(),
  reflection: reflectionPayloadSchema2
}).strict();
var storedReflectionSchema2 = external_exports.object({
  id: external_exports.number().int().positive(),
  sessionId: external_exports.string().min(1),
  createdAt: external_exports.string().min(1),
  label: external_exports.string().min(1).optional(),
  agentName: external_exports.string().min(1).optional(),
  sourceState: external_exports.string().min(1).optional(),
  reflection: reflectionPayloadSchema2
}).strict();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/review-types.js
var reviewTypeSchema2 = external_exports.string().min(1);
var reviewVerdictSchema2 = external_exports.enum(["PASS", "FAIL"]);
var reviewFindingSeveritySchema2 = external_exports.enum(["minor", "major", "critical"]);
var reviewFindingStatusSchema2 = external_exports.enum(["blocking", "non-blocking", "accepted-risk"]);
var reviewFindingSchema2 = external_exports.object({
  title: external_exports.string().min(1).optional(),
  severity: reviewFindingSeveritySchema2.optional(),
  status: reviewFindingStatusSchema2.optional(),
  rule: external_exports.string().min(1).optional(),
  file: external_exports.string().min(1).optional(),
  startLine: external_exports.number().int().positive().optional(),
  endLine: external_exports.number().int().positive().optional(),
  details: external_exports.string().min(1).optional(),
  recommendation: external_exports.string().min(1).optional()
}).strict().superRefine((finding, context) => {
  if (finding.title === void 0 && finding.details === void 0 && finding.rule === void 0) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected review finding to include at least one of title, details, or rule.",
      path: ["title"]
    });
  }
  if (finding.endLine !== void 0 && finding.startLine === void 0) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected startLine when endLine is provided.",
      path: ["startLine"]
    });
  }
  if (finding.startLine !== void 0 && finding.endLine !== void 0 && finding.endLine < finding.startLine) {
    context.addIssue({
      code: external_exports.ZodIssueCode.custom,
      message: "Expected endLine to be greater than or equal to startLine.",
      path: ["endLine"]
    });
  }
});
var reviewPayloadSchema2 = external_exports.object({
  verdict: reviewVerdictSchema2,
  summary: external_exports.string().min(1).optional(),
  branch: external_exports.string().min(1).optional(),
  pullRequestNumber: external_exports.number().int().positive().optional(),
  findings: external_exports.array(reviewFindingSchema2)
}).strict();
var recordReviewInputSchema2 = reviewPayloadSchema2.extend({
  reviewType: reviewTypeSchema2,
  sourceState: external_exports.string().min(1).optional()
}).strict();
var storedReviewSchema2 = recordReviewInputSchema2.extend({
  id: external_exports.number().int().positive(),
  sessionId: external_exports.string().min(1),
  createdAt: external_exports.string().min(1)
}).strict();
var listedReviewSchema2 = storedReviewSchema2.extend({ repository: external_exports.string().min(1).optional() }).strict();
var reviewFiltersSchema2 = external_exports.object({
  repository: external_exports.string().min(1).optional(),
  branch: external_exports.string().min(1).optional(),
  pullRequestNumber: external_exports.number().int().positive().optional(),
  reviewType: reviewTypeSchema2.optional(),
  verdict: reviewVerdictSchema2.optional()
}).strict();

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/engine-events.js
var sessionStartedSchema2 = external_exports.object({
  type: external_exports.literal("session-started"),
  at: external_exports.string(),
  transcriptPath: external_exports.string().optional(),
  repository: external_exports.string().optional(),
  currentState: external_exports.string().optional(),
  states: external_exports.array(external_exports.string()).optional()
});
var transitionedSchema2 = external_exports.object({
  type: external_exports.literal("transitioned"),
  at: external_exports.string(),
  from: external_exports.string(),
  to: external_exports.string(),
  preBlockedState: external_exports.string().optional(),
  iteration: external_exports.number().optional(),
  developingHeadCommit: external_exports.string().optional(),
  developerDone: external_exports.boolean().optional()
});
var agentRegisteredSchema2 = external_exports.object({
  type: external_exports.literal("agent-registered"),
  at: external_exports.string(),
  agentType: external_exports.string(),
  agentId: external_exports.string()
});
var agentShutDownSchema2 = external_exports.object({
  type: external_exports.literal("agent-shut-down"),
  at: external_exports.string(),
  agentName: external_exports.string()
});
var journalEntrySchema2 = external_exports.object({
  type: external_exports.literal("journal-entry"),
  at: external_exports.string(),
  agentName: external_exports.string(),
  content: external_exports.string()
});
var writeCheckedSchema2 = external_exports.object({
  type: external_exports.literal("write-checked"),
  at: external_exports.string(),
  tool: external_exports.string(),
  filePath: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var bashCheckedSchema2 = external_exports.object({
  type: external_exports.literal("bash-checked"),
  at: external_exports.string(),
  tool: external_exports.string(),
  command: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var pluginReadCheckedSchema2 = external_exports.object({
  type: external_exports.literal("plugin-read-checked"),
  at: external_exports.string(),
  tool: external_exports.string(),
  path: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var idleCheckedSchema2 = external_exports.object({
  type: external_exports.literal("idle-checked"),
  at: external_exports.string(),
  agentName: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var identityVerifiedSchema2 = external_exports.object({
  type: external_exports.literal("identity-verified"),
  at: external_exports.string(),
  status: external_exports.string(),
  transcriptPath: external_exports.string()
});
var contextRequestedSchema2 = external_exports.object({
  type: external_exports.literal("context-requested"),
  at: external_exports.string(),
  agentName: external_exports.string()
});
var reviewRecordedEventSchema2 = external_exports.object({
  type: external_exports.literal("review-recorded"),
  at: external_exports.string(),
  reviewId: external_exports.number().int().positive(),
  reviewType: external_exports.string(),
  verdict: external_exports.enum(["PASS", "FAIL"])
});
var engineEventSchema2 = external_exports.discriminatedUnion("type", [
  sessionStartedSchema2,
  transitionedSchema2,
  agentRegisteredSchema2,
  agentShutDownSchema2,
  journalEntrySchema2,
  writeCheckedSchema2,
  bashCheckedSchema2,
  pluginReadCheckedSchema2,
  idleCheckedSchema2,
  identityVerifiedSchema2,
  contextRequestedSchema2,
  reviewRecordedEventSchema2
]);

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/repository-tracking-events.js
var issueRecordedSchema2 = external_exports.object({
  type: external_exports.literal("issue-recorded"),
  at: external_exports.string(),
  issueNumber: external_exports.number()
});
var branchRecordedSchema2 = external_exports.object({
  type: external_exports.literal("branch-recorded"),
  at: external_exports.string(),
  branch: external_exports.string()
});
var prRecordedSchema2 = external_exports.object({
  type: external_exports.literal("pr-recorded"),
  at: external_exports.string(),
  prNumber: external_exports.number()
});
var repositoryMetadataEventSchema2 = external_exports.discriminatedUnion("type", [
  issueRecordedSchema2,
  branchRecordedSchema2,
  prRecordedSchema2
]);

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/precondition-result.js
var pass2 = () => ({ pass: true });
var fail2 = (reason) => ({
  pass: false,
  reason
});

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/infra/cli/presentation/output-guidance.js
var PLATFORM_NOTIFICATION_FENCE2 = "****************************************************************";
var JOURNAL_GUIDANCE2 = [
  PLATFORM_NOTIFICATION_FENCE2,
  "PLATFORM NOTIFICATION",
  "",
  "Record your progress and reasoning as you work by calling:",
  '  <workflow-command> write-journal <agent-name> "<detailed journal entry>"',
  "",
  "Use the same workflow command prefix used for other workflow commands such as transition.",
  "",
  "Use it for key decisions, progress milestones, and blockers.",
  "Every session should have a journal trail of the work performed.",
  PLATFORM_NOTIFICATION_FENCE2
].join("\n");

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-engine@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-engine/dist/platform/domain/testing/workflow-spec.js
var EMPTY_OVERRIDES2 = Object.freeze({});

// ../../packages/dev-workflow-v2/domain-model/src/domain/workflow-types.ts
var STATE_NAMES = [
  "IMPLEMENTING",
  "REVIEWING",
  "SUBMITTING_PR",
  "AWAITING_CI",
  "AWAITING_PR_FEEDBACK",
  "ADDRESSING_FEEDBACK",
  "REFLECTING",
  "COMPLETE",
  "BLOCKED"
];
var STATE_NAME_SCHEMA = external_exports.enum(STATE_NAMES);
function createWorkflowStateSchema(stateNames) {
  const stateNameSchema = external_exports.enum(stateNames);
  return external_exports.object({
    currentStateMachineState: stateNameSchema,
    githubIssue: external_exports.number().int().positive().optional(),
    featureBranch: external_exports.string().optional(),
    prNumber: external_exports.number().int().positive().optional(),
    prUrl: external_exports.string().optional(),
    architectureReviewPassed: external_exports.boolean(),
    codeReviewPassed: external_exports.boolean(),
    bugScannerPassed: external_exports.boolean(),
    taskCheckPassed: external_exports.boolean(),
    ciPassed: external_exports.boolean(),
    feedbackClean: external_exports.boolean(),
    feedbackAddressed: external_exports.boolean(),
    feedbackUnresolvedCount: external_exports.number().optional(),
    prFeedbackVerificationFailedReason: external_exports.string().optional(),
    preBlockedState: external_exports.string().optional(),
    transcriptPath: external_exports.string().optional()
  });
}
var WORKFLOW_STATE_SCHEMA = createWorkflowStateSchema(STATE_NAMES);
var WorkflowState = class _WorkflowState {
  currentStateMachineState;
  githubIssue;
  featureBranch;
  prNumber;
  prUrl;
  architectureReviewPassed;
  codeReviewPassed;
  bugScannerPassed;
  taskCheckPassed;
  ciPassed;
  feedbackClean;
  feedbackAddressed;
  feedbackUnresolvedCount;
  prFeedbackVerificationFailedReason;
  preBlockedState;
  transcriptPath;
  constructor(value) {
    this.currentStateMachineState = value.currentStateMachineState;
    this.architectureReviewPassed = value.architectureReviewPassed;
    this.codeReviewPassed = value.codeReviewPassed;
    this.bugScannerPassed = value.bugScannerPassed;
    this.taskCheckPassed = value.taskCheckPassed;
    this.ciPassed = value.ciPassed;
    this.feedbackClean = value.feedbackClean;
    this.feedbackAddressed = value.feedbackAddressed;
    if (value.githubIssue !== void 0) this.githubIssue = value.githubIssue;
    if (value.featureBranch !== void 0) this.featureBranch = value.featureBranch;
    if (value.prNumber !== void 0) this.prNumber = value.prNumber;
    if (value.prUrl !== void 0) this.prUrl = value.prUrl;
    if (value.feedbackUnresolvedCount !== void 0) {
      this.feedbackUnresolvedCount = value.feedbackUnresolvedCount;
    }
    if (value.prFeedbackVerificationFailedReason !== void 0) {
      this.prFeedbackVerificationFailedReason = value.prFeedbackVerificationFailedReason;
    }
    if (value.preBlockedState !== void 0) this.preBlockedState = value.preBlockedState;
    if (value.transcriptPath !== void 0) this.transcriptPath = value.transcriptPath;
  }
  static parse(value) {
    return new _WorkflowState(WORKFLOW_STATE_SCHEMA.parse(value));
  }
  with(changes) {
    return _WorkflowState.parse({
      ...this,
      ...changes
    });
  }
};
var INITIAL_STATE = WorkflowState.parse({
  currentStateMachineState: "IMPLEMENTING",
  architectureReviewPassed: false,
  codeReviewPassed: false,
  bugScannerPassed: false,
  taskCheckPassed: false,
  ciPassed: false,
  feedbackClean: false,
  feedbackAddressed: false
});
function parseStateName(value) {
  return STATE_NAME_SCHEMA.parse(value);
}
function getWorkflowStateNameSchema() {
  return STATE_NAME_SCHEMA;
}
function getInitialWorkflowState() {
  return INITIAL_STATE;
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/fold.ts
var LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA = external_exports.enum([
  "architecture-review",
  "code-review",
  "bug-scanner",
  "task-check"
]);
function applyRecordedReviewVerdict(state, event) {
  const parsedReviewType = LIVING_ARCHITECTURE_REVIEW_TYPE_SCHEMA.safeParse(event.reviewType);
  if (!parsedReviewType.success) {
    return state;
  }
  const passed = event.verdict === "PASS";
  switch (parsedReviewType.data) {
    case "architecture-review":
      return state.with({ architectureReviewPassed: passed });
    case "code-review":
      return state.with({ codeReviewPassed: passed });
    case "bug-scanner":
      return state.with({ bugScannerPassed: passed });
    case "task-check":
      return state.with({ taskCheckPassed: passed });
  }
}
function applyTransitioned(state, event) {
  const newPreBlockedState = event.to === "BLOCKED" ? event.from : void 0;
  return state.with({
    ...event.stateOverrides,
    currentStateMachineState: event.to,
    preBlockedState: newPreBlockedState
  });
}
function applyReviewEvent(state, event) {
  switch (event.type) {
    case "architecture-review-completed":
      return state.with({ architectureReviewPassed: event.passed });
    case "code-review-completed":
      return state.with({ codeReviewPassed: event.passed });
    case "bug-scanner-completed":
      return state.with({ bugScannerPassed: event.passed });
    case "ci-completed":
      return state.with({ ciPassed: event.passed });
    case "feedback-checked":
      return state.with({
        feedbackClean: event.clean,
        feedbackUnresolvedCount: event.unresolvedCount
      });
    case "feedback-addressed":
      return state.with({ feedbackAddressed: true });
    case "pr-feedback-verification-failed":
      return state.with({ prFeedbackVerificationFailedReason: event.reason });
    case "review-recorded":
      return applyRecordedReviewVerdict(state, event);
  }
  return void 0;
}
function applyRecordingEvent(state, event) {
  const reviewResult = applyReviewEvent(state, event);
  if (reviewResult !== void 0) return reviewResult;
  switch (event.type) {
    case "issue-recorded":
      return state.with({ githubIssue: event.issueNumber });
    case "branch-recorded":
      return state.with({ featureBranch: event.branch });
    case "pr-recorded":
      return state.with({
        prNumber: event.prNumber,
        prUrl: event.prUrl
      });
    case "task-check-passed":
      return state.with({ taskCheckPassed: true });
    case "session-started":
      return state.with({
        ...event.transcriptPath !== void 0 && { transcriptPath: event.transcriptPath }
      });
    default:
      return state;
  }
}
function applyEvent(state, event) {
  if (event.type === "transitioned") return applyTransitioned(state, event);
  return applyRecordingEvent(state, event);
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/output-messages.ts
function getOperationBody(op) {
  return op.replaceAll("-", " ").replace(/^\w/, (c) => c.toUpperCase());
}
function getTransitionTitle(to) {
  return to;
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/define-state.ts
function defineState(definition) {
  return definition;
}

// ../../node_modules/.pnpm/@nt-ai-lab+deterministic-agent-workflow-dsl@0.3.6/node_modules/@nt-ai-lab/deterministic-agent-workflow-dsl/dist/platform/domain/recording-ops.js
function checkOperationGate(op, state, registry) {
  const stateName = state.currentStateMachineState;
  const stateDef = registry[stateName];
  if (stateDef.allowedWorkflowOperations.includes(op)) {
    return pass2();
  }
  return fail2(`${op} is not allowed in state ${state.currentStateMachineState}.`);
}
function defineRecordingOps(registry, ops) {
  return {
    executeOp: (opName, state, now, args) => {
      const gate = checkOperationGate(opName, state, registry);
      if (!gate.pass) {
        return {
          pass: false,
          reason: gate.reason
        };
      }
      const opDef = Object.hasOwn(ops, opName) ? ops[opName] : void 0;
      if (opDef === void 0) {
        return {
          pass: false,
          reason: `Unknown recording operation: ${opName}`
        };
      }
      const payload = opDef.payload(...args);
      return {
        pass: true,
        event: {
          type: opDef.event,
          at: now,
          ...payload
        }
      };
    }
  };
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/implementing.ts
function defineImplementingState() {
  return defineState({
    emoji: "\u{1F528}",
    agentInstructions: "states/implementing.md",
    canTransitionTo: ["REVIEWING", "BLOCKED"],
    allowedWorkflowOperations: ["record-issue", "record-branch"],
    forbidden: { write: true },
    transitionGuard: (ctx) => {
      if (ctx.to === "BLOCKED") return pass2();
      if (!ctx.gitInfo.hasCommitsVsDefault)
        return fail2("No commits beyond default branch. Write code and commit before reviewing.");
      if (!ctx.gitInfo.workingTreeClean)
        return fail2("Working tree is not clean. Commit all changes before transitioning.");
      if (!ctx.state.githubIssue) return fail2("No issue recorded. Run record-issue first.");
      return pass2();
    },
    onEntry: (state) => state.with({
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false
    })
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/reviewing.ts
function defineReviewingState() {
  return defineState({
    emoji: "\u{1F4CB}",
    agentInstructions: "states/reviewing.md",
    canTransitionTo: ["SUBMITTING_PR", "IMPLEMENTING", "BLOCKED"],
    forbidden: { write: true },
    allowedWorkflowOperations: ["record-review"],
    transitionGuard: (ctx) => {
      const taskCheckRequired = ctx.state.githubIssue !== void 0;
      const allPassed = ctx.state.architectureReviewPassed && ctx.state.codeReviewPassed && ctx.state.bugScannerPassed && (!taskCheckRequired || ctx.state.taskCheckPassed);
      if (ctx.to === "SUBMITTING_PR" && !allPassed)
        return fail2(
          taskCheckRequired ? "Not all reviews passed. Each of architecture-review, code-review, bug-scanner, and task-check must pass." : "Not all reviews passed. Each of architecture-review, code-review, and bug-scanner must pass."
        );
      if (ctx.to === "IMPLEMENTING" && allPassed)
        return fail2("All reviews passed. Transition to SUBMITTING_PR, not IMPLEMENTING.");
      return pass2();
    }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/submitting-pr.ts
function defineSubmittingPrState() {
  return defineState({
    emoji: "\u{1F680}",
    agentInstructions: "states/submitting_pr.md",
    canTransitionTo: ["AWAITING_CI", "BLOCKED"],
    allowedWorkflowOperations: ["record-pr", "create-pr"],
    forbidden: { write: true },
    allowForbidden: { bash: ["git push"] },
    transitionGuard: (ctx) => {
      if (!ctx.state.prNumber) return fail2("prNumber not set. Run record-pr first.");
      return pass2();
    }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/awaiting-ci.ts
function defineAwaitingCiState() {
  return defineState({
    emoji: "\u23F3",
    agentInstructions: "states/awaiting_ci.md",
    canTransitionTo: ["AWAITING_PR_FEEDBACK", "IMPLEMENTING", "BLOCKED"],
    allowedWorkflowOperations: ["record-ci-passed", "record-ci-failed"],
    forbidden: { write: true },
    allowForbidden: { bash: ["gh pr checks"] },
    transitionGuard: (ctx) => {
      if (ctx.to === "AWAITING_PR_FEEDBACK" && !ctx.state.ciPassed)
        return fail2("CI not passed. Run record-ci-passed first.");
      if (ctx.to === "IMPLEMENTING" && ctx.state.ciPassed)
        return fail2("CI passed. Transition to AWAITING_PR_FEEDBACK, not IMPLEMENTING.");
      return pass2();
    }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/awaiting-pr-feedback.ts
function defineAwaitingPrFeedbackState() {
  return defineState({
    emoji: "\u{1F4AC}",
    agentInstructions: "states/awaiting_pr_feedback.md",
    canTransitionTo: ["ADDRESSING_FEEDBACK", "REFLECTING"],
    allowedWorkflowOperations: [],
    forbidden: { write: true }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/addressing-feedback.ts
function defineAddressingFeedbackState() {
  return defineState({
    emoji: "\u{1F527}",
    agentInstructions: "states/addressing_feedback.md",
    canTransitionTo: ["REVIEWING", "BLOCKED"],
    allowedWorkflowOperations: ["verify-feedback-addressed"],
    forbidden: { write: true },
    transitionGuard: (ctx) => {
      if (ctx.to === "BLOCKED") return pass2();
      if (!ctx.state.feedbackAddressed)
        return fail2("Feedback not addressed. Run verify-feedback-addressed first.");
      if (!ctx.state.feedbackClean)
        return fail2(
          "PR feedback is not yet clear. Resolve all feedback, ensure no CHANGES_REQUESTED review remains, then run verify-feedback-addressed again."
        );
      return pass2();
    },
    onEntry: (state) => state.with({
      feedbackAddressed: false,
      feedbackClean: false
    })
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/reflecting.ts
function defineReflectingState() {
  return defineState({
    emoji: "\u{1FA9E}",
    agentInstructions: "states/reflecting.md",
    canTransitionTo: ["COMPLETE", "BLOCKED"],
    allowedWorkflowOperations: [],
    forbidden: { write: true }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/complete.ts
function defineCompleteState() {
  return defineState({
    emoji: "\u2705",
    agentInstructions: "states/complete.md",
    allowIdle: true,
    canTransitionTo: [],
    allowedWorkflowOperations: [],
    forbidden: { write: true }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/states/blocked.ts
function defineBlockedState() {
  return defineState({
    emoji: "\u26A0\uFE0F",
    agentInstructions: "states/blocked.md",
    allowIdle: true,
    forbidden: { write: true },
    canTransitionTo: [
      "IMPLEMENTING",
      "REVIEWING",
      "SUBMITTING_PR",
      "AWAITING_CI",
      "AWAITING_PR_FEEDBACK",
      "ADDRESSING_FEEDBACK",
      "REFLECTING"
    ],
    allowedWorkflowOperations: [],
    transitionGuard: (ctx) => {
      const preBlockedState = ctx.state.preBlockedState;
      if (ctx.to !== preBlockedState) {
        return fail2(
          `Cannot transition from BLOCKED to ${ctx.to}. Must return to pre-blocked state: ${preBlockedState ?? "unknown"}.`
        );
      }
      return pass2();
    }
  });
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/registry.ts
var WORKFLOW_REGISTRY = {
  IMPLEMENTING: defineImplementingState(),
  REVIEWING: defineReviewingState(),
  SUBMITTING_PR: defineSubmittingPrState(),
  AWAITING_CI: defineAwaitingCiState(),
  AWAITING_PR_FEEDBACK: defineAwaitingPrFeedbackState(),
  ADDRESSING_FEEDBACK: defineAddressingFeedbackState(),
  REFLECTING: defineReflectingState(),
  COMPLETE: defineCompleteState(),
  BLOCKED: defineBlockedState()
};
function getStateDefinition(state) {
  return WORKFLOW_REGISTRY[parseStateName(state)];
}
function getWorkflowRegistry() {
  return WORKFLOW_REGISTRY;
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/workflow-events.ts
var STATE_NAME_SCHEMA2 = getWorkflowStateNameSchema();
var KNOWN_WORKFLOW_EVENT_TYPES = [
  "session-started",
  "transitioned",
  "issue-recorded",
  "branch-recorded",
  "pr-recorded",
  "ci-completed",
  "feedback-checked",
  "feedback-addressed",
  "pr-feedback-verification-failed",
  "task-check-passed",
  "review-recorded",
  "bash-checked",
  "write-checked"
];
var SESSION_STARTED_SCHEMA = external_exports.object({
  type: external_exports.literal("session-started"),
  at: external_exports.string(),
  transcriptPath: external_exports.string().optional(),
  repository: external_exports.string().optional()
});
var TRANSITIONED_SCHEMA = external_exports.object({
  type: external_exports.literal("transitioned"),
  at: external_exports.string(),
  from: STATE_NAME_SCHEMA2,
  to: STATE_NAME_SCHEMA2,
  preBlockedState: external_exports.string().optional(),
  stateOverrides: external_exports.record(external_exports.unknown()).optional()
});
var ISSUE_RECORDED_SCHEMA = external_exports.object({
  type: external_exports.literal("issue-recorded"),
  at: external_exports.string(),
  issueNumber: external_exports.number()
});
var BRANCH_RECORDED_SCHEMA = external_exports.object({
  type: external_exports.literal("branch-recorded"),
  at: external_exports.string(),
  branch: external_exports.string()
});
var ARCHITECTURE_REVIEW_COMPLETED_SCHEMA = external_exports.object({
  type: external_exports.literal("architecture-review-completed"),
  at: external_exports.string(),
  passed: external_exports.boolean()
});
var CODE_REVIEW_COMPLETED_SCHEMA = external_exports.object({
  type: external_exports.literal("code-review-completed"),
  at: external_exports.string(),
  passed: external_exports.boolean()
});
var BUG_SCANNER_COMPLETED_SCHEMA = external_exports.object({
  type: external_exports.literal("bug-scanner-completed"),
  at: external_exports.string(),
  passed: external_exports.boolean()
});
var PR_RECORDED_SCHEMA = external_exports.object({
  type: external_exports.literal("pr-recorded"),
  at: external_exports.string(),
  prNumber: external_exports.number(),
  prUrl: external_exports.string().optional()
});
var CI_COMPLETED_SCHEMA = external_exports.object({
  type: external_exports.literal("ci-completed"),
  at: external_exports.string(),
  passed: external_exports.boolean(),
  output: external_exports.string().optional()
});
var FEEDBACK_CHECKED_SCHEMA = external_exports.object({
  type: external_exports.literal("feedback-checked"),
  at: external_exports.string(),
  clean: external_exports.boolean(),
  unresolvedCount: external_exports.number().optional(),
  reviewDecision: external_exports.string().nullable().optional()
});
var FEEDBACK_ADDRESSED_SCHEMA = external_exports.object({
  type: external_exports.literal("feedback-addressed"),
  at: external_exports.string()
});
var PR_FEEDBACK_VERIFICATION_FAILED_SCHEMA = external_exports.object({
  type: external_exports.literal("pr-feedback-verification-failed"),
  at: external_exports.string(),
  reason: external_exports.string().min(1)
});
var TASK_CHECK_PASSED_SCHEMA = external_exports.object({
  type: external_exports.literal("task-check-passed"),
  at: external_exports.string()
});
var REVIEW_RECORDED_EVENT_SCHEMA = external_exports.object({
  type: external_exports.literal("review-recorded"),
  at: external_exports.string(),
  reviewId: external_exports.number().int().nonnegative(),
  reviewType: external_exports.string(),
  verdict: external_exports.enum(["PASS", "FAIL"])
});
var BASH_CHECKED_SCHEMA = external_exports.object({
  type: external_exports.literal("bash-checked"),
  at: external_exports.string(),
  tool: external_exports.string(),
  command: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var WRITE_CHECKED_SCHEMA = external_exports.object({
  type: external_exports.literal("write-checked"),
  at: external_exports.string(),
  tool: external_exports.string(),
  filePath: external_exports.string(),
  allowed: external_exports.boolean(),
  reason: external_exports.string().optional()
});
var WORKFLOW_EVENT_SCHEMA = external_exports.discriminatedUnion("type", [
  SESSION_STARTED_SCHEMA,
  TRANSITIONED_SCHEMA,
  ISSUE_RECORDED_SCHEMA,
  BRANCH_RECORDED_SCHEMA,
  ARCHITECTURE_REVIEW_COMPLETED_SCHEMA,
  CODE_REVIEW_COMPLETED_SCHEMA,
  BUG_SCANNER_COMPLETED_SCHEMA,
  PR_RECORDED_SCHEMA,
  CI_COMPLETED_SCHEMA,
  FEEDBACK_CHECKED_SCHEMA,
  FEEDBACK_ADDRESSED_SCHEMA,
  PR_FEEDBACK_VERIFICATION_FAILED_SCHEMA,
  TASK_CHECK_PASSED_SCHEMA,
  REVIEW_RECORDED_EVENT_SCHEMA,
  BASH_CHECKED_SCHEMA,
  WRITE_CHECKED_SCHEMA
]);
function parseWorkflowEvent(event) {
  return WORKFLOW_EVENT_SCHEMA.parse(event);
}
function getKnownWorkflowEventTypes() {
  return [...KNOWN_WORKFLOW_EVENT_TYPES];
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/pull-request-description.ts
var CREATE_PR_COMMAND_TOKENS_SCHEMA = external_exports.array(external_exports.string());
var OPTION_SUCCESS_SCHEMA = external_exports.object({
  ok: external_exports.literal(true),
  value: external_exports.string()
});
var PULL_REQUEST_OPTION_NAMES = [
  "--title",
  "--description",
  "--problem",
  "--acceptance-criteria",
  "--key-changes",
  "--architecture-impact",
  "--validation",
  "--notes"
];
function parsePullRequestDescriptionOptions(rawArgs) {
  const parsedTokens = CREATE_PR_COMMAND_TOKENS_SCHEMA.safeParse(rawArgs);
  if (!parsedTokens.success) {
    return {
      ok: false,
      reason: "Expected create-pr arguments to be option/value string pairs."
    };
  }
  const commandTokens = parsedTokens.data;
  const tokenValidationReason = validateOptionTokens(commandTokens);
  if (tokenValidationReason !== void 0) {
    return {
      ok: false,
      reason: tokenValidationReason
    };
  }
  const title = readRequiredOption(commandTokens, "--title");
  const description = readRequiredOption(commandTokens, "--description");
  const problem = readRequiredOption(commandTokens, "--problem");
  const acceptanceCriteria = readRequiredOption(commandTokens, "--acceptance-criteria");
  const keyChanges = readRequiredOption(commandTokens, "--key-changes");
  const architectureImpact = readRequiredOption(commandTokens, "--architecture-impact");
  const validation = readRequiredOption(commandTokens, "--validation");
  const notes = readRequiredOption(commandTokens, "--notes");
  return buildPullRequestDescriptionInput({
    title,
    description,
    problem,
    acceptanceCriteria,
    keyChanges,
    architectureImpact,
    validation,
    notes
  });
}
function buildPullRequestDescriptionInput(optionValueResults) {
  const optionResults = Object.values(optionValueResults);
  const failedOptionResult = optionResults.find((optionResult) => !optionResult.ok);
  if (failedOptionResult !== void 0 && !failedOptionResult.ok) {
    return {
      ok: false,
      reason: failedOptionResult.reason
    };
  }
  return {
    ok: true,
    input: {
      title: readSuccessfulOptionValue(optionValueResults.title),
      description: readSuccessfulOptionValue(optionValueResults.description),
      problem: readSuccessfulOptionValue(optionValueResults.problem),
      acceptanceCriteria: readSuccessfulOptionValue(optionValueResults.acceptanceCriteria),
      keyChanges: readSuccessfulOptionValue(optionValueResults.keyChanges),
      architectureImpact: readSuccessfulOptionValue(optionValueResults.architectureImpact),
      validation: readSuccessfulOptionValue(optionValueResults.validation),
      notes: readSuccessfulOptionValue(optionValueResults.notes)
    }
  };
}
function readSuccessfulOptionValue(optionValueResult) {
  return OPTION_SUCCESS_SCHEMA.parse(optionValueResult).value;
}
function buildPullRequestCreationRequest(input, githubIssue) {
  return {
    title: input.title,
    body: [
      formatSection("Description", input.description),
      formatSection("Linked Issue", `Closes #${githubIssue}`),
      formatSection("What Problem Does This PR Solve?", input.problem),
      formatSection("Acceptance Criteria", input.acceptanceCriteria),
      formatSection("Key Changes", input.keyChanges),
      formatSection("Notable Architectural Changes / Impact", input.architectureImpact),
      formatSection("Validation", input.validation),
      formatSection("Notes", input.notes)
    ].join("\n\n")
  };
}
function validateOptionTokens(commandTokens) {
  if (commandTokens.length === 0) {
    return `Expected create-pr options: ${PULL_REQUEST_OPTION_NAMES.join(", ")}.`;
  }
  if (commandTokens.length % 2 !== 0) {
    return `Expected value after ${String(commandTokens.at(-1))}.`;
  }
  const optionTokens = commandTokens.filter((_commandToken, index) => index % 2 === 0);
  const unknownOption = optionTokens.find(
    (optionToken) => !PULL_REQUEST_OPTION_NAMES.includes(optionToken)
  );
  if (unknownOption !== void 0) {
    return `Unknown create-pr option ${unknownOption}. Allowed options: ${PULL_REQUEST_OPTION_NAMES.join(", ")}.`;
  }
  const duplicateOption = optionTokens.find(
    (optionToken, index) => optionTokens.indexOf(optionToken) !== index
  );
  if (duplicateOption !== void 0) {
    return `Duplicate create-pr option ${duplicateOption}.`;
  }
  return void 0;
}
function readRequiredOption(commandTokens, optionName) {
  const optionIndex = commandTokens.findIndex(
    (commandToken, index) => index % 2 === 0 && commandToken === optionName
  );
  if (optionIndex < 0) {
    return {
      ok: false,
      reason: `Missing required create-pr option ${optionName}.`
    };
  }
  const optionValue = external_exports.string().parse(commandTokens.at(optionIndex + 1));
  if (optionValue.trim().length === 0) {
    return {
      ok: false,
      reason: `Expected non-empty value for ${optionName}.`
    };
  }
  return {
    ok: true,
    value: optionValue
  };
}
function formatSection(heading, content) {
  return [`## ${heading}`, content].join("\n\n");
}

// ../../packages/dev-workflow-v2/domain-model/src/domain/workflow.ts
var PR_FEEDBACK_POLL_INTERVAL_MS = 15e3;
var PR_FEEDBACK_TIMEOUT_MS = 3e5;
var PR_FEEDBACK_MAX_ATTEMPTS = Math.floor(PR_FEEDBACK_TIMEOUT_MS / PR_FEEDBACK_POLL_INTERVAL_MS) + 1;
var REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS = 2;
var WORKFLOW_REGISTRY2 = getWorkflowRegistry();
var RECORDING_OPS_MAP = {
  "record-issue": {
    event: "issue-recorded",
    payload: (n) => ({ issueNumber: n })
  },
  "record-branch": {
    event: "branch-recorded",
    payload: (b) => ({ branch: b })
  },
  "record-pr": {
    event: "pr-recorded",
    payload: (n, url) => ({
      prNumber: n,
      ...url ? { prUrl: url } : {}
    })
  },
  "record-ci-passed": {
    event: "ci-completed",
    payload: () => ({ passed: true })
  },
  "record-ci-failed": {
    event: "ci-completed",
    payload: (output) => ({
      passed: false,
      output
    })
  }
};
var RECORDING_OPS = defineRecordingOps(
  WORKFLOW_REGISTRY2,
  RECORDING_OPS_MAP
);
function diffStateOverrides(stateBefore, stateAfter) {
  const overrides = {};
  const beforeEntries = new Map(Object.entries(stateBefore));
  for (const [key, value] of Object.entries(stateAfter)) {
    if (key === "currentStateMachineState") continue;
    if (value !== beforeEntries.get(key)) {
      overrides[key] = value;
    }
  }
  return overrides;
}
function isFeedbackClear(feedback) {
  return feedback.reviewDecision !== "CHANGES_REQUESTED" && feedback.unresolvedCount === 0;
}
function readPrFeedback(getPrFeedback, prNumber) {
  try {
    return {
      ok: true,
      feedback: getPrFeedback(prNumber)
    };
  } catch (error) {
    return {
      ok: false,
      reason: `Unable to fetch PR feedback: ${String(error)}`
    };
  }
}
var Workflow = class _Workflow {
  state;
  deps;
  pendingEvents = [];
  constructor(state, deps) {
    this.state = state;
    this.deps = deps;
  }
  static createFresh(deps) {
    return new _Workflow(getInitialWorkflowState(), deps);
  }
  static rehydrate(state, deps) {
    return new _Workflow(WorkflowState.parse(state), deps);
  }
  getPendingEvents() {
    return this.pendingEvents;
  }
  getState() {
    return this.state;
  }
  getAgentInstructions(pluginRoot) {
    return `${pluginRoot}/${getStateDefinition(this.state.currentStateMachineState).agentInstructions}`;
  }
  appendEvent(event) {
    const workflowEvent = parseWorkflowEvent(event);
    this.append(workflowEvent);
    if (workflowEvent.type === "transitioned" && workflowEvent.to === "AWAITING_PR_FEEDBACK") {
      if (this.state.prNumber === void 0) {
        this.appendPrFeedbackVerificationFailure(
          "prNumber not set. Record the PR before awaiting PR feedback."
        );
        return;
      }
      this.awaitPrFeedback(this.state.prNumber);
    }
  }
  startSession(transcriptPath, repository) {
    const event = {
      type: "session-started",
      at: this.deps.now(),
      transcriptPath,
      ...repository === void 0 ? {} : { repository }
    };
    this.pendingEvents = [...this.pendingEvents, event];
    this.state = applyEvent(this.state, event);
  }
  getTranscriptPath() {
    if (this.state.transcriptPath === void 0) {
      throw new WorkflowStateError2("Transcript path not set. Session has not been started.");
    }
    return this.state.transcriptPath;
  }
  getRecordedReviews() {
    return this.deps.listSessionReviews();
  }
  getReviewDetails(reviewId) {
    const review = this.getRecordedReviews().find(
      (recordedReview) => recordedReview.id === reviewId
    );
    if (review === void 0) {
      throw new WorkflowStateError2(`Review ${String(reviewId)} not found in current session.`);
    }
    return review;
  }
  getLatestReviewByType(reviewType) {
    const reviewsOfType = this.getRecordedReviews().filter((recordedReview) => recordedReview.reviewType === reviewType).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return reviewsOfType.at(-1);
  }
  registerAgent(agentType, agentId) {
    void agentType;
    void agentId;
    return pass2();
  }
  handleTeammateIdle(agentName) {
    void agentName;
    return pass2();
  }
  executeRecording(op, ...args) {
    const result = RECORDING_OPS.executeOp(op, this.state, this.deps.now(), args);
    if (!result.pass) return fail2(result.reason);
    this.appendEvent(result.event);
    return pass2();
  }
  createPr(rawArgs) {
    const gate = checkOperationGate("create-pr", this.state, WORKFLOW_REGISTRY2);
    if (!gate.pass) return gate;
    if (this.state.githubIssue === void 0) {
      return fail2("githubIssue not set. Record the issue before creating a PR.");
    }
    const parsedDescription = parsePullRequestDescriptionOptions(rawArgs);
    if (!parsedDescription.ok) {
      return fail2(parsedDescription.reason);
    }
    try {
      const pullRequestRequest = buildPullRequestCreationRequest(
        parsedDescription.input,
        this.state.githubIssue
      );
      const pullRequest = this.deps.createPullRequest(pullRequestRequest);
      if (pullRequest.isDraft) {
        return fail2(
          `Expected workflow-created PR #${pullRequest.prNumber} to be ready for review. Got draft PR. Transition to BLOCKED; do not use gh pr ready as a workaround.`
        );
      }
      this.append({
        type: "pr-recorded",
        at: this.deps.now(),
        prNumber: pullRequest.prNumber,
        prUrl: pullRequest.prUrl
      });
      return pass2();
    } catch (error) {
      return fail2(`Unable to create PR: ${String(error)}`);
    }
  }
  verifyFeedbackAddressed() {
    const gate = checkOperationGate("verify-feedback-addressed", this.state, WORKFLOW_REGISTRY2);
    if (!gate.pass) return gate;
    if (this.state.prNumber === void 0) {
      return fail2("prNumber not set. Record the PR before verifying feedback.");
    }
    const feedbackResult = readPrFeedback(this.deps.getPrFeedback, this.state.prNumber);
    if (!feedbackResult.ok) return fail2(feedbackResult.reason);
    const { feedback } = feedbackResult;
    const clean = isFeedbackClear(feedback);
    this.append({
      type: "feedback-checked",
      at: this.deps.now(),
      clean,
      unresolvedCount: feedback.unresolvedCount,
      reviewDecision: feedback.reviewDecision
    });
    if (feedback.reviewDecision === "CHANGES_REQUESTED" && feedback.unresolvedCount > 0) {
      return fail2(
        `PR still has CHANGES_REQUESTED review status and ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`
      );
    }
    if (feedback.reviewDecision === "CHANGES_REQUESTED") {
      return fail2(
        "PR still has CHANGES_REQUESTED review status. Resolve all feedback or transition to BLOCKED."
      );
    }
    if (feedback.unresolvedCount > 0) {
      return fail2(
        `PR still has ${feedback.unresolvedCount} unresolved feedback threads. Resolve all feedback or transition to BLOCKED.`
      );
    }
    this.append({
      type: "feedback-addressed",
      at: this.deps.now()
    });
    return pass2();
  }
  awaitPrFeedback(prNumber) {
    this.pollPrFeedback(prNumber, PR_FEEDBACK_MAX_ATTEMPTS, 0);
  }
  pollPrFeedback(prNumber, attemptsRemaining, consecutiveCleanPolls) {
    const feedbackResult = readPrFeedback(this.deps.getPrFeedback, prNumber);
    if (!feedbackResult.ok) {
      this.appendPrFeedbackVerificationFailure(feedbackResult.reason);
      return;
    }
    const { feedback } = feedbackResult;
    if (!feedback.coderabbitReviewSeen) {
      this.scheduleNextPrFeedbackPoll(prNumber, attemptsRemaining, 0);
      return;
    }
    const clean = isFeedbackClear(feedback);
    const nextConsecutiveCleanPolls = clean ? consecutiveCleanPolls + 1 : 0;
    if (clean && nextConsecutiveCleanPolls < REQUIRED_CONSECUTIVE_CLEAN_CODERABBIT_POLLS && attemptsRemaining > 1) {
      this.deps.sleepMs(PR_FEEDBACK_POLL_INTERVAL_MS);
      this.pollPrFeedback(prNumber, attemptsRemaining - 1, nextConsecutiveCleanPolls);
      return;
    }
    this.append({
      type: "feedback-checked",
      at: this.deps.now(),
      clean,
      unresolvedCount: feedback.unresolvedCount,
      reviewDecision: feedback.reviewDecision
    });
    this.appendAutomaticTransition(clean ? "REFLECTING" : "ADDRESSING_FEEDBACK");
  }
  scheduleNextPrFeedbackPoll(prNumber, attemptsRemaining, consecutiveCleanPolls) {
    if (attemptsRemaining <= 1) {
      this.appendPrFeedbackVerificationFailure(
        `CodeRabbit feedback did not appear within ${PR_FEEDBACK_TIMEOUT_MS}ms for PR #${prNumber}.`
      );
      return;
    }
    this.deps.sleepMs(PR_FEEDBACK_POLL_INTERVAL_MS);
    this.pollPrFeedback(prNumber, attemptsRemaining - 1, consecutiveCleanPolls);
  }
  appendAutomaticTransition(to) {
    const from = this.state.currentStateMachineState;
    const stateBefore = this.state;
    const context = {
      state: stateBefore,
      gitInfo: this.deps.getGitInfo(),
      from,
      to
    };
    const targetDef = getStateDefinition(to);
    const stateAfter = targetDef.onEntry === void 0 ? stateBefore : targetDef.onEntry(stateBefore, context);
    const stateOverrides = diffStateOverrides(stateBefore, stateAfter);
    this.append({
      type: "transitioned",
      at: this.deps.now(),
      from,
      to,
      ...Object.keys(stateOverrides).length === 0 ? {} : { stateOverrides }
    });
  }
  appendPrFeedbackVerificationFailure(reason) {
    this.append({
      type: "pr-feedback-verification-failed",
      at: this.deps.now(),
      reason
    });
    this.appendAutomaticTransition("BLOCKED");
  }
  append(event) {
    if (this.isPrFeedbackBlockedWithoutFailureEvent(event)) {
      throw new WorkflowStateError2(
        "Expected pr-feedback-verification-failed event before AWAITING_PR_FEEDBACK can transition to BLOCKED."
      );
    }
    this.pendingEvents = [...this.pendingEvents, event];
    this.state = applyEvent(this.state, event);
  }
  isPrFeedbackBlockedWithoutFailureEvent(event) {
    if (event.type !== "transitioned") return false;
    if (event.from !== "AWAITING_PR_FEEDBACK") return false;
    if (event.to !== "BLOCKED") return false;
    const previousEvent = this.pendingEvents.at(-1);
    if (previousEvent === void 0) return true;
    return previousEvent.type !== "pr-feedback-verification-failed";
  }
};

// ../../packages/dev-workflow-v2/domain-model/src/domain/workflow-predicates.ts
import path from "node:path";
var PROTECTED_FILES = [
  "nx.json",
  "tsconfig.base.json",
  "eslint.config.mjs",
  /^vitest\.config\./,
  /^vite\.config\./
];
function checkWriteAllowed(filePath) {
  const basename = path.basename(filePath);
  for (const pattern of PROTECTED_FILES) {
    if (typeof pattern === "string" ? basename === pattern : pattern.test(basename)) {
      return false;
    }
  }
  return true;
}
function isWriteAllowed(filePath, state) {
  void state;
  return checkWriteAllowed(filePath);
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/configure-workflow.ts
var KNOWN_EVENT_TYPES = new Set(getKnownWorkflowEventTypes());
function diffStateOverrides2(stateBefore, stateAfter) {
  const overrides = {};
  const beforeEntries = new Map(Object.entries(stateBefore));
  for (const [key, value] of Object.entries(stateAfter)) {
    if (key === "currentStateMachineState") continue;
    if (value !== beforeEntries.get(key)) overrides[key] = value;
  }
  return overrides;
}
function configureWorkflow(input) {
  void input;
  return {
    fold(state, event) {
      try {
        return applyEvent(state, parseWorkflowEvent(event));
      } catch (error) {
        if (KNOWN_EVENT_TYPES.has(event.type)) {
          throw new WorkflowStateError2(`Malformed workflow event "${event.type}": ${String(error)}`);
        }
        return state;
      }
    },
    buildWorkflow(state, deps) {
      return Workflow.rehydrate(state, deps);
    },
    stateSchema: getWorkflowStateNameSchema(),
    initialState: getInitialWorkflowState,
    getRegistry: getWorkflowRegistry,
    buildTransitionContext(state, from, to, deps) {
      return { state, gitInfo: deps.getGitInfo(), from, to };
    },
    buildTransitionEvent(from, to, stateBefore, stateAfter, now) {
      const overrides = diffStateOverrides2(stateBefore, stateAfter);
      return {
        type: "transitioned",
        at: now,
        from,
        to,
        ...Object.keys(overrides).length > 0 ? { stateOverrides: overrides } : {}
      };
    },
    getOperationBody,
    getTransitionTitle,
    isWriteAllowed
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/create-workflow-routes.ts
var CreateWorkflowRoutes = class {
  constructor(stateNameSchemaProvider, defineRoutes2) {
    this.stateNameSchemaProvider = stateNameSchemaProvider;
    this.defineRoutes = defineRoutes2;
  }
  stateNameSchemaProvider;
  defineRoutes;
  execute(input) {
    const stateNameSchema = this.stateNameSchemaProvider.getSchema();
    return {
      routes: this.defineRoutes({
        init: { type: "session-start" },
        transition: {
          type: "transition",
          args: [arg.state("STATE", stateNameSchema)]
        },
        "record-issue": {
          type: "transaction",
          args: [arg.number("number")],
          handler: (workflow, issueNumber) => input.recordIssue(workflow, input.parseNumberArgument(issueNumber))
        },
        "record-branch": {
          type: "transaction",
          args: [arg.string("branch")],
          handler: (workflow, branch) => input.recordBranch(workflow, input.parseStringArgument(branch))
        },
        "record-pr": {
          type: "transaction",
          args: [arg.number("number"), arg.string("url").optional()],
          handler: (workflow, number, url) => input.recordPullRequest(
            workflow,
            input.parseNumberArgument(number),
            input.parseOptionalStringArgument(url)
          )
        },
        "create-pr": {
          type: "transaction",
          args: [arg.rest()],
          handler: (workflow, args) => input.createPullRequest(workflow, input.parseStringArguments(args))
        },
        "record-ci-passed": {
          type: "transaction",
          args: [],
          handler: (workflow) => input.recordCiPassed(workflow)
        },
        "record-ci-failed": {
          type: "transaction",
          args: [arg.string("output")],
          handler: (workflow, output) => input.recordCiFailed(workflow, input.parseStringArgument(output))
        },
        "verify-feedback-addressed": {
          type: "transaction",
          args: [],
          handler: (workflow) => input.verifyFeedbackAddressed(workflow)
        }
      })
    };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/git/git-client.ts
import { execFileSync as execFileSync2 } from "node:child_process";
function defaultGitExecutor(binary, commandArguments) {
  return execFileSync2(binary, commandArguments, { encoding: "utf-8" }).trim();
}
function readGitRepositoryStatus(gitBinary = "git", executeGit = defaultGitExecutor) {
  const defaultBranch = detectDefaultBranch(executeGit, gitBinary);
  return {
    currentBranch: runGit(executeGit, gitBinary, ["rev-parse", "--abbrev-ref", "HEAD"]),
    workingTreeClean: runGit(executeGit, gitBinary, ["status", "--porcelain"]).length === 0,
    headCommit: runGit(executeGit, gitBinary, ["rev-parse", "HEAD"]),
    changedFilesVsDefault: runGit(executeGit, gitBinary, [
      "diff",
      "--name-only",
      defaultBranch,
      "HEAD"
    ]).split("\n").filter((f) => f.length > 0),
    hasCommitsVsDefault: runGit(executeGit, gitBinary, ["rev-list", "HEAD", `^${defaultBranch}`]).length > 0
  };
}
function detectDefaultBranch(executeGit, gitBinary) {
  try {
    return runGit(executeGit, gitBinary, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "--short"
    ]).replace("origin/", "");
  } catch {
    return "main";
  }
}
function runGit(executeGit, gitBinary, gitArguments) {
  return executeGit(gitBinary, gitArguments);
}

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/github/create-pull-request.ts
var pullRequestSchema = external_exports.object({
  number: external_exports.number().int().positive(),
  url: external_exports.string().url(),
  isDraft: external_exports.boolean()
});
var createPullRequestOutputSchema = external_exports.object({ url: external_exports.string().url() });
var PullRequestCreationOutputError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PullRequestCreationOutputError";
  }
};
function createGithubPullRequestClient(runGh2) {
  return (request) => {
    const createOutput = runGh2([
      "pr",
      "create",
      "--title",
      request.title,
      "--body",
      request.body,
      "--json",
      "url"
    ]);
    const pullRequestUrl = readPullRequestUrl(createOutput);
    return readPullRequest(runGh2, pullRequestUrl);
  };
}
function readPullRequestUrl(createOutput) {
  const trimmedOutput = createOutput.trim();
  if (trimmedOutput.length === 0) {
    throw new PullRequestCreationOutputError(
      "Expected gh pr create to return JSON with a url field. Got empty output."
    );
  }
  try {
    return createPullRequestOutputSchema.parse(JSON.parse(trimmedOutput)).url;
  } catch {
    throw new PullRequestCreationOutputError(
      `Expected gh pr create to return JSON with a url field. Got: ${trimmedOutput}`
    );
  }
}
function readPullRequest(runGh2, pullRequestReference) {
  const rawPullRequest = runGh2(["pr", "view", pullRequestReference, "--json", "number,url,isDraft"]);
  const pullRequest = pullRequestSchema.parse(JSON.parse(rawPullRequest));
  return {
    prNumber: pullRequest.number,
    prUrl: pullRequest.url,
    isDraft: pullRequest.isDraft
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/github/get-pr-feedback.ts
var threadCommentSchema = external_exports.object({
  author: external_exports.object({ login: external_exports.string() }).nullable(),
  body: external_exports.string(),
  url: external_exports.string().optional()
});
var graphqlThreadNodeSchema = external_exports.object({
  id: external_exports.string(),
  isResolved: external_exports.boolean(),
  isOutdated: external_exports.boolean(),
  path: external_exports.string().nullable(),
  line: external_exports.number().nullable(),
  comments: external_exports.object({ nodes: external_exports.array(threadCommentSchema) })
});
var graphqlReviewNodeSchema = external_exports.object({
  author: external_exports.object({ login: external_exports.string() }).nullable(),
  state: external_exports.string()
});
var graphqlResponseSchema = external_exports.object({
  data: external_exports.object({
    repository: external_exports.object({
      pullRequest: external_exports.object({
        reviewDecision: external_exports.string().nullable(),
        reviews: external_exports.object({ nodes: external_exports.array(graphqlReviewNodeSchema) }),
        reviewThreads: external_exports.object({ nodes: external_exports.array(graphqlThreadNodeSchema) })
      })
    })
  })
});
var repoInfoSchema = external_exports.object({
  owner: external_exports.object({ login: external_exports.string() }),
  name: external_exports.string()
});
function createGithubPullRequestFeedbackClient(runGh2) {
  return (prNumber) => {
    const repoRaw = runGh2(["repo", "view", "--json", "owner,name"]);
    const repo = repoInfoSchema.parse(JSON.parse(repoRaw));
    const query = [
      '{ repository(owner: "',
      repo.owner.login,
      '", name: "',
      repo.name,
      '") { pullRequest(number: ',
      String(prNumber),
      ") { reviewDecision reviews(first: 100) { nodes { author { login } state } } reviewThreads(first: 100) { nodes { id isResolved isOutdated path line comments(first: 100) { nodes { body url author { login } } } } } } } }"
    ].join("");
    const raw = runGh2(["api", "graphql", "-f", `query=${query}`]);
    const response = graphqlResponseSchema.parse(JSON.parse(raw));
    const reviews = response.data.repository.pullRequest.reviews.nodes;
    const threads = response.data.repository.pullRequest.reviewThreads.nodes.map((node) => ({
      ...node,
      comments: node.comments.nodes
    }));
    const unresolved = threads.filter((thread) => !thread.isResolved && !thread.isOutdated);
    return {
      reviewDecision: response.data.repository.pullRequest.reviewDecision,
      coderabbitReviewSeen: reviews.some(
        (review) => review.author?.login === "coderabbitai" || review.author?.login === "coderabbitai[bot]"
      ),
      unresolvedCount: unresolved.length,
      threads: unresolved
    };
  };
}

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/github/github-cli.ts
import { execFileSync as execFileSync3 } from "node:child_process";
function defaultGithubExecutor(binary, commandArguments) {
  return execFileSync3(binary, commandArguments, { encoding: "utf-8" });
}
function runGh(ghArguments, ghBinary = "gh", executeGithub = defaultGithubExecutor) {
  return executeGithub(ghBinary, ghArguments);
}

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/create-pull-request.ts
var CreatePullRequest = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    return { result: this.workflow.createPr(input.arguments) };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/record-branch.ts
var RecordBranch = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    return { result: this.workflow.executeRecording("record-branch", input.branch) };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/record-ci-failed.ts
var RecordCiFailed = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    return { result: this.workflow.executeRecording("record-ci-failed", input.output) };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/record-ci-passed.ts
var RecordCiPassed = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    void input;
    return { result: this.workflow.executeRecording("record-ci-passed") };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/record-issue.ts
var RecordIssue = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    return { result: this.workflow.executeRecording("record-issue", input.issueNumber) };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/record-pull-request.ts
var RecordPullRequest = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    return { result: this.workflow.executeRecording("record-pr", input.number, input.url) };
  }
};

// ../../packages/dev-workflow-v2/use-cases/src/features/workflow/commands/verify-feedback-addressed.ts
var VerifyFeedbackAddressed = class {
  constructor(workflow) {
    this.workflow = workflow;
  }
  workflow;
  execute(input) {
    void input;
    return { result: this.workflow.verifyFeedbackAddressed() };
  }
};

// src/features/workflow/entrypoint/workflow/workflow-route-inputs.ts
var InvalidWorkflowRouteInputError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidWorkflowRouteInputError";
  }
};
function parseNumberArgument(value) {
  if (typeof value !== "number") throw new InvalidWorkflowRouteInputError("Expected parsed number");
  return value;
}
function parseStringArgument(value) {
  if (typeof value !== "string") throw new InvalidWorkflowRouteInputError("Expected parsed string");
  return value;
}
function parseOptionalStringArgument(value) {
  if (value === void 0 || typeof value === "string") return value;
  throw new InvalidWorkflowRouteInputError("Expected parsed optional string");
}
function parseStringArguments(value) {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  throw new InvalidWorkflowRouteInputError("Expected parsed string arguments");
}

// src/features/workflow/entrypoint/workflow/entrypoint.ts
function createWorkflowRoutes(dependencies) {
  return dependencies.createWorkflowRoutes.execute({
    parseNumberArgument: dependencies.parseNumberArgument,
    parseStringArgument: dependencies.parseStringArgument,
    parseOptionalStringArgument: dependencies.parseOptionalStringArgument,
    parseStringArguments: dependencies.parseStringArguments,
    recordIssue: (workflow, issueNumber) => new RecordIssue(workflow).execute({ issueNumber }).result,
    recordBranch: (workflow, branch) => new RecordBranch(workflow).execute({ branch }).result,
    recordPullRequest: (workflow, number, url) => new RecordPullRequest(workflow).execute({ number, url }).result,
    createPullRequest: (workflow, args) => new CreatePullRequest(workflow).execute({ arguments: args }).result,
    recordCiPassed: (workflow) => new RecordCiPassed(workflow).execute({}).result,
    recordCiFailed: (workflow, output) => new RecordCiFailed(workflow).execute({ output }).result,
    verifyFeedbackAddressed: (workflow) => new VerifyFeedbackAddressed(workflow).execute({}).result
  }).routes;
}

// ../../packages/dev-workflow-v2/use-cases/src/infra/external-clients/zod/zod-schema-provider.ts
var ZodSchemaProvider = class {
  constructor(schema) {
    this.schema = schema;
  }
  schema;
  getSchema() {
    return this.schema;
  }
};

// src/shell/codex-cli.ts
var workflowConfiguration = configureWorkflow({});
var workflowDefinition = workflowConfiguration;
var routes = createWorkflowRoutes({
  createWorkflowRoutes: new CreateWorkflowRoutes(
    new ZodSchemaProvider(workflowDefinition.stateSchema),
    defineWorkflowRoutes
  ),
  parseNumberArgument,
  parseStringArgument,
  parseOptionalStringArgument,
  parseStringArguments
});
var bashForbidden = {
  commands: ["git push", "gh pr"],
  flags: ["--no-verify", "--force", "--hard"]
};
var workflowRoot = join2(dirname(fileURLToPath(import.meta.url)), "..", "..");
var workflowCommand = 'node "$PLUGIN_ROOT/com.openai.codex/dist/codex-workflow-command.mjs" --runtime=bundled';
var defaultProcessDeps = createDefaultProcessDeps();
var processDeps = {
  ...defaultProcessDeps,
  readFile: (path2) => {
    const input = defaultProcessDeps.readFile(path2);
    const threadId = defaultProcessDeps.getEnv("CODEX_THREAD_ID");
    if (path2 !== "/dev/stdin" || threadId === void 0 || threadId === "") {
      return input;
    }
    const hookInput = JSON.parse(input);
    if (typeof hookInput !== "object" || hookInput === null || Array.isArray(hookInput)) {
      return input;
    }
    return JSON.stringify({
      ...hookInput,
      session_id: threadId
    });
  }
};
var InvalidSleepDurationError = class extends Error {
  constructor() {
    super("sleepMs requires a finite non-negative number");
    this.name = "InvalidSleepDurationError";
  }
};
function sleepMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new InvalidSleepDurationError();
  }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
createCodexWorkflowCli({
  workflowDefinition,
  routes,
  bashForbidden,
  isWriteAllowed: workflowConfiguration.isWriteAllowed,
  workflowCommand,
  workflowRoot,
  processDeps,
  buildWorkflowDeps: (platform) => ({
    getGitInfo: createWorkflowGitStatusReader(readGitRepositoryStatus),
    getPrFeedback: createWorkflowPullRequestFeedbackReader(
      createGithubPullRequestFeedbackClient(runGh)
    ),
    createPullRequest: createWorkflowPullRequestCreator(createGithubPullRequestClient(runGh)),
    listSessionReviews: () => platform.store.listSessionReviews(platform.getSessionId()),
    sleepMs,
    now: platform.now
  })
});

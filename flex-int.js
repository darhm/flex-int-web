/**
 * FLEX Interpreter v1.0.0
 *
 * Changelog v1.1.0:
 *  added arithmetic primitives in flex;
 *  added `#put' sharp function;
 *  added `iobuffer' for browser and NodeJS compatibilty;
 *  added push expression-like syntax for arrays and dicts.
 *
 * Changelog v1.0.0:
 *  added arrays;
 *  added dicts;
 *  added class expressions;
 *  added FNULL.
 *
 * Changelog v0.0.1:
 *  added FLEX basic data types;
 *  added push expressions;
 *  added pop expressions;
 *
 * Copyright (C) 2022 darhm,
 * Licensed under GPL-3.0 License.
 */
let F = {};

/**
 * FLEX Interpreter Exception
 */
F.Exception = function (message) {
    /** Message **/
    this.message = message;

    /** FLEX Exception identifier **/
    this.flex = true;

    return;
};

/**
 * FLEX Input/Output buffer
 *
 * NOTE: Modify this function if you are in NodeJS or in another browser
 */
F.iobuffer = {
    /** print equivalent **/
    output: (s) => {
        document.getElementById("flex-console").innerHTML += s + "<BR>";
    },

    /** input equivalent **/
    input: (p) => {
        let a = null;

        while (a === null) a = prompt(p);

        return a;
    },

    clear: () => {
        document.getElementById("flex-console").innerHTML = "";
    },

    /** FLEX iobuffer identifier **/
    flex: true
};

/**
 * FLEX NULL
 */
F.NULL = function () {
    /** FLEX NULL identifier **/
    this.flex = true;

    return;
};

/**
 * FLEX typeof utility
 */
F.typeof = function (data) {
    try {
        if (data instanceof F.NULL) return "null";
    } catch (e) {};

    if (data === null) return "jsNull";

    if (Array.isArray(data)) {
        if (data.length == 1 && typeof data[0] == "string") return "string";

        return "function";
    } else if (typeof data == "object" && Object.keys(data).length == 1 && Object.keys(data)[0] == "@")
        return "array";
    else if (typeof data == "object" && Object.keys(data).length == 1 && Object.keys(data)[0] == "!")
        return "dict";
    else if (typeof data == "string") return "instr";
    else if (typeof data == "number") return "number";
    else if (typeof data == "boolean") return "boolean";

    return "unknown";
};

/**
 * Converts FLEX types into JavaScript types
 */
F.toNative = function (api, data) {
    let parsed;

    switch (F.typeof(data)) {
        case "boolean":
        case "instr":
        case "number":
        case "function":
        case "null":
            return data;

        case "jsNull":
            return new F.NULL();

        case "string":
            return data[0];

        case "array":
            parsed = [];

            for (let i in data["@"]) {
                let value = data["@"][i];

                if (typeof value == "string") {
                    if (!F.validator.isValidPushExpr(value))
                        throw new F.Exception("Expected push expression-like syntax");
                    else {
                        parsed[i] = F.expr.parsePushExpr(api, value);
                    }
                } else
                    parsed[i] = F.toNative(api, data["@"][i]);
            }

            return parsed;

        case "dict":
            parsed = {};

            const keys = Object.keys(data["!"]);

            keys.forEach((key) => {
                let value = data["!"][key];

                if (typeof value == "string") {
                    if (!F.validator.isValidPushExpr(value))
                        throw new F.Exception("Expected push expression-like syntax");
                    else {
                        api = F.expr.parsePushExpr(api, value);
                        parsed[key] = api.stack.pop();
                    }
                } else
                    parsed[key] = F.toNative(api, value);
            });

            return parsed;

        case "unknown":
            throw new F.Exception("Unknown type: `" + data + "'");
    }
};

/**
 * flex interpreter stack
 */
F.Stack = function (stack) {
    if (!Array.isArray(stack)) throw new F.Exception("Internal: Stack: invalid stack array");

    let raw = stack;

    /**
     * gets the raw stack as an array
     */
    this.get = () => raw;

    /**
     * pushes x to the stack
     */
    this.push = (x) => {
        raw.push(x);

        return;
    };

    /**
     * pops a value to the stack
     */
    this.pop = () => {
        let x = raw.pop();

        if (x === undefined) throw new F.Exception("stack underflow (trying to pop undefined value)");

        return x;
    };

    /**
     * flushes the stack
     */
    this.flush = () => {
        raw = [];

        return;
    }

    /** stack constant identifier **/
    this.flex = true;
};

/**
 * flex safe wrapper
 */
F.SAFE = function (data) {
    /** data api keys **/
    const API_KEYS = ["functions", "stack", "vars"];

    try {
        if (typeof data != "object" || Array.isArray(data))
            throw new F.Exception("Wnsafe: Corrupted data");

        API_KEYS.forEach((key) => {
            if (!Object.keys(data).includes(key))
                throw new F.Exception("Unsafe: Missing `" + key + "' key");
        });

        if (typeof data.stack != "object" || data.stack.flex === undefined || !data.stack.flex)
            throw new F.Exception("Unsafe: Invalid stack");

        if (typeof data.vars != "object" || Array.isArray(data.vars))
            throw new F.Exception("Unsafe: Invalid vars");

        if (typeof data.functions != "object" || Array.isArray(data.functions))
            throw new F.Exception("Unsafe: Invalid functions");
    } catch (e) {
        throw new F.Exception("Unsafe: Unknown api alteration");
    }

    return data;
};

/**
 * FLEX Validator
 */
F.validator = {
    isValidPopExpr: (x) => /^&[a-z-]+(\.(\$[a-z-]+|&0|[a-z-]+|[0-9]+))*$/.test(x),
    isValidPushExpr: (x) => /^\$[a-z-]+(\.([0-9]+|\$[a-z-]+|[a-z-]+|&0))*$/.test(x),
    isValidClassExpr: (x) => /^\:\$[a-z-]+(\.([0-9]+|[a-z-]+|\$[a-z-]+|&0))*$/.test(x),
    isValid: (x) => /^[a-z-]+$/.test(x),
    isValidSharp: (x) =>
        x == "#nop" ||
         x == "#return" ||
         x == "#exit" ||
         x == "#flush" ||
         x == "#put" ||
         x == "#clear" ||
        x == "~nop" ||
         x == "~return" ||
         x == "~exit" ||
         x == "~flush" ||
         x == "~put" ||
         x == "~clear" ||
        "+-*/".split("").includes(x),
    isValidVar: (x) => /^\$[a-z-]+$/.test(x)
};

/**
 * FLEX Expression parsers
 */
F.expr = {
    getVar: (vars, data) => {
        if (F.validator.isValidVar(data)) throw new F.Exception("Invalid variable: Malformed");

        let name = data.split("$")[1];

        if (vars[name] === undefined)
            throw new F.Exception("Invalid variable: undefined");

        return vars[name];
    },

    substituteVars: (vars, stack, indexMap) => {
        let s = [];

        for (let i in indexMap) {
            let index = indexMap[i];

            if (Number.isNaN(Number(index))) {
                if (index == "&0") stack.pop();
                else if (index.startsWith("$")) s[i] = getVar(vars, index);
                else s[i] = index;
            } else {
                if (!/^[0-9]+$/.test(index)) throw new F.Exception("Invalid var substitution: Invalid number: `" + index + "'");

                s[i] = Number(index);
            }
        }

        return s;
    },

    parsePopExpr: (api, expr) => {
        if (!F.validator.isValidPopExpr(expr))
            throw new F.Exception("Invalid pop expression: `" + expr + "'");

        if (/^\&[a-z0-9-]+$/.test(expr)) {
            let name = expr.split("&")[1];

            api.vars[name] = api.stack.pop();
        } else {
            const splitted = expr.split(".");

            let name = splitted[0].split("&")[1];
            splitted.shift();

            if (api.vars[name] === undefined)
                throw new F.Exception("Invalid pop expression: Cannot set index/key on undefined variable: `" + name + "'");

            let indexMap = F.expr.substituteVars(api.vars, api.stack, splitted);
            let value = api.stack.pop();

            api.vars[name] = F.expr.setIndex(api.vars[name], value, indexMap);
        }

        return api;
    },

    parsePushExpr: (api, expr) => {
        if (!F.validator.isValidPushExpr(expr))
            throw "Invalid push expression: Malformed: `" + expr + "'";

        if (/^\$[a-z0-9-]+$/.test(expr)) {
            let name = expr.split("$")[1];

            if (api.vars[name] === undefined) throw "Invalid push expression: Undefined master variable: `" + name + "'";

            api.stack.push(api.vars[name]);
        } else {
            const splitted = expr.split(".");

            let name = splitted[0].split("$")[1];
            splitted.shift();

            if (api.vars[name] === undefined) throw "Invalid push expression: Undefined variable `" + expr + "'";

            api.stack.push(
                F.expr.getIndex(api.vars[name], F.expr.substituteVars(api.vars, api.stack, splitted))
            );

            if (api.stack.get()[api.stack.get().length - 1] === undefined)
                throw "Invalid push expression: Undefined variable: `" + expr + "'";
        }

        return api;
    },

    executeClassExpr: (api, expr) => {
        if (!F.validator.isValidClassExpr(expr))
            throw new F.Exception("Invalid class expression: Malformed: `" + expr + "'");

        if (/^:\$[a-z-]+$/.test(expr)) {
            throw new F.Exception("Invalid class expr: Cannot use class expressions in non-classes");
        } else {
            const splitted = expr.split(":")[1].split(".");

            let name = splitted[0].split("$")[1];
            splitted.shift();

            if (api.vars[name] === undefined)
                throw F.Exception("Invalid class expr: Undefined variable: `" + expr + "'");

            const exec = F.expr.getIndex(api.vars[name], F.expr.substituteVars(api.vars, api.stack, splitted));

            if (F.typeof(exec) != "function")
                throw new F.Exception("Invalid class expr: Invalid function: `" + expr + "'");

            if (exec === undefined)
                throw new F.Exception("Invalid class expr: Undefined function: `" + expr + "'");

            api.stack.push(api.vars[name]);

            F.eval(api, exec);
        }

        return api;
    },

    setIndex: (arr, value, indexMap) => {
        const isArr = Array.isArray(arr);
        // without this loopIndexMap THIS SOFTWARE COMES WITH NO WARRANTY.will be a indexMap reference
        let loopIndexMap = Array(...indexMap);

        for (let i in indexMap) {
            loopIndexMap.shift();

            let index = indexMap[i];
            let arrayValue = arr[index];

            if (Array.isArray(arrayValue) && typeof index == "string")
                throw "Expected array index not dict key";

            if (((isArr && Array.isArray(arrayValue)) || (!isArr && typeof arrayValue == "object")) && i < indexMap.length - 1) {
                arr[index] = F.expr.setIndex(arr[index], value, loopIndexMap);

                break;
            }

            arr[index] = value;
        }

        return arr;
    },

    getIndex: (arr, indexMap) => {
        const isArr = Array.isArray(arr);

        for (let i in indexMap) {
            let index = indexMap[i];

            if ((isArr && Array.isArray(arr[index])) || (!isArr && typeof arr[index] == "object")) {
                arr = arr[index];
            } else return arr[index];
        }

        return arr;
    }
};

F.exec = (api, name) => {
    if (!Object.keys(api.functions).includes(name))
        throw new F.Exception("Undefined function: `" + name + "'");

    let exec = api.functions[name];

    if (Array.isArray(exec))
        api = F.eval(api, exec);
    else if (typeof exec == "function")
        api = F.SAFE(exec(api));
    else
        throw new F.Exception("Unknown function, expected native or flex function: `" + exec + "'");

    return api;
};

/**
 * Generates a new API with the given parameters
 */
F.newAPI = (stack = [], vars = {}, functions = {}) => {
    return F.SAFE({
        stack: new F.Stack(stack),
        vars: vars,
        functions: functions
    });
};
/**
 * Evaluate the given FLEX instructions
 */
F.eval = (api, instructions) => {
    try {
        F.SAFE(api);
    } catch (e) {
        throw new F.Exception("Invalid API");
    }

    if (api.functions["main"] === undefined)
        api.functions["main"] = instructions;

    instructions.forEach((instr) => {
        try {
            switch (F.typeof(instr)) {
                case "boolean":
                case "number":
                case "null":
                case "function":
                    api.stack.push(instr);

                    break;

                case "string":
                case "array":
                case "dict":
                case "jsNull":
                    api.stack.push(F.toNative(api, instr));

                    break;

                case "instr":
                    if (F.validator.isValidPushExpr(instr))
                        api = F.expr.parsePushExpr(api, instr);
                    else if (F.validator.isValidPopExpr(instr))
                        api = F.expr.parsePopExpr(api, instr);
                    else if (F.validator.isValidClassExpr(instr))
                        api = F.expr.executeClassExpr(api, instr);
                    else if (F.validator.isValid(instr))
                        api = F.exec(api, instr);
                    else if (F.validator.isValidSharp(instr)) {
                        let a, b;

                        switch (instr) {
                            case "#nop":
                            case "~nop":
                                break;

                            case "#flush":
                            case "~flush":
                                api.stack.flush();
                                break;

                            case "#return":
                            case "~return":
                                return api;

                            case "#exit":
                            case "~exit":
                                throw "dead";

                            case "#put":
                            case "~put":
                                a = api.stack.pop();

                                if (typeof a == "object") F.iobuffer.output(JSON.stringify(a));
                                else F.iobuffer.output(a);

                                break;

                            case "#clear":
                            case "~clear":
                                F.iobuffer.clear();

                                break;

                            case "+":
                                a = api.stack.pop();
                                b = api.stack.pop();

                                if (typeof a != typeof b)
                                    throw new F.Exception("Values must be of equal type");

                                if (typeof a != "number" && typeof a != "string")
                                    throw new F.Exception("Expected number or string");

                                api.stack.push(a + b);

                                break;

                            case "-":
                                a = api.stack.pop();
                                b = api.stack.pop();

                                if (typeof a != typeof b)
                                    throw new F.Exception("Values must be of equal type");

                                if (typeof a != "number")
                                    throw new F.Exception("Expected number");

                                api.stack.push(a - b);

                                break;
                        }
                    } else
                        throw new F.Exception("Malformed instruction");

                    break;

                case "unknown":
                default:
                    throw new F.Exception("Unknown instruction");

                    break;
            }
        } catch (err) {
            if (err instanceof F.Exception)
                throw new F.Exception("On `" + instr + "': " + err.message);
            else if (err == "dead") throw "dead";
            else
                throw new F.Exception("On `" + instr + "': " + err);
        }
    });

    return api;
}

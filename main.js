const command = document.getElementById("command");
let API = F.newAPI([], {}, {
    "stack-dump": (api) => {
        F.iobuffer.output(api.stack.get().join("; "));

        return api;
    },

    "help": (api) => {
        F.iobuffer.output("*** flex-int help v1.1.0 ***");
        F.iobuffer.output("Type your expression in YAML, expressions must include [ and ]");
        F.iobuffer.output("This FLEX implementation has a library set to do almost every operation");
        F.iobuffer.output("Use sharp function `clear' to clear and sharp function `put' to print something");

        return api;
    }
});

command.addEventListener("keypress", (e) => {
    if (e.which != 13) return;

    let expr = command.value;
    let parsed;

    F.iobuffer.output("> " + expr);

    try {
        // parse yaml, requires js-yaml script
        parsed = jsyaml.load(expr, jsyaml.CORE_SCHEMA);
    } catch (e) {
        F.iobuffer.output("< Provide valid YAML!");

        return;
    }

    try {
        API = F.eval(API, parsed);
    } catch (e) {
        if (e == "dead") {
            F.iobuffer.output("< dead");

            return;
        }

        F.iobuffer.output(e.message);

        return;
    }

    F.iobuffer.output("< OK!");

    command.value = "";
});

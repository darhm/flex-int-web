const command = document.getElementById("command");
let API = F.newAPI([], {}, {
    "stack-dump": (api) => {
        F.iobuffer.output(api.stack.get().join("; "));

        return api;
    }
});

command.addEventListener("keypress", (e) => {
    if (e.which != 13) return;

    let expr = command.value;
    let parsed;

    F.iobuffer.output(expr);

    try {
        parsed = JSON.parse(expr);
    } catch (e) {
        F.iobuffer.output("Provide valid JSON!");

        return;
    }

    try {
        API = F.eval(API, parsed);
    } catch (e) {
        if (e == "dead") {
            F.iobuffer.output("dead");

            return;
        }

        F.iobuffer.output(e.message);

        return;
    }

    F.iobuffer.output("OK!");

    command.value = "";
});

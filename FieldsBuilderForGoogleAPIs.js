var apiObj = {};
var methodObj = {};

loadAPIList();

function clearMethodList() {
    $('#status').empty();
    $('#tree').css({
        "display": "none"
    });
    $('#selectmethod').empty();
    $('#selectmethoddiv').css({
        "display": "none"
    });
    $('#fields').css({
        "display": "none"
    });
    $('#fieldsexp').css({
        "display": "none"
    });
    $('#checkcontrol').css({
        "display": "none"
    });
    $('#fieldvalue').val("");
}

function clearResourceList() {
    clearMethodList();
    $('#selectresource').empty();
    $('#selectresourcediv').css({
        "display": "none"
    });
}

function showFields() {
    $('#selectmethoddiv').css({
        "display": "block"
    });
    $('#fieldvalue').empty();
    $('#fields').css({
        "display": "block"
    });
    $('#fieldsexp').css({
        "display": "block"
    });
    $('#checkcontrol').css({
        "display": "block"
    });
}

$('#checkall').on('click', function() {
    $("#tree").jstree().check_all();
    createFields();
});

$('#uncheckall').on('click', function() {
    $("#tree").jstree().uncheck_all();
    $('#fieldvalue').val("");
});

$('#openall').on('click', function() {
    $("#tree").jstree().open_all();
});

$('#closeall').on('click', function() {
    $("#tree").jstree().close_all();
});

function initJsTree() {
    $('#tree').jstree({
        plugins: ["wholerow", "checkbox"],
        core: {
            'check_callback': true,
            themes: {
                icons: false,
                responsive: true
            },
            data: []
        },
        checkbox: {
            whole_node: false,
            tie_selection: false
        }
    });
}

function setDocumentURL() {
    if (methodObj.hasOwnProperty("documentationLink")) {
        $('#documenturl').attr('href', methodObj.documentationLink);
    } else {
        $('#documenturl').removeAttr('href');
    }
}

function loadAPIList() {
    fetch("https://www.googleapis.com/discovery/v1/apis")
        .then(function(res) {
            return res.json()
        })
        .then(function(obj) {
            apiObj = obj;
            let select = $('#selectapi');
            obj.items.sort(function(a, b) {
                a = a.title.toLowerCase();
                b = b.title.toLowerCase();
                return (a < b) ? -1 : (a > b) ? 1 : 0;
            }).forEach(function(e) {
                select.append($("<option>").val(e.id).text(e.title + "(" + e.version + ")"));
            });
        }).catch(function(err) {
            console.error(err);
        });
}

$('#searchapi').keyup(function() {
    clearResourceList();
    const val = $(this).val().toLowerCase();
    let select = $('#selectapi');
    select.empty();
    const values = apiObj.items
        .filter(function(e) {
            return e.title.toLowerCase().indexOf(val) > -1
        })
        .sort(function(a, b) {
            a = a.title.toLowerCase();
            b = b.title.toLowerCase();
            return a < b ? -1 : a > b ? 1 : 0;
        });
    values.forEach(function(e) {
        select.append($("<option>").val(e.id).text(e.title + "(" + e.version + ")"))
    });
    if (values.length == 1) {
        $('#selectresourcediv').css({
            "display": "block"
        });
        const [api, version] = $('#selectapi').prop("selectedIndex", 0).val().split(":");
        loadResourceList(api, version);
    }
});

$('#selectapi').change(function() {
    const select = $('#selectapi');
    $('#selectresourcediv').css({
        "display": "block"
    });
    const [api, version] = select.val().split(":");
    loadResourceList(api, version);
});

function loadResourceList(api, version) {
    const url = "https://www.googleapis.com/discovery/v1/apis/" + api + "/" + version + "/rest";
    fetch(url)
        .then(function(res) {
            return res.json()
        })
        .then(function(obj) {
            methodObj = obj;
            let select = $('#selectresource');
            select.empty();
            clearMethodList();
            initJsTree();
            const resources = Object.keys(obj.resources).sort();
            resources.forEach(function(e) {
                select.append($("<option>").val(e).text(e))
            });
            if (resources.length > 0) {
                if ($('#selectmethoddiv').css('display') == 'none') {
                    showFields();
                }
                const resource = $('#selectresource').prop("selectedIndex", 0).val();
                loadMethodList(resource);
            } else if (resources.length == 0) {
                $('#status').text("No resources.");
            }
            setDocumentURL();
        }).catch(function(err) {
            $('#status').text("No resources.");
        });
}

$('#selectresource').change(function() {
    clearMethodList()
    const select = $('#selectresource');
    const resource = select.val();
    showFields();
    loadMethodList(resource);
});

function loadMethodList(resource) {
    let select = $('#selectmethod');
    select.empty();
    let methods;
    if (methodObj.resources[resource].hasOwnProperty("methods")) {
        methods = Object.keys(methodObj.resources[resource].methods).sort();
        methods.forEach(function(e) {
            select.append($("<option>").val(e).text(e))
        });
    } else if (!methodObj.resources[resource].hasOwnProperty("methods") && methodObj.resources[resource].hasOwnProperty("resources")) {
        methods = [];
        $('#status').text("Sorry. Currently unsupported fields in this application.");
    }
    if (methods.length > 0) {
        $('#status').empty();
        const resource = $('#selectresource').val();
        const method = methods[0];
        initJsTree();
        $('#tree').css({
            "display": "block"
        });
        loadTree(resource, method);
    }
}

$('#selectmethod').change(function() {
    $('#status').empty();
    $('#fieldvalue').empty();
    $('#fields').css({
        "display": "block"
    });
    const resource = $('#selectresource').val();
    const method = $('#selectmethod').val();
    initJsTree();
    $('#tree').css({
        "display": "block"
    });
    loadTree(resource, method);
});

function loadTree(resource, method) {
    var baseData = methodObj.schemas;
    var getData = function getData(data, res, pre_parent, now_parent) {
        for (var key in data) {
            if (
                !(key == "type" && typeof data[key] == "string") &&
                !(key == "description" && typeof data[key] == "string") &&
                !(key == "format" && typeof data[key] == "string") &&
                !(key == "default" && typeof data[key] == "string") &&
                !(key == "required" && Array.isArray(data[key])) &&
                !(key == "enum" && Array.isArray(data[key])) &&
                !(key == "enumDescriptions" && Array.isArray(data[key])) &&
                isNaN(key)
            ) {
                res.push({
                    id: now_parent == "#" ? "#_" + key : pre_parent + "_" + key,
                    text: key,
                    parent: now_parent
                });
            }
            if (typeof data[key] === "object") {
                var pre_temp = now_parent == "#" ? "#_" + key : pre_parent + "_" + key;
                var now_temp = now_parent + "_" + key;
                getData(data[key], res, pre_temp, now_temp);
            }
        }
        return res;
    }

    if (
        methodObj.resources.hasOwnProperty(resource) &&
        methodObj.resources[resource].methods.hasOwnProperty(method)
    ) {
        if (methodObj.resources[resource].methods[method].hasOwnProperty("response")) {
            const responseObj = methodObj.resources[resource].methods[method].response;
            const responseValue = responseObj[Object.keys(responseObj)[0]];
            var baseDataTemp1 = JSON.parse(JSON.stringify(baseData));
            var baseDataTemp2 = JSON.parse(JSON.stringify(baseData));
            if (Object.keys(baseDataTemp1[responseValue].properties).length == 0) {
                $('#tree').css({
                    "display": "none"
                });
                $('#status').text("This method uses no fields.");
            } else {
                var obj;
                try {
                    obj = addData(baseDataTemp1, baseDataTemp1[responseValue].properties);
                } catch (e) {
                    $('#status').text("Looop was not converged. So the hierarchy of fields is low.");
                    let data = baseDataTemp2[responseValue].properties;
                    data = JSON.parse(JSON.stringify(data).replace(/\"\$ref\":\"(\w+)\"/g, function(p1, p2) {
                        return JSON.stringify(baseDataTemp2[p2].properties).slice(1).slice(0, -1);
                    }).replace(/\{\,\"/g, "{\""));
                    obj = addDataNoReplace(baseDataTemp2, data);
                }
                if (Object.keys(obj).length > 0) {
                    var data = getData(obj, [], "", "#");
                    $('#tree').jstree(true).settings.core.data = data;
                    $('#tree').jstree(true).refresh();
                    $('#tree').on("check_node.jstree uncheck_node.jstree", function(e, data) {
                        createFields()
                    });
                } else {
                    $('#tree').css({
                        "display": "none"
                    });
                    $('#status').text("Sorry. Currently unsupported fields in this application.");
                }
            }
        } else {
            $('#tree').css({
                "display": "none"
            });
            $('#status').text("This method uses no fields.");
            console.log("This method uses no fields.")
        }
    } else {
        $('#status').text("Unknown error");
        console.error("Unknown error");
    }
}

function adjustment(keys, init, search) {
    return Object.keys(keys).reduce(function(o, e) {
        if (e != search) o[e] = keys[e];
        return o;
    }, init);
}

function addDataNoReplace(baseData, data) {
    for (var key in data) {
        if (key == "items" && data["type"] == "array" && data[key].hasOwnProperty("type") && data[key]["type"] == "string") {
            delete data[key];
        } else if (data[key].hasOwnProperty("properties") && !data[key].hasOwnProperty("id")) {
            data[key] = adjustment(data[key].properties, data[key].properties, "");
        } else if (data[key].hasOwnProperty("items") && data[key]["items"].hasOwnProperty("properties")) {
            data[key] = adjustment(data[key], data[key]["items"].properties, "items");
        } else if (data[key].hasOwnProperty("items") && data[key]["items"].hasOwnProperty("$ref")) {
            data[key] = adjustment(data[key], baseData[data[key]["items"]["$ref"]].properties, "items");
        } else if (data[key].hasOwnProperty("additionalProperties")) {
            delete data[key]["additionalProperties"];
        } else if (data[key].hasOwnProperty("$ref")) {
            var temp = {};
            temp[data[key]["$ref"]] = {};
            data[key] = temp;
        }
        if (typeof data[key] === "object") {
            addDataNoReplace(baseData, data[key]);
        }
    }
    return data;
}

function addData(baseData, data) {
    for (var key in data) {
        if (key == "items" && data["type"] == "array" && data[key].hasOwnProperty("type") && data[key]["type"] == "string") {
            delete data[key];
        } else if (data[key].hasOwnProperty("properties") && !data[key].hasOwnProperty("id")) {
            data[key] = adjustment(data[key].properties, data[key].properties, "");
        } else if (data[key].hasOwnProperty("items") && data[key]["items"].hasOwnProperty("properties")) {
            data[key] = adjustment(data[key], data[key]["items"].properties, "items");
        } else if (data[key].hasOwnProperty("items") && data[key]["items"].hasOwnProperty("$ref")) {
            data[key] = adjustment(data[key], baseData[data[key]["items"]["$ref"]].properties, "items");
        } else if (data[key].hasOwnProperty("additionalProperties") && data[key]["additionalProperties"].hasOwnProperty("$ref")) {
            delete data[key]["additionalProperties"];
        } else if (data[key].hasOwnProperty("$ref")) {
            data[key] = adjustment(data[key], baseData[data[key]["$ref"]].properties, "$ref");
        }
        if (typeof data[key] === "object") {
            addData(baseData, data[key]);
        }
    }
    return data;
}

function createFieldsObject(obj) {
    var r1 = obj.reduce(function(o, e) {
        if (e.parent in o) {
            o[e.parent].push(e);
        } else {
            o[e.parent] = [e];
        }
        return o;
    }, {});
    var initTemp = {};
    var r2 = Object.keys(r1).map(function(e) {
        return r1[e].reduce(function(o2, f, j) {
            var last = j == r1[e].length - 1;
            o2.texts[f.text] = initTemp;
            if (last) {
                var temp = f.parent.split("_");
                o2.parents = temp;
            }
            return o2;
        }, {
            texts: {},
            parents: []
        });
    });
    var createObj = function(obj, keys, value) {
        var lkey = keys.splice(-1);
        keys.forEach(function(e) {
            obj[e] = obj[e] || {};
            obj = obj[e];
        });
        obj[lkey] = value;
        obj = obj[lkey];
    };
    var r3 = r2.reduce(function(ar, e) {
        var obj = {};
        createObj(obj, e.parents, e.texts);
        ar.push(obj);
        return ar;
    }, []);
    var merge = function merge(current, update) {
        Object.keys(update).forEach(function(key) {
            if (current.hasOwnProperty(key) && typeof current[key] === 'object' && !(current[key] instanceof Array)) {
                merge(current[key], update[key]);
            } else {
                current[key] = update[key];
            }
        });
        return current;
    }
    var r4 = r3.reduce(function(obj, e) {
        return merge(obj, e)
    }, {});
    var strObj = JSON.stringify(r4["#"]);
    var str = strObj.replace(/\:\{\}/g, "").replace(/"/g, "").replace(/:/g, "").replace(/\{/g, "(").replace(/\}/g, ")").slice(1).slice(0, -1);
    return str;
}

function createFields() {
    var checked = $("#tree").jstree("get_checked", true);
    var parents = checked.filter(function(e) {
        return e.children.length > 0
    });
    var removedChildren = checked.filter(function(e) {
        return !parents.some(function(f) {
            return f.children.indexOf(e.id) != -1
        })
    });
    if (removedChildren.length > 0) {
        var str = createFieldsObject(removedChildren);
        $('#fieldvalue').val(str);
    }
}

const apiObj = {};
let methodObj = {};

// Initialize application
$(document).ready(() => {
    loadAPIList();
    initJsTree();
    setupEventHandlers();
});

function setupEventHandlers() {
    $('#searchapi').on('input', handleSearch);
    $('#selectapi').on('change', handleApiChange);
    $('#selectresource').on('change', handleResourceChange);
    $('#selectmethod').on('change', handleMethodChange);
    
    $('#checkall').on('click', () => {
        $("#tree").jstree().check_all();
        createFields();
    });
    
    $('#uncheckall').on('click', () => {
        $("#tree").jstree().uncheck_all();
        $('#fieldvalue').val("");
    });
    
    $('#openall').on('click', () => $("#tree").jstree().open_all());
    $('#closeall').on('click', () => $("#tree").jstree().close_all());
    
    // Copy to clipboard
    $('#copyfields').on('click', () => {
        const copyText = document.getElementById("fieldvalue");
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
        showStatus("Copied to clipboard!", "success");
    });
}

function showStatus(message, type = 'info') {
    const status = $('#status');
    status.text(message);
    status.removeClass('error success info').addClass(type);
    if (type === 'success') {
        setTimeout(() => status.text(''), 3000);
    }
}

function initJsTree() {
    // If jstree is already initialized, destroy it first
    if ($.jstree.reference('#tree')) {
        $('#tree').jstree('destroy');
    }

    $('#tree').jstree({
        plugins: ["wholerow", "checkbox"],
        core: {
            'check_callback': true,
            themes: {
                name: 'default',
                dots: true,
                icons: false
            },
            data: []
        },
        checkbox: {
            whole_node: true,
            tie_selection: false
        }
    });
    
    $('#tree').on("check_node.jstree uncheck_node.jstree", () => createFields());
}

async function loadAPIList() {
    try {
        const res = await fetch("https://www.googleapis.com/discovery/v1/apis");
        const obj = await res.json();
        
        // Store globally
        Object.assign(apiObj, obj);
        
        const select = $('#selectapi');
        select.empty();
        select.append($("<option>").val("").text("Select an API..."));
        
        obj.items.sort((a, b) => a.title.localeCompare(b.title))
            .forEach(e => {
                select.append($("<option>").val(e.id).text(`${e.title} (${e.version})`));
            });
            
    } catch (err) {
        console.error(err);
        showStatus("Failed to load API list.", "error");
    }
}

function handleSearch() {
    clearResourceList();
    const val = $(this).val().toLowerCase();
    const select = $('#selectapi');
    select.empty();
    
    const values = apiObj.items
        .filter(e => e.title.toLowerCase().includes(val) || e.name.toLowerCase().includes(val))
        .sort((a, b) => a.title.localeCompare(b.title));
        
    if (values.length === 0) {
        select.append($("<option>").val("").text("No APIs found"));
        return;
    }
    
    values.forEach(e => {
        select.append($("<option>").val(e.id).text(`${e.title} (${e.version})`));
    });
    
    if (values.length === 1) {
        select.prop("selectedIndex", 0);
        handleApiChange();
    }
}

async function handleApiChange() {
    const val = $('#selectapi').val();
    if (!val) return;
    
    const [api, version] = val.split(":"); // This might fail if id doesn't have colon, but standard discovery IDs do.
    // Fallback if split doesn't work as expected (some IDs might be different)
    const selectedApiItem = apiObj.items.find(i => i.id === val);
    if (!selectedApiItem) return;
    
    await loadDiscoveryDocument(selectedApiItem.discoveryRestUrl);
}

async function loadDiscoveryDocument(url) {
    try {
        showStatus("Loading discovery document...", "info");
        const res = await fetch(url);
        methodObj = await res.json();
        
        $('#selectresourcediv').show();
        const select = $('#selectresource');
        select.empty();
        select.append($("<option>").val("").text("Select a Resource..."));
        
        clearMethodList();
        
        // Flatten resources to handle nesting
        const resources = getAllResources(methodObj);
        resources.sort().forEach(r => {
            select.append($("<option>").val(r).text(r));
        });
        
        showStatus("API loaded. Select a resource.", "info");
        
    } catch (err) {
        console.error(err);
        showStatus("Failed to load discovery document.", "error");
    }
}

// Recursive function to get all resource paths
function getAllResources(root, parentPath = '') {
    let paths = [];
    if (root.resources) {
        for (const [key, value] of Object.entries(root.resources)) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            paths.push(currentPath);
            paths = paths.concat(getAllResources(value, currentPath));
        }
    }
    return paths;
}

function handleResourceChange() {
    clearMethodList();
    const resourcePath = $('#selectresource').val();
    if (!resourcePath) return;
    
    loadMethodList(resourcePath);
}

function loadMethodList(resourcePath) {
    const select = $('#selectmethod');
    select.empty();
    select.append($("<option>").val("").text("Select a Method..."));
    
    // Navigate to the resource object
    const parts = resourcePath.split('.');
    let current = methodObj;
    for (const part of parts) {
        if (current.resources && current.resources[part]) {
            current = current.resources[part];
        } else {
            console.error("Resource path not found:", resourcePath);
            return;
        }
    }
    
    if (current.methods) {
        const methods = Object.keys(current.methods).sort();
        methods.forEach(m => {
            select.append($("<option>").val(m).text(m));
        });
        $('#selectmethoddiv').show();
    } else {
        showStatus("No methods found for this resource.", "info");
    }
}

function handleMethodChange() {
    const method = $('#selectmethod').val();
    const resourcePath = $('#selectresource').val();
    if (!method || !resourcePath) return;
    
    // Navigate to the method object
    const parts = resourcePath.split('.');
    let current = methodObj;
    for (const part of parts) {
        current = current.resources[part];
    }
    const methodData = current.methods[method];
    
    // Update documentation link
    if (methodObj.documentationLink) {
        $('#documenturl').attr('href', methodObj.documentationLink);
    }
    
    $('#fields').show();
    $('#fieldsexp').show();
    $('#checkcontrol').show();
    $('#tree').show();
    $('#fieldvalue').val("");
    
    loadTree(methodData);
}

function loadTree(methodData) {
    if (!methodData.response || !methodData.response.$ref) {
        $('#tree').hide();
        showStatus("This method does not return a response body with fields to select.", "info");
        return;
    }
    
    const schemaName = methodData.response.$ref;
    const schemas = methodObj.schemas;
    
    if (!schemas || !schemas[schemaName]) {
        $('#tree').hide();
        showStatus("Schema definition not found.", "error");
        return;
    }
    
    showStatus("Building tree...", "info");
    
    // Build tree data handling circular references
    const treeData = buildTreeData(schemas[schemaName], schemas, "#", [], schemaName);
    
    $('#tree').jstree(true).settings.core.data = treeData;
    $('#tree').jstree(true).refresh();
    
    showStatus("");
}

function buildTreeData(schema, allSchemas, parentId, visitedRefs, currentRefName) {
    const data = [];
    
    // Helper to process properties
    const processProperties = (props, pId) => {
        for (const [key, prop] of Object.entries(props)) {
            const nodeId = pId === "#" ? key : `${pId}/${key}`;
            
            // Skip simple types if they are not containers, but we want to show all selectable fields
            // Actually, we want to show everything that can be a field.
            
            const node = {
                id: nodeId,
                text: key,
                parent: pId,
                icon: false
            };
            
            data.push(node);
            
            // Check for recursion/nested objects
            let nextSchema = prop;
            let refName = null;
            
            if (prop.$ref) {
                refName = prop.$ref;
                nextSchema = allSchemas[refName];
            } else if (prop.type === 'array' && prop.items) {
                if (prop.items.$ref) {
                    refName = prop.items.$ref;
                    nextSchema = allSchemas[refName];
                } else if (prop.items.type === 'object' || prop.items.properties) {
                    nextSchema = prop.items;
                }
            }
            
            if (nextSchema && (nextSchema.properties || nextSchema.additionalProperties)) {
                // Cycle detection
                if (refName && visitedRefs.includes(refName)) {
                    // Cycle detected, stop recursion for this branch
                    // Optionally add a visual indicator or just leaf node
                    // For fields selection, we usually don't need infinite depth.
                    // Google APIs usually support wildcards or specific depth, but here we just stop.
                    continue;
                }
                
                const newVisited = refName ? [...visitedRefs, refName] : [...visitedRefs];
                
                // If it has properties, recurse
                if (nextSchema.properties) {
                    const childData = buildTreeData(nextSchema, allSchemas, nodeId, newVisited, refName);
                    data.push(...childData);
                }
            }
        }
    };
    
    if (schema.properties) {
        processProperties(schema.properties, parentId);
    }
    
    return data;
}

function createFields() {
    const checkedNodes = $("#tree").jstree("get_checked", true);
    
    if (checkedNodes.length === 0) {
        $('#fieldvalue').val("");
        return;
    }

    // Create a Set of checked IDs for fast lookup
    const checkedIds = new Set(checkedNodes.map(n => n.id));
    
    // Filter out nodes whose parent is also checked
    // This ensures that if a parent is selected (implying all children), we only include the parent
    const topLevelChecked = checkedNodes.filter(n => !checkedIds.has(n.parent));
    
    const root = {};
    
    topLevelChecked.forEach(node => {
        // The ID is constructed as "path/to/node" (or just "node" for top level)
        // However, we should be careful if IDs contain other characters. 
        // In buildTreeData we used: const nodeId = pId === "#" ? key : `${pId}/${key}`;
        // So splitting by '/' is correct assuming keys don't contain '/'.
        // Google API field names don't contain '/'.
        
        const path = node.id;
        const parts = path.split('/');
        let current = root;
        
        parts.forEach((part, index) => {
            if (!current[part]) {
                // If it's the last part, mark as true (leaf of selection)
                // Otherwise create object for nesting
                current[part] = index === parts.length - 1 ? true : {};
            } else if (current[part] === true) {
                // If we encounter a node that is already marked as true, it means a parent was selected.
                // But our filtering logic should prevent this case (we only process top-level checked).
                // So this branch might not be reached, but good to keep existing value.
            }
            
            // Navigate deeper if it's an object
            if (current[part] !== true) {
                current = current[part];
            }
        });
    });
    
    // Now convert root object to fields string
    const fieldsString = stringifyFields(root);
    $('#fieldvalue').val(fieldsString);
}

function stringifyFields(obj) {
    if (obj === true) return "";
    
    const parts = [];
    for (const [key, value] of Object.entries(obj)) {
        if (value === true) {
            parts.push(key);
        } else {
            const sub = stringifyFields(value);
            if (sub) {
                parts.push(`${key}(${sub})`);
            } else {
                parts.push(key);
            }
        }
    }
    return parts.join(",");
}

function clearResourceList() {
    $('#selectresourcediv').hide();
    $('#selectresource').empty();
    clearMethodList();
}

function clearMethodList() {
    $('#selectmethoddiv').hide();
    $('#selectmethod').empty();
    $('#fields').hide();
    $('#fieldsexp').hide();
    $('#checkcontrol').hide();
    $('#tree').hide();
    $('#fieldvalue').val("");
    $('#status').text("");
    $('#documenturl').removeAttr('href');
}

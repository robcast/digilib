var Debug = null;
var _now = {};

function element(name, content) {
	var E = document.createElement(name);
	if (content) {
		if (content.nodeType) // it's a node
			E.appendChild(content)
		else // it's text
			E.appendChild(document.createTextNode(content))
		};
	return E;
	}
	
function appendElement(node, name, content) {
	if (node == null || ! node.appendChild)
        return node;
	return node.appendChild(element(name,content));
	}

function getDebug() {
	if (Debug == null) {
		Debug = document.getElementById('debug');
		if (Debug == null) {
			Debug = appendElement(document.body, 'div');
			Debug.setAttribute('class', 'debug');
			Debug.setAttribute('id', 'debug');
			Debug.innerhtml = '<h3>Debug</h3>';
			};
		};
	return Debug;
	}

function debug() {
	var D = getDebug();
	// return alertObject(D);
	var msg = "";
	for (var i = 0; i<arguments.length; i++) msg += arguments[i] + " ";
	return appendElement(D, "p", msg);
	}

function debugObject(obj, exclude) {
	if (exclude == null)
	    exclude = '';
	var noConst = exclude.indexOf('const') > -1;
	var A = new Array();
	for (var prop in obj) A.push(prop); 
	A.sort();
	var D = getDebug();
	var T = appendElement(D, "table");
	for (var i = 0; i < A.length; i++) {
		var key = A[i];
		var value = obj[key];
		var type = typeof(value);
		// exclude specified types
		if (exclude.indexOf(type) > -1)
			continue;
		// exclude uppercase-only properties (= constants)
		if (noConst && key.search(/^[A-Z0-9_]+$/) > -1)
			continue;
		var TR = appendElement(T, "tr");
		appendElement(TR, "td", element("b", key));
		appendElement(TR, "td", type); 
		appendElement(TR, "td", value + ""); 
		if (type == "function") 
			appendElement(TR, "td", value.toSource());
		};
	}

function strObject(obj) {
	var res = "";
	var A = new Array();
	try {
		for (var i in obj) A[i] = typeof(obj[i]);
		}
	catch(e) { typ = "unknown" };
    var count = 0;
	for (var item in A) {
		count++;
        typ = A[item];
		res += item + " (" + typ + "): ";
		if (typ != "function") res += obj[item];
		res += "\t";
        if (count % 4 == 0)
            res += "\n";
		}
	return res;
	}

function alertObject(obj) {
	return alert(strObject(obj));
	}

function alertHTML(obj) {
	if (obj)
        return alert(obj.tagName + ".innerHTML:\n" + obj.innerHTML);
	}

function serialize(xmlobject) {
	return (new XMLSerializer()).serializeToString(xmlobject);
	}
	
function startTime(s) {
	_now[s] = new Date();
	}
	
function elapsedTime(s) {
	var diff = new Date(new Date - _now[s]);
	debug(s + ": " + diff.getSeconds() + "." + diff.getMilliseconds() + " sec.");
	}


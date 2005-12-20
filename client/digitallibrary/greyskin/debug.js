var Debug;
var _now = {};

function newElement(tagname, content) {
	// creates a new element, adding node or text content if given
	var elem = document.createElement(tagname);
	if (content) elem.appendChild(content.nodeType
		? content // content is a node
		: document.createTextNode(content) // content is a string
		);
	return elem;
	}
	
function appendNewElement(node, tagname, content) {
	// appends a new element to "node", adding content if given
	if (!node.appendChild) {
		alert("Could not append: " + typeof(node));
		return null;
		}
	return node.appendChild(newElement(tagname, content));
	}

function getDebug() {
	if (Debug == null) {
		Debug = document.getElementById('debug');
		if (Debug == null) {
			if (!document.body) return null;
			// its still too early!
			Debug = appendNewElement(document.body, 'div');
			Debug.setAttribute('id', 'debug');
			Debug.className = 'debug';
			Debug.innerhtml = '<p class="debug">Debug</p>';
			};
		};
	return Debug;
	}

function debug() {
	var msg = "";
	for (var i = 0; i<arguments.length; i++)
		msg += arguments[i] + " ";
	var D = getDebug();
	if (!D) {
		alert("Debug div not present!\n" + msg);
		return null;
		}
	return appendNewElement(D, "p", msg);
	}

function debugProps(obj, msg) {
	var D = getDebug();
	if (msg) appendNewElement(D, "h1", msg);
	for (var item in obj) {
		var typ = typeof(obj[item]);
		if (typ != "function") appendNewElement(D, "p",
			item 
			+ " (" + typ + "): "
			+ obj[item]
			);
		};
	}

function debugObject(obj, msg) {
	if (msg) appendNewElement(D, "h1", msg);
	var D = getDebug();
	var A = new Array();
	for (var i in obj) A[i] = typeof(obj[i]); 
	var T = appendNewElement(D, "table");
	for (var item in A) {
		var TR = appendNewElement(T, "tr");
		appendNewElement(TR, "td", newElement("b", item));
		appendNewElement(TR, "td", A[item]); 
		if (A[item] == "function") 
			appendNewElement(TR, "td", A[item].toSource());
		};
	}

function strObject(obj) {
	var res = "";
	var A = new Array();
	for (var i in obj) A[i] = typeof(obj[i]); 
	for (var item in A) {
		typ = A[item];
		res += item + " (" + typ + "): ";
		if (typ != "function") res += obj[item];
		res += "\n";
		}
	return res;
	}

function alertObject(obj) {
	return alert(strObject(obj));
	}

function startTime(s) {
	_now[s] = new Date();
	}
	
function elapsedTime(s) {
	var diff = new Date(new Date - _now[s]);
	debug(s + ": " + diff.getSeconds() + "." + diff.getMilliseconds() + " sec.");
	}

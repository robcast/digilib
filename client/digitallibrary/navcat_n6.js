// these two global variables have to be initialised before the frist use of the functions below
// to fill in the attributes you can use the function initPicture provided below
// - array with all attributes
var att = new Array();

// - variable to store the path to the frame, in which the pictures should be created
var whichFrame = parent.mainFrame;

// give a name to the window containing digicat - this way one can test if there is already a
// digicat-window open and replace the contents of it (ex. digilib)
window.name = "digicat";

function loadThumbTable() {
	tableWidth = whichFrame.innerWidth-30;
	tableHeight = whichFrame.innerHeight-30;

	cellWidth = Math.floor(tableWidth/att[3])-6;
	cellHeight = Math.floor(tableHeight/att[2])-4;
	
//	alert(tableWidth + "   " + tableHeight + "\n" + cellWidth + "   " +cellHeight);

	whichFrame.document.open();
	whichFrame.document.write('<html><head>');
	whichFrame.document.write('<style type="text/css">.myFont {font-family: sans-serif, Arial; font-size: 11px; color: #FFFFFF}</style>');
	whichFrame.document.write('<script language="Javascript">');
	whichFrame.document.write('function loadDigilib(idx) {');
	whichFrame.document.write('linkRef = "http://' + location.host + '/docuserver/digitallibrary/digilib.html?' + parent.att[0] + '+" + idx;');
	whichFrame.document.write('win = window.open(linkRef, "digilib");');
	whichFrame.document.write('win.focus();');	
	whichFrame.document.write('}');	
	whichFrame.document.write('</script>');	


	whichFrame.document.write('</head><body bgcolor="#666666">');
	whichFrame.document.write('<table border="1" width="' + tableWidth + '" height="' + tableHeight + '">');
	for (i = 0; i < att[2]; i++) {
		whichFrame.document.write('<tr>');
		for (j = 0; j < att[3]; j++) {
			indexNr = parseInt(att[1])+i*parseInt(att[3])+j;
			thumb  = "http://" + location.host + "/docuserver/digitallibrary/servlet/Scaler/"
			thumb += att[0] + "?" + "pn=" + indexNr + "&ws=1.0&mo=fit&dw=" + cellWidth + "&dh=" + (cellHeight-25);
			whichFrame.document.write('<td align="center" valign="middle" width="' + cellWidth + '" height="' + cellHeight + '" class="myFont">');
			whichFrame.document.write('<a href="javascript:loadDigilib(' + indexNr + ')">');
			whichFrame.document.write('<img src="' + thumb + '" border="0">');
			whichFrame.document.write('</a><br>');
			whichFrame.document.write(indexNr + '</td>');
		}
		whichFrame.document.write('</tr>');
	}
	whichFrame.document.write('</table></body></html>');
	whichFrame.document.close();

	initScripts();
}


function Backpage() {

	if (att[1] <= 1) {
		att[1] = 1;
        alert("You are already on the first page!");
	}
	
    att[1] = parseInt(att[1])-parseInt(att[2]*att[3]);

    if (att[1] < 1) {
    	att[1] = 1;
    }
	loadThumbTable();
}



function Nextpage() {

    att[1] = parseInt(att[1])+parseInt(att[2]*att[3]);
	loadThumbTable();
}


// capturing keypresses for next and previous page
// ascii-values of n = 110, b = 98
function parseKeypress (event) {
	if (event.charCode == 110) {
		Nextpage();
	}
	if (event.charCode == 98) {
		Backpage();
	}
}


// initialize browser specific things (keypress caputring)
function initScripts() {
	for (var f = 0; f < frames.length; f++) {
		frames[f].document.addEventListener('keypress', parseKeypress, true);
	}
	whichFrame.focus();
}


// fill in the values of the "att"-array
function initPicture(picURL) {
	att = picURL.split("+");

	if (att[0].lastIndexOf("/") == att[0].length-1) {
		att[0] = att[0].substring(0, att[0].length-1);
	}
	
	if (att.length < 2 || att[1] == "") {
		att[1] = 1;
	}

	if (att.length < 3 || att[2] == "") {
		att[2] = 3;
	}

	if (att.length < 4) {
		att[3] = 4;
	}
}

<%
// checking if the height and width of this client is already known
if ((request.getParameter("dw") == null) || (request.getParameter("dh") == null)) {
%>

<html>
<head>
<script language="Javascript">

function redirect() {

	if (navigator.appName.toLowerCase() == "netscape") {	// mozilla-browsers (netscape 4.xx, netscape 6.xx, etc.)
		client = "&dw=" + (innerWidth-30) + "&dh=" + (innerHeight-30);
	} else {												// ie
		client = "&dw=" + (document.body.clientWidth-30) + "&dh=" + (document.body.clientHeight-30);
	}

	location.replace("dlImage.jsp?<%= request.getQueryString() %>" + client);
}

</script>
</head>
<body bgcolor="#666666" onload="redirect()">
</body>
</html>

<%
} else {

digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest();
// default values for parameters
dlRequest.setFn("/");					// url of the page/document
dlRequest.setPn(1);					// page number
dlRequest.setWs(1);					// scale factor
dlRequest.setMo("");					// special options like 'fit' for gifs
dlRequest.setMk("0/0");					// marks
dlRequest.setWx(0);					// left edge of image (float from 0 to 1)
dlRequest.setWy(0);					// top edge in image (float from 0 to 1)
dlRequest.setWw(1);					// width of image (float from 0 to 1)
dlRequest.setWh(1);					// height of image (float from 0 to 1)
// overrriding default parameters with provided parameters from query-string
dlRequest.setWithRequest(request);

//String imageLocation = "http://" + request.getServerName() + "/docuserver/digitallibrary/servlet/Scaler/" + fn + "?pn=" + pn + "&ws=" + ws + "&mo=" + mo + "&wx=" + wx + "&wy=" + wy + "&ww=" + ww + "&wh=" + wh + "&dw=" + dw + "&dh=" + dh;

String baseUrl = dlRequest.getBaseURL();

String imageLocation = dlRequest.getBaseURL() + "/servlet/Scaler/?" + dlRequest.getAsString();
%>

<html>
<head>
<script language="JavaScript">

var baseUrl = "<%= dlRequest.getBaseURL() %>";

// browser version test to include the corresponding navigation-file
if (navigator.userAgent.toLowerCase().indexOf("opera") > -1) {
	document.write('<script src="navigation_o6.js"><\/script>');
} else if (navigator.userAgent.toLowerCase().indexOf("msie") > -1) {
	document.write('<script src="navigation_ie.js"><\/script>');
} else if (navigator.userAgent.toLowerCase().indexOf("mozilla\/4") > -1) {
	document.write('<script src="navigation_n4.js"><\/script>');
} else if (navigator.userAgent.toLowerCase().indexOf("mozilla\/5") > -1) {
	document.write('<script src="navigation_n6.js"><\/script>');
} else {
	alert('Your browser is not directly supported by this client right now.\n\nLoading now the optimised version for Netscape 6, that sticks the most to the w3c specifications.');
	document.write('<script src="navigation_n6.js"><\/script>');
}

// add module to show the total number of pages (not browser dependant!)
document.write('<script src="modules\/pagesTotal.js"><\/script>');
// document.write('<script src="modules\/pdfMaker.js"><\/script>');

</script>
</head>
<body bgcolor="#666666" onload='init_pagesTotal("<%= dlRequest.getFn() %>", "<%= dlRequest.getPn() %>", "<%= dlRequest.getWs() %>", "<%= dlRequest.getMo() %>", "<%= dlRequest.getMk() %>", "<%= dlRequest.getWx() %>", "<%= dlRequest.getWy() %>", "<%= dlRequest.getWw() %>", "<%= dlRequest.getWh() %>", "<%= dlRequest.getPt() %>")'>

<div id="lay1" style="position: absolute; left: 10px; top: 10px; visibility: visible"><img name="pic" src="<%= imageLocation %>" border="0"></div>

<div id="dot0" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark1.gif" border="0"></div>
<div id="dot1" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark2.gif" border="0"></div>
<div id="dot2" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark3.gif" border="0"></div>
<div id="dot3" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark4.gif" border="0"></div>
<div id="dot4" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark5.gif" border="0"></div>
<div id="dot5" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark6.gif" border="0"></div>
<div id="dot6" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark7.gif" border="0"></div>
<div id="dot7" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="mark8.gif" border="0"></div>
<div id="eck1" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="olinks.gif" border="0"></div>
<div id="eck2" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="orechts.gif" border="0"></div>
<div id="eck3" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="ulinks.gif" border="0"></div>
<div id="eck4" style="position: absolute; left: -20; top: 100; visibility: hidden"><img src="urechts.gif" border="0"></div>
</body>
</html>
<%
}
%>

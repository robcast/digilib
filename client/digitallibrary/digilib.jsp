<html>
<title>Digital Document Library</title>
<head>
<jsp:useBean id="DB" scope="page" class="digilib.servlet.DocumentBean" />

<%
// set servlet init-parameter
DB.setConfig(getServletConfig());
// check if authentication is needed and redirect if necessary
DB.doAuthentication(request, response);
%>

<script language="JavaScript">

// the document's query string (minus "?")
var query = location.search.substring(1);

// feel free to uncomment - i have never seen a problem so...
// // DEBUG 
// alert('DIR: <%= DB.getDocuPath(request) %> PAGES: <%= DB.getNumPages(request) %>');

// number of pages of the document
var numPages = <%= DB.getNumPages(request) %>;

// browser version test to include the corresponding navigation-file
if ((navigator.appName.toLowerCase() == "netscape") && (parseFloat(navigator.appVersion) < 5.0)) {
	top.document.write('<script src="navigation_n4.js"><\/script>');
} else if (navigator.appName.toLowerCase() == "netscape") {
	top.document.write('<script src="navigation_n6.js"><\/script>');
} else if ((navigator.appName.toLowerCase() == "microsoft internet explorer") && (parseFloat(navigator.appVersion) >= 4.0)) {
	top.document.write('<script src="navigation11_ie.js"><\/script>');
} else {
	alert('Your browser is not directly supported by this client right now.\n\nLoading now the optimised version for Netscape 6, that sticks the most to the w3c specifications.');
	top.document.write('<script src="navigation_n6.js"><\/script>');
}

</script>

</head>

<frameset cols="*,90" border="0" onLoad="whichFrame = parent.mainFrame; initPicture(query); loadPicture(2); initScripts();">
  <frame name="mainFrame" src="about:blank" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="about:blank" scrolling="no" noresize>
    <frame name="rightFrame" src="navigation.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>

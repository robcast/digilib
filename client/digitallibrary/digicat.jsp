<%@ page language="java" %>

<%!
// authentication stuff - robert
// -----------------------------
// create DocumentBean instance for all JSP requests
digilib.servlet.DocumentBean docBean = new digilib.servlet.DocumentBean();

// initialize DocumentBean instance in JSP init
public void jspInit() {
    try {
        // set servlet init-parameter
        docBean.setConfig(getServletConfig());
    } catch (javax.servlet.ServletException e) {
        System.out.println(e);
    }
}
%>

<%
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(request, response);

// set up request object for base URL
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest();
dlRequest.setBaseURL(request);

%>

<html>
<head>

<script language="JavaScript">

var baseUrl = "<%= dlRequest.getBaseURL() %>";

// DEBUG
//alert('DIR: <%= docBean.getDocuPath(request) %> PAGES: <%= docBean.getNumPages(request) %>');

// the document's query string (minus "?")
var query = location.search.substring(1);

// first page number
var firstPage = <%= docBean.getFirstPage(request) %>;

// number of pages of the document
var numPages = <%= docBean.getNumPages(request) %>;

    // browser version test to include the corresponding navigation-file
    if ((navigator.appName.toLowerCase() == "netscape") && (parseFloat(navigator.appVersion) < 5.0)) {
        top.document.write('<script src="navcat_n4.js"><\/script>');
    } else if (navigator.appName.toLowerCase() == "netscape") {
        top.document.write('<script src="navcat_n6.js"><\/script>');
    } else if ((navigator.appName.toLowerCase() == "microsoft internet explorer") && (parseFloat(navigator.appVersion) >= 4.0)) {
    	top.document.write('<script src="navcat_ie.js"><\/script>');
    } else {
        alert('Your browser is not directly supported by this client right now.\n\nLoading now the optimised version for Netscape 6, that sticks the most to the w3c specifications.');
        top.document.write('<script src="navcat_n6.js"><\/script>');
    }   

</script>

</head>

<frameset cols="*,90" boder="no" border="0" onLoad="whichFrame = parent.mainFrame; initPicture(query); loadThumbTable(); initScripts();">
  <frame name="mainFrame" src="about:blank">
  <frame name="rightFrame" src="navcat.html" scrolling="no" noresize>
</frameset>

</html>

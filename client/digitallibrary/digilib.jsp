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

// parsing the query
// -----------------

digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest();
// fill the request with the old format query string
dlRequest.setWithOldString(request.getQueryString());
// add number of pages
dlRequest.setPt(docBean.getNumPages(request));
// retrieve request in new paramter format 
String query = "dlImage.jsp?" + dlRequest.getAsString();
%>

<html>
<head>
<title>Digital Document Library</title>
</head>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="<%= query %>" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="about:blank" scrolling="no" noresize>
    <frame name="rightFrame" src="dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>
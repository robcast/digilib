<%@ page language="java" %><%!
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
%><%

// parsing the query
// -----------------

digilib.servlet.DigilibRequest dcRequest = new digilib.servlet.DigilibRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dcRequest, response);

// set number of pages  
dcRequest.setValue("pt", docBean.getNumPages(dcRequest));
String baseUrl = dcRequest.getAsString("base.url");
%>
<html>
<head>
<title>Digital Document Library - Digicat</title>
</head>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="oldskin/dcMain.jsp?<%= dcRequest.getAsString() %>" scrolling="auto">
  <frame name="rightFrame" src="oldskin/dcMenu.html" scrolling="no" noresize>
</frameset>

</html>

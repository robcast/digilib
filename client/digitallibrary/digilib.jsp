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

// parsing the query
// -----------------

digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dlRequest, response);
    
String digiURL = "digimage.jsp?" + dlRequest.getAsString();

%><html>
<head>
<title>Digital Document Library (L2)</title>
</head>

<frameset cols="*,90" border="0" onload="pageFrame.show()">
  <frame name="mainFrame" src="<%= digiURL %>" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="oldskin/pageWin.html" scrolling="no" noresize>
    <frame name="rightFrame" src="oldskin/dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>

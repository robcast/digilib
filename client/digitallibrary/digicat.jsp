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

digilib.servlet.DigilibRequest dcRequest = new digilib.servlet.DigilibRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dcRequest, response);

%>


<%

// the different levels of presentation
// ------------------------------------


// level 3 representation hack - lugi
      // it would be much more interesting to check
      // if the sidebar is actually installed and in
      // the case it isn't - automatically do it.
      // however this requires client-side tests and
      // so slows down everything.
      // we might want to talk about it for a future
      // release

if (dcRequest.getAsInt("lv") == 3) {
  String userAgent = request.getHeader("User-Agent").toLowerCase();
  
  if (userAgent.indexOf("mozilla/5.0") == 0) {

    // mozilla 5 that does not support xul-sidebars
    if (userAgent.indexOf("opera")     > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("chimera")   > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("camino")    > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("konqueror") > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("safari")    > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("galeon")    > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("skipstone") > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("k-meleon")  > -1) dcRequest.setValue("lv", 2);
    if (userAgent.indexOf("firefox")   > -1) dcRequest.setValue("lv", 2);

    // the chance is quite big, that the browser supports xul-sidebars
    dcRequest.setValue("lv", 1);
  
  } else {

    // redirect to level 2 because of definitive lack of sidebar support
    dcRequest.setValue("lv", 2);
  }
}



switch (dcRequest.getAsInt("lv")) {

  // LEVEL 0 --------------------------------------------------------------

  case 0:
%>

<%
    break; // level 0




  // LEVEL 1 --------------------------------------------------------------

  case 1:

    // set number of pages  
    dcRequest.setValue("pt", docBean.getNumPages(dcRequest));
%>
<html>
<head>

<style type="text/css">
td {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  color: #FFFFFF;
  text-align: center;
  vertical-align: middle;
}
</style>

<script src="navcat.js" type="text/javascript"></script>
<script type="text/javascript">

var baseUrl = "<%= dcRequest.getAsString("base.url") %>";

newParameter('fn', '<%= dcRequest.getFilePath() %>', '', 1);
newParameter('pn', '<%= dcRequest.getAsString("pn") %>', '1', 1);
newParameter('pt', '<%= dcRequest.getAsString("pt") %>', '<%= dcRequest.getAsString("pt") %>', 9);

newParameter('mo', '<%= dcRequest.getAsString("mo") %>', '6x4', 1);

newParameter('dw', '<%= dcRequest.getAsString("dw") %>', '0', 1);
newParameter('dh', '<%= dcRequest.getAsString("dh") %>', '0', 1);

</script>

</head>

<body bgcolor="#666666">

<div align="center">
<script type="text/javascript">
  init();
</script>
</div>

</body>

</html>
<%
    break; // level 1




  // LEVEL 2 --------------------------------------------------------------

  case 2:
%>

<%
    // retrieve request in new paramter format and redirect to level 1
    dcRequest.setValue("lv", 1);
    String query = "digicat.jsp?" + dcRequest.getAsString();
%>

<html>
<head>
<title>Digital Document Library - Alcatraz (Level 2)</title>
</head>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="<%= query %>" scrolling="auto">
  <frame name="rightFrame" src="dcMenu.html" scrolling="no" noresize>
</frameset>

</html>

<%
    break; // level 2

} // end switch

%>

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

digilib.servlet.DigilibServletRequest dcRequest = new digilib.servlet.DigilibServletRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dcRequest, response);
// set number of pages  
dcRequest.setValue("pt", docBean.getNumPages(dcRequest));
// chop off /oldskin -- ugly ;-(
String baseUrl = dcRequest.getAsString("base.url");
int p = baseUrl.lastIndexOf("/oldskin");
if (p > 0) {
   baseUrl = baseUrl.substring(0, p);
}
%>
<html>
<head>
<script type="text/javascript" src="../baselib.js"></script>
<script type="text/javascript" src="dclib.js"></script>
<script type="text/javascript">
base_init();
var baseUrl = "<%= baseUrl %>";
newParameter('fn', '', 1);
newParameter('pn', 1, 1);
newParameter('pt', 9, 9);
newParameter('mx', '6x4', 1);
newParameter('mo', '', 1);
newParameter('dw', 0, 1);
newParameter('dh', 0, 1);
dc_init();
</script>

<style type="text/css">
td {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  color: #FFFFFF;
  text-align: center;
  vertical-align: middle;
}
.number {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  color: #FFFFFF;
  padding-top: 2px;
}
.nonumber {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11px;
  color: #000000;
  padding-top: 2px;
}
</style>
</head>

<body bgcolor="#666666">

<div align="center">
<script type="text/javascript">
  dc_render(document);
</script>
</div>

</body>

</html>

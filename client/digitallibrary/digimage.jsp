<%@ page language="java" %><%!
// -- JSP init -------------

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
// -- end of JSP init -------------
%><%
// -- JSP request -------------

// parsing the query
// -----------------
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
docBean.setRequest(dlRequest);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(response);
// add number of pages
dlRequest.setValue("pt", docBean.getNumPages());
// store objects for jsp:include
pageContext.setAttribute("docBean", docBean, pageContext.REQUEST_SCOPE);
%><html>
<head>
    <title>Digital Document Library (L1)</title>
    <script type="text/javascript" src="baselib.js"></script>
    <script type="text/javascript" src="dllib.js"></script>
<script type="text/javascript">
  var dlTarget = window.name;
  var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
  var toolbarEnabledURL = window.location.href;
  newParameter('fn', '', 1);
  newParameter('pn', '1', 1);
  newParameter('ws', '1.0', 1);
  newParameter('mo', '', 1);
  newParameter('mk', '', 3);
  newParameter('wx', '0.0', 2);
  newParameter('wy', '0.0', 2);
  newParameter('ww', '1.0', 2);
  newParameter('wh', '1.0', 2);
  newParameter('pt', '<%= dlRequest.getAsString("pt") %>', 1);
  newParameter('brgt', '0.0', 1);
  newParameter('cont', '0.0', 1);
  newParameter('rot', '0.0', 1);
  newParameter('rgba', '', 1);
  newParameter('rgbm', '', 1);
  newParameter('ddpix', '', 9);
  newParameter('ddpiy', '', 9);
  document.id='digilib';
  dl_param_init();
</script>
</head>
<body bgcolor="#666666" onload="dl_init();">
<% if (dlRequest.hasOption("clop", "noarrows")) {
%><jsp:include page="digimage_img_inc.jsp" /><%
} else {
%><jsp:include page="digimage_tbl_inc.jsp" /><%
}
%>

 <div id="dot0" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark1.gif" border="0"></div>
 <div id="dot1" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark2.gif" border="0"></div>
 <div id="dot2" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark3.gif" border="0"></div>
 <div id="dot3" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark4.gif" border="0"></div>
 <div id="dot4" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark5.gif" border="0"></div>
 <div id="dot5" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark6.gif" border="0"></div>
 <div id="dot6" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark7.gif" border="0"></div>
 <div id="dot7" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="mark8.gif" border="0"></div>
 <div id="eck1" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="olinks.gif" border="0"></div>
 <div id="eck2" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="orechts.gif" border="0"></div>
 <div id="eck3" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="ulinks.gif" border="0"></div>
 <div id="eck4" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="urechts.gif" border="0"></div>

</body>

</html>

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
  base_init();
  var dlTarget = window.name;
  var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
  var toolbarEnabledURL = window.location.href;
  newParameter('fn', '', 1);
  newParameter('pn', '1', 1);
  newParameter('ws', '1.0', 2);
  newParameter('mo', '', 2);
  newParameter('wx', '0.0', 4);
  newParameter('wy', '0.0', 4);
  newParameter('ww', '1.0', 4);
  newParameter('wh', '1.0', 4);
  newParameter('brgt', '0.0', 4);
  newParameter('cont', '0.0', 4);
  newParameter('rot', '0.0', 4);
  newParameter('rgba', '', 4);
  newParameter('rgbm', '', 4);
  newParameter('ddpi', '', 8);
  newParameter('ddpix', '', 8);
  newParameter('ddpiy', '', 8);
  newParameter('mk', '', 16);
  newParameter('pt', '0', 32);
  setParameter('pt', '<%= dlRequest.getAsString("pt") %>');
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

 <div id="dot0" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark1.gif" border="0"></div>
 <div id="dot1" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark2.gif" border="0"></div>
 <div id="dot2" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark3.gif" border="0"></div>
 <div id="dot3" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark4.gif" border="0"></div>
 <div id="dot4" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark5.gif" border="0"></div>
 <div id="dot5" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark6.gif" border="0"></div>
 <div id="dot6" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark7.gif" border="0"></div>
 <div id="dot7" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/mark8.gif" border="0"></div>
 <div id="eck1" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/olinks.gif" border="0"></div>
 <div id="eck2" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/orechts.gif" border="0"></div>
 <div id="eck3" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/ulinks.gif" border="0"></div>
 <div id="eck4" style="position:absolute; left:-20; top:100; visibility:hidden"><img src="img/urechts.gif" border="0"></div>

</body>

</html>
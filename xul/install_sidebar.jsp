<%@page contentType="text/html" import="java.util.*"%>  
<%
    String serverName = request.getServerName();
    int serverPort = request.getServerPort();
    String serverPATH = request.getRequestURI();
    int lastSlash = serverPATH.lastIndexOf("/");
    serverPATH=serverPATH.substring(0, lastSlash);
%>
<html>
<head>
<title>Alcatraz-XUL-Sidebars</title>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">

<script language="JavaScript">
<!-- simple one-line side-bar-installer , addPanel("title in sidebar","url","url to customize tab. is optional")


// deluxe sidebar installer with browser testing 

 function addSidebarPanel(name, url) {
 	if ((typeof window.sidebar == "object") && (typeof window.sidebar.addPanel == "function")) 
	{ 
		window.sidebar.addPanel (name,url,""); 
	} 
	else 
	{ 
		alert ("To use this functionality a Netscape 6+ or Mozilla browser is needed !"); 
	}
 } 
-->
</script>


</head>

<body bgcolor="#FFFFFF" text="#000000">
<div align=center>

<br> <br>

<h3>Alcatraz-XUL-Sidebars</h3>
<!-- installing tab into sidebar with javascript inside form-->

  Digilib-Buttons im Sidebar
  <br>
  <input type="submit" name="Abschicken" value="Install Button-List into Sidebar!" onClick="javascript:sidebar.addPanel('DIGILIB-Buttons', 'http://<%=serverName%>:<%=serverPort%><%=serverPATH%>/buttons.xul','');">
  <br><br>

</div>
</body>

</html>

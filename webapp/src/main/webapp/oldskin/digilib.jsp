<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2001 - 2013 WTWG Uni Bern, MPIWG Berlin
  %%
  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as 
  published by the Free Software Foundation, either version 3 of the 
  License, or (at your option) any later version.
  
  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Lesser Public License for more details.
  
  You should have received a copy of the GNU General Lesser Public 
  License along with this program.  If not, see
  <http://www.gnu.org/licenses/lgpl-3.0.html>.
  #L%
  Authors:
    Christian Luginbuehl,
    Robert Casties
  --%><%@ page language="java" %><%!
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

digilib.servlet.DigilibServletRequest dlRequest = new digilib.servlet.DigilibServletRequest(request);
// check if authentication is needed and redirect if necessary
docBean.doAuthentication(dlRequest, response);
    
String digiURL = "digimage.jsp?" + dlRequest.getAsString();

%><html>
<head>
<title>Digital Document Library</title>
</head>
<frameset cols="*,90" border="0" onload="pageFrame.show()">
  <frame name="mainFrame" src="<%= digiURL %>" scrolling="auto">
  <frameset rows="25,*" border="0">
    <frame name="pageFrame" src="pageWin.html" scrolling="no" noresize>
    <frame name="rightFrame" src="dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>

<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2001 - 2013 IT-Group MPIWG, WTWG Uni Bern and others
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

digilib.conf.DigilibServletRequest dcRequest = new digilib.conf.DigilibServletRequest(request);
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
  <frame name="mainFrame" src="dcMain.jsp?<%= dcRequest.getAsString() %>" scrolling="auto">
  <frame name="rightFrame" src="dcMenu.html" scrolling="no" noresize>
</frameset>

</html>

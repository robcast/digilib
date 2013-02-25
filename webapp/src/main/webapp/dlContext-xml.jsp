<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2004 - 2013 MPIWG Berlin
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
  Author: Robert Casties (robcast@berlios.de)
  --%><%@ page language="java" %><%!
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
%><?xml version="1.0" encoding="UTF-8" ?>
<%
// process request
// get digilib config
digilib.servlet.DigilibConfiguration dlConfig = docBean.getDlConfig();
// parsing the query
digilib.servlet.DigilibServletRequest dlRequest = new digilib.servlet.DigilibServletRequest(request);
// dir cache
digilib.io.DocuDirCache dirCache = (digilib.io.DocuDirCache) dlConfig.getValue("servlet.dir.cache");

%><!-- Automatically generated XML snippet with document context -->
<result>
<%
int pn = dlRequest.getAsInt("pn");
String fn = dlRequest.getFilePath();
String ctx = "";
digilib.io.DocuDirent f = dirCache.getFile(fn, pn, digilib.io.FileOps.FileClass.IMAGE);
if (f != null) {
    //ctx = "hasfile:"+f.getName();
    f.checkMeta();
    java.util.HashMap meta = f.getFileMeta();
    if (meta != null) {
	//ctx = "JSP:hasmeta!";
	if (meta.containsKey("context")) {
	    ctx = (String) meta.get("context");
	}
    }
}
%><%= ctx %>
</result>

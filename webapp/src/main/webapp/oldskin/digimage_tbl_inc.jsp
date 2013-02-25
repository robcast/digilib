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
  --%><%@ page language="java" %><%
// retrieve objects from context
digilib.servlet.DocumentBean docBean = (digilib.servlet.DocumentBean) pageContext.getAttribute("docBean", PageContext.REQUEST_SCOPE);
digilib.servlet.DigilibServletRequest dlRequest = docBean.getRequest();
String ua = request.getHeader("User-Agent");
boolean isN4 = ((ua.indexOf("Mozilla/4.") > -1)&&(ua.indexOf("MSIE") == -1));
%>
<table border="0"  cellpadding="0" cellspacing="0">
  <tr>
    <td></td>
    <td align="center"><%
      if (docBean.canMoveUp()) {
        %><a href="javascript:moveBy(0, -0.5)"><img src="img/up.gif" border="0" /></a><%
      }
      %></td>
      <td></td>
  </tr>
  <tr>
    <td valign="center"><%
      if (docBean.canMoveLeft()) {
        %><a href="javascript:moveBy(-0.5, 0)"><img src="img/left.gif" border="0" /></a><%
      }
      %></td>
	  <td>
<%
	  if(isN4) {
	      %><ilayer name="scaler"><%
		  } else {
	      %><div id="scaler" style="visibility:visible"><%
		  }
%>
<script type="text/javascript">
var ps = bestPicSize(getElement('scaler'), 10);
document.write('<img id="pic" src="<%=
  dlRequest.getAsString("base.url") + "/servlet/Scaler?" + dlRequest.getAsString('s')
%>&dw='+ps.width+'&dh='+ps.height+'" />');
</script>
<% 
    if(isN4) {
	%></ilayer><%
	    } else {
	%></div><%
	    }
%>
    </td>
    <td valign="center"><%
      if (docBean.canMoveRight()) {
        %><a href="javascript:moveBy(0.5, 0)"><img src="img/right.gif" border="0" /></a><%
      }
      %></td>
  </tr>
  <tr>
    <td></td>
    <td align="center"><%
      if (docBean.canMoveDown()) {
        %><a href="javascript:moveBy(0, 0.5)"><img src="img/down.gif" border="0" /></a><%
      }
      %></td>
    <td></td>
  </tr>
</table>

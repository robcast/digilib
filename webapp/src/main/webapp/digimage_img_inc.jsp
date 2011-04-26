<%@ page language="java" %><%
// retrieve objects from context
digilib.servlet.DocumentBean docBean = (digilib.servlet.DocumentBean) pageContext.getAttribute("docBean", pageContext.REQUEST_SCOPE);
digilib.servlet.DigilibServletRequest dlRequest = docBean.getRequest();
String ua = request.getHeader("User-Agent");
boolean isN4 = ((ua.indexOf("Mozilla/4.") > -1)&&(ua.indexOf("MSIE") == -1));
%>
<%
    if (isN4) {
%><ilayer name="scaler"><%
	    } else {
%><div id="scaler"><%
	    }
%>
<script type="text/javascript">
var ps = bestPicSize(getElement('scaler'), 10);
document.write('<img id="pic" src="<%= dlRequest.getAsString("base.url") + "/servlet/Scaler?" + dlRequest.getAsString('s') %>&dw='+ps.width+'&dh='+ps.height+'" />');
</script>
<%   
    if (isN4) {
%></ilayer><%
	    } else {
%></div><%
	    }
%>

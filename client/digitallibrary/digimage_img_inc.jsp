<%@ page language="java" %><%
// retrieve objects from context
digilib.servlet.DocumentBean docBean = (digilib.servlet.DocumentBean) pageContext.getAttribute("docBean", pageContext.REQUEST_SCOPE);
digilib.servlet.DigilibRequest dlRequest = docBean.getRequest();
%>
<div id="scaler" style="position:absolute; left:10px; top:10px; visibility:visible">
<script type="text/javascript">
var ps = bestPicSize(getElement('scaler'), 10);
document.write('<img id="pic" src="<%=
  dlRequest.getAsString("base.url") + "/servlet/Scaler?" + dlRequest.getAsString()
%>&dw='+ps.width+'&dh='+ps.height+'" />');
</script>
</div>

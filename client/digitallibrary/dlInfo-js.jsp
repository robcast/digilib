<%@ page language="java" %>
<%!
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
digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
docBean.setRequest(dlRequest);
%>
// Automatically generated JavaScript snippet with parameters
<%
    Object[] keys = dlRequest.keySet().toArray();
    java.util.Arrays.sort(keys);
    int l = keys.length;
    for (int i = 0; i < l; i++) {
	String key = (String) keys[i];
	String val = dlRequest.getAsString(key);
	if (val.length() == 0) {
	    val = "";
	}
	%>var dl_<%= key %> = "<%= val %>";
<%
       }
%>

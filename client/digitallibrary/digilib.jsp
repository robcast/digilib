<%@ page language="java" import="java.util.*" %>

<html>
<head>
<title>Digital Document Library</title>
</head>

<jsp:useBean id="DB" scope="page" class="digilib.servlet.DocumentBean" />

<%
// authentication stuff - robert
// -----------------------------

// set servlet init-parameter
DB.setConfig(getServletConfig());
// check if authentication is needed and redirect if necessary
DB.doAuthentication(request, response);


// parsing the query
// -----------------

String query = "";

if (request.getQueryString() != null) {
	StringTokenizer tokenizer = new StringTokenizer(request.getQueryString(), "+");

	int numTokens = tokenizer.countTokens(); 

	if (numTokens >= 1) query += "fn=" + tokenizer.nextToken();
	if (numTokens >= 2) query += "&pn=" + tokenizer.nextToken();
	if (numTokens >= 3) query += "&ws=" + tokenizer.nextToken();
	if (numTokens >= 4) query += "&mo=" + tokenizer.nextToken();
	if (numTokens >= 5) query += "&mk=" + tokenizer.nextToken();
	if (numTokens >= 6) query += "&wx=" + tokenizer.nextToken();
	if (numTokens >= 7) query += "&wy=" + tokenizer.nextToken();
	if (numTokens >= 8) query += "&ww=" + tokenizer.nextToken();
	if (numTokens >= 9) query += "&wh=" + tokenizer.nextToken();

	// a module update for total number of pages
	query += "&pt=" + DB.getNumPages(request);
}
%>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="dlImage.jsp?<%= query %>" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="about:blank" scrolling="no" noresize>
    <frame name="rightFrame" src="dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>

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

String query = "dlImage.jsp?";
String token;

if (request.getQueryString() != null) {
	// have to enable the passing of delimiter to get empty parameters
	StringTokenizer tokenizer = new StringTokenizer(request.getQueryString(), "+", true);

	// looks ugly but it works - hopefully...
	
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "fn=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&pn=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&ws=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (!token.equals("+")) {
			query += "&mo=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (!token.equals("+")) {
			query += "&mk=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&wx=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&wy=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&ww=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}
	if (tokenizer.hasMoreTokens()) {
		token = tokenizer.nextToken();
		if (token != "+") {
			query += "&wh=" + token;
			if (tokenizer.hasMoreTokens()) tokenizer.nextToken();
		}
	}

	// a module update for total number of pages
	query += "&pt=" + DB.getNumPages(request);
}
%>

<frameset cols="*,90" border="0">
  <frame name="mainFrame" src="<%= query %>" scrolling="auto">
  <frameset rows="20,*" border="0">
    <frame name="pageFrame" src="about:blank" scrolling="no" noresize>
    <frame name="rightFrame" src="dlMenu.html" scrolling="no" noresize>
  </frameset>
</frameset>

</html>
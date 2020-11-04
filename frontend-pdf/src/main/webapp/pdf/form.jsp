<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2009 - 2013 MPIWG Berlin
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
  --%><%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%><html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<title>PDF Generator</title>
</head>
<body>
<h1>digilib PDF generator</h1>
<form action="../PDFGenerator" method="post">
<p>
  <label for="fn">document path (fn): </label>
  <input type="text" name="fn" id="fn" required>
</p>
<p>
  <label for="pgs">pages (pgs): </label>
  <input type="text" name="pgs" id="pgs" required>
</p>
<p>
  <label for="dw">pixel page width (dw): </label>
  <input type="text" name="dw" id="dw">
</p>
<p>
  <label for="dh">pixel page height (dh): </label>
  <input type="text" name="dh" id="dh">
</p>
<p>
  <label for="logo">header logo url (logo): </label>
  <input type="text" name="logo" id="logo">
</p>
<p>
  <label for="header-title">header title (header-title): </label>
  <input type="text" name="header-title" id="header-title">
</p>
<p>
  <label for="header-subtitle">header subtitle (header-subtitle): </label>
  <input type="text" name="header-subtitle" id="header-subtitle">
</p>
<p>
  <label for="reference">document reference (reference): </label>
  <input type="text" name="reference" id="reference">
</p>
<p>
  <label for="author">document author (author): </label>
  <input type="text" name="author" id="author">
</p>
<p>
  <label for="title">document title (title): </label>
  <input type="text" name="title" id="title">
</p>
<p>
  <label for="date">document date (date): </label>
  <input type="text" name="date" id="date">
</p>
<p>
  <label for="online-url">document online-url (online-url): </label>
  <input type="text" name="online-url" id="online-url">
</p>
<p>
  <input type="submit" value="Submit">
</p>
</form>
</body>
</html>

<%--
  #%L
  digilib-webapp
  %%
  Copyright (C) 2001 - 2019 digilib Community
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
  --%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2//EN">
<html>
<head>
<title>Digital Library Redirect</title>
</head>

<script LANGUAGE="JavaScript">

<!-- Beginning of JavaScript --------

//this.location = "http://"+location.host+"/docuserver/digitallibrary/digicat.jsp"+location.search;

this.location.replace(this.location.href.replace(/digicat\.jsp/, "oldskin/digicat.jsp"));

// -- End of JavaScript code -------------- -->
</script>

<body>
<h1>Digital Library Redirect</h1>

<p>You should automatically be redirected to the Digital Library page.
    (<tt>digicat.<b>jsp</b></tt>)</p>

<p>If this doesn't happen make sure JavaScript is enabled in your browser. 
    The Digital Library pages need JavaScript to work. If your problem still 
    remains, please contact the administrator.</p>

<hr>
<address>robcast@berlios.de</address>
</body> 
</html>

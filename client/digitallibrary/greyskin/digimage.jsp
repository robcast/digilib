<%@ page language="java" %><%!
	// -- JSP init -------------
	
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
	// -- end of JSP init -------------
%>

<%
	// -- JSP request -------------
	
	// parsing the query
	// -----------------
	digilib.servlet.DigilibRequest dlRequest = new digilib.servlet.DigilibRequest(request);
	docBean.setRequest(dlRequest);
	// check if authentication is needed and redirect if necessary
	docBean.doAuthentication(response);
	// add number of pages
	dlRequest.setValue("pt", docBean.getNumPages());
	// store objects for jsp:include
	pageContext.setAttribute("docBean", docBean, pageContext.REQUEST_SCOPE);
%>

<html>

<head>
	<title>Digital Document Library NG</title>
	
	<style type="text/css">

		body		{ background-color: #E0E0E0; color: black; font-size: 8pt }
		code		{ font-family: monospace; color: blue; }
		pre		{ color: #006060; }

		a.icon		{ margin: 0px; padding: 0px; }

		img.png 	{ border: none; }
		img.mark 	{ border: none; }

		div.button	{ margin: -4px; padding: 0px; }
		div.dot		{ position: absolute; left: -20; top: 100; visibility: hidden }		div#scaler-table { padding-right: 40px; }

		div#buttons	{ position: absolute; right: 10px; top: 10px; }
		
	</style>
	
	<script type="text/javascript" src="../baselib.js"></script>
	
	<script type="text/javascript" src="../dllib.js"></script>

	<script language="JavaScript">
		function highlightPNG(id, on) {
			var elem = document.getElementById(id);
			//var div  = elem.parentNode.parentNode;
			elem.style.backgroundImage = on 
				? "url('corona.png')"
				: null;
		}

		base_init();
		var dlTarget = window.name;
		var baseUrl = '<%= dlRequest.getAsString("base.url") %>';
		var toolbarEnabledURL = window.location.href;
		newParameter('fn', '', 1);
		newParameter('pn', '1', 1);
		newParameter('ws', '1.0', 1);
		newParameter('mo', '', 1);
		newParameter('mk', '', 3);
		newParameter('wx', '0.0', 2);
		newParameter('wy', '0.0', 2);
		newParameter('ww', '1.0', 2);
		newParameter('wh', '1.0', 2);
		newParameter('pt', '<%= dlRequest.getAsString("pt") %>', 1);
		newParameter('brgt', '0.0', 1);
		newParameter('cont', '0.0', 1);
		newParameter('rot', '0.0', 1);
		newParameter('rgba', '', 1);
		newParameter('rgbm', '', 1);
		newParameter('ddpix', '', 1);
		newParameter('ddpiy', '', 1);
		document.id='digilib';
		dl_param_init();
		
		function init() {
			dl_init();
			var scaler = getElement('scaler');
			var pic = getElement('pic');
			var ps = bestPicSize(scaler, 50);
			var src = "../servlet/Scaler?fn=&dw=" + ps.width + "&dh=" + ps.height;
			pic.src = src;
			}
	</script>
</head>

<body onload="init();">

 <div id="scaler-table">
 	<div id="scaler" style="visibility:visible">
		<img id="pic"></img>
	</div>
 </div>

 <!-- marks as dynamically created divs with numbers or text? -->
 <div id="dot0" class="dot"><img class="mark" src="../img/mark1.gif" ></div>
 <div id="dot1" class="dot"><img class="mark" src="../img/mark2.gif" ></div>
 <div id="dot2" class="dot"><img class="mark" src="../img/mark3.gif" ></div>
 <div id="dot3" class="dot"><img class="mark" src="../img/mark4.gif" ></div>
 <div id="dot4" class="dot"><img class="mark" src="../img/mark5.gif" ></div>
 <div id="dot5" class="dot"><img class="mark" src="../img/mark6.gif" ></div>
 <div id="dot6" class="dot"><img class="mark" src="../img/mark7.gif" ></div>
 <div id="dot7" class="dot"><img class="mark" src="../img/mark8.gif" ></div>

 <!-- zoom area with a transparent div ? -->
 <div id="eck1" class="dot"><img class="mark" src="../img/olinks.gif" ></div>
 <div id="eck2" class="dot"><img class="mark" src="../img/orechts.gif" ></div>
 <div id="eck3" class="dot"><img class="mark" src="../img/ulinks.gif" ></div>
 <div id="eck4" class="dot"><img class="mark" src="../img/urechts.gif" ></div>
 
 
 <div id="buttons" 
	<div class="button">
		<a
			class="icon"
			href="javascript:showOptions(0);setMark()"
			>

			<img
				class="png"
				id="mark"
				onmouseover="highlightPNG('mark', 1)"
				onmouseout="highlightPNG('mark', 0)"
				title="set a mark"
				src="mark.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:removeMark()"
			>

			<img
				class="png"
				id="delmark"
				onmouseover="highlightPNG('delmark', 1)"
				onmouseout="highlightPNG('delmark', 0)"
				title="delete the last mark"
				src="delmark.png"
				>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:getRefWin()"
			>

			<img
				class="png"
				id="reference"
				onmouseover="highlightPNG('reference', 1)"
				onmouseout="highlightPNG('reference', 0)"
				title="get a reference URL"
				src="reference.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomBy(1.4)"
			>

			<img
				class="png"
				id="zoom-in"
				onmouseover="highlightPNG('zoom-in', 1)"
				onmouseout="highlightPNG('zoom-in', 0)"
				title="zoom in"
				src="zoom-in.png"
			>
	</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomBy(0.7)"
			>

			<img
				class="png"
				id="zoom-out"
				onmouseover="highlightPNG('zoom-out', 1)"
				onmouseout="highlightPNG('zoom-out', 0)"
				title="zoom out"
				src="zoom-out.png"
			>
	</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:showOptions(0);zoomArea()"
			>

			<img
				class="png"
				id="zoom-area"
				onmouseover="highlightPNG('zoom-area', 1)"
				onmouseout="highlightPNG('zoom-area', 0)"
				title="zoom area"
				src="zoom-area.png"
			>
		</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:zoomFullpage()"
			>

			<img
				class="png"
				id="zoom-full"
				onmouseover="highlightPNG('zoom-full', 1)"
				onmouseout="highlightPNG('zoom-full', 0)"
				title="view the whole image"
				src="zoom-full.png"
			>
	</a> 
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:mirror('h')"
			>

			<img
				class="png"
				id="mirror-h"
				onmouseover="highlightPNG('mirror-h', 1)"
				onmouseout="highlightPNG('mirror-h', 0)"
				title="mirror horizontally"
				src="mirror-horizontal.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:mirror('v')"
			>

			<img
				class="png"
				id="mirror-v"
				onmouseover="highlightPNG('mirror-v', 1)"
				onmouseout="highlightPNG('mirror-v', 0)"
				title="mirror vertically"
				src="mirror-vertical.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('rot', 'Rotate (0..360) clockwise')"
			>

			<img
				class="png"
				id="rotate"
				onmouseover="highlightPNG('rotate', 1)"
				onmouseout="highlightPNG('rotate', 0)"
				title="rotate image"
				src="rotate.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('brgt', 'Brightness (-255..255)')"
			>

			<img
				class="png"
				id="brightness"
				onmouseover="highlightPNG('brightness', 1)"
				onmouseout="highlightPNG('brightness', 0)"
				title="set brightness"
				src="brightness.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('cont', 'Contrast (0..8)')"
			>

			<img
				class="png"
				id="contrast"
				onmouseover="highlightPNG('contrast', 1)"
				onmouseout="highlightPNG('contrast', 0)"
				title="set contrast"
				src="contrast.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('rgb', '...')"
			>

			<img
				class="png"
				id="rgb"
				onmouseover="highlightPNG('rgb', 1)"
				onmouseout="highlightPNG('rgb', 0)"
				title="set rgb values"
				src="rgb.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setParamWin('size', '...')"
			>

			<img
				class="png"
				id="size"
				onmouseover="highlightPNG('size', 1)"
				onmouseout="highlightPNG('size', 0)"
				title="resize page"
				src="size.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:setQualityWin('Quality (0..2)')"
			>

			<img
				class="png"
				id="quality"
				onmouseover="highlightPNG('quality', 1)"
				onmouseout="highlightPNG('quality', 0)"
				title="set image quality"
				src="quality.png"
			>
		</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPage('-1')"
			>

			<img
				class="png"
				id="back"
				onmouseover="highlightPNG('back', 1)"
				onmouseout="highlightPNG('back', 0)"
				title="goto previous image"
				src="back.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPage('+1')"
			>

			<img
				class="png"
				id="fwd"
				onmouseover="highlightPNG('fwd', 1)"
				onmouseout="highlightPNG('fwd', 0)"
				title="goto next image"
				src="fwd.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:gotoPageWin()"
			>

			<img
				class="png"
				id="page"
				onmouseover="highlightPNG('page', 1)"
				onmouseout="highlightPNG('page', 0)"
				title="specify image"
				src="page.png"
			>
	</a>
	</div>
	
	<div class="button">
		<a
			class="icon"
			href="javascript:help()"
			>

			<img
				class="png"
				id="help"
				onmouseover="highlightPNG('help', 1)"
				onmouseout="highlightPNG('help', 0)"
				title="help"
				src="help.png"
			>
		</a>
	</div>
	
</div>


</body>

</html>
